import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Edit3,
  FileText,
  History,
  Printer,
  Search,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react';
import {
  AuditLogItem,
  FiscalYearDataset,
  ProgramCategory,
  RealizationStatus,
  SubkegiatanItem,
} from '../types/budget';
import {
  formatNumberID,
  formatPercentID,
  formatRupiah,
} from '../data/sipanggarData';

import { ParsedSpjDocument } from '../services/spjParser';

interface DataAnggaranViewProps {
  dataset: FiscalYearDataset;
  subkegiatanList: SubkegiatanItem[];
  initialStatusFilter: RealizationStatus | 'Semua';
  canEdit: boolean;
  onUpdateRealisasi: (subId: string, newRealisasi: number, keterangan: string) => void;
  onOpenSheetsModal: () => void;
  connectedSheetTitle: string | null;
  activeSourceLabel: string;
}

export const DataAnggaranView: React.FC<DataAnggaranViewProps> = ({
  dataset,
  subkegiatanList,
  initialStatusFilter,
  canEdit,
  onUpdateRealisasi,
  onOpenSheetsModal,
  connectedSheetTitle,
  activeSourceLabel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState<ProgramCategory>('Semua Program');
  const [statusFilter, setStatusFilter] = useState<RealizationStatus | 'Semua'>(
    initialStatusFilter
  );
  const [editingItem, setEditingItem] = useState<SubkegiatanItem | null>(null);
  const [editNominal, setEditNominal] = useState('');
  const [editNote, setEditNote] = useState('');

  const filteredItems = useMemo(() => {
    return subkegiatanList.filter((item) => {
      const matchesSearch =
        item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kegiatan.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProgram =
        programFilter === 'Semua Program' || item.program === programFilter;
      const matchesStatus = statusFilter === 'Semua' || item.status === statusFilter;
      return matchesSearch && matchesProgram && matchesStatus;
    });
  }, [subkegiatanList, searchQuery, programFilter, statusFilter]);

  const openEditModal = (item: SubkegiatanItem) => {
    setEditingItem(item);
    setEditNominal(String(item.realisasi));
    setEditNote(`Pembaruan realisasi SP2D ${item.nama}`);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const parsed = Math.max(0, Math.min(editingItem.pagu, Number(editNominal) || 0));
    onUpdateRealisasi(editingItem.id, parsed, editNote || 'Pembaruan realisasi anggaran');
    setEditingItem(null);
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-[17px] font-extrabold text-[#0E264D]">
              Data Anggaran & Subkegiatan Tahun {dataset.year}
            </h3>
            <p className="text-[12.5px] text-slate-600 mt-0.5">
              Rincian pagu DPA, realisasi SP2D, dan sisa anggaran per subkegiatan Bapperida Kab. Nagekeo.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit ? (
              <button
                type="button"
                onClick={onOpenSheetsModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors cursor-pointer whitespace-nowrap bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
              >
                <span>
                  {connectedSheetTitle ? `Sheets: ${connectedSheetTitle}` : `Sumber: ${activeSourceLabel}`}
                </span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border whitespace-nowrap bg-blue-50 border-blue-200 text-[#0E264D]">
                Mode Pantau Pimpinan (Hanya Baca)
              </span>
            )}
            {(['Semua', 'Baik', 'Perlu Perhatian', 'Belum Terealisasi'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-[#0E76F4] text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Program Select */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kode rekening, nama kegiatan, atau subkegiatan..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-[13px] text-[#0E264D] focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="md:col-span-4">
            <select
              aria-label="Filter Program"
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value as ProgramCategory)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-[13px] font-semibold text-[#0E264D] bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="Semua Program">Semua Program</option>
              <option value="Pelayanan Umum">Pelayanan Umum</option>
              <option value="Perekonomian">Perekonomian</option>
              <option value="Pembangunan">Pembangunan</option>
              <option value="Penunjang">Penunjang</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[540px] overflow-y-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#EEF3FA] text-[#0E264D] font-bold">
                <th className="py-2.5 px-3">Kode</th>
                <th className="py-2.5 px-3">Subkegiatan & Kegiatan</th>
                <th className="py-2.5 px-3">Program</th>
                <th className="py-2.5 px-3 text-right">Pagu (Rp)</th>
                <th className="py-2.5 px-3 text-right">Realisasi (Rp)</th>
                <th className="py-2.5 px-3 text-right">% Serapan</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                {canEdit && <th className="py-2.5 px-3 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} className="py-8 text-center text-slate-500">
                    Tidak ada data subkegiatan yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/35 transition-colors">
                    <td className="py-3 px-3 font-mono text-[11.5px] text-slate-600 whitespace-nowrap">
                      {item.kode}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-[#0E264D]">{item.nama}</div>
                      <div className="text-[11.5px] text-slate-500">{item.kegiatan}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                      {item.program}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-slate-700 tabular-nums whitespace-nowrap">
                      {formatNumberID(item.pagu)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#0E264D] tabular-nums whitespace-nowrap">
                      {formatNumberID(item.realisasi)}
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold text-[#0E264D] tabular-nums whitespace-nowrap">
                      {formatPercentID(item.persentase)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {item.status === 'Baik' && (
                        <span className="inline-block px-2.5 py-1 rounded-md bg-[#DCFCE7] text-[#15803D] text-[11px] font-bold">
                          Baik
                        </span>
                      )}
                      {item.status === 'Perlu Perhatian' && (
                        <span className="inline-block px-2.5 py-1 rounded-md bg-[#FEF3C7] text-[#B45309] text-[11px] font-bold">
                          Perlu Perhatian
                        </span>
                      )}
                      {item.status === 'Belum Terealisasi' && (
                        <span className="inline-block px-2.5 py-1 rounded-md bg-[#FEE2E2] text-[#DC2626] text-[11px] font-bold">
                          Belum Terealisasi
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-[#0E76F4] text-[#0E76F4] hover:text-white text-[11.5px] font-bold transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Input SP2D</span>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Input / Update Realisasi */}
      {canEdit && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-[1px]">
          <form
            onSubmit={handleSaveEdit}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-[#EEF3FA]">
              <div>
                <div className="text-[11px] font-mono font-bold text-[#0E76F4]">
                  {editingItem.kode}
                </div>
                <h4 className="text-[15.5px] font-bold text-[#0E264D]">
                  Perbarui Realisasi Anggaran (SP2D)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-[13px]">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                <div className="font-bold text-[#0E264D]">{editingItem.nama}</div>
                <div className="text-[12px] text-slate-600 mt-1 tabular-nums">
                  Pagu Tersedia: <strong className="text-[#0E264D]">{formatRupiah(editingItem.pagu)}</strong>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#0E264D] mb-1">
                  Total Realisasi Kumulatif (Rp)
                </label>
                <input
                  type="number"
                  min={0}
                  max={editingItem.pagu}
                  step={1000}
                  value={editNominal}
                  onChange={(e) => setEditNominal(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono font-bold text-[#0E264D] focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <div className="mt-1 text-[11.5px] text-slate-500 tabular-nums">
                  Estimasi Serapan:{' '}
                  <strong className="text-[#0E76F4]">
                    {formatPercentID(
                      editingItem.pagu > 0
                        ? (Math.min(editingItem.pagu, Number(editNominal) || 0) / editingItem.pagu) * 100
                        : 0
                    )}
                  </strong>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#0E264D] mb-1">
                  Catatan / Nomor Referensi SP2D
                </label>
                <input
                  type="text"
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-[#0E264D] focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-[12.5px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#0E76F4] hover:bg-[#0C64D2] text-white text-[12.5px] font-bold cursor-pointer"
              >
                Simpan Realisasi
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export const MonitoringRealisasiView: React.FC<{ dataset: FiscalYearDataset }> = ({
  dataset,
}) => {
  return (
    <div className="space-y-4 pb-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <TrendingUp className="w-5 h-5 text-[#0E76F4]" />
          <div>
            <h3 className="text-[17px] font-extrabold text-[#0E264D]">
              Monitoring Penyerapan Anggaran per Program & Triwulan ({dataset.year})
            </h3>
            <p className="text-[12.5px] text-slate-600">
              Evaluasi capaian target serapan kas triwulanan terhadap pagu anggaran tahun berjalan.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {dataset.programs.map((prog) => (
            <div
              key={prog.id}
              className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: prog.color }}
                  />
                  <span className="font-bold text-[14px] text-[#0E264D]">{prog.name}</span>
                </div>
                <span className="text-[15px] font-extrabold text-[#0E264D] tabular-nums">
                  {formatPercentID(prog.persentase)}
                </span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${prog.persentase}%`, backgroundColor: prog.color }}
                />
              </div>

              <div className="flex items-center justify-between text-[12px] text-slate-600 tabular-nums">
                <span>Realisasi: <strong className="text-[#0E264D]">{formatRupiah(prog.realisasi)}</strong></span>
                <span>Pagu: {formatRupiah(prog.pagu)}</span>
              </div>
            </div>
          ))}
        </div>

        <h4 className="text-[14.5px] font-bold text-[#0E264D] mb-3">
          Rincian Target vs Realisasi Triwulanan
        </h4>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-[12.5px]">
            <thead>
              <tr className="bg-[#EEF3FA] text-[#0E264D] font-bold">
                <th className="py-2.5 px-4">Periode Triwulan</th>
                <th className="py-2.5 px-4 text-right">Target Pagu (Rp)</th>
                <th className="py-2.5 px-4 text-right">Realisasi (Rp)</th>
                <th className="py-2.5 px-4 text-right">Serapan {dataset.year}</th>
                <th className="py-2.5 px-4 text-right">Serapan {dataset.year - 1}</th>
                <th className="py-2.5 px-4 text-center">Capaian Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dataset.quarterly.map((q) => {
                const isOnTrack = q.persentase >= 75;
                return (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-[#0E264D]">
                      {q.label} <span className="font-normal text-slate-500">{q.months}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold tabular-nums">
                      {formatRupiah(q.anggaranMiliar * 1e9)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#0E264D] tabular-nums">
                      {formatRupiah(q.realisasiMiliar * 1e9)}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-[#0E76F4] tabular-nums">
                      {formatPercentID(q.persentase)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-500 tabular-nums">
                      {formatPercentID(q.prevYearPercent)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          isOnTrack
                            ? 'bg-[#DCFCE7] text-[#15803D]'
                            : 'bg-[#FEF3C7] text-[#B45309]'
                        }`}
                      >
                        {isOnTrack ? 'Sesuai Target' : 'Perlu Percepatan'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

interface PeringatanRealisasiViewProps {
  subkegiatanList: SubkegiatanItem[];
  canEdit: boolean;
  onSaveFollowUp: (subId: string, tindakLanjut: string) => void;
}

export const PeringatanRealisasiView: React.FC<PeringatanRealisasiViewProps> = ({
  subkegiatanList,
  canEdit,
  onSaveFollowUp,
}) => {
  const [tab, setTab] = useState<'belum' | 'perhatian'>('belum');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');

  const belumList = subkegiatanList.filter((s) => s.status === 'Belum Terealisasi');
  const perhatianList = subkegiatanList.filter((s) => s.status === 'Perlu Perhatian');
  const activeList = tab === 'belum' ? belumList : perhatianList;

  return (
    <div className="space-y-4 pb-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-[#DC2626]" />
            <div>
              <h3 className="text-[17px] font-extrabold text-[#0E264D]">
                Peringatan Realisasi & Tindak Lanjut Percepatan
              </h3>
              <p className="text-[12.5px] text-slate-600">
                Pemantauan subkegiatan dengan realisasi 0% atau serapan di bawah 70%.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setTab('belum')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${
                tab === 'belum'
                  ? 'bg-[#DC2626] text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Belum Terealisasi ({belumList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('perhatian')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${
                tab === 'perhatian'
                  ? 'bg-[#D97706] text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Perlu Perhatian ({perhatianList.length})</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {activeList.map((item, idx) => (
            <div
              key={item.id}
              className={`rounded-xl border p-4 ${
                item.status === 'Belum Terealisasi'
                  ? 'bg-[#FEF2F2]/60 border-[#FECACA]'
                  : 'bg-[#FFFBEB]/60 border-[#FDE68A]'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
                    <span className="font-mono font-bold text-slate-600">
                      #{idx + 1} · {item.kode}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="font-semibold text-[#0E264D]">{item.unitPelaksana}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-semibold text-slate-600">Triwulan {item.triwulan}</span>
                  </div>
                  <h4 className="text-[14.5px] font-bold text-[#0E264D]">{item.nama}</h4>
                  <p className="text-[12px] text-slate-600">{item.kegiatan}</p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right tabular-nums">
                    <div className="text-[11px] font-semibold text-slate-500">Pagu Anggaran</div>
                    <div className="text-[14px] font-extrabold text-[#0E264D]">
                      {formatRupiah(item.pagu)}
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="text-[11px] font-semibold text-slate-500">Serapan</div>
                    <div
                      className={`text-[15px] font-extrabold ${
                        item.status === 'Belum Terealisasi' ? 'text-[#DC2626]' : 'text-[#B45309]'
                      }`}
                    >
                      {formatPercentID(item.persentase)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200/70 grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
                <div>
                  <span className="font-bold text-slate-700">Kendala Teridentifikasi: </span>
                  <span className="text-slate-600">
                    {item.catatanKendala || 'Dalam proses verifikasi dokumen pertanggungjawaban.'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-[#0E264D]">Tindak Lanjut: </span>
                    <span className="text-slate-700">
                      {item.tindakLanjut || 'Belum ada catatan tindak lanjut.'}
                    </span>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSubId(item.id);
                        setNoteInput(item.tindakLanjut || '');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-[11.5px] font-bold text-[#0E264D] hover:bg-slate-50 shrink-0 cursor-pointer"
                    >
                      Catat Tindak Lanjut
                    </button>
                  )}
                </div>
              </div>

              {canEdit && editingSubId === item.id && (
                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Masukkan rencana tindak lanjut percepatan realisasi..."
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 bg-white text-[12.5px] focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSaveFollowUp(item.id, noteInput);
                        setEditingSubId(null);
                      }}
                      className="px-3.5 py-2 rounded-lg bg-[#0E76F4] text-white text-[12px] font-bold cursor-pointer"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSubId(null)}
                      className="px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-[12px] font-semibold cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const LaporanView: React.FC<{
  dataset: FiscalYearDataset;
  subkegiatanList: SubkegiatanItem[];
  spjDocument?: ParsedSpjDocument | null;
}> = ({ dataset, subkegiatanList, spjDocument }) => {
  const handleDownloadCSV = () => {
    const headers = [
      'Kode Rekening',
      'Program',
      'Kegiatan',
      'Subkegiatan',
      'Triwulan',
      'Pagu (Rp)',
      'Realisasi (Rp)',
      'Persentase (%)',
      'Status',
    ];
    const rows = subkegiatanList.map((s) => [
      s.kode,
      s.program,
      `"${s.kegiatan.replace(/"/g, '""')}"`,
      `"${s.nama.replace(/"/g, '""')}"`,
      s.triwulan,
      s.pagu,
      s.realisasi,
      s.persentase.toFixed(2),
      s.status,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_Realisasi_SIPANGGAR_${dataset.year}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 pb-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 no-print">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-[#0E76F4]" />
            <div>
              <h3 className="text-[17px] font-extrabold text-[#0E264D]">
                Laporan Realisasi Anggaran Tahun {dataset.year}
              </h3>
              <p className="text-[12.5px] text-slate-600">
                Rekapitulasi resmi capaian keuangan Bapperida Kabupaten Nagekeo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-[12.5px] font-bold transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Unduh CSV</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0E76F4] hover:bg-[#0C64D2] text-white text-[12.5px] font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>

        {/* Printable Formal Report Header */}
        <div className="border border-slate-200 rounded-xl p-5 bg-slate-50/40">
          <div className="text-center border-b-2 border-[#0E264D] pb-4 mb-4">
            <div className="text-[12px] font-bold uppercase tracking-wider text-slate-600">
              Pemerintah Kabupaten Nagekeo
            </div>
            <div className="text-[16px] font-extrabold text-[#0E264D] mt-0.5">
              BADAN PERENCANAAN PEMBANGUNAN, RISET DAN INOVASI DAERAH
            </div>
            <div className="text-[13px] font-semibold text-slate-700 mt-1">
              Laporan Realisasi Anggaran Tahun Berjalan {dataset.year} (s.d. Triwulan IV)
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-slate-500">Total Pagu Anggaran</div>
              <div className="text-[14px] font-extrabold text-[#0E264D] tabular-nums mt-0.5">
                {formatRupiah(dataset.totalAnggaran)}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-slate-500">Total Realisasi</div>
              <div className="text-[14px] font-extrabold text-emerald-700 tabular-nums mt-0.5">
                {formatRupiah(dataset.totalRealisasi)}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-slate-500">Sisa Anggaran</div>
              <div className="text-[14px] font-extrabold text-amber-700 tabular-nums mt-0.5">
                {formatRupiah(dataset.sisaAnggaran)}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="text-[11px] font-semibold text-slate-500">Serapan Kumulatif</div>
              <div className="text-[15px] font-extrabold text-[#0E76F4] tabular-nums mt-0.5">
                {formatPercentID(dataset.persentaseRealisasi)}
              </div>
            </div>
          </div>

          <table className="w-full text-left border-collapse text-[12.5px] bg-white rounded-lg overflow-hidden border border-slate-200">
            <thead>
              <tr className="bg-[#EEF3FA] text-[#0E264D] font-bold">
                <th className="py-2.5 px-3">Kode</th>
                <th className="py-2.5 px-3">Nama Kegiatan</th>
                <th className="py-2.5 px-3 text-right">Pagu (Rp)</th>
                <th className="py-2.5 px-3 text-right">Realisasi (Rp)</th>
                <th className="py-2.5 px-3 text-right">Sisa (Rp)</th>
                <th className="py-2.5 px-3 text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dataset.kegiatanList.map((k) => (
                <tr key={k.id}>
                  <td className="py-2.5 px-3 font-mono text-[11.5px] text-slate-600">{k.kode}</td>
                  <td className="py-2.5 px-3 font-semibold text-[#0E264D]">{k.nama}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatNumberID(k.pagu)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums font-semibold">
                    {formatNumberID(k.realisasi)}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-600">
                    {formatNumberID(Math.max(0, k.pagu - k.realisasi))}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold tabular-nums">
                    {formatPercentID(k.persentase)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {spjDocument && (
            <>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="text-[11px] font-semibold text-slate-500">SPJ LS-Gaji s.d. Saat Ini</div>
                  <div className="text-[13.5px] font-extrabold text-[#0E264D] tabular-nums mt-0.5">
                    {formatRupiah(spjDocument.spjBreakdown.lsGaji)}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="text-[11px] font-semibold text-slate-500">SPJ LS Barang & Jasa</div>
                  <div className="text-[13.5px] font-extrabold text-[#0E264D] tabular-nums mt-0.5">
                    {formatRupiah(spjDocument.spjBreakdown.lsBarangJasa)}
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3">
                  <div className="text-[11px] font-semibold text-slate-500">SPJ UP / GU / TU</div>
                  <div className="text-[13.5px] font-extrabold text-[#0E264D] tabular-nums mt-0.5">
                    {formatRupiah(spjDocument.spjBreakdown.upGuTu)}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 text-[12px] text-[#0E264D] pt-4 border-t border-slate-200">
                <div>
                  <div className="text-slate-500">Pengguna Anggaran</div>
                  <div className="font-extrabold mt-8 underline">
                    {spjDocument.metadata.penggunaAnggaran}
                  </div>
                </div>
                <div className="sm:text-right">
                  <div className="text-slate-500">Bendahara Pengeluaran</div>
                  <div className="font-extrabold mt-8 underline">
                    {spjDocument.metadata.bendaharaPengeluaran}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const RiwayatPembaruanView: React.FC<{ logs: AuditLogItem[] }> = ({ logs }) => {
  return (
    <div className="space-y-4 pb-6">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <History className="w-5 h-5 text-[#0E76F4]" />
          <div>
            <h3 className="text-[17px] font-extrabold text-[#0E264D]">
              Riwayat Pembaruan Data Anggaran & Realisasi
            </h3>
            <p className="text-[12.5px] text-slate-600">
              Catatan aktivitas pencairan SP2D, verifikasi triwulan, dan tindak lanjut pimpinan.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
                  <span className="inline-flex items-center gap-1 font-bold text-[#0E76F4]">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {log.aksi}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="font-semibold text-slate-700">
                    {log.tanggal} ({log.waktu})
                  </span>
                </div>
                <div className="text-[13.5px] font-semibold text-[#0E264D]">{log.keterangan}</div>
                <div className="text-[12px] text-slate-500">
                  Oleh: <strong className="text-slate-700">{log.pengguna}</strong> — {log.jabatan}
                </div>
              </div>

              {typeof log.nominal === 'number' && (
                <div className="text-left sm:text-right shrink-0">
                  <div className="text-[11px] font-semibold text-slate-500">Nilai Transaksi</div>
                  <div className="text-[14px] font-extrabold text-emerald-700 tabular-nums">
                    {formatRupiah(log.nominal)}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
