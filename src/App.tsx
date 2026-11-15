import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  InputRealisasiView,
  RealisasiInputPayload,
  RealisasiSubmitResult,
} from './components/InputRealisasiView';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { googleSignIn, initAuth, logout } from './services/googleAuth';
import {
  readSubkegiatanFromSheet,
  SpreadsheetMetadata,
  syncSubkegiatanToSheet,
} from './services/googleSheets';
import {
  isSpjFungsionalFormat,
  parseCsvMatrix,
  ParsedSpjDocument,
  parseSpjFungsionalMatrix,
} from './services/spjParser';

const DEFAULT_DATABASE_CSV_URL = '/assets/aistudio/Database_SIPANGGAR_9d822400';
const LIVE_ROWS_STORAGE_KEY = 'sipanggar_live_rows_v1';
const GSHEET_LINK_STORAGE_KEY = 'sipanggar_gsheet_link_v1';

const PROGRAM_COLORS: Record<Exclude<ProgramCategory, 'Semua Program'>, string> = {
  'Pelayanan Umum': '#0E76F4',
  Perekonomian: '#16A34A',
  Pembangunan: '#F59E0B',
  Penunjang: '#7C3AED',
};

const serializeRowsSignature = (rows: SubkegiatanItem[]): string =>
  rows
    .map(
      (r) =>
        `${r.kode}|${r.program}|${r.kegiatan}|${r.nama}|${r.triwulan}|${r.pagu}|${r.realisasi}|${r.tindakLanjut || ''}`
    )
    .join('\n');

const formatNowTime = () =>
  new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

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

  // Google Sheets OAuth & 2-Way Sync State (metadata only in localStorage, tokens strictly in memory)
  const [sheetsModalOpen, setSheetsModalOpen] = useState<boolean>(false);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [connectedSheet, setConnectedSheet] = useState<SpreadsheetMetadata | null>(() => {
    try {
      const saved = localStorage.getItem(GSHEET_LINK_STORAGE_KEY);
      if (saved) return JSON.parse(saved).meta || null;
    } catch {
      // ignore storage errors
    }
    return null;
  });
  const [selectedSheetTab, setSelectedSheetTab] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(GSHEET_LINK_STORAGE_KEY);
      if (saved) return JSON.parse(saved).tab || '';
    } catch {
      // ignore
    }
    return '';
  });
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(GSHEET_LINK_STORAGE_KEY);
      if (saved) return Boolean(JSON.parse(saved).autoSyncEnabled);
    } catch {
      // ignore
    }
    return false;
  });
  const [isSyncingNow, setIsSyncingNow] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isSpreadsheetMode, setIsSpreadsheetMode] = useState<boolean>(false);

  const isDirtyForRemoteRef = useRef<boolean>(false);
  const lastRemoteSignatureRef = useRef<string>('');

  const persistLiveRows = useCallback((rows: SubkegiatanItem[]) => {
    try {
      localStorage.setItem(LIVE_ROWS_STORAGE_KEY, JSON.stringify(rows));
    } catch {
      // ignore quota errors
    }
  }, []);

  useEffect(() => {
    try {
      if (connectedSheet) {
        localStorage.setItem(
          GSHEET_LINK_STORAGE_KEY,
          JSON.stringify({
            meta: connectedSheet,
            tab: selectedSheetTab,
            autoSyncEnabled,
          })
        );
      } else {
        localStorage.removeItem(GSHEET_LINK_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [connectedSheet, selectedSheetTab, autoSyncEnabled]);

  const applySpjDocument = useCallback(
    (spjDoc: ParsedSpjDocument, sourceLabel: string, persistRows = true) => {
      setActiveSpjDoc(spjDoc);
      setSubkegiatanList(spjDoc.subkegiatanList);
      setIsSpreadsheetMode(true);
      setActiveSourceLabel(sourceLabel);
      setSelectedYear(spjDoc.metadata.tahunAnggaran || 2026);
      setRealisasiDelta(0);
      if (persistRows) {
        persistLiveRows(spjDoc.subkegiatanList);
      }
    },
    [persistLiveRows]
  );

  const loadDefaultDatabaseSpreadsheet = useCallback(
    async (clearSavedEdits = true) => {
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
      if (clearSavedEdits) {
        try {
          localStorage.removeItem(LIVE_ROWS_STORAGE_KEY);
        } catch {
          // ignore
        }
        applySpjDocument(spjDoc, 'Database SIPANGGAR', true);
      } else {
        setActiveSpjDoc(spjDoc);
      }
      isDirtyForRemoteRef.current = Boolean(autoSyncEnabled);
      setAuditLogs((prev) => [
        {
          id: `log-init-spj-${Date.now()}`,
          tanggal: '13 Des 2026',
          waktu: '08:00 WITA',
          pengguna: spjDoc.metadata.bendaharaPengeluaran,
          jabatan: 'Bendahara Pengeluaran',
          aksi: 'Verifikasi Triwulan',
          keterangan: `Terhubung 2 arah ke spreadsheet Database SIPANGGAR (${spjDoc.kegiatanList.length} Kegiatan, ${spjDoc.subkegiatanList.length} Subkegiatan · ${spjDoc.metadata.perangkatDaerah}).`,
          nominal: spjDoc.totalRealisasi,
        },
        ...prev.filter((l) => !l.id.startsWith('log-init-spj-')),
      ]);
    },
    [applySpjDocument, autoSyncEnabled]
  );

  useEffect(() => {
    let hasSavedRows = false;
    try {
      const saved = localStorage.getItem(LIVE_ROWS_STORAGE_KEY);
      if (saved) {
        const parsed: SubkegiatanItem[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          hasSavedRows = true;
          setSubkegiatanList(parsed);
          setIsSpreadsheetMode(true);
          setActiveSourceLabel('Database SIPANGGAR');
        }
      }
    } catch {
      // ignore parse errors
    }

    loadDefaultDatabaseSpreadsheet(!hasSavedRows).catch(() => {
      // Fall back quietly to baseline dataset if static asset fails
    });
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSaveFollowUp = (subId: string, tindakLanjut: string) => {
    let subName = '';
    setSubkegiatanList((prev) => {
      const next = prev.map((item) => {
        if (item.id !== subId) return item;
        subName = item.nama;
        return { ...item, tindakLanjut };
      });
      persistLiveRows(next);
      return next;
    });
    isDirtyForRemoteRef.current = true;
    addAuditLog('Tindak Lanjut Peringatan', `Tindak lanjut "${subName}": ${tindakLanjut}`);
  };

  const handleUpdateRealisasi = (
    subId: string,
    newRealisasi: number,
    keterangan: string
  ) => {
    let diff = 0;
    setSubkegiatanList((prev) => {
      const next = prev.map((item) => {
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
      });
      persistLiveRows(next);
      return next;
    });

    if (diff !== 0 && !isSpreadsheetMode) {
      setRealisasiDelta((d) => d + diff);
    }

    isDirtyForRemoteRef.current = true;
    addAuditLog('Input Realisasi SP2D', keterangan, newRealisasi);
  };

  const handleSubmitInputRealisasi = async (
    payload: RealisasiInputPayload
  ): Promise<RealisasiSubmitResult> => {
    const targetItem = subkegiatanList.find((s) => s.id === payload.subId);
    if (!targetItem) {
      return { syncedToSheet: false, errorMessage: 'Subkegiatan tidak ditemukan.' };
    }

    let diff = 0;
    const updatedList = subkegiatanList.map((item) => {
      if (item.id !== payload.subId) return item;
      const boundedRealisasi = Math.min(item.pagu, Math.max(0, payload.newRealisasi));
      diff = boundedRealisasi - item.realisasi;
      const pct = item.pagu > 0 ? (boundedRealisasi / item.pagu) * 100 : 0;
      const nextStatus: RealizationStatus =
        boundedRealisasi === 0
          ? 'Belum Terealisasi'
          : pct < 70
          ? 'Perlu Perhatian'
          : 'Baik';
      return {
        ...item,
        triwulan: payload.triwulan,
        realisasi: boundedRealisasi,
        persentase: pct,
        status: nextStatus,
        tindakLanjut: payload.tindakLanjut || item.tindakLanjut,
      };
    });

    setSubkegiatanList(updatedList);
    persistLiveRows(updatedList);
    setIsSpreadsheetMode(true);
    if (diff !== 0 && !isSpreadsheetMode) {
      setRealisasiDelta((d) => d + diff);
    }
    isDirtyForRemoteRef.current = true;
    addAuditLog('Input Realisasi SP2D', payload.nomorSp2d, payload.newRealisasi);

    // Immediately write the updated dataset to the connected Google Sheets tab
    if (accessToken && connectedSheet && selectedSheetTab) {
      try {
        setIsSyncingNow(true);
        await syncSubkegiatanToSheet(
          connectedSheet.spreadsheetId,
          selectedSheetTab,
          updatedList,
          accessToken
        );
        isDirtyForRemoteRef.current = false;
        lastRemoteSignatureRef.current = serializeRowsSignature(updatedList);
        setLastSyncedAt(formatNowTime());
        return {
          syncedToSheet: true,
          sheetTitle: connectedSheet.title,
          tabName: selectedSheetTab,
        };
      } catch (err: any) {
        return {
          syncedToSheet: false,
          errorMessage: err?.message || 'Gagal menulis ke Google Sheets.',
        };
      } finally {
        setIsSyncingNow(false);
      }
    }

    return { syncedToSheet: false };
  };

  const handleImportRowsFromSheet = (
    rows: SubkegiatanItem[],
    meta: SpreadsheetMetadata,
    tab: string,
    spjDoc?: ParsedSpjDocument
  ) => {
    if (spjDoc) {
      applySpjDocument(spjDoc, meta.title, true);
      lastRemoteSignatureRef.current = serializeRowsSignature(spjDoc.subkegiatanList);
    } else {
      setActiveSpjDoc(null);
      setSubkegiatanList(rows);
      persistLiveRows(rows);
      lastRemoteSignatureRef.current = serializeRowsSignature(rows);
      setIsSpreadsheetMode(true);
      setActiveSourceLabel(meta.title);
      setSelectedYear(2026);
    }
    isDirtyForRemoteRef.current = false;
    setConnectedSheet(meta);
    setSelectedSheetTab(tab);
    setLastSyncedAt(formatNowTime());
    addAuditLog(
      'Verifikasi Triwulan',
      `Menghubungkan & menyinkronkan ${rows.length} subkegiatan dari Google Sheets "${meta.title}" (tab "${tab}").`
    );
  };

  // Auto-Push: Dashboard/Spreadsheet edits -> Google Sheets (debounced 900ms when 2-way autoSync is ON)
  useEffect(() => {
    if (!autoSyncEnabled || !accessToken || !connectedSheet || !selectedSheetTab) return;
    if (!isDirtyForRemoteRef.current) return;

    const timer = window.setTimeout(async () => {
      try {
        setIsSyncingNow(true);
        await syncSubkegiatanToSheet(
          connectedSheet.spreadsheetId,
          selectedSheetTab,
          subkegiatanList,
          accessToken
        );
        isDirtyForRemoteRef.current = false;
        lastRemoteSignatureRef.current = serializeRowsSignature(subkegiatanList);
        setLastSyncedAt(formatNowTime());
      } catch {
        // Keep dirty flag so user can retry or re-authenticate
      } finally {
        setIsSyncingNow(false);
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [subkegiatanList, autoSyncEnabled, accessToken, connectedSheet, selectedSheetTab]);

  // Auto-Pull: Google Sheets edits -> Dashboard/Spreadsheet (every 15 seconds when 2-way autoSync is ON)
  useEffect(() => {
    if (!autoSyncEnabled || !accessToken || !connectedSheet || !selectedSheetTab) return;

    const interval = window.setInterval(async () => {
      if (isDirtyForRemoteRef.current || isSyncingNow) return;
      try {
        const { rows, spjDocument } = await readSubkegiatanFromSheet(
          connectedSheet.spreadsheetId,
          selectedSheetTab,
          accessToken
        );
        if (rows.length === 0) return;
        const remoteSig = serializeRowsSignature(rows);
        if (remoteSig !== lastRemoteSignatureRef.current) {
          lastRemoteSignatureRef.current = remoteSig;
          if (spjDocument) {
            setActiveSpjDoc(spjDocument);
          }
          setSubkegiatanList(rows);
          persistLiveRows(rows);
          setIsSpreadsheetMode(true);
          setLastSyncedAt(formatNowTime());
        }
      } catch {
        // Ignore transient background poll errors
      }
    }, 15000);

    return () => window.clearInterval(interval);
  }, [
    autoSyncEnabled,
    accessToken,
    connectedSheet,
    selectedSheetTab,
    isSyncingNow,
    persistLiveRows,
  ]);

  const handleManualTwoWaySync = useCallback(async () => {
    if (!accessToken || !connectedSheet || !selectedSheetTab) return;
    setIsSyncingNow(true);
    try {
      if (isDirtyForRemoteRef.current) {
        await syncSubkegiatanToSheet(
          connectedSheet.spreadsheetId,
          selectedSheetTab,
          subkegiatanList,
          accessToken
        );
        isDirtyForRemoteRef.current = false;
        lastRemoteSignatureRef.current = serializeRowsSignature(subkegiatanList);
      } else {
        const { rows, spjDocument } = await readSubkegiatanFromSheet(
          connectedSheet.spreadsheetId,
          selectedSheetTab,
          accessToken
        );
        if (rows.length > 0) {
          lastRemoteSignatureRef.current = serializeRowsSignature(rows);
          if (spjDocument) {
            setActiveSpjDoc(spjDocument);
          }
          setSubkegiatanList(rows);
          persistLiveRows(rows);
          setIsSpreadsheetMode(true);
        } else {
          await syncSubkegiatanToSheet(
            connectedSheet.spreadsheetId,
            selectedSheetTab,
            subkegiatanList,
            accessToken
          );
          lastRemoteSignatureRef.current = serializeRowsSignature(subkegiatanList);
        }
      }
      setLastSyncedAt(formatNowTime());
    } finally {
      setIsSyncingNow(false);
    }
  }, [accessToken, connectedSheet, selectedSheetTab, subkegiatanList, persistLiveRows]);

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
          autoSyncEnabled={autoSyncEnabled}
          isSyncingNow={isSyncingNow}
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

          {activeSection === 'input-realisasi' && (
            <InputRealisasiView
              dataset={activeDataset}
              subkegiatanList={subkegiatanList}
              connectedSheet={connectedSheet}
              selectedSheetTab={selectedSheetTab}
              isGoogleConnected={Boolean(accessToken && !needsAuth)}
              autoSyncEnabled={autoSyncEnabled}
              isSyncingNow={isSyncingNow}
              lastSyncedAt={lastSyncedAt}
              onSubmitRealisasi={handleSubmitInputRealisasi}
              onManualTwoWaySync={handleManualTwoWaySync}
              onOpenSheetsModal={() => setSheetsModalOpen(true)}
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

      {/* Google Sheets & 2-Way Spreadsheet Integration Modal */}
      <GoogleSheetsModal
        isOpen={sheetsModalOpen}
        onClose={() => setSheetsModalOpen(false)}
        googleUser={googleUser}
        accessToken={accessToken}
        needsAuth={needsAuth}
        isLoggingIn={isLoggingIn}
        onGoogleLogin={handleGoogleLogin}
        onGoogleLogout={() => {
          setAutoSyncEnabled(false);
          return handleGoogleLogout();
        }}
        selectedYear={selectedYear}
        subkegiatanList={subkegiatanList}
        kegiatanList={activeDataset.kegiatanList}
        connectedSheet={connectedSheet}
        selectedTab={selectedSheetTab}
        activeSourceLabel={activeSourceLabel}
        activeSpjMetadata={activeSpjDoc?.metadata || null}
        autoSyncEnabled={autoSyncEnabled}
        isSyncingNow={isSyncingNow}
        lastSyncedAt={lastSyncedAt}
        onToggleAutoSync={(enabled) => {
          setAutoSyncEnabled(enabled);
          if (enabled) {
            lastRemoteSignatureRef.current = serializeRowsSignature(subkegiatanList);
            setLastSyncedAt(formatNowTime());
          }
        }}
        onManualTwoWaySync={handleManualTwoWaySync}
        onOpenInputRealisasi={() => setActiveSection('input-realisasi')}
        onChangeConnectedSheet={(meta, tab) => {
          setConnectedSheet(meta);
          setSelectedSheetTab(tab);
        }}
        onImportRows={handleImportRowsFromSheet}
        onResetDefaultDatabase={() => loadDefaultDatabaseSpreadsheet(true)}
        onAddAuditLog={(aksi, keterangan) => addAuditLog(aksi, keterangan)}
      />
    </div>
  );
}
