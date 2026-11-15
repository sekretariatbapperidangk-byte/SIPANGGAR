import React, { useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  FiscalYearDataset,
  ProgramCategory,
  SubkegiatanItem,
} from '../types/budget';
import { formatPercentID, formatRupiah } from '../data/sipanggarData';
import { SpreadsheetMetadata } from '../services/googleSheets';

interface SpreadsheetViewProps {
  dataset: FiscalYearDataset;
  subkegiatanList: SubkegiatanItem[];
  onUpdateRow: (subId: string, patch: Partial<SubkegiatanItem>) => void;
  onAddRow: () => void;
  onDeleteRow: (subId: string) => void;
  onResetDefaultDatabase: () => Promise<void>;
  onOpenSheetsModal: () => void;
  connectedSheet: SpreadsheetMetadata | null;
  selectedSheetTab: string;
  autoSyncEnabled: boolean;
  isSyncingNow: boolean;
  lastSyncedAt: string | null;
  onManualTwoWaySync: () => Promise<void>;
}

const PROGRAM_OPTIONS: Exclude<ProgramCategory, 'Semua Program'>[] = [
  'Pelayanan Umum',
  'Perekonomian',
  'Pembangunan',
  'Penunjang',
];

const TRIWULAN_OPTIONS: ('I' | 'II' | 'III' | 'IV')[] = ['I', 'II', 'III', 'IV'];

export const SpreadsheetView: React.FC<SpreadsheetViewProps> = ({
  dataset,
  subkegiatanList,
  onUpdateRow,
  onAddRow,
  onDeleteRow,
  onResetDefaultDatabase,
  onOpenSheetsModal,
  connectedSheet,
  selectedSheetTab,
  autoSyncEnabled,
  isSyncingNow,
  lastSyncedAt,
  onManualTwoWaySync,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState<ProgramCategory>('Semua Program');
  const [isResetting, setIsResetting] = useState(false);

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return subkegiatanList.filter((item) => {
      const matchProg = programFilter === 'Semua Program' || item.program === programFilter;
      if (!q) return matchProg;
      return (
        matchProg &&
        (item.nama.toLowerCase().includes(q) ||
          item.kegiatan.toLowerCase().includes(q) ||
          item.kode.toLowerCase().includes(q) ||
          item.unitPelaksana.toLowerCase().includes(q))
      );
    });
  }, [subkegiatanList, searchQuery, programFilter]);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await onResetDefaultDatabase();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Top Spreadsheet Control & Live Two-Way Sync Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[17px] font-extrabold text-[#0E264D]">
                  Spreadsheet Langsung 2 Arah (TA {dataset.year})
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>Sinkron Otomatis ke Dashboard</span>
                </span>
              </div>
              <p className="text-[12.5px] text-slate-600 mt-0.5">
                Ubah sel Pagu, Realisasi, Program, atau Tindak Lanjut langsung di tabel ini — seluruh grafik, kartu KPI, dan laporan di Dashboard langsung diperbarui tanpa perlu mengunggah file.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onAddRow}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0E76F4] hover:bg-[#0C64D2] text-white text-[12.5px] font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Baris</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={isResetting}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-[#0E264D] text-[12px] font-bold transition-colors cursor-pointer disabled:opacity-60"
              title="Kembalikan data awal dari Database SIPANGGAR"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>Reset Database Awal</span>
            </button>

            <button
              type="button"
              onClick={onOpenSheetsModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-bold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{connectedSheet ? 'Pengaturan Google Sheets' : 'Hubungkan Google Sheets'}</span>
            </button>
          </div>
        </div>

        {/* Connected Google Sheet Live Bar */}
        {connectedSheet && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-[12.5px]">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-[#0E264D]">
                  Google Sheets Terhubung: {connectedSheet.title}
                </span>{' '}
                <span className="text-slate-600">(Tab: {selectedSheetTab})</span>
                <div className="text-[11.5px] text-emerald-800 mt-0.5">
                  {autoSyncEnabled
                    ? `Mode 2 Arah Otomatis Aktif (Tarik & Kirim Otomatis)${
                        lastSyncedAt ? ` · Sinkron terakhir: ${lastSyncedAt}` : ''
                      }`
                    : 'Sinkronisasi manual — aktifkan Sinkron 2 Arah Otomatis di Pengaturan Google Sheets.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onManualTwoWaySync}
                disabled={isSyncingNow}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-800 text-[12px] font-bold cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
                <span>{isSyncingNow ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
              </button>
              <a
                href={connectedSheet.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-[#0E264D] text-[12px] font-bold"
              >
                <span>Buka Sheet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Live Totals Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] px-3.5 py-2.5">
            <div className="text-[11px] font-semibold text-blue-700">Total Pagu Spreadsheet</div>
            <div className="text-[15px] font-extrabold text-[#0E264D] tabular-nums mt-0.5">
              {formatRupiah(dataset.totalAnggaran)}
            </div>
          </div>
          <div className="rounded-xl bg-[#ECFDF5] border border-[#BBF7D0] px-3.5 py-2.5">
            <div className="text-[11px] font-semibold text-emerald-700">Total Realisasi Spreadsheet</div>
            <div className="text-[15px] font-extrabold text-emerald-800 tabular-nums mt-0.5">
              {formatRupiah(dataset.totalRealisasi)}
            </div>
          </div>
          <div className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] px-3.5 py-2.5">
            <div className="text-[11px] font-semibold text-amber-700">Sisa Anggaran</div>
            <div className="text-[15px] font-extrabold text-amber-800 tabular-nums mt-0.5">
              {formatRupiah(dataset.sisaAnggaran)}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5">
            <div className="text-[11px] font-semibold text-slate-600">Capaian Serapan (% Auto)</div>
            <div className="text-[15px] font-extrabold text-[#0E76F4] tabular-nums mt-0.5">
              {formatPercentID(dataset.persentaseRealisasi)} · {subkegiatanList.length} Baris
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter baris spreadsheet berdasarkan kode, program, kegiatan, atau subkegiatan..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-[13px] text-[#0E264D] focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="md:col-span-4">
            <select
              aria-label="Filter Program Spreadsheet"
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value as ProgramCategory)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-[13px] font-semibold text-[#0E264D] bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="Semua Program">Semua Program</option>
              {PROGRAM_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Editable Spreadsheet Grid */}
        <div className="overflow-x-auto max-h-[580px] overflow-y-auto rounded-xl border border-slate-300 bg-white">
          <table className="w-full text-left border-collapse text-[12px] min-w-[1180px]">
            <thead className="sticky top-0 z-20 bg-[#EEF3FA] text-[#0E264D] font-bold shadow-[0_1px_0_0_#CBD5E1]">
              <tr>
                <th className="py-2 px-2.5 border-r border-slate-200 w-10 text-center">#</th>
                <th className="py-2 px-2.5 border-r border-slate-200 w-36">A · Kode Rekening</th>
                <th className="py-2 px-2.5 border-r border-slate-200 w-36">B · Program</th>
                <th className="py-2 px-2.5 border-r border-slate-200 w-52">C · Kegiatan</th>
                <th className="py-2 px-2.5 border-r border-slate-200 w-60">D · Subkegiatan</th>
                <th className="py-2 px-2 border-r border-slate-200 w-20 text-center">E · TW</th>
                <th className="py-2 px-2.5 border-r border-slate-200 w-36 text-right">F · Pagu (Rp)</th>
                <th className="py-2 px-2.5 border-r border-slate-200 w-36 text-right">G · Realisasi (Rp)</th>
                <th className="py-2 px-2.5 border-r border-slate-200 w-24 text-right">H · % (Auto)</th>
                <th className="py-2 px-2.5 border-r border-slate-200 w-32 text-center">I · Status</th>
                <th className="py-2 px-2.5 border-r border-slate-200 w-44">J · Tindak Lanjut</th>
                <th className="py-2 px-2 w-12 text-center">Hapus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-blue-50/35 group">
                  <td className="py-1.5 px-2 border-r border-slate-200 bg-slate-50 text-center font-semibold text-slate-500 tabular-nums">
                    {idx + 1}
                  </td>

                  <td className="p-0 border-r border-slate-200">
                    <input
                      type="text"
                      value={row.kode}
                      onChange={(e) => onUpdateRow(row.id, { kode: e.target.value })}
                      className="w-full px-2.5 py-2 bg-transparent font-mono text-[11.5px] text-slate-700 focus:bg-blue-50/70 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500"
                    />
                  </td>

                  <td className="p-0 border-r border-slate-200">
                    <select
                      aria-label={`Program baris ${idx + 1}`}
                      value={row.program}
                      onChange={(e) =>
                        onUpdateRow(row.id, {
                          program: e.target.value as Exclude<ProgramCategory, 'Semua Program'>,
                        })
                      }
                      className="w-full px-2 py-2 bg-transparent font-semibold text-[#0E264D] focus:bg-blue-50/70 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 cursor-pointer"
                    >
                      {PROGRAM_OPTIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="p-0 border-r border-slate-200">
                    <input
                      type="text"
                      value={row.kegiatan}
                      onChange={(e) => onUpdateRow(row.id, { kegiatan: e.target.value })}
                      className="w-full px-2.5 py-2 bg-transparent text-slate-700 focus:bg-blue-50/70 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500"
                    />
                  </td>

                  <td className="p-0 border-r border-slate-200">
                    <input
                      type="text"
                      value={row.nama}
                      onChange={(e) => onUpdateRow(row.id, { nama: e.target.value })}
                      className="w-full px-2.5 py-2 bg-transparent font-semibold text-[#0E264D] focus:bg-blue-50/70 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500"
                    />
                  </td>

                  <td className="p-0 border-r border-slate-200">
                    <select
                      aria-label={`Triwulan baris ${idx + 1}`}
                      value={row.triwulan}
                      onChange={(e) =>
                        onUpdateRow(row.id, {
                          triwulan: e.target.value as 'I' | 'II' | 'III' | 'IV',
                        })
                      }
                      className="w-full px-2 py-2 bg-transparent text-center font-semibold text-[#0E264D] focus:bg-blue-50/70 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 cursor-pointer"
                    >
                      {TRIWULAN_OPTIONS.map((tw) => (
                        <option key={tw} value={tw}>
                          {tw}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="p-0 border-r border-slate-200">
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={row.pagu}
                      onChange={(e) =>
                        onUpdateRow(row.id, {
                          pagu: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full px-2.5 py-2 bg-transparent text-right font-mono font-semibold text-slate-800 tabular-nums focus:bg-blue-50/70 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500"
                    />
                  </td>

                  <td className="p-0 border-r border-slate-200">
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={row.realisasi}
                      onChange={(e) =>
                        onUpdateRow(row.id, {
                          realisasi: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-full px-2.5 py-2 bg-transparent text-right font-mono font-bold text-[#0E264D] tabular-nums focus:bg-emerald-50/80 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-emerald-500"
                    />
                  </td>

                  <td className="py-2 px-2.5 border-r border-slate-200 text-right font-extrabold text-[#0E264D] tabular-nums bg-slate-50/60">
                    {formatPercentID(row.persentase)}
                  </td>

                  <td className="py-1.5 px-2 border-r border-slate-200 text-center bg-slate-50/60 whitespace-nowrap">
                    {row.status === 'Baik' && (
                      <span className="inline-block px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#15803D] text-[11px] font-bold">
                        Baik
                      </span>
                    )}
                    {row.status === 'Perlu Perhatian' && (
                      <span className="inline-block px-2 py-0.5 rounded-md bg-[#FEF3C7] text-[#B45309] text-[11px] font-bold">
                        Perlu Perhatian
                      </span>
                    )}
                    {row.status === 'Belum Terealisasi' && (
                      <span className="inline-block px-2 py-0.5 rounded-md bg-[#FEE2E2] text-[#DC2626] text-[11px] font-bold">
                        Belum Terealisasi
                      </span>
                    )}
                  </td>

                  <td className="p-0 border-r border-slate-200">
                    <input
                      type="text"
                      value={row.tindakLanjut || ''}
                      placeholder="Catatan tindak lanjut..."
                      onChange={(e) => onUpdateRow(row.id, { tindakLanjut: e.target.value })}
                      className="w-full px-2.5 py-2 bg-transparent text-slate-700 focus:bg-blue-50/70 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500"
                    />
                  </td>

                  <td className="py-1.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteRow(row.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Hapus baris ini"
                      aria-label={`Hapus baris ${row.nama}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
