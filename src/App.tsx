import { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  FISCAL_YEAR_DATASETS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SUBKEGIATAN_LIST,
} from './data/sipanggarData';
import {
  AuditLogItem,
  FiscalYearDataset,
  KegiatanItem,
  NavSection,
  ProgramCategory,
  ProgramRealizationItem,
  QuarterId,
  RealizationStatus,
  SubkegiatanItem,
} from './types/budget';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import {
  DataAnggaranView,
  LaporanView,
  MonitoringRealisasiView,
  PeringatanRealisasiView,
  RiwayatPembaruanView,
} from './components/SubPages';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { googleSignIn, initAuth, logout } from './services/googleAuth';
import { SpreadsheetMetadata } from './services/googleSheets';
import {
  isSpjFungsionalFormat,
  parseCsvMatrix,
  ParsedSpjDocument,
  parseIndonesianMoney,
  parseSpjFungsionalMatrix,
} from './services/spjParser';

const DEFAULT_DATABASE_CSV_URL = '/assets/aistudio/Database_SIPANGGAR_9d822400';

const PROGRAM_COLORS: Record<Exclude<ProgramCategory, 'Semua Program'>, string> = {
  'Pelayanan Umum': '#0E76F4',
  Perekonomian: '#16A34A',
  Pembangunan: '#F59E0B',
  Penunjang: '#7C3AED',
};

const normalizeFlatProgram = (raw: string): Exclude<ProgramCategory, 'Semua Program'> => {
  const lower = raw.toLowerCase();
  if (lower.includes('pelayanan') || lower.includes('pemerintahan') || lower.includes('koordinasi')) {
    return 'Pelayanan Umum';
  }
  if (lower.includes('ekonomi') || lower.includes('penelitian') || lower.includes('umkm')) {
    return 'Perekonomian';
  }
  if (lower.includes('penunjang') || lower.includes('sekretariat')) {
    return 'Penunjang';
  }
  return 'Pembangunan';
};

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterId>('TW4');
  const [userRole, setUserRole] = useState<string>('Pimpinan');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const [subkegiatanList, setSubkegiatanList] =
    useState<SubkegiatanItem[]>(INITIAL_SUBKEGIATAN_LIST);
  const [activeSpjDoc, setActiveSpjDoc] = useState<ParsedSpjDocument | null>(null);
  const [activeSourceLabel, setActiveSourceLabel] = useState<string>('Database SIPANGGAR');
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);
  const [dataStatusFilter, setDataStatusFilter] = useState<RealizationStatus | 'Semua'>('Semua');
  const [realisasiDelta, setRealisasiDelta] = useState<number>(0);

  // Google Sheets OAuth & Sync State
  const [sheetsModalOpen, setSheetsModalOpen] = useState<boolean>(false);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [connectedSheet, setConnectedSheet] = useState<SpreadsheetMetadata | null>(null);
  const [selectedSheetTab, setSelectedSheetTab] = useState<string>('');
  const [isSpreadsheetMode, setIsSpreadsheetMode] = useState<boolean>(false);

  const applySpjDocument = useCallback((spjDoc: ParsedSpjDocument, sourceLabel: string) => {
    setActiveSpjDoc(spjDoc);
    setSubkegiatanList(spjDoc.subkegiatanList);
    setIsSpreadsheetMode(true);
    setActiveSourceLabel(sourceLabel);
    setSelectedYear(spjDoc.metadata.tahunAnggaran || 2026);
    setRealisasiDelta(0);
  }, []);

  const loadDefaultDatabaseSpreadsheet = useCallback(async () => {
    const response = await fetch(DEFAULT_DATABASE_CSV_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} saat memuat Database SIPANGGAR`);
    }
    const csvText = await response.text();
    const matrix = parseCsvMatrix(csvText);
    if (!isSpjFungsionalFormat(matrix)) {
      throw new Error('Format Database SIPANGGAR tidak dikenali sebagai SPJ Fungsional.');
    }
    const spjDoc = parseSpjFungsionalMatrix(matrix);
    applySpjDocument(spjDoc, 'Database SIPANGGAR');
    setConnectedSheet(null);
    setSelectedSheetTab('');
    setAuditLogs((prev) => [
      {
        id: `log-init-spj-${Date.now()}`,
        tanggal: '13 Des 2026',
        waktu: '08:00 WITA',
        pengguna: spjDoc.metadata.bendaharaPengeluaran,
        jabatan: 'Bendahara Pengeluaran',
        aksi: 'Verifikasi Triwulan',
        keterangan: `Terhubung ke spreadsheet Database SIPANGGAR (${spjDoc.kegiatanList.length} Kegiatan, ${spjDoc.subkegiatanList.length} Subkegiatan · ${spjDoc.metadata.perangkatDaerah}).`,
        nominal: spjDoc.totalRealisasi,
      },
      ...prev.filter((l) => !l.id.startsWith('log-init-spj-')),
    ]);
  }, [applySpjDocument]);

  useEffect(() => {
    loadDefaultDatabaseSpreadsheet().catch(() => {
      // Fall back quietly to baseline dataset if static asset fails
    });
  }, [loadDefaultDatabaseSpreadsheet]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setAccessToken(token);
        setNeedsAuth(false);
      },
      () => {
        setAccessToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      setGoogleUser(result.user);
      setAccessToken(result.accessToken);
      setNeedsAuth(false);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setGoogleUser(null);
    setAccessToken(null);
    setNeedsAuth(true);
    setConnectedSheet(null);
    setSelectedSheetTab('');
  };

  const addAuditLog = (
    aksi: AuditLogItem['aksi'],
    keterangan: string,
    nominal?: number
  ) => {
    const now = new Date();
    const waktu = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        tanggal: '14 Nov 2026',
        waktu: `${waktu} WITA`,
        pengguna: googleUser?.displayName || activeSpjDoc?.metadata.penggunaAnggaran || userRole,
        jabatan: userRole,
        aksi,
        keterangan,
        nominal,
      },
      ...prev,
    ]);
  };

  const activeDataset: FiscalYearDataset = useMemo(() => {
    const base = FISCAL_YEAR_DATASETS[selectedYear] ?? FISCAL_YEAR_DATASETS[2026];

    if (isSpreadsheetMode && selectedYear === 2026) {
      const totalAnggaran = subkegiatanList.reduce((acc, s) => acc + s.pagu, 0);
      const totalRealisasi = subkegiatanList.reduce((acc, s) => acc + s.realisasi, 0);
      const sisaAnggaran = Math.max(0, totalAnggaran - totalRealisasi);
      const persentaseRealisasi =
        totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0;

      const programKeys: Exclude<ProgramCategory, 'Semua Program'>[] = [
        'Pelayanan Umum',
        'Perekonomian',
        'Pembangunan',
        'Penunjang',
      ];
      const programs: ProgramRealizationItem[] = programKeys.map((prog) => {
        const items = subkegiatanList.filter((s) => s.program === prog);
        const pagu = items.reduce((acc, i) => acc + i.pagu, 0);
        const realisasi = items.reduce((acc, i) => acc + i.realisasi, 0);
        return {
          id: prog,
          name: prog,
          pagu,
          realisasi,
          persentase: pagu > 0 ? (realisasi / pagu) * 100 : 0,
          color: PROGRAM_COLORS[prog],
          subCount: items.length,
        };
      });

      const kegiatanMap = new Map<string, SubkegiatanItem[]>();
      subkegiatanList.forEach((s) => {
        const arr = kegiatanMap.get(s.kegiatan) || [];
        arr.push(s);
        kegiatanMap.set(s.kegiatan, arr);
      });

      const kegiatanList: KegiatanItem[] = Array.from(kegiatanMap.entries()).map(
        ([kegName, items], idx) => {
          const matchedSpjKeg = activeSpjDoc?.kegiatanList.find((k) => k.nama === kegName);
          const pagu = items.reduce((a, b) => a + b.pagu, 0);
          const realisasi = items.reduce((a, b) => a + b.realisasi, 0);
          const persentase = pagu > 0 ? (realisasi / pagu) * 100 : 0;
          return {
            id: matchedSpjKeg?.id || `ss-keg-${idx}`,
            kode: matchedSpjKeg?.kode || items[0]?.kode.slice(0, 14) || `5.01.0${idx + 1}.2.01`,
            nama: kegName,
            program: items[0]?.program || 'Pembangunan',
            pagu,
            realisasi,
            persentase,
            status:
              realisasi === 0
                ? 'Belum Terealisasi'
                : persentase < 70
                ? 'Perlu Perhatian'
                : 'Baik',
            jumlahSubkegiatan: items.length,
            bidangPenanggungJawab:
              activeSpjDoc?.metadata.perangkatDaerah ||
              items[0]?.unitPelaksana ||
              'Bapperida Kab. Nagekeo',
          };
        }
      );

      const quarterKeys: {
        id: QuarterId;
        short: 'I' | 'II' | 'III' | 'IV';
        label: string;
        months: string;
      }[] = [
        { id: 'TW1', short: 'I', label: 'Triwulan I', months: '(Jan-Mar)' },
        { id: 'TW2', short: 'II', label: 'Triwulan II', months: '(Apr-Jun)' },
        { id: 'TW3', short: 'III', label: 'Triwulan III', months: '(Jul-Sep)' },
        { id: 'TW4', short: 'IV', label: 'Triwulan IV', months: '(Okt-Des)' },
      ];

      const hasMultiQuarterRows =
        new Set(subkegiatanList.map((s) => s.triwulan)).size > 1;

      const paguWeights = [0.23, 0.25, 0.26, 0.26];
      const realWeights = [0.2405, 0.2455, 0.264, 0.25];

      const quarterly = quarterKeys.map((qMeta, i) => {
        const qItems = subkegiatanList.filter((s) => s.triwulan === qMeta.short);
        const paguMiliarRaw = hasMultiQuarterRows
          ? qItems.reduce((a, b) => a + b.pagu, 0) / 1e9
          : (totalAnggaran * paguWeights[i]) / 1e9;
        const realMiliarRaw = hasMultiQuarterRows
          ? qItems.reduce((a, b) => a + b.realisasi, 0) / 1e9
          : (totalRealisasi * realWeights[i]) / 1e9;
        const pct = paguMiliarRaw > 0 ? (realMiliarRaw / paguMiliarRaw) * 100 : 0;
        return {
          id: qMeta.id,
          label: qMeta.label,
          shortLabel: qMeta.label,
          months: qMeta.months,
          anggaranMiliar: Number(paguMiliarRaw.toFixed(2)),
          realisasiMiliar: Number(realMiliarRaw.toFixed(2)),
          persentase: pct,
          trendYearPercent: pct,
          prevYearPercent: base.quarterly[i]?.prevYearPercent ?? 65,
        };
      });

      const baik = subkegiatanList.filter((s) => s.status === 'Baik').length;
      const perluPerhatian = subkegiatanList.filter((s) => s.status === 'Perlu Perhatian').length;
      const belumTerealisasi = subkegiatanList.filter(
        (s) => s.status === 'Belum Terealisasi'
      ).length;

      return {
        ...base,
        year: selectedYear,
        totalAnggaran,
        totalRealisasi,
        sisaAnggaran,
        persentaseRealisasi,
        programs,
        kegiatanList,
        quarterly,
        statusCounts: {
          baik,
          perluPerhatian,
          belumTerealisasi,
          total: subkegiatanList.length,
        },
      };
    }

    if (selectedYear !== 2026 || realisasiDelta === 0) {
      return base;
    }

    const totalRealisasi = Math.min(base.totalAnggaran, base.totalRealisasi + realisasiDelta);
    const sisaAnggaran = Math.max(0, base.totalAnggaran - totalRealisasi);
    const persentaseRealisasi =
      base.totalAnggaran > 0 ? (totalRealisasi / base.totalAnggaran) * 100 : 0;

    return {
      ...base,
      totalRealisasi,
      sisaAnggaran,
      persentaseRealisasi,
    };
  }, [selectedYear, realisasiDelta, subkegiatanList, isSpreadsheetMode, activeSpjDoc]);

  const handleUpdateRealisasi = (
    subId: string,
    newRealisasi: number,
    keterangan: string
  ) => {
    let diff = 0;
    setSubkegiatanList((prev) =>
      prev.map((item) => {
        if (item.id !== subId) return item;
        diff = newRealisasi - item.realisasi;
        const pct = item.pagu > 0 ? (newRealisasi / item.pagu) * 100 : 0;
        const nextStatus: RealizationStatus =
          newRealisasi === 0 ? 'Belum Terealisasi' : pct < 70 ? 'Perlu Perhatian' : 'Baik';
        return {
          ...item,
          realisasi: newRealisasi,
          persentase: pct,
          status: nextStatus,
        };
      })
    );

    if (diff !== 0 && !isSpreadsheetMode) {
      setRealisasiDelta((d) => d + diff);
    }

    addAuditLog('Input Realisasi SP2D', keterangan, newRealisasi);
  };

  const handleSaveFollowUp = (subId: string, tindakLanjut: string) => {
    let subName = '';
    setSubkegiatanList((prev) =>
      prev.map((item) => {
        if (item.id !== subId) return item;
        subName = item.nama;
        return { ...item, tindakLanjut };
      })
    );

    addAuditLog('Tindak Lanjut Peringatan', `Tindak lanjut "${subName}": ${tindakLanjut}`);
  };

  const handleImportRowsFromSheet = (
    rows: SubkegiatanItem[],
    meta: SpreadsheetMetadata,
    tab: string,
    spjDoc?: ParsedSpjDocument
  ) => {
    if (spjDoc) {
      applySpjDocument(spjDoc, meta.title);
    } else {
      setActiveSpjDoc(null);
      setSubkegiatanList(rows);
      setIsSpreadsheetMode(true);
      setActiveSourceLabel(meta.title);
      setSelectedYear(2026);
    }
    setConnectedSheet(meta);
    setSelectedSheetTab(tab);
    addAuditLog(
      'Verifikasi Triwulan',
      `Mengimpor ${rows.length} subkegiatan dari Google Sheets "${meta.title}" (tab "${tab}").`
    );
  };

  const handleImportCsvFile = (
    csvText: string,
    fileName: string
  ): { success: boolean; message: string } => {
    const matrix = parseCsvMatrix(csvText);
    if (matrix.length < 2) {
      return { success: false, message: 'File CSV kosong atau tidak memiliki baris data.' };
    }

    if (isSpjFungsionalFormat(matrix)) {
      const spjDoc = parseSpjFungsionalMatrix(matrix);
      if (spjDoc.subkegiatanList.length === 0) {
        return {
          success: false,
          message: 'Format SPJ terdeteksi, tetapi tidak ada subkegiatan yang berhasil dibaca.',
        };
      }
      applySpjDocument(spjDoc, fileName);
      setConnectedSheet(null);
      setSelectedSheetTab('');
      addAuditLog(
        'Verifikasi Triwulan',
        `Mengimpor file spreadsheet SPJ "${fileName}" (${spjDoc.kegiatanList.length} Kegiatan, ${spjDoc.subkegiatanList.length} Subkegiatan).`,
        spjDoc.totalRealisasi
      );
      return {
        success: true,
        message: `File SPJ "${fileName}" berhasil dimuat (${spjDoc.kegiatanList.length} Kegiatan, ${spjDoc.subkegiatanList.length} Subkegiatan).`,
      };
    }

    // Generic flat CSV fallback
    const headers = matrix[0].map((h) => String(h || '').toLowerCase().trim());
    const findCol = (keywords: string[], fallbackIdx: number) => {
      const idx = headers.findIndex((h) => keywords.some((k) => h.includes(k)));
      return idx >= 0 ? idx : fallbackIdx;
    };

    const colKode = findCol(['kode', 'rekening'], 0);
    const colProg = findCol(['program'], 1);
    const colKeg = findCol(['kegiatan'], 2);
    const colNama = findCol(['subkegiatan', 'sub kegiatan', 'uraian', 'nama'], 3);
    const colTw = findCol(['triwulan', 'tw', 'periode'], 4);
    const colPagu = findCol(['pagu', 'anggaran'], 5);
    const colReal = findCol(['realisasi', 'spj', 'serapan'], 6);
    const colUnit = findCol(['unit', 'bidang', 'pelaksana'], 7);

    const parsed: SubkegiatanItem[] = [];
    for (let i = 1; i < matrix.length; i++) {
      const r = matrix[i];
      if (!r || r.every((c) => !String(c || '').trim())) continue;
      const nama = String(r[colNama] || r[colKeg] || '').trim();
      if (!nama) continue;
      const pagu = parseIndonesianMoney(r[colPagu]);
      const realisasi = parseIndonesianMoney(r[colReal]);
      const pct = pagu > 0 ? Math.min(100, (realisasi / pagu) * 100) : 0;
      const twRaw = String(r[colTw] || 'IV').toUpperCase();
      const triwulan: 'I' | 'II' | 'III' | 'IV' = twRaw.includes('III') || twRaw === '3'
        ? 'III'
        : twRaw.includes('II') || twRaw === '2'
        ? 'II'
        : twRaw === 'I' || twRaw === '1'
        ? 'I'
        : 'IV';
      parsed.push({
        id: `csv-row-${i}`,
        kode: String(r[colKode] || `5.01.00.0.${String(i).padStart(2, '0')}`).trim(),
        program: normalizeFlatProgram(String(r[colProg] || '')),
        kegiatan: String(r[colKeg] || 'Kegiatan Bapperida').trim(),
        nama,
        triwulan,
        pagu,
        realisasi,
        persentase: pct,
        status: realisasi === 0 ? 'Belum Terealisasi' : pct < 70 ? 'Perlu Perhatian' : 'Baik',
        unitPelaksana: String(r[colUnit] || 'Bapperida Kab. Nagekeo').trim(),
      });
    }

    if (parsed.length === 0) {
      return {
        success: false,
        message: 'Tidak ada baris subkegiatan valid ditemukan pada file CSV tersebut.',
      };
    }

    setActiveSpjDoc(null);
    setSubkegiatanList(parsed);
    setIsSpreadsheetMode(true);
    setActiveSourceLabel(fileName);
    setConnectedSheet(null);
    setSelectedSheetTab('');
    addAuditLog(
      'Verifikasi Triwulan',
      `Mengimpor ${parsed.length} subkegiatan dari file CSV "${fileName}".`
    );
    return {
      success: true,
      message: `Berhasil memuat ${parsed.length} subkegiatan dari "${fileName}".`,
    };
  };

  const handleFilterStatusClick = (status: RealizationStatus | 'Semua') => {
    setDataStatusFilter(status);
    setActiveSection('data-anggaran');
  };

  const unrealizedAlertCount = activeDataset.statusCounts.belumTerealisasi;

  return (
    <div className="min-h-screen flex bg-[#EEF3FA] text-[#0E264D]">
      {/* Left Navigation Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSelectSection={(sec) => {
          if (sec === 'data-anggaran') {
            setDataStatusFilter('Semua');
          }
          setActiveSection(sec);
        }}
        alertCount={unrealizedAlertCount}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          selectedYear={selectedYear}
          onChangeYear={setSelectedYear}
          selectedQuarter={selectedQuarter}
          onChangeQuarter={setSelectedQuarter}
          userRole={userRole}
          onChangeRole={setUserRole}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenSheetsModal={() => setSheetsModalOpen(true)}
          connectedSheetTitle={connectedSheet?.title || null}
          activeSourceLabel={activeSourceLabel}
          perangkatDaerahSubtitle={
            activeSpjDoc
              ? `${activeSpjDoc.metadata.perangkatDaerah} · Pengguna Anggaran: ${activeSpjDoc.metadata.penggunaAnggaran}`
              : undefined
          }
        />

        <main className="flex-1 px-4 sm:px-6">
          {activeSection === 'dashboard' && (
            <DashboardView
              dataset={activeDataset}
              selectedQuarter={selectedQuarter}
              onSelectQuarter={setSelectedQuarter}
              subkegiatanList={subkegiatanList}
              onNavigate={setActiveSection}
              onFilterStatusClick={handleFilterStatusClick}
            />
          )}

          {activeSection === 'data-anggaran' && (
            <DataAnggaranView
              key={dataStatusFilter}
              dataset={activeDataset}
              subkegiatanList={subkegiatanList}
              initialStatusFilter={dataStatusFilter}
              onUpdateRealisasi={handleUpdateRealisasi}
              onOpenSheetsModal={() => setSheetsModalOpen(true)}
              connectedSheetTitle={connectedSheet?.title || null}
              activeSourceLabel={activeSourceLabel}
            />
          )}

          {activeSection === 'monitoring' && (
            <MonitoringRealisasiView dataset={activeDataset} />
          )}

          {activeSection === 'peringatan' && (
            <PeringatanRealisasiView
              subkegiatanList={subkegiatanList}
              onSaveFollowUp={handleSaveFollowUp}
            />
          )}

          {activeSection === 'laporan' && (
            <LaporanView
              dataset={activeDataset}
              subkegiatanList={subkegiatanList}
              spjDocument={activeSpjDoc}
            />
          )}

          {activeSection === 'riwayat' && (
            <RiwayatPembaruanView logs={auditLogs} />
          )}
        </main>
      </div>

      {/* Google Sheets & Spreadsheet Integration Modal */}
      <GoogleSheetsModal
        isOpen={sheetsModalOpen}
        onClose={() => setSheetsModalOpen(false)}
        googleUser={googleUser}
        accessToken={accessToken}
        needsAuth={needsAuth}
        isLoggingIn={isLoggingIn}
        onGoogleLogin={handleGoogleLogin}
        onGoogleLogout={handleGoogleLogout}
        selectedYear={selectedYear}
        subkegiatanList={subkegiatanList}
        kegiatanList={activeDataset.kegiatanList}
        connectedSheet={connectedSheet}
        selectedTab={selectedSheetTab}
        activeSourceLabel={activeSourceLabel}
        activeSpjMetadata={activeSpjDoc?.metadata || null}
        onChangeConnectedSheet={(meta, tab) => {
          setConnectedSheet(meta);
          setSelectedSheetTab(tab);
        }}
        onImportRows={handleImportRowsFromSheet}
        onImportCsvFile={handleImportCsvFile}
        onResetDefaultDatabase={loadDefaultDatabaseSpreadsheet}
        onAddAuditLog={(aksi, keterangan) => addAuditLog(aksi, keterangan)}
      />
    </div>
  );
}
