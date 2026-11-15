import {
  KegiatanItem,
  ProgramCategory,
  RealizationStatus,
  SubkegiatanItem,
} from '../types/budget';
import {
  isSpjFungsionalFormat,
  ParsedSpjDocument,
  parseSpjFungsionalMatrix,
} from './spjParser';

export interface SpreadsheetMetadata {
  spreadsheetId: string;
  title: string;
  spreadsheetUrl: string;
  sheets: { sheetId: number; title: string; rowCount: number }[];
}

export const extractSpreadsheetId = (input: string): string => {
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }
  return trimmed;
};

const parseIndonesianOrRawNumber = (val: unknown): number => {
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (typeof val !== 'string') return 0;
  const cleaned = val
    .replace(/Rp/gi, '')
    .replace(/\s+/g, '')
    .replace(/\.(?=\d{3}(?:[.,]|$))/g, '')
    .replace(',', '.');
  const num = Number(cleaned.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(num) ? Math.max(0, num) : 0;
};

const normalizeProgram = (raw: string): Exclude<ProgramCategory, 'Semua Program'> => {
  const lower = raw.toLowerCase();
  if (lower.includes('pelayanan') || lower.includes('pemerintahan') || lower.includes('publik')) {
    return 'Pelayanan Umum';
  }
  if (lower.includes('ekonomi') || lower.includes('umkm')) {
    return 'Perekonomian';
  }
  if (lower.includes('penunjang') || lower.includes('sekretariat')) {
    return 'Penunjang';
  }
  return 'Pembangunan';
};

const normalizeTriwulan = (raw: string): 'I' | 'II' | 'III' | 'IV' => {
  const upper = raw.toUpperCase().trim();
  if (upper === 'I' || upper === '1' || upper.includes('TW1') || upper.includes('TRIWULAN I')) {
    return 'I';
  }
  if (upper === 'II' || upper === '2' || upper.includes('TW2') || upper.includes('TRIWULAN II')) {
    return 'II';
  }
  if (upper === 'III' || upper === '3' || upper.includes('TW3') || upper.includes('TRIWULAN III')) {
    return 'III';
  }
  return 'IV';
};

export const fetchSpreadsheetMetadata = async (
  rawIdOrUrl: string,
  accessToken: string
): Promise<SpreadsheetMetadata> => {
  const spreadsheetId = extractSpreadsheetId(rawIdOrUrl);
  if (!spreadsheetId) {
    throw new Error('ID atau tautan Google Spreadsheet tidak valid.');
  }

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties(sheetId,title,gridProperties.rowCount)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const msg = errBody?.error?.message || `HTTP ${res.status}`;
    if (res.status === 401) {
      throw new Error('Sesi Google berakhir. Silakan masuk kembali dengan Google.');
    }
    if (res.status === 403) {
      throw new Error('Akun Google Anda tidak memiliki izin akses ke Spreadsheet ini.');
    }
    if (res.status === 404) {
      throw new Error('Spreadsheet tidak ditemukan. Periksa kembali tautan atau ID Spreadsheet.');
    }
    throw new Error(`Gagal memuat metadata Spreadsheet: ${msg}`);
  }

  const data = await res.json();
  return {
    spreadsheetId: data.spreadsheetId,
    title: data.properties?.title || 'Spreadsheet Tanpa Judul',
    spreadsheetUrl:
      data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
    sheets: (data.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId ?? 0,
      title: s.properties?.title ?? 'Sheet1',
      rowCount: s.properties?.gridProperties?.rowCount ?? 1000,
    })),
  };
};

export const readSubkegiatanFromSheet = async (
  spreadsheetId: string,
  sheetTitle: string,
  accessToken: string
): Promise<{
  rows: SubkegiatanItem[];
  rawRowCount: number;
  spjDocument?: ParsedSpjDocument;
}> => {
  const range = `'${sheetTitle.replace(/'/g, "''")}'!A1:X500`;
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || `Gagal membaca data tab "${sheetTitle}".`);
  }

  const data = await res.json();
  const values: string[][] = data.values || [];
  if (values.length < 2) {
    return { rows: [], rawRowCount: 0 };
  }

  // Auto-detect SPJ Belanja Fungsional format (Database_SIPANGGAR)
  if (isSpjFungsionalFormat(values)) {
    const spjDoc = parseSpjFungsionalMatrix(values);
    return {
      rows: spjDoc.subkegiatanList,
      rawRowCount: spjDoc.subkegiatanList.length,
      spjDocument: spjDoc,
    };
  }

  const headers = values[0].map((h) => String(h || '').toLowerCase().trim());
  const findCol = (keywords: string[], fallbackIdx: number): number => {
    const idx = headers.findIndex((h) => keywords.some((k) => h.includes(k)));
    return idx >= 0 ? idx : fallbackIdx;
  };

  const colKode = findCol(['kode', 'rekening', 'code'], 0);
  const colProgram = findCol(['program'], 1);
  const colKegiatan = findCol(['kegiatan'], 2);
  const colNama = findCol(['subkegiatan', 'sub kegiatan', 'uraian', 'nama'], 3);
  const colTriwulan = findCol(['triwulan', 'tw', 'periode'], 4);
  const colPagu = findCol(['pagu', 'anggaran', 'budget'], 5);
  const colRealisasi = findCol(['realisasi', 'serapan', 'sp2d'], 6);
  const colUnit = findCol(['unit', 'bidang', 'pelaksana', 'opd'], 7);
  const colKendala = findCol(['kendala', 'catatan', 'hambatan'], 8);
  const colTindakLanjut = findCol(['tindak lanjut', 'rencana', 'aksi'], 9);

  const parsedRows: SubkegiatanItem[] = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (!row || row.every((cell) => !String(cell || '').trim())) continue;

    const nama = String(row[colNama] || row[colKegiatan] || '').trim();
    if (!nama) continue;

    const pagu = parseIndonesianOrRawNumber(row[colPagu]);
    const realisasi = parseIndonesianOrRawNumber(row[colRealisasi]);
    const persentase = pagu > 0 ? Math.min(100, (realisasi / pagu) * 100) : 0;
    const status: RealizationStatus =
      realisasi === 0 ? 'Belum Terealisasi' : persentase < 70 ? 'Perlu Perhatian' : 'Baik';

    parsedRows.push({
      id: `gs-row-${i}`,
      kode: String(row[colKode] || `5.01.00.0.${String(i).padStart(2, '0')}`).trim(),
      program: normalizeProgram(String(row[colProgram] || 'Pembangunan')),
      kegiatan: String(row[colKegiatan] || 'Program Kerja Bapperida').trim(),
      nama,
      triwulan: normalizeTriwulan(String(row[colTriwulan] || 'IV')),
      pagu,
      realisasi,
      persentase,
      status,
      unitPelaksana: String(row[colUnit] || 'Bapperida Kab. Nagekeo').trim(),
      catatanKendala: row[colKendala] ? String(row[colKendala]).trim() : undefined,
      tindakLanjut: row[colTindakLanjut] ? String(row[colTindakLanjut]).trim() : undefined,
    });
  }

  return { rows: parsedRows, rawRowCount: values.length - 1 };
};

export const createSipanggarSpreadsheet = async (
  year: number,
  subkegiatanList: SubkegiatanItem[],
  kegiatanList: KegiatanItem[],
  accessToken: string
): Promise<SpreadsheetMetadata> => {
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `SIPANGGAR Bapperida Kab. Nagekeo - TA ${year}`,
      },
      sheets: [
        { properties: { title: 'Subkegiatan' } },
        { properties: { title: 'Rekap_Kegiatan' } },
      ],
    }),
  });

  if (!createRes.ok) {
    const errBody = await createRes.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || 'Gagal membuat Google Spreadsheet baru.');
  }

  const created = await createRes.json();
  const spreadsheetId: string = created.spreadsheetId;

  const subValues = [
    [
      'Kode Rekening',
      'Program',
      'Kegiatan',
      'Subkegiatan',
      'Triwulan',
      'Pagu (Rp)',
      'Realisasi (Rp)',
      'Unit Pelaksana',
      'Kendala',
      'Tindak Lanjut',
      '% Serapan',
    ],
    ...subkegiatanList.map((s) => [
      s.kode,
      s.program,
      s.kegiatan,
      s.nama,
      s.triwulan,
      s.pagu,
      s.realisasi,
      s.unitPelaksana,
      s.catatanKendala || '',
      s.tindakLanjut || '',
      `${s.persentase.toFixed(2)}%`,
    ]),
  ];

  const kegValues = [
    ['Kode', 'Kegiatan', 'Program', 'Pagu (Rp)', 'Realisasi (Rp)', '% Realisasi', 'Status'],
    ...kegiatanList.map((k) => [
      k.kode,
      k.nama,
      k.program,
      k.pagu,
      k.realisasi,
      `${k.persentase.toFixed(2)}%`,
      k.status,
    ]),
  ];

  const batchRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: 'Subkegiatan!A1', values: subValues },
          { range: 'Rekap_Kegiatan!A1', values: kegValues },
        ],
      }),
    }
  );

  if (!batchRes.ok) {
    const errBody = await batchRes.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || 'Spreadsheet dibuat tetapi gagal mengisi baris awal.');
  }

  return {
    spreadsheetId,
    title: created.properties?.title || `SIPANGGAR Bapperida Kab. Nagekeo - TA ${year}`,
    spreadsheetUrl:
      created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    sheets: (created.sheets || []).map((s: any) => ({
      sheetId: s.properties?.sheetId ?? 0,
      title: s.properties?.title ?? 'Subkegiatan',
      rowCount: 1000,
    })),
  };
};

export const syncSubkegiatanToSheet = async (
  spreadsheetId: string,
  sheetTitle: string,
  subkegiatanList: SubkegiatanItem[],
  accessToken: string
): Promise<void> => {
  const escapedTitle = `'${sheetTitle.replace(/'/g, "''")}'`;

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(`${escapedTitle}!A1:K500`)}:clear`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const values = [
    [
      'Kode Rekening',
      'Program',
      'Kegiatan',
      'Subkegiatan',
      'Triwulan',
      'Pagu (Rp)',
      'Realisasi (Rp)',
      'Unit Pelaksana',
      'Kendala',
      'Tindak Lanjut',
      '% Serapan',
    ],
    ...subkegiatanList.map((s) => [
      s.kode,
      s.program,
      s.kegiatan,
      s.nama,
      s.triwulan,
      s.pagu,
      s.realisasi,
      s.unitPelaksana,
      s.catatanKendala || '',
      s.tindakLanjut || '',
      `${s.persentase.toFixed(2)}%`,
    ]),
  ];

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      spreadsheetId
    )}/values/${encodeURIComponent(`${escapedTitle}!A1`)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error?.message || 'Gagal memperbarui data ke Google Sheets.');
  }
};
