import {
  KegiatanItem,
  ProgramCategory,
  ProgramRealizationItem,
  RealizationStatus,
  SubkegiatanItem,
} from '../types/budget';

export interface ParsedSpjDocument {
  metadata: {
    perangkatDaerah: string;
    penggunaAnggaran: string;
    bendaharaPengeluaran: string;
    tahunAnggaran: number;
    bulan: string;
  };
  totalAnggaranInduk: number;
  totalAnggaranPergeseran: number;
  totalAnggaran: number;
  totalRealisasi: number;
  sisaAnggaran: number;
  persentaseRealisasi: number;
  spjBreakdown: {
    lsGaji: number;
    lsBarangJasa: number;
    upGuTu: number;
  };
  programs: ProgramRealizationItem[];
  kegiatanList: KegiatanItem[];
  subkegiatanList: SubkegiatanItem[];
}

export const parseCsvMatrix = (csvText: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (ch === '\r' && next === '\n') {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += ch;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
};

export const parseIndonesianMoney = (raw: unknown): number => {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (typeof raw !== 'string') return 0;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-' || trimmed === '–') return 0;

  // Indonesian format: "  3.426.932.118,00 " or "105.964.680"
  const normalized = trimmed
    .replace(/Rp/gi, '')
    .replace(/\s+/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const val = Number(normalized.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(val) ? Math.max(0, Math.round(val)) : 0;
};

const mapSpjProgramToCategory = (
  programName: string,
  programCode: string
): Exclude<ProgramCategory, 'Semua Program'> => {
  const upper = programName.toUpperCase();
  if (upper.includes('PENUNJANG') || programCode.startsWith('5.01.01')) {
    return 'Penunjang';
  }
  if (upper.includes('PENELITIAN') || upper.includes('PENGEMBANGAN') || programCode.startsWith('5.05')) {
    return 'Perekonomian';
  }
  if (upper.includes('KOORDINASI') || upper.includes('SINKRONISASI') || programCode.startsWith('5.01.03')) {
    return 'Pelayanan Umum';
  }
  return 'Pembangunan';
};

const PROGRAM_COLOR_MAP: Record<Exclude<ProgramCategory, 'Semua Program'>, string> = {
  'Pelayanan Umum': '#0E76F4',
  Perekonomian: '#16A34A',
  Pembangunan: '#F59E0B',
  Penunjang: '#7C3AED',
};

export const isSpjFungsionalFormat = (matrix: string[][]): boolean => {
  const sampleText = matrix
    .slice(0, 15)
    .map((r) => r.join(' '))
    .join(' ')
    .toUpperCase();
  return (
    sampleText.includes('SPJ BELANJA') ||
    sampleText.includes('KODE REKENING') ||
    sampleText.includes('JUMLAH ANGGARAN PERUBAHAN')
  );
};

export const parseSpjFungsionalMatrix = (matrix: string[][]): ParsedSpjDocument => {
  let perangkatDaerah = 'BAPPELITBANGDA KABUPATEN NAGEKEO';
  let penggunaAnggaran = 'HILDEGARDIS M KASI, S.IP.,MPA';
  let bendaharaPengeluaran = 'MERKURIUS LOWA COO,S.Kom';
  let tahunAnggaran = 2026;
  let bulan = 'JANUARI';

  for (let i = 0; i < Math.min(15, matrix.length); i++) {
    const row = matrix[i];
    const label = String(row[2] || '').trim().toLowerCase();
    const val = String(row[9] || '').trim();
    if (label.includes('perangkat daerah') && val) perangkatDaerah = val;
    if (label.includes('pengguna anggaran') && val) penggunaAnggaran = val;
    if (label.includes('bendahara pengeluaran') && val) bendaharaPengeluaran = val;
    if (label.includes('tahun anggaran') && val) {
      const parsedYr = Number(val);
      if (parsedYr > 2000) tahunAnggaran = parsedYr;
    }
    if (label === 'bulan' && val) bulan = val;
  }

  // Locate header row (starts data after row with "1", "2", "3", "4" or "Kode Rekening")
  let dataStartIdx = 13;
  for (let i = 0; i < Math.min(25, matrix.length); i++) {
    const row = matrix[i];
    if (String(row[2] || '').trim() === '1' && String(row[8] || '').trim() === '2') {
      dataStartIdx = i + 1;
      break;
    }
  }

  interface InternalSub {
    kode: string;
    programName: string;
    programCategory: Exclude<ProgramCategory, 'Semua Program'>;
    kegiatanName: string;
    nama: string;
    pagu: number;
    realisasi: number;
    lsGaji: number;
    lsBarangJasa: number;
    upGuTu: number;
    sumberDanaSet: Set<string>;
  }

  interface InternalKeg {
    kode: string;
    nama: string;
    programCategory: Exclude<ProgramCategory, 'Semua Program'>;
    pagu: number;
    realisasi: number;
    subCount: number;
  }

  interface InternalProg {
    kode: string;
    nama: string;
    category: Exclude<ProgramCategory, 'Semua Program'>;
    pagu: number;
    realisasi: number;
    subCount: number;
  }

  const progList: InternalProg[] = [];
  const kegList: InternalKeg[] = [];
  const subList: InternalSub[] = [];

  let currentProg: InternalProg | null = null;
  let currentKeg: InternalKeg | null = null;
  let currentSub: InternalSub | null = null;

  let grandTotalInduk = 0;
  let grandTotalPergeseran = 0;
  let grandTotalPerubahan = 0;
  let grandTotalSpj = 0;
  let grandTotalSisa = 0;
  let grandLsGaji = 0;
  let grandLsBarangJasa = 0;
  let grandUpGuTu = 0;

  for (let i = dataStartIdx; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.length < 9) continue;

    const codeParts = [row[2], row[3], row[4], row[5], row[6], row[7]]
      .map((c) => String(c || '').trim())
      .filter(Boolean);
    const fullCode = codeParts.join('.');
    const uraian = String(row[8] || '').replace(/\s+/g, ' ').trim();

    const anggaranInduk = parseIndonesianMoney(row[9]);
    const anggaranPergeseran = parseIndonesianMoney(row[10]);
    const anggaranPerubahan = parseIndonesianMoney(row[11]);
    const sumberDana = String(row[12] || '').trim();

    const lsGaji = parseIndonesianMoney(row[15]);
    const lsBarang = parseIndonesianMoney(row[18]);
    const upGuTu = parseIndonesianMoney(row[21]);
    const jumlahSpj = parseIndonesianMoney(row[22]);
    const sisaPagu = parseIndonesianMoney(row[23]);

    // Check grand total row (empty code & empty uraian, with total numbers in col 9-11 & 22-23)
    if (!fullCode && !uraian && anggaranPerubahan > 0 && jumlahSpj > 0) {
      grandTotalInduk = anggaranInduk;
      grandTotalPergeseran = anggaranPergeseran;
      grandTotalPerubahan = anggaranPerubahan;
      grandLsGaji = lsGaji;
      grandLsBarangJasa = lsBarang;
      grandUpGuTu = upGuTu;
      grandTotalSpj = jumlahSpj;
      grandTotalSisa = sisaPagu;
      break;
    }

    if (!uraian && !fullCode) continue;

    const upperUraian = uraian.toUpperCase();

    if (upperUraian.startsWith('PROGRAM ')) {
      const cat = mapSpjProgramToCategory(uraian, fullCode);
      currentProg = {
        kode: fullCode || '5',
        nama: uraian.replace(/^PROGRAM\s+/i, '').trim(),
        category: cat,
        pagu: anggaranPerubahan,
        realisasi: 0,
        subCount: 0,
      };
      progList.push(currentProg);
      currentKeg = null;
      currentSub = null;
      continue;
    }

    if (upperUraian.startsWith('KEGIATAN ')) {
      const cat = currentProg?.category || 'Pembangunan';
      currentKeg = {
        kode: fullCode,
        nama: uraian.replace(/^KEGIATAN\s+/i, '').trim(),
        programCategory: cat,
        pagu: anggaranPerubahan,
        realisasi: 0,
        subCount: 0,
      };
      kegList.push(currentKeg);
      currentSub = null;
      continue;
    }

    const isSubRow =
      upperUraian.startsWith('SUB KEGIATAN') ||
      (codeParts.length === 6 &&
        codeParts[0] === '5' &&
        codeParts[3] === '2' &&
        !sumberDana);

    if (isSubRow) {
      const cleanName = uraian.replace(/^Sub\s+Kegiatan\s+/i, '').trim();
      const cat = currentProg?.category || 'Pembangunan';
      currentSub = {
        kode: fullCode,
        programName: currentProg?.nama || 'Program Bapperida',
        programCategory: cat,
        kegiatanName: currentKeg?.nama || 'Kegiatan Perencanaan',
        nama: cleanName,
        pagu: anggaranPerubahan,
        realisasi: 0,
        lsGaji: 0,
        lsBarangJasa: 0,
        upGuTu: 0,
        sumberDanaSet: new Set(),
      };
      subList.push(currentSub);
      if (currentKeg) currentKeg.subCount += 1;
      if (currentProg) currentProg.subCount += 1;
      continue;
    }

    // Leaf line item (has Sumber Dana or 4-digit rekening sub-object)
    const isLeafRow = Boolean(sumberDana) || (row[7] && String(row[7]).trim().length === 4);
    if (isLeafRow && currentSub) {
      const effectiveSpj = jumlahSpj > 0 ? jumlahSpj : lsGaji + lsBarang + upGuTu;
      currentSub.realisasi += effectiveSpj;
      currentSub.lsGaji += lsGaji;
      currentSub.lsBarangJasa += lsBarang;
      currentSub.upGuTu += upGuTu;
      if (sumberDana) currentSub.sumberDanaSet.add(sumberDana);

      if (currentKeg) currentKeg.realisasi += effectiveSpj;
      if (currentProg) currentProg.realisasi += effectiveSpj;
    }
  }

  const totalAnggaran =
    grandTotalPerubahan > 0
      ? grandTotalPerubahan
      : progList.reduce((acc, p) => acc + p.pagu, 0);
  const totalRealisasi =
    grandTotalSpj > 0
      ? grandTotalSpj
      : subList.reduce((acc, s) => acc + s.realisasi, 0);
  const sisaAnggaran =
    grandTotalSisa > 0 ? grandTotalSisa : Math.max(0, totalAnggaran - totalRealisasi);
  const persentaseRealisasi =
    totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0;

  // Map programs (aggregate by category so the 4 legend colors map cleanly, OR keep distinct SPJ programs)
  const categoryBuckets = new Map<
    Exclude<ProgramCategory, 'Semua Program'>,
    { pagu: number; realisasi: number; subCount: number }
  >();

  (['Pelayanan Umum', 'Perekonomian', 'Pembangunan', 'Penunjang'] as const).forEach((cat) => {
    categoryBuckets.set(cat, { pagu: 0, realisasi: 0, subCount: 0 });
  });

  progList.forEach((p) => {
    const bucket = categoryBuckets.get(p.category)!;
    bucket.pagu += p.pagu;
    bucket.realisasi += p.realisasi;
    bucket.subCount += p.subCount;
  });

  const programs: ProgramRealizationItem[] = Array.from(categoryBuckets.entries()).map(
    ([cat, data]) => ({
      id: cat,
      name: cat,
      pagu: data.pagu,
      realisasi: data.realisasi,
      persentase: data.pagu > 0 ? (data.realisasi / data.pagu) * 100 : 0,
      color: PROGRAM_COLOR_MAP[cat],
      subCount: data.subCount,
    })
  );

  const kegiatanList: KegiatanItem[] = kegList.map((k, idx) => {
    const pct = k.pagu > 0 ? (k.realisasi / k.pagu) * 100 : 0;
    const status: RealizationStatus =
      k.realisasi === 0 ? 'Belum Terealisasi' : pct < 70 ? 'Perlu Perhatian' : 'Baik';
    return {
      id: `spj-keg-${idx + 1}`,
      kode: k.kode || `5.01.${idx + 1}`,
      nama: toTitleCaseSmart(k.nama),
      program: k.programCategory,
      pagu: k.pagu,
      realisasi: k.realisasi,
      persentase: pct,
      status,
      jumlahSubkegiatan: k.subCount,
      bidangPenanggungJawab: perangkatDaerah,
    };
  });

  const subkegiatanList: SubkegiatanItem[] = subList.map((s, idx) => {
    const pct = s.pagu > 0 ? (s.realisasi / s.pagu) * 100 : 0;
    const status: RealizationStatus =
      s.realisasi === 0 ? 'Belum Terealisasi' : pct < 70 ? 'Perlu Perhatian' : 'Baik';
    const sumberList = Array.from(s.sumberDanaSet).join(', ');
    return {
      id: `spj-sub-${idx + 1}`,
      kode: s.kode || `5.01.00.0.${String(idx + 1).padStart(2, '0')}`,
      program: s.programCategory,
      kegiatan: toTitleCaseSmart(s.kegiatanName),
      nama: s.nama,
      triwulan: 'IV',
      pagu: s.pagu,
      realisasi: s.realisasi,
      persentase: pct,
      status,
      unitPelaksana: sumberList ? `Sumber Dana: ${sumberList}` : perangkatDaerah,
      catatanKendala:
        status === 'Belum Terealisasi'
          ? `Belum ada pencairan SPJ hingga akhir periode (Pagu: Rp ${s.pagu.toLocaleString('id-ID')}).`
          : status === 'Perlu Perhatian'
          ? `Serapan masih ${pct.toFixed(2).replace('.', ',')}% dari pagu perubahan.`
          : undefined,
      tindakLanjut:
        status === 'Belum Terealisasi'
          ? 'Verifikasi kelengkapan administrasi pengajuan SPP/SPM.'
          : undefined,
    };
  });

  return {
    metadata: {
      perangkatDaerah,
      penggunaAnggaran,
      bendaharaPengeluaran,
      tahunAnggaran,
      bulan,
    },
    totalAnggaranInduk: grandTotalInduk,
    totalAnggaranPergeseran: grandTotalPergeseran,
    totalAnggaran,
    totalRealisasi,
    sisaAnggaran,
    persentaseRealisasi,
    spjBreakdown: {
      lsGaji: grandLsGaji || subList.reduce((a, b) => a + b.lsGaji, 0),
      lsBarangJasa: grandLsBarangJasa || subList.reduce((a, b) => a + b.lsBarangJasa, 0),
      upGuTu: grandUpGuTu || subList.reduce((a, b) => a + b.upGuTu, 0),
    },
    programs,
    kegiatanList,
    subkegiatanList,
  };
};

const toTitleCaseSmart = (text: string): string => {
  if (!text) return '';
  if (text !== text.toUpperCase()) return text;
  const keepUpper = new Set(['SKPD', 'ASN', 'BMD', 'SDA', 'RPJPD', 'RPJMD', 'RKPD', 'SIPD']);
  return text
    .split(/\s+/)
    .map((word) => {
      const clean = word.replace(/[^A-Z0-9]/g, '');
      if (keepUpper.has(clean)) return word;
      if (word.length <= 3 && word === 'DAN') return 'dan';
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};
