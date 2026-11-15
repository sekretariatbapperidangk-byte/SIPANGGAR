import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Coins,
  Info,
  PieChart as PieChartIcon,
  Target,
  TrendingUp,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import {
  FiscalYearDataset,
  KegiatanItem,
  NavSection,
  ProgramCategory,
  QuarterId,
  RealizationStatus,
  SubkegiatanItem,
} from '../types/budget';
import {
  formatNumberID,
  formatPercentID,
  formatRupiah,
  QUARTER_OPTIONS,
} from '../data/sipanggarData';
import { ProgramDonutChart, QuarterlyBarChart, TrendLineChart } from './Charts';

interface DashboardViewProps {
  dataset: FiscalYearDataset;
  selectedQuarter: QuarterId;
  onSelectQuarter: (q: QuarterId) => void;
  subkegiatanList: SubkegiatanItem[];
  onNavigate: (section: NavSection) => void;
  onFilterStatusClick: (status: RealizationStatus | 'Semua') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  dataset,
  selectedQuarter,
  onSelectQuarter,
  subkegiatanList,
  onNavigate,
  onFilterStatusClick,
}) => {
  const [selectedProgram, setSelectedProgram] = useState<ProgramCategory>('Semua Program');
  const [showUnrealizedModal, setShowUnrealizedModal] = useState(false);
  const [activeKegiatanModal, setActiveKegiatanModal] = useState<KegiatanItem | null>(null);

  // Adjust KPI metrics dynamically if user inspects earlier quarters (TW1-TW3),
  // while TW4 displays the full current-year totals matching the reference layout.
  const kpiMetrics = useMemo(() => {
    const quarterIdx = QUARTER_OPTIONS.findIndex((q) => q.id === selectedQuarter);
    if (quarterIdx === 3 || quarterIdx === -1) {
      return {
        totalAnggaran: dataset.totalAnggaran,
        totalRealisasi: dataset.totalRealisasi,
        sisaAnggaran: dataset.sisaAnggaran,
        persentaseRealisasi: dataset.persentaseRealisasi,
        deltaYoY: dataset.deltaYoY,
      };
    }

    const activeQuarters = dataset.quarterly.slice(0, quarterIdx + 1);
    const totalAnggaran = activeQuarters.reduce((acc, q) => acc + q.anggaranMiliar * 1e9, 0);
    const totalRealisasi = activeQuarters.reduce((acc, q) => acc + q.realisasiMiliar * 1e9, 0);
    const sisaAnggaran = Math.max(0, totalAnggaran - totalRealisasi);
    const persentaseRealisasi = totalAnggaran > 0 ? (totalRealisasi / totalAnggaran) * 100 : 0;
    const prevAvg =
      activeQuarters.reduce((acc, q) => acc + q.prevYearPercent, 0) / activeQuarters.length;
    const deltaYoY = persentaseRealisasi - prevAvg;

    return {
      totalAnggaran,
      totalRealisasi,
      sisaAnggaran,
      persentaseRealisasi,
      deltaYoY,
    };
  }, [dataset, selectedQuarter]);

  const unrealizedSubkegiatan = useMemo(
    () => subkegiatanList.filter((s) => s.status === 'Belum Terealisasi'),
    [subkegiatanList]
  );

  const filteredKegiatan = useMemo(() => {
    if (selectedProgram === 'Semua Program') return dataset.kegiatanList;
    return dataset.kegiatanList.filter((k) => k.program === selectedProgram);
  }, [dataset.kegiatanList, selectedProgram]);

  const activeQuarterMeta = QUARTER_OPTIONS.find((q) => q.id === selectedQuarter) ?? QUARTER_OPTIONS[3];
  const unrealizedCount =
    dataset.year === 2026 ? unrealizedSubkegiatan.length : dataset.statusCounts.belumTerealisasi;

  return (
    <div className="space-y-4 pb-6">
      {/* Row 1: 4 Summary KPI Cards */}
      <section aria-label="Ringkasan Anggaran Tahun Berjalan" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
        {/* Card 1: Total Anggaran */}
        <div
          className="rounded-2xl px-4 py-4 text-white shadow-sm flex items-center gap-3.5"
          style={{
            background: 'linear-gradient(135deg, #1680F9 0%, #0C58C7 100%)',
          }}
        >
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold text-blue-50/95 leading-snug">
              Total Anggaran
            </div>
            <div className="text-[18px] sm:text-[19px] font-extrabold tracking-tight tabular-nums leading-tight mt-0.5 truncate">
              {formatRupiah(kpiMetrics.totalAnggaran)}
            </div>
          </div>
        </div>

        {/* Card 2: Total Realisasi */}
        <div
          className="rounded-2xl px-4 py-4 text-white shadow-sm flex items-center gap-3.5"
          style={{
            background: 'linear-gradient(135deg, #1EB452 0%, #118238 100%)',
          }}
        >
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <Coins className="w-7 h-7 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold text-emerald-50/95 leading-snug">
              Total Realisasi
            </div>
            <div className="text-[18px] sm:text-[19px] font-extrabold tracking-tight tabular-nums leading-tight mt-0.5 truncate">
              {formatRupiah(kpiMetrics.totalRealisasi)}
            </div>
          </div>
        </div>

        {/* Card 3: Sisa Anggaran */}
        <div
          className="rounded-2xl px-4 py-4 text-white shadow-sm flex items-center gap-3.5"
          style={{
            background: 'linear-gradient(135deg, #FBB017 0%, #EA8A06 100%)',
          }}
        >
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <PieChartIcon className="w-7 h-7 text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold text-amber-50/95 leading-snug">
              Sisa Anggaran
            </div>
            <div className="text-[18px] sm:text-[19px] font-extrabold tracking-tight tabular-nums leading-tight mt-0.5 truncate">
              {formatRupiah(kpiMetrics.sisaAnggaran)}
            </div>
          </div>
        </div>

        {/* Card 4: Persentase Realisasi */}
        <div
          className="rounded-2xl px-4 py-4 text-white shadow-sm flex items-center gap-3.5"
          style={{
            background: 'linear-gradient(135deg, #143C78 0%, #0A2550 100%)',
          }}
        >
          <div className="w-12 h-12 rounded-xl bg-white/12 flex items-center justify-center shrink-0">
            <Target className="w-7 h-7 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-semibold text-blue-100/90 leading-snug">
              Persentase Realisasi
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-[22px] sm:text-[24px] font-extrabold tracking-tight tabular-nums leading-none">
                {formatPercentID(kpiMetrics.persentaseRealisasi)}
              </span>
              <span
                className={`text-[13px] font-bold tabular-nums whitespace-nowrap ${
                  kpiMetrics.deltaYoY >= 0 ? 'text-[#2CE274]' : 'text-rose-300'
                }`}
              >
                {kpiMetrics.deltaYoY >= 0 ? '↑ +' : '↓ '}
                {formatPercentID(Math.abs(kpiMetrics.deltaYoY))}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Row 2: Quarterly Bar Chart (60%) & Program Donut Chart (40%) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Realisasi Anggaran per Triwulan */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#0E76F4] shrink-0" />
              <h3 className="text-[15.5px] font-bold text-[#0E264D] tracking-tight">
                Realisasi Anggaran per Triwulan
              </h3>
            </div>

            <div className="flex items-center gap-4 text-[12px] font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-[3px] bg-[#0E76F4]" />
                Anggaran
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-[3px] bg-[#16A34A]" />
                Realisasi
              </span>
            </div>
          </div>

          <QuarterlyBarChart
            data={dataset.quarterly}
            selectedQuarter={selectedQuarter}
            onSelectQuarter={onSelectQuarter}
          />
        </div>

        {/* Right: Realisasi per Program */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5 text-[#0E76F4] shrink-0" />
              <h3 className="text-[15.5px] font-bold text-[#0E264D] tracking-tight">
                Realisasi per Program
              </h3>
            </div>
            {selectedProgram !== 'Semua Program' && (
              <button
                type="button"
                onClick={() => setSelectedProgram('Semua Program')}
                className="text-[11.5px] font-semibold text-[#0E76F4] hover:underline cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>

          <div className="flex-1 flex items-center">
            <ProgramDonutChart
              programs={dataset.programs}
              totalPercent={kpiMetrics.persentaseRealisasi}
              selectedProgram={selectedProgram}
              onSelectProgram={setSelectedProgram}
            />
          </div>
        </div>
      </section>

      {/* Row 3: Unrealized Alert Table (48%) & Detail Realisasi per Kegiatan (52%) */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left: Subkegiatan Belum Terealisasi */}
        <div className="xl:col-span-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-col">
          <div className="flex items-start gap-2.5 mb-3">
            <AlertTriangle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
            <h3 className="text-[15px] font-bold text-[#0E264D] leading-snug">
              Subkegiatan yang Belum Terealisasi pada Triwulan yang Sudah Lewat
            </h3>
          </div>

          {/* Red Alert Banner */}
          <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-3.5 py-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 mb-3.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="w-6 h-6 text-[#DC2626] shrink-0" />
              <div className="text-[12.5px] leading-snug">
                <div className="font-bold text-[#B91C1C]">
                  Terdapat {unrealizedCount} Subkegiatan
                </div>
                <div className="text-slate-700 font-medium">
                  belum terealisasi pada {activeQuarterMeta.label} ({activeQuarterMeta.months}).
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowUnrealizedModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[12px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
            >
              <span>Lihat Detail</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Compact Unrealized Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200/80">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#EEF3FA] text-[#0E264D] text-[12px] font-bold">
                  <th className="py-2 px-3 w-10 text-center">No</th>
                  <th className="py-2 px-3">Program / Kegiatan / Subkegiatan</th>
                  <th className="py-2 px-3 text-center w-20">Triwulan</th>
                  <th className="py-2 px-3 text-center w-36">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[12.5px]">
                {unrealizedSubkegiatan.slice(0, 3).map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 text-center font-bold text-[#0E264D] tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-[#0E264D] leading-tight">
                        {item.kegiatan}
                      </div>
                      <div className="text-[11.5px] text-slate-600 leading-tight mt-0.5">
                        - {item.nama}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                      {item.triwulan}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-md bg-[#FEE2E2] text-[#DC2626] text-[11px] font-bold whitespace-nowrap">
                        Belum Terealisasi
                      </span>
                    </td>
                  </tr>
                ))}

                {unrealizedSubkegiatan.length > 3 && (
                  <tr
                    onClick={() => setShowUnrealizedModal(true)}
                    className="hover:bg-rose-50/40 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-3 text-center font-bold text-slate-500">...</td>
                    <td className="py-2.5 px-3 font-bold text-[#0E264D]">
                      dan {unrealizedCount - 3} lainnya
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">IV</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-md bg-[#FEE2E2] text-[#DC2626] text-[11px] font-bold whitespace-nowrap">
                        Belum Terealisasi
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Detail Realisasi per Kegiatan */}
        <div className="xl:col-span-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#0E76F4] shrink-0" />
              <h3 className="text-[15.5px] font-bold text-[#0E264D] tracking-tight">
                Detail Realisasi per Kegiatan
              </h3>
            </div>

            {/* Program Dropdown Filter */}
            <div className="relative">
              <select
                aria-label="Filter Program Kegiatan"
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value as ProgramCategory)}
                className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-[12.5px] font-semibold text-[#0E264D] hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
              >
                <option value="Semua Program">Semua Program</option>
                <option value="Pelayanan Umum">Pelayanan Umum</option>
                <option value="Perekonomian">Perekonomian</option>
                <option value="Pembangunan">Pembangunan</option>
                <option value="Penunjang">Penunjang</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="overflow-x-auto max-h-[325px] overflow-y-auto rounded-xl border border-slate-200/80 flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#EEF3FA] text-[#0E264D] text-[12px] font-bold">
                  <th className="py-2.5 px-3">Kegiatan</th>
                  <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Pagu (Rp)</th>
                  <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Realisasi (Rp)</th>
                  <th className="py-2.5 px-2.5 text-right whitespace-nowrap">% Realisasi</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[12.5px]">
                {filteredKegiatan.map((keg) => (
                  <tr
                    key={keg.id}
                    onClick={() => setActiveKegiatanModal(keg)}
                    className="hover:bg-blue-50/45 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3 font-medium text-[#0E264D] leading-snug">
                      {keg.nama}
                    </td>
                    <td className="py-3 px-2.5 text-right font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                      {formatNumberID(keg.pagu)}
                    </td>
                    <td className="py-3 px-2.5 text-right font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                      {formatNumberID(keg.realisasi)}
                    </td>
                    <td className="py-3 px-2.5 text-right font-extrabold text-[#0E264D] tabular-nums whitespace-nowrap">
                      {formatPercentID(keg.persentase)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {keg.status === 'Baik' ? (
                        <span className="inline-block px-3 py-1 rounded-md bg-[#DCFCE7] text-[#15803D] text-[11.5px] font-bold">
                          Baik
                        </span>
                      ) : keg.status === 'Belum Terealisasi' ? (
                        <span className="inline-block px-2.5 py-1 rounded-md bg-[#FEE2E2] text-[#DC2626] text-[11.5px] font-bold">
                          Belum Terealisasi
                        </span>
                      ) : (
                        <span className="inline-block px-2.5 py-1 rounded-md bg-[#FEF3C7] text-[#B45309] text-[11.5px] font-bold">
                          Perlu Perhatian
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Row 4: Ringkasan Status Realisasi (55%) & Tren Realisasi Anggaran (45%) */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left: Ringkasan Status Realisasi */}
        <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3.5">
            <PieChartIcon className="w-5 h-5 text-[#0E76F4] shrink-0" />
            <h3 className="text-[15.5px] font-bold text-[#0E264D] tracking-tight">
              Ringkasan Status Realisasi
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Baik */}
            <button
              type="button"
              onClick={() => onFilterStatusClick('Baik')}
              className="rounded-xl bg-[#ECFDF5] border border-[#BBF7D0] p-3.5 text-left hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-6 h-6 text-[#16A34A] shrink-0" />
                <span className="text-[22px] font-extrabold text-[#166534] tabular-nums leading-none">
                  {dataset.statusCounts.baik}
                </span>
              </div>
              <div className="mt-2.5 text-[11.5px] leading-snug text-slate-700">
                <div className="font-semibold">Subkegiatan</div>
                <div className="font-bold text-[#15803D]">Baik</div>
                <div className="font-medium text-slate-600">(≥ 70%)</div>
              </div>
            </button>

            {/* Perlu Perhatian */}
            <button
              type="button"
              onClick={() => onFilterStatusClick('Perlu Perhatian')}
              className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] p-3.5 text-left hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-6 h-6 text-[#D97706] shrink-0" />
                <span className="text-[22px] font-extrabold text-[#92400E] tabular-nums leading-none">
                  {dataset.statusCounts.perluPerhatian}
                </span>
              </div>
              <div className="mt-2.5 text-[11.5px] leading-snug text-slate-700">
                <div className="font-semibold">Subkegiatan</div>
                <div className="font-bold text-[#B45309]">Perlu Perhatian</div>
                <div className="font-medium text-slate-600">(30% – 69%)</div>
              </div>
            </button>

            {/* Belum Terealisasi */}
            <button
              type="button"
              onClick={() => onFilterStatusClick('Belum Terealisasi')}
              className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-3.5 text-left hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <XCircle className="w-6 h-6 text-[#DC2626] shrink-0" />
                <span className="text-[22px] font-extrabold text-[#991B1B] tabular-nums leading-none">
                  {dataset.statusCounts.belumTerealisasi}
                </span>
              </div>
              <div className="mt-2.5 text-[11.5px] leading-snug text-slate-700">
                <div className="font-semibold">Subkegiatan</div>
                <div className="font-bold text-[#DC2626]">Belum Terealisasi</div>
                <div className="font-medium text-slate-600">(0%)</div>
              </div>
            </button>

            {/* Total Subkegiatan */}
            <button
              type="button"
              onClick={() => onFilterStatusClick('Semua')}
              className="rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] p-3.5 text-left hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Info className="w-6 h-6 text-[#0E76F4] shrink-0" />
                <span className="text-[22px] font-extrabold text-[#0E264D] tabular-nums leading-none">
                  {dataset.statusCounts.total}
                </span>
              </div>
              <div className="mt-2.5 text-[11.5px] leading-snug text-[#0E264D]">
                <div className="font-bold">Total</div>
                <div className="font-semibold text-slate-600">Subkegiatan</div>
              </div>
            </button>
          </div>
        </div>

        {/* Right: Tren Realisasi Anggaran */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5 flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#0E76F4] shrink-0" />
              <h3 className="text-[15.5px] font-bold text-[#0E264D] tracking-tight">
                Tren Realisasi Anggaran
              </h3>
            </div>

            <div className="flex items-center gap-3.5 text-[11.5px] font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-1 rounded-full bg-[#0E76F4]" />
                Realisasi {dataset.year}
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-3.5 border-t-2 border-dashed border-slate-400" />
                Realisasi {dataset.year - 1}
              </span>
            </div>
          </div>

          <TrendLineChart data={dataset.quarterly} currentYear={dataset.year} />
        </div>
      </section>

      {/* Modal: Detail 12 Subkegiatan Belum Terealisasi */}
      {showUnrealizedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[1px]">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-[#FEF2F2]">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
                <div>
                  <h4 className="text-[15.5px] font-bold text-[#0E264D]">
                    Daftar Subkegiatan Belum Terealisasi ({unrealizedSubkegiatan.length})
                  </h4>
                  <p className="text-[12px] text-slate-600">
                    Periode {activeQuarterMeta.label} ({activeQuarterMeta.months}) · Tahun Anggaran {dataset.year}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUnrealizedModal(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-800 cursor-pointer"
                aria-label="Tutup modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-[12.5px]">
                  <thead>
                    <tr className="bg-[#EEF3FA] text-[#0E264D] font-bold">
                      <th className="py-2.5 px-3 text-center w-10">No</th>
                      <th className="py-2.5 px-3">Kode & Subkegiatan</th>
                      <th className="py-2.5 px-3">Unit Pelaksana</th>
                      <th className="py-2.5 px-3 text-right">Pagu (Rp)</th>
                      <th className="py-2.5 px-3">Kendala</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unrealizedSubkegiatan.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-center font-bold tabular-nums">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="text-[11px] font-mono text-slate-500">{item.kode}</div>
                          <div className="font-bold text-[#0E264D]">{item.nama}</div>
                          <div className="text-[11.5px] text-slate-500">{item.kegiatan}</div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{item.unitPelaksana}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#0E264D] tabular-nums whitespace-nowrap">
                          {formatNumberID(item.pagu)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[12px] max-w-xs">
                          {item.catatanKendala || 'Menunggu kelengkapan administrasi pencairan.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <span className="text-[12px] text-slate-600">
                Kelola tindak lanjut & catatan percepatan di menu Peringatan Realisasi.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowUnrealizedModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-[12.5px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUnrealizedModal(false);
                    onNavigate('peringatan');
                  }}
                  className="px-4 py-2 rounded-lg bg-[#0E76F4] hover:bg-[#0C64D2] text-white text-[12.5px] font-bold cursor-pointer"
                >
                  Buka Peringatan Realisasi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detail Kegiatan */}
      {activeKegiatanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[1px]">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-[#EEF3FA]">
              <div>
                <div className="text-[11px] font-mono font-semibold text-[#0E76F4]">
                  {activeKegiatanModal.kode} · Program {activeKegiatanModal.program}
                </div>
                <h4 className="text-[16px] font-bold text-[#0E264D] mt-0.5">
                  {activeKegiatanModal.nama}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveKegiatanModal(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-800 cursor-pointer"
                aria-label="Tutup detail kegiatan"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="text-[11px] font-semibold text-slate-500">Total Pagu</div>
                  <div className="text-[14px] font-extrabold text-[#0E264D] tabular-nums mt-0.5">
                    {formatRupiah(activeKegiatanModal.pagu)}
                  </div>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                  <div className="text-[11px] font-semibold text-emerald-700">Total Realisasi</div>
                  <div className="text-[14px] font-extrabold text-emerald-800 tabular-nums mt-0.5">
                    {formatRupiah(activeKegiatanModal.realisasi)}
                  </div>
                </div>
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                  <div className="text-[11px] font-semibold text-blue-700">Capaian Serapan</div>
                  <div className="text-[16px] font-extrabold text-[#0E76F4] tabular-nums mt-0.5">
                    {formatPercentID(activeKegiatanModal.persentase)}
                  </div>
                </div>
              </div>

              <div className="text-[12.5px] text-slate-700 space-y-1">
                <div>
                  <span className="font-semibold text-slate-500">Penanggung Jawab:</span>{' '}
                  <span className="font-bold text-[#0E264D]">
                    {activeKegiatanModal.bidangPenanggungJawab}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500">Jumlah Subkegiatan:</span>{' '}
                  <span className="font-bold text-[#0E264D] tabular-nums">
                    {activeKegiatanModal.jumlahSubkegiatan} Subkegiatan
                  </span>
                </div>
              </div>

              <div>
                <div className="text-[12px] font-bold text-[#0E264D] mb-2">
                  Progres Penyerapan Anggaran
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, activeKegiatanModal.persentase)}%`,
                      backgroundColor:
                        activeKegiatanModal.persentase >= 75 ? '#16A34A' : '#F59E0B',
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveKegiatanModal(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-[12.5px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveKegiatanModal(null);
                  onNavigate('data-anggaran');
                }}
                className="px-4 py-2 rounded-lg bg-[#0E76F4] hover:bg-[#0C64D2] text-white text-[12.5px] font-bold cursor-pointer"
              >
                Lihat di Data Anggaran
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
