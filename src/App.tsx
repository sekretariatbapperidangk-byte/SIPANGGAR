import { useMemo, useState } from 'react';
import {
  FISCAL_YEAR_DATASETS,
  INITIAL_AUDIT_LOGS,
  INITIAL_SUBKEGIATAN_LIST,
} from './data/sipanggarData';
import {
  AuditLogItem,
  FiscalYearDataset,
  NavSection,
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

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('dashboard');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterId>('TW4');
  const [userRole, setUserRole] = useState<string>('Pimpinan');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const [subkegiatanList, setSubkegiatanList] =
    useState<SubkegiatanItem[]>(INITIAL_SUBKEGIATAN_LIST);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);
  const [dataStatusFilter, setDataStatusFilter] = useState<RealizationStatus | 'Semua'>('Semua');
  const [realisasiDelta, setRealisasiDelta] = useState<number>(0);

  const activeDataset: FiscalYearDataset = useMemo(() => {
    const base = FISCAL_YEAR_DATASETS[selectedYear] ?? FISCAL_YEAR_DATASETS[2026];
    if (selectedYear !== 2026 || realisasiDelta === 0) {
      return base;
    }

    const totalRealisasi = Math.min(base.totalAnggaran, base.totalRealisasi + realisasiDelta);
    const sisaAnggaran = Math.max(0, base.totalAnggaran - totalRealisasi);
    const persentaseRealisasi =
      base.totalAnggaran > 0 ? (totalRealisasi / base.totalAnggaran) * 100 : 0;

    const deltaBelum =
      subkegiatanList.filter((s) => s.status === 'Belum Terealisasi').length -
      INITIAL_SUBKEGIATAN_LIST.filter((s) => s.status === 'Belum Terealisasi').length;
    const deltaPerhatian =
      subkegiatanList.filter((s) => s.status === 'Perlu Perhatian').length -
      INITIAL_SUBKEGIATAN_LIST.filter((s) => s.status === 'Perlu Perhatian').length;
    const deltaBaik =
      subkegiatanList.filter((s) => s.status === 'Baik').length -
      INITIAL_SUBKEGIATAN_LIST.filter((s) => s.status === 'Baik').length;

    return {
      ...base,
      totalRealisasi,
      sisaAnggaran,
      persentaseRealisasi,
      statusCounts: {
        baik: base.statusCounts.baik + deltaBaik,
        perluPerhatian: base.statusCounts.perluPerhatian + deltaPerhatian,
        belumTerealisasi: Math.max(0, base.statusCounts.belumTerealisasi + deltaBelum),
        total: base.statusCounts.total,
      },
    };
  }, [selectedYear, realisasiDelta, subkegiatanList]);

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
          pct === 0 ? 'Belum Terealisasi' : pct < 70 ? 'Perlu Perhatian' : 'Baik';
        return {
          ...item,
          realisasi: newRealisasi,
          persentase: pct,
          status: nextStatus,
        };
      })
    );

    if (diff !== 0) {
      setRealisasiDelta((d) => d + diff);
    }

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
        pengguna: userRole,
        jabatan: userRole,
        aksi: 'Input Realisasi SP2D',
        keterangan,
        nominal: newRealisasi,
      },
      ...prev,
    ]);
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

    setAuditLogs((prev) => [
      {
        id: `log-${Date.now()}`,
        tanggal: '14 Nov 2026',
        waktu: 'Baru saja',
        pengguna: userRole,
        jabatan: userRole,
        aksi: 'Tindak Lanjut Peringatan',
        keterangan: `Tindak lanjut "${subName}": ${tindakLanjut}`,
      },
      ...prev,
    ]);
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
            <LaporanView dataset={activeDataset} subkegiatanList={subkegiatanList} />
          )}

          {activeSection === 'riwayat' && (
            <RiwayatPembaruanView logs={auditLogs} />
          )}
        </main>
      </div>
    </div>
  );
}
