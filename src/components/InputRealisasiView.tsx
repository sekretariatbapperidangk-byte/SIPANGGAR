import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardEdit,
  ExternalLink,
  FileSpreadsheet,
  Link2,
  RefreshCw,
  Search,
  Send,
} from 'lucide-react';
import {
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
import { SpreadsheetMetadata } from '../services/googleSheets';

export interface RealisasiInputPayload {
  subId: string;
  newRealisasi: number;
  triwulan: 'I' | 'II' | 'III' | 'IV';
  nomorSp2d: string;
  tindakLanjut: string;
}

export interface RealisasiSubmitResult {
  syncedToSheet: boolean;
  sheetTitle?: string;
  tabName?: string;
  errorMessage?: string;
}

interface InputRealisasiViewProps {
  dataset: FiscalYearDataset;
  subkegiatanList: SubkegiatanItem[];
  connectedSheet: SpreadsheetMetadata | null;
  selectedSheetTab: string;
  isGoogleConnected: boolean;
  autoSyncEnabled: boolean;
  isSyncingNow: boolean;
  lastSyncedAt: string | null;
  onSubmitRealisasi: (payload: RealisasiInputPayload) => Promise<RealisasiSubmitResult>;
  onManualTwoWaySync: () => Promise<void>;
  onOpenSheetsModal: () => void;
}

type FilterMode = 'kurang-dan-belum' | 'belum' | 'perhatian' | 'semua';

export const InputRealisasiView: React.FC<InputRealisasiViewProps> = ({
  dataset,
  subkegiatanList,
  connectedSheet,
  selectedSheetTab,
  isGoogleConnected,
  autoSyncEnabled,
  isSyncingNow,
  lastSyncedAt,
  onSubmitRealisasi,
  onManualTwoWaySync,
  onOpenSheetsModal,
}) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('kurang-dan-belum');
  const [programFilter, setProgramFilter] = useState<ProgramCategory>('Semua Program');
  const [searchQuery, setSearchQuery] = useState('');

  // Prioritized list of subkegiatan requiring realization input
  const prioritizedCandidates = useMemo(() => {
    const orderWeight = (s: SubkegiatanItem) => {
      if (s.realisasi === 0) return 0;
      if (s.persentase < 70) return 1;
      if (s.realisasi < s.pagu) return 2;
      return 3;
    };

    return [...subkegiatanList].sort((a, b) => {
      const wa = orderWeight(a);
      const wb = orderWeight(b);
      if (wa !== wb) return wa - wb;
      return a.persentase - b.persentase;
    });
  }, [subkegiatanList]);

  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return prioritizedCandidates.filter((item) => {
      if (filterMode === 'kurang-dan-belum' && item.realisasi >= item.pagu) return false;
      if (filterMode === 'belum' && item.status !== 'Belum Terealisasi') return false;
      if (filterMode === 'perhatian' && item.status !== 'Perlu Perhatian') return false;

      const matchProgram =
        programFilter === 'Semua Program' || item.program === programFilter;
      if (!matchProgram) return false;

      if (!q) return true;
      return (
        item.nama.toLowerCase().includes(q) ||
        item.kegiatan.toLowerCase().includes(q) ||
        item.kode.toLowerCase().includes(q)
      );
    });
  }, [prioritizedCandidates, filterMode, programFilter, searchQuery]);

  const counts = useMemo(() => {
    const belum = subkegiatanList.filter((s) => s.realisasi === 0).length;
    const kurang = subkegiatanList.filter((s) => s.realisasi > 0 && s.realisasi < s.pagu).length;
    const perhatian = subkegiatanList.filter((s) => s.status === 'Perlu Perhatian').length;
    const totalSisaBelumTerserap = subkegiatanList.reduce(
      (acc, s) => acc + Math.max(0, s.pagu - s.realisasi),
      0
    );
    return { belum, kurang, perhatian, totalSisaBelumTerserap };
  }, [subkegiatanList]);

  const [selectedSubId, setSelectedSubId] = useState<string>(
    () =>
      prioritizedCandidates.find((s) => s.realisasi < s.pagu)?.id ||
      prioritizedCandidates[0]?.id ||
      ''
  );

  const selectedItem = useMemo(
    () =>
      subkegiatanList.find((s) => s.id === selectedSubId) ||
      filteredList[0] ||
      prioritizedCandidates[0] ||
      null,
    [subkegiatanList, selectedSubId, filteredList, prioritizedCandidates]
  );

  const [inputMode, setInputMode] = useState<'tambah' | 'set-total'>('tambah');
  const [nominalInput, setNominalInput] = useState<string>('');
  const [triwulanInput, setTriwulanInput] = useState<'I' | 'II' | 'III' | 'IV'>('IV');
  const [sp2dNote, setSp2dNote] = useState<string>('');
  const [tindakLanjutInput, setTindakLanjutInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!selectedItem) return;
    setTriwulanInput(selectedItem.triwulan);
    setTindakLanjutInput(selectedItem.tindakLanjut || '');
    if (inputMode === 'set-total') {
      setNominalInput(String(selectedItem.realisasi));
    } else {
      setNominalInput('');
    }
  }, [selectedItem?.id, inputMode]);

  const handleSelectRow = (item: SubkegiatanItem) => {
    setSelectedSubId(item.id);
    setFeedback(null);
    if (inputMode === 'set-total') {
      setNominalInput(String(item.realisasi));
    } else {
      setNominalInput('');
    }
    setTriwulanInput(item.triwulan);
    setTindakLanjutInput(item.tindakLanjut || '');
  };

  const remainingPagu = selectedItem
    ? Math.max(0, selectedItem.pagu - selectedItem.realisasi)
    : 0;

  const parsedNominal = Math.max(0, Number(nominalInput) || 0);
  const computedNewRealisasi = useMemo(() => {
    if (!selectedItem) return 0;
    const raw =
      inputMode === 'tambah' ? selectedItem.realisasi + parsedNominal : parsedNominal;
    return Math.min(selectedItem.pagu, Math.max(0, raw));
  }, [selectedItem, inputMode, parsedNominal]);

  const computedNewPercent =
    selectedItem && selectedItem.pagu > 0
      ? (computedNewRealisasi / selectedItem.pagu) * 100
      : 0;

  const computedNewStatus: RealizationStatus =
    computedNewRealisasi === 0
      ? 'Belum Terealisasi'
      : computedNewPercent < 70
      ? 'Perlu Perhatian'
      : 'Baik';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setFeedback(null);
    setIsSaving(true);
    try {
      const result = await onSubmitRealisasi({
        subId: selectedItem.id,
        newRealisasi: computedNewRealisasi,
        triwulan: triwulanInput,
        nomorSp2d:
          sp2dNote.trim() ||
          `Input realisasi SP2D ${selectedItem.nama} (${formatRupiah(computedNewRealisasi)})`,
        tindakLanjut: tindakLanjutInput.trim(),
      });

      setSp2dNote('');
      if (inputMode === 'tambah') {
        setNominalInput('');
      }

      if (result.syncedToSheet) {
        setFeedback({
          type: 'success',
          message: `Realisasi "${selectedItem.nama}" berhasil disimpan ke Dashboard dan langsung masuk ke Google Sheets "${result.sheetTitle}" (Tab: ${result.tabName}).`,
        });
      } else if (result.errorMessage) {
        setFeedback({
          type: 'warning',
          message: `Realisasi tersimpan di Dashboard, namun gagal mengirim ke Google Sheets: ${result.errorMessage}`,
        });
      } else {
        setFeedback({
          type: 'warning',
          message:
            'Realisasi tersimpan di sistem & Dashboard. Hubungkan Google Sheets agar perubahan juga tercatat otomatis di spreadsheet Anda.',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Top Header & Google Sheets Connection Strip */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0E76F4] text-white flex items-center justify-center shrink-0">
              <ClipboardEdit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[17px] font-extrabold text-[#0E264D]">
                Input Realisasi Subkegiatan Kurang / Belum Terealisasi (TA {dataset.year})
              </h3>
              <p className="text-[12.5px] text-slate-600 mt-0.5">
                Pilih subkegiatan yang masih 0% atau belum terserap 100%, lalu masukkan nominal realisasi SP2D. Data otomatis tersimpan ke Dashboard dan dikirim ke Google Sheets terhubung.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {connectedSheet && isGoogleConnected && (
              <>
                <button
                  type="button"
                  onClick={onManualTwoWaySync}
                  disabled={isSyncingNow}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-[12px] font-bold cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
                  <span>{isSyncingNow ? 'Menyinkronkan...' : 'Sinkronkan Sheet'}</span>
                </button>
                <a
                  href={connectedSheet.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-[#0E264D] text-[12px] font-bold"
                >
                  <span>Buka Spreadsheet</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </>
            )}
            <button
              type="button"
              onClick={onOpenSheetsModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-bold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>
                {connectedSheet && isGoogleConnected
                  ? 'Pengaturan Google Sheets'
                  : 'Hubungkan Google Sheets'}
              </span>
            </button>
          </div>
        </div>

        {/* Live Spreadsheet Connection Banner */}
        {connectedSheet && isGoogleConnected ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <div className="flex items-center gap-2 text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Terhubung langsung ke Google Sheets:{' '}
                <strong>{connectedSheet.title}</strong> (Tab: <strong>{selectedSheetTab}</strong>)
                {autoSyncEnabled ? ' · Sinkron 2 Arah Aktif' : ' · Kirim Otomatis saat Input'}
                {lastSyncedAt ? ` · Terakhir: ${lastSyncedAt}` : ''}
              </span>
            </div>
            <span className="font-bold text-emerald-700">
              Setiap input langsung masuk ke Spreadsheet
            </span>
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <div className="flex items-center gap-2 text-amber-900">
              <Link2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Google Sheets belum terhubung. Klik{' '}
                <strong>Hubungkan Google Sheets</strong> agar setiap input realisasi otomatis masuk ke file Google Sheets Anda.
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenSheetsModal}
              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11.5px] cursor-pointer"
            >
              Hubungkan Sekarang
            </button>
          </div>
        )}

        {/* Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] px-4 py-3">
            <div className="text-[11.5px] font-semibold text-rose-700">
              Belum Terealisasi (0%)
            </div>
            <div className="text-[18px] font-extrabold text-[#DC2626] tabular-nums mt-0.5">
              {counts.belum} Subkegiatan
            </div>
          </div>
          <div className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] px-4 py-3">
            <div className="text-[11.5px] font-semibold text-amber-700">
              Realisasi Masih Kurang (&lt;100%)
            </div>
            <div className="text-[18px] font-extrabold text-[#B45309] tabular-nums mt-0.5">
              {counts.belum + counts.kurang} Subkegiatan{' '}
              <span className="text-[12px] font-semibold text-amber-700">
                ({counts.perhatian} di bawah 70%)
              </span>
            </div>
          </div>
          <div className="rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] px-4 py-3">
            <div className="text-[11.5px] font-semibold text-blue-700">
              Total Sisa Pagu Belum Terserap
            </div>
            <div className="text-[18px] font-extrabold text-[#0E264D] tabular-nums mt-0.5">
              {formatRupiah(counts.totalSisaBelumTerserap)}
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Input & Selection Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Left: Input Realisasi Form */}
        <div className="xl:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-4">
          <div>
            <h4 className="text-[15.5px] font-extrabold text-[#0E264D]">
              Form Input Realisasi Anggaran
            </h4>
            <p className="text-[12px] text-slate-500 mt-0.5">
              Pilih subkegiatan di bawah atau klik salah satu baris pada daftar di samping.
            </p>
          </div>

          {feedback && (
            <div
              className={`rounded-xl border px-3.5 py-3 text-[12.5px] flex items-start gap-2.5 ${
                feedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : feedback.type === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1.5">
                <div>{feedback.message}</div>
                {feedback.type === 'warning' && !connectedSheet && (
                  <button
                    type="button"
                    onClick={onOpenSheetsModal}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11.5px] font-bold cursor-pointer"
                  >
                    <span>Hubungkan Google Sheets</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {selectedItem ? (
            <form onSubmit={handleSubmit} className="space-y-3.5 text-[13px]">
              {/* Subkegiatan selector */}
              <div>
                <label className="block text-[12px] font-bold text-[#0E264D] mb-1">
                  Subkegiatan Target
                </label>
                <select
                  aria-label="Pilih Subkegiatan Target"
                  value={selectedItem.id}
                  onChange={(e) => {
                    const next = subkegiatanList.find((s) => s.id === e.target.value);
                    if (next) handleSelectRow(next);
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-[12.5px] font-semibold text-[#0E264D] focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {prioritizedCandidates.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.realisasi === 0
                        ? '[0%] '
                        : item.realisasi < item.pagu
                        ? `[${item.persentase.toFixed(0)}%] `
                        : '[100%] '}
                      {item.nama} — Sisa {formatRupiah(Math.max(0, item.pagu - item.realisasi))}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Subkegiatan Details Card */}
              <div className="rounded-xl bg-[#F8FAFC] border border-slate-200 p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2 text-[11.5px]">
                  <span className="font-mono font-bold text-[#0E76F4]">{selectedItem.kode}</span>
                  <span className="font-semibold text-slate-600">{selectedItem.program}</span>
                </div>
                <div className="font-bold text-[#0E264D] leading-snug">{selectedItem.nama}</div>
                <div className="text-[11.5px] text-slate-500">{selectedItem.kegiatan}</div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-[11.5px] tabular-nums">
                  <div>
                    <div className="text-slate-500">Pagu DPA</div>
                    <div className="font-bold text-[#0E264D]">
                      {formatRupiah(selectedItem.pagu)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Realisasi Kini</div>
                    <div className="font-bold text-emerald-700">
                      {formatRupiah(selectedItem.realisasi)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Sisa Kurang</div>
                    <div className="font-extrabold text-rose-600">
                      {formatRupiah(remainingPagu)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Input Mode Switch */}
              <div>
                <label className="block text-[12px] font-bold text-[#0E264D] mb-1">
                  Metode Penginputan
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('tambah');
                      setNominalInput('');
                    }}
                    className={`py-1.5 px-2.5 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${
                      inputMode === 'tambah'
                        ? 'bg-[#0E76F4] text-white'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    + Tambah Pencairan Baru
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMode('set-total');
                      setNominalInput(String(selectedItem.realisasi));
                    }}
                    className={`py-1.5 px-2.5 rounded-lg text-[12px] font-bold transition-colors cursor-pointer ${
                      inputMode === 'set-total'
                        ? 'bg-[#0E76F4] text-white'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    Ubah Total Realisasi
                  </button>
                </div>
              </div>

              {/* Nominal Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[12px] font-bold text-[#0E264D]">
                    {inputMode === 'tambah'
                      ? 'Nominal Realisasi Tambahan (Rp)'
                      : 'Total Realisasi Kumulatif Baru (Rp)'}
                  </label>
                  {remainingPagu > 0 && inputMode === 'tambah' && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setNominalInput(String(Math.round(remainingPagu * 0.5)))}
                        className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-[#0E76F4] text-[11px] font-bold cursor-pointer"
                      >
                        50% Sisa
                      </button>
                      <button
                        type="button"
                        onClick={() => setNominalInput(String(remainingPagu))}
                        className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold cursor-pointer"
                      >
                        Penuhi 100%
                      </button>
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  min={0}
                  max={inputMode === 'tambah' ? remainingPagu : selectedItem.pagu}
                  step={1000}
                  value={nominalInput}
                  onChange={(e) => setNominalInput(e.target.value)}
                  placeholder={
                    inputMode === 'tambah'
                      ? `Maksimal tambahan ${formatNumberID(remainingPagu)}`
                      : `Maksimal ${formatNumberID(selectedItem.pagu)}`
                  }
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-[14px] text-[#0E264D] focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* Triwulan & Nomor SP2D */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-4">
                  <label className="block text-[12px] font-bold text-[#0E264D] mb-1">
                    Triwulan
                  </label>
                  <select
                    aria-label="Triwulan Pencairan"
                    value={triwulanInput}
                    onChange={(e) =>
                      setTriwulanInput(e.target.value as 'I' | 'II' | 'III' | 'IV')
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-[12.5px] font-semibold text-[#0E264D]"
                  >
                    <option value="I">Triwulan I</option>
                    <option value="II">Triwulan II</option>
                    <option value="III">Triwulan III</option>
                    <option value="IV">Triwulan IV</option>
                  </select>
                </div>
                <div className="sm:col-span-8">
                  <label className="block text-[12px] font-bold text-[#0E264D] mb-1">
                    Nomor SP2D / Keterangan Pencairan
                  </label>
                  <input
                    type="text"
                    value={sp2dNote}
                    onChange={(e) => setSp2dNote(e.target.value)}
                    placeholder="Contoh: SP2D No. 0421/LS/2026"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-[12.5px] text-[#0E264D] focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>

              {/* Tindak Lanjut */}
              <div>
                <label className="block text-[12px] font-bold text-[#0E264D] mb-1">
                  Catatan / Tindak Lanjut (Tersimpan ke Kolom Spreadsheet)
                </label>
                <input
                  type="text"
                  value={tindakLanjutInput}
                  onChange={(e) => setTindakLanjutInput(e.target.value)}
                  placeholder="Contoh: Dokumen SPJ LS tahap II sudah diterbitkan"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-[12.5px] text-[#0E264D] focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              {/* Live Result Preview */}
              <div className="rounded-xl bg-[#EFF6FF] border border-[#BFDBFE] p-3 text-[12px] space-y-1.5">
                <div className="font-bold text-[#0E264D]">
                  Pratinjau Hasil Setelah Disimpan
                </div>
                <div className="flex items-center justify-between tabular-nums">
                  <span className="text-slate-600">Total Realisasi Baru:</span>
                  <strong className="text-[#0E264D]">{formatRupiah(computedNewRealisasi)}</strong>
                </div>
                <div className="flex items-center justify-between tabular-nums">
                  <span className="text-slate-600">Capaian Serapan & Status:</span>
                  <span className="font-extrabold text-[#0E76F4]">
                    {formatPercentID(computedNewPercent)} ({computedNewStatus})
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0E76F4] hover:bg-[#0C64D2] disabled:opacity-60 text-white text-[13px] font-bold transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSaving
                    ? 'Menyimpan & Menyinkronkan...'
                    : connectedSheet && isGoogleConnected
                    ? 'Simpan Realisasi & Kirim ke Google Sheets'
                    : 'Simpan Realisasi Anggaran'}
                </span>
              </button>
            </form>
          ) : (
            <div className="py-8 text-center text-slate-500 text-[13px]">
              Tidak ada data subkegiatan yang tersedia.
            </div>
          )}
        </div>

        {/* Right: Table of Subkegiatan Belum / Kurang Terealisasi */}
        <div className="xl:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <h4 className="text-[15.5px] font-extrabold text-[#0E264D]">
                Daftar Subkegiatan Belum / Kurang Terealisasi
              </h4>
              <p className="text-[12px] text-slate-500">
                Klik baris subkegiatan untuk langsung mengisi realisasi di formulir.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'kurang-dan-belum', label: 'Kurang & 0%' },
                  { id: 'belum', label: '0% (Belum)' },
                  { id: 'perhatian', label: '< 70%' },
                  { id: 'semua', label: 'Semua' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilterMode(t.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold transition-colors cursor-pointer ${
                    filterMode === t.id
                      ? 'bg-[#0E76F4] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-7 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari subkegiatan atau kode..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-[12.5px] text-[#0E264D] focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="sm:col-span-5">
              <select
                aria-label="Filter Program Daftar Realisasi"
                value={programFilter}
                onChange={(e) => setProgramFilter(e.target.value as ProgramCategory)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[12.5px] font-semibold text-[#0E264D] bg-white"
              >
                <option value="Semua Program">Semua Program</option>
                <option value="Pelayanan Umum">Pelayanan Umum</option>
                <option value="Perekonomian">Perekonomian</option>
                <option value="Pembangunan">Pembangunan</option>
                <option value="Penunjang">Penunjang</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[540px] overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead className="sticky top-0 z-10 bg-[#EEF3FA] text-[#0E264D] font-bold">
                <tr>
                  <th className="py-2.5 px-3">Subkegiatan</th>
                  <th className="py-2.5 px-3 text-right">Pagu (Rp)</th>
                  <th className="py-2.5 px-3 text-right">Realisasi (Rp)</th>
                  <th className="py-2.5 px-3 text-right">Kurang (Rp)</th>
                  <th className="py-2.5 px-3 text-center">Serapan</th>
                  <th className="py-2.5 px-3 text-center">Pilih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      Semua subkegiatan pada filter ini sudah terealisasi 100%.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item) => {
                    const sisa = Math.max(0, item.pagu - item.realisasi);
                    const isSelected = selectedItem?.id === item.id;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleSelectRow(item)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/90' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          <div className="font-mono text-[10.5px] text-slate-500">
                            {item.kode} · TW {item.triwulan}
                          </div>
                          <div className="font-bold text-[#0E264D]">{item.nama}</div>
                          <div className="text-[11px] text-slate-500">{item.program}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-slate-700 font-semibold whitespace-nowrap">
                          {formatNumberID(item.pagu)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-[#0E264D] font-bold whitespace-nowrap">
                          {formatNumberID(item.realisasi)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums text-rose-600 font-bold whitespace-nowrap">
                          {formatNumberID(sisa)}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums ${
                              item.status === 'Belum Terealisasi'
                                ? 'bg-[#FEE2E2] text-[#DC2626]'
                                : item.status === 'Perlu Perhatian'
                                ? 'bg-[#FEF3C7] text-[#B45309]'
                                : 'bg-[#DCFCE7] text-[#15803D]'
                            }`}
                          >
                            {formatPercentID(item.persentase)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectRow(item);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                              isSelected
                                ? 'bg-[#0E76F4] text-white'
                                : 'bg-blue-50 text-[#0E76F4] hover:bg-blue-100'
                            }`}
                          >
                            {isSelected ? 'Dipilih' : 'Input'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
