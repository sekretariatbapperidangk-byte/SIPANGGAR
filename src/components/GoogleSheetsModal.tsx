import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  Database,
  ExternalLink,
  FileSpreadsheet,
  Link2,
  LogOut,
  PlusCircle,
  RefreshCw,
  UploadCloud,
  X,
} from 'lucide-react';
import {
  createSipanggarSpreadsheet,
  fetchSpreadsheetMetadata,
  readSubkegiatanFromSheet,
  SpreadsheetMetadata,
  syncSubkegiatanToSheet,
} from '../services/googleSheets';
import { ParsedSpjDocument } from '../services/spjParser';
import { formatPercentID, formatRupiah } from '../data/sipanggarData';
import { KegiatanItem, SubkegiatanItem } from '../types/budget';

export const GoogleSignInButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}> = ({ onClick, disabled, label = 'Sign in with Google' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="gsi-material-button"
  >
    <div className="gsi-material-button-state" />
    <div className="gsi-material-button-content-wrapper">
      <div className="gsi-material-button-icon">
        <svg
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 48 48"
          style={{ display: 'block' }}
        >
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
          <path fill="none" d="M0 0h48v48H0z" />
        </svg>
      </div>
      <span className="gsi-material-button-contents">{label}</span>
    </div>
  </button>
);

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleUser: User | null;
  accessToken: string | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
  onGoogleLogin: () => Promise<void>;
  onGoogleLogout: () => Promise<void>;
  selectedYear: number;
  subkegiatanList: SubkegiatanItem[];
  kegiatanList: KegiatanItem[];
  connectedSheet: SpreadsheetMetadata | null;
  selectedTab: string;
  activeSourceLabel: string;
  activeSpjMetadata?: ParsedSpjDocument['metadata'] | null;
  autoSyncEnabled: boolean;
  isSyncingNow: boolean;
  lastSyncedAt: string | null;
  onToggleAutoSync: (enabled: boolean) => void;
  onManualTwoWaySync: () => Promise<void>;
  onOpenInputRealisasi: () => void;
  onChangeConnectedSheet: (meta: SpreadsheetMetadata | null, tab: string) => void;
  onImportRows: (
    rows: SubkegiatanItem[],
    meta: SpreadsheetMetadata,
    tab: string,
    spjDoc?: ParsedSpjDocument
  ) => void;
  onResetDefaultDatabase: () => Promise<void>;
  onAddAuditLog: (aksi: 'Input Realisasi SP2D' | 'Verifikasi Triwulan', keterangan: string) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  googleUser,
  accessToken,
  needsAuth,
  isLoggingIn,
  onGoogleLogin,
  onGoogleLogout,
  selectedYear,
  subkegiatanList,
  kegiatanList,
  connectedSheet,
  selectedTab,
  activeSourceLabel,
  activeSpjMetadata,
  autoSyncEnabled,
  isSyncingNow,
  lastSyncedAt,
  onToggleAutoSync,
  onManualTwoWaySync,
  onOpenInputRealisasi,
  onChangeConnectedSheet,
  onImportRows,
  onResetDefaultDatabase,
  onAddAuditLog,
}) => {
  const [urlOrIdInput, setUrlOrIdInput] = useState(connectedSheet?.spreadsheetId || '');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<SubkegiatanItem[] | null>(null);
  const [previewSpjDoc, setPreviewSpjDoc] = useState<ParsedSpjDocument | undefined>(undefined);
  const [confirmMode, setConfirmMode] = useState<'push-once' | 'enable-auto' | null>(null);

  if (!isOpen) return null;

  const isSignedIn = Boolean(accessToken && !needsAuth);

  const handleLoadSpreadsheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setPreviewRows(null);
    setPreviewSpjDoc(undefined);
    setLoadingAction('load-meta');
    try {
      const meta = await fetchSpreadsheetMetadata(urlOrIdInput, accessToken);
      const defaultTab = meta.sheets[0]?.title || '';
      onChangeConnectedSheet(meta, defaultTab);
      setUrlOrIdInput(meta.spreadsheetId);

      // Immediately read rows from the selected tab so it connects cleanly without uploading files
      if (defaultTab) {
        const { rows, spjDocument } = await readSubkegiatanFromSheet(
          meta.spreadsheetId,
          defaultTab,
          accessToken
        );
        if (rows.length > 0) {
          setPreviewRows(rows);
          setPreviewSpjDoc(spjDocument);
          setSuccessMsg(
            `Terhubung ke "${meta.title}" (${defaultTab}) — ditemukan ${rows.length} baris siap diterapkan.`
          );
          return;
        }
      }

      setSuccessMsg(
        `Terhubung ke "${meta.title}" (${meta.sheets.length} tab lembar kerja ditemukan).`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal memuat Spreadsheet.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReadTabPreview = async () => {
    if (!accessToken || !connectedSheet || !selectedTab) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoadingAction('read-rows');
    try {
      const { rows, spjDocument } = await readSubkegiatanFromSheet(
        connectedSheet.spreadsheetId,
        selectedTab,
        accessToken
      );
      if (rows.length === 0) {
        setErrorMsg(
          `Tab "${selectedTab}" masih kosong atau belum memakai kolom header SIPANGGAR. Anda dapat langsung menekan "Kirim Data ke Tab" untuk mengisi tab ini dari Dashboard.`
        );
        setPreviewRows(null);
        setPreviewSpjDoc(undefined);
      } else {
        setPreviewRows(rows);
        setPreviewSpjDoc(spjDocument);
        setSuccessMsg(
          spjDocument
            ? `Terdeteksi format SPJ Belanja Fungsional (${spjDocument.kegiatanList.length} Kegiatan, ${rows.length} Subkegiatan). Klik "Terapkan & Hubungkan 2 Arah".`
            : `Berhasil membaca ${rows.length} baris subkegiatan dari tab "${selectedTab}". Klik "Terapkan ke Dashboard".`
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal membaca data dari Google Sheets.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleApplyImport = () => {
    if (!previewRows || !connectedSheet) return;
    onImportRows(previewRows, connectedSheet, selectedTab, previewSpjDoc);
    setSuccessMsg(
      `${previewRows.length} data subkegiatan dari "${connectedSheet.title}" (${selectedTab}) telah diterapkan ke Dashboard & menu Input Realisasi.`
    );
    setPreviewRows(null);
    setPreviewSpjDoc(undefined);
  };

  const handleReloadDatabaseSipanggar = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoadingAction('reload-default');
    try {
      await onResetDefaultDatabase();
      setSuccessMsg(
        'Database SIPANGGAR bawaan (61 Subkegiatan) dimuat ulang ke Dashboard & siap disinkronkan.'
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal memuat ulang Database SIPANGGAR.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCreateTemplateSheet = async () => {
    if (!accessToken) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoadingAction('create-sheet');
    try {
      const meta = await createSipanggarSpreadsheet(
        selectedYear,
        subkegiatanList,
        kegiatanList,
        accessToken
      );
      const firstTab = meta.sheets[0]?.title || 'Subkegiatan';
      onChangeConnectedSheet(meta, firstTab);
      onToggleAutoSync(true);
      setUrlOrIdInput(meta.spreadsheetId);
      onAddAuditLog(
        'Verifikasi Triwulan',
        `Membuat Google Spreadsheet baru "${meta.title}" (${subkegiatanList.length} subkegiatan) dengan Sinkronisasi 2 Arah Otomatis aktif.`
      );
      setSuccessMsg(
        `Spreadsheet "${meta.title}" berhasil dibuat, diisi ${subkegiatanList.length} subkegiatan, dan Sinkronisasi 2 Arah Otomatis langsung aktif!`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal membuat Google Spreadsheet baru.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleConfirmedWriteAction = async () => {
    const mode = confirmMode;
    setConfirmMode(null);
    if (!accessToken || !connectedSheet || !selectedTab || !mode) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setLoadingAction('push-sync');
    try {
      await syncSubkegiatanToSheet(
        connectedSheet.spreadsheetId,
        selectedTab,
        subkegiatanList,
        accessToken
      );
      if (mode === 'enable-auto') {
        onToggleAutoSync(true);
        onAddAuditLog(
          'Verifikasi Triwulan',
          `Mengaktifkan Sinkronisasi 2 Arah Otomatis ke Google Sheets "${connectedSheet.title}" tab "${selectedTab}".`
        );
        setSuccessMsg(
          `Sinkronisasi 2 Arah Otomatis aktif untuk "${connectedSheet.title}" (${selectedTab})! Perubahan di Dashboard maupun Google Sheets akan otomatis sinkron.`
        );
      } else {
        onAddAuditLog(
          'Input Realisasi SP2D',
          `Sinkronisasi ${subkegiatanList.length} subkegiatan ke Google Sheets "${connectedSheet.title}" tab "${selectedTab}".`
        );
        setSuccessMsg(
          `Berhasil menyinkronkan ${subkegiatanList.length} subkegiatan ke "${connectedSheet.title}" (${selectedTab}).`
        );
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menulis pembaruan ke Google Sheets.');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[1px]">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-[#EEF3FA]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[16px] font-extrabold text-[#0E264D]">
                Koneksi 2 Arah Dashboard ↔ Spreadsheet — SIPANGGAR
              </h3>
              <p className="text-[12px] text-slate-600">
                Sumber aktif: <strong className="text-[#0E264D]">{activeSourceLabel}</strong> ({subkegiatanList.length} Subkegiatan · Sinkron Langsung)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-800 cursor-pointer"
            aria-label="Tutup panel koneksi spreadsheet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-[13px]">
          {/* Active Database & Input Realisasi Banner */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Database className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#0E264D]">
                    Database SIPANGGAR & Input Realisasi Terhubung
                  </div>
                  <div className="text-[12px] text-slate-600 mt-0.5">
                    {activeSpjMetadata
                      ? `${activeSpjMetadata.perangkatDaerah} · PA: ${activeSpjMetadata.penggunaAnggaran}`
                      : `Setiap input realisasi di sistem otomatis diperbarui di Dashboard dan disinkronkan ke Google Sheets.`}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenInputRealisasi();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[12px] font-bold cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Buka Input Realisasi</span>
                </button>
                <button
                  type="button"
                  onClick={handleReloadDatabaseSipanggar}
                  disabled={loadingAction !== null}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-60 text-[#0E264D] text-[12px] font-bold cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-[#0E76F4] ${
                      loadingAction === 'reload-default' ? 'animate-spin' : ''
                    }`}
                  />
                  <span>Reset Database SIPANGGAR</span>
                </button>
              </div>
            </div>
          </div>

          {/* Google Auth Status Banner */}
          {!isSignedIn ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="font-bold text-[#0E264D] text-[14px]">
                  Hubungkan ke Google Sheets (Opsional — Sinkron Cloud 2 Arah)
                </div>
                <p className="text-[12.5px] text-slate-600 mt-0.5">
                  Masuk dengan Google jika Anda ingin menyinkronkan data SIPANGGAR secara otomatis 2 arah ke dokumen Google Sheets Anda.
                </p>
              </div>
              <div className="shrink-0">
                <GoogleSignInButton
                  onClick={onGoogleLogin}
                  disabled={isLoggingIn}
                  label={isLoggingIn ? 'Menghubungkan...' : 'Sign in with Google'}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-[#0E264D] text-[13px]">
                    Terautentikasi sebagai {googleUser?.displayName || googleUser?.email}
                  </div>
                  {googleUser?.email && (
                    <div className="text-[11.5px] text-slate-600">{googleUser.email}</div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={onGoogleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-[12px] font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Akun Google</span>
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12.5px] text-rose-800 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[12.5px] text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {isSignedIn && (
            <>
              {/* Create new live 2-way Google Sheet */}
              <div className="rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-[#0E264D]">
                    Buat Google Spreadsheet Baru (Langsung Terhubung 2 Arah)
                  </div>
                  <p className="text-[12px] text-slate-600 mt-0.5">
                    Otomatis membuat Google Sheets berisi {subkegiatanList.length} subkegiatan TA {selectedYear} dan mengaktifkan sinkronisasi 2 arah.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCreateTemplateSheet}
                  disabled={loadingAction !== null}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-[12.5px] font-bold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>
                    {loadingAction === 'create-sheet'
                      ? 'Membuat Spreadsheet...'
                      : 'Buat & Hubungkan 2 Arah'}
                  </span>
                </button>
              </div>

              {/* Connect Existing Spreadsheet URL or ID */}
              <form
                onSubmit={handleLoadSpreadsheet}
                className="rounded-xl border border-slate-200 p-4 space-y-3"
              >
                <div>
                  <label className="block font-bold text-[#0E264D] mb-1">
                    Atau Tempel Tautan Google Spreadsheet Anda
                  </label>
                  <p className="text-[12px] text-slate-500">
                    Cukup tempel URL Google Sheets — tanpa perlu mengunduh atau mengunggah file CSV.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={urlOrIdInput}
                      onChange={(e) => setUrlOrIdInput(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1ABC.../edit"
                      required
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-[12.5px] text-[#0E264D] focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loadingAction !== null}
                    className="px-4 py-2 rounded-xl bg-[#0E76F4] hover:bg-[#0C64D2] disabled:opacity-60 text-white text-[12.5px] font-bold whitespace-nowrap cursor-pointer"
                  >
                    {loadingAction === 'load-meta' ? 'Menghubungkan...' : 'Hubungkan Sheet'}
                  </button>
                </div>
              </form>

              {/* Connected Sheet Controls & 2-Way Auto Sync */}
              {connectedSheet && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-[#0E76F4]">
                        Google Sheets Terhubung
                      </div>
                      <div className="text-[14.5px] font-extrabold text-[#0E264D]">
                        {connectedSheet.title}
                      </div>
                    </div>
                    <a
                      href={connectedSheet.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-[12px] font-bold text-[#0E264D] hover:bg-slate-50"
                    >
                      <span>Buka di Google Sheets</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  {/* Two-way Auto Sync Switch */}
                  <div className="rounded-xl bg-white border border-blue-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-[#0E264D] flex items-center gap-1.5">
                        <ArrowLeftRight className="w-4 h-4 text-emerald-600" />
                        <span>Sinkronisasi 2 Arah Otomatis (Real-time)</span>
                      </div>
                      <p className="text-[11.5px] text-slate-600 mt-0.5">
                        Edit di Dashboard/Spreadsheet SIPANGGAR otomatis tersimpan ke Google Sheets, dan edit di Google Sheets otomatis ditarik tiap 15 detik.
                        {lastSyncedAt ? ` (Terakhir: ${lastSyncedAt})` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (autoSyncEnabled) {
                            onToggleAutoSync(false);
                          } else {
                            setConfirmMode('enable-auto');
                          }
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-[12px] font-bold cursor-pointer transition-colors ${
                          autoSyncEnabled
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {autoSyncEnabled ? '2 Arah: AKTIF' : 'Aktifkan 2 Arah'}
                      </button>

                      <button
                        type="button"
                        onClick={onManualTwoWaySync}
                        disabled={isSyncingNow || !selectedTab}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-[#0E264D] text-[12px] font-bold cursor-pointer disabled:opacity-60"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
                        <span>Sinkronkan</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                    <div className="sm:col-span-5">
                      <label className="block text-[11.5px] font-bold text-slate-700 mb-1">
                        Tab Lembar Kerja Aktif
                      </label>
                      <select
                        value={selectedTab}
                        onChange={(e) => onChangeConnectedSheet(connectedSheet, e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-[12.5px] font-semibold text-[#0E264D]"
                      >
                        {connectedSheet.sheets.map((s) => (
                          <option key={s.sheetId} value={s.title}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-7 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleReadTabPreview}
                        disabled={loadingAction !== null || !selectedTab}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-blue-300 hover:bg-blue-50 text-[#0E264D] text-[12.5px] font-bold cursor-pointer disabled:opacity-60"
                      >
                        <RefreshCw
                          className={`w-4 h-4 text-[#0E76F4] ${
                            loadingAction === 'read-rows' ? 'animate-spin' : ''
                          }`}
                        />
                        <span>Tarik Data dari Tab</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmMode('push-once')}
                        disabled={loadingAction !== null || !selectedTab}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0D2B5C] hover:bg-[#143C78] text-white text-[12.5px] font-bold cursor-pointer disabled:opacity-60"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>
                          {loadingAction === 'push-sync'
                            ? 'Menyinkronkan...'
                            : 'Kirim Data ke Tab'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Imported Rows */}
              {previewRows && previewRows.length > 0 && (
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                    <span className="font-bold text-[#0E264D] text-[12.5px]">
                      Pratinjau Data Google Sheets ({previewRows.length} baris)
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyImport}
                      className="px-3.5 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-[12px] font-bold cursor-pointer"
                    >
                      Terapkan ke Dashboard
                    </button>
                  </div>
                  {previewSpjDoc && (
                    <div className="px-4 py-2.5 bg-blue-50/60 border-b border-blue-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11.5px]">
                      <div>
                        <span className="text-slate-500">SKPD:</span>{' '}
                        <strong className="text-[#0E264D]">{previewSpjDoc.metadata.perangkatDaerah}</strong>
                      </div>
                      <div className="tabular-nums">
                        <span className="text-slate-500">Pagu Perubahan:</span>{' '}
                        <strong className="text-[#0E264D]">{formatRupiah(previewSpjDoc.totalAnggaran)}</strong>
                      </div>
                      <div className="tabular-nums">
                        <span className="text-slate-500">Jumlah SPJ:</span>{' '}
                        <strong className="text-emerald-700">{formatRupiah(previewSpjDoc.totalRealisasi)}</strong>
                      </div>
                    </div>
                  )}
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-[12px]">
                      <thead>
                        <tr className="bg-[#EEF3FA] text-[#0E264D] font-bold">
                          <th className="py-2 px-3">Subkegiatan</th>
                          <th className="py-2 px-3">Program</th>
                          <th className="py-2 px-3 text-right">Pagu</th>
                          <th className="py-2 px-3 text-right">Realisasi</th>
                          <th className="py-2 px-3 text-right">%</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewRows.slice(0, 8).map((r) => (
                          <tr key={r.id}>
                            <td className="py-1.5 px-3 font-medium text-[#0E264D]">{r.nama}</td>
                            <td className="py-1.5 px-3 text-slate-600">{r.program}</td>
                            <td className="py-1.5 px-3 text-right tabular-nums">
                              {formatRupiah(r.pagu)}
                            </td>
                            <td className="py-1.5 px-3 text-right tabular-nums">
                              {formatRupiah(r.realisasi)}
                            </td>
                            <td className="py-1.5 px-3 text-right font-bold tabular-nums">
                              {formatPercentID(r.persentase)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-[12.5px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Explicit Confirmation Dialog before overwriting or enabling auto-write on Google Sheets */}
      {confirmMode && connectedSheet && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-amber-50 flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <h4 className="text-[15px] font-extrabold text-[#0E264D]">
                {confirmMode === 'enable-auto'
                  ? 'Aktifkan Sinkronisasi 2 Arah Otomatis?'
                  : 'Konfirmasi Pembaruan Spreadsheet'}
              </h4>
            </div>
            <div className="p-5 space-y-2.5 text-[13px] text-slate-700">
              <p>
                {confirmMode === 'enable-auto'
                  ? 'SIPANGGAR akan menyinkronkan data aktif ke tab Google Sheets ini sekarang, lalu secara otomatis mengirim perubahan Dashboard dan menarik pembaruan dari Google Sheets setiap 15 detik.'
                  : 'Anda akan menimpa dan memperbarui isi lembar kerja pada Google Sheets berikut:'}
              </p>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1 text-[12.5px]">
                <div>
                  <span className="text-slate-500">Spreadsheet:</span>{' '}
                  <strong className="text-[#0E264D]">{connectedSheet.title}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Tab Lembar Kerja:</span>{' '}
                  <strong className="text-[#0E264D]">{selectedTab}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Data yang disinkronkan:</span>{' '}
                  <strong className="text-[#0E264D] tabular-nums">
                    {subkegiatanList.length} subkegiatan (+ 1 baris header)
                  </strong>
                </div>
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmMode(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-[12.5px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmedWriteAction}
                className="px-4 py-2 rounded-lg bg-[#0E76F4] hover:bg-[#0C64D2] text-white text-[12.5px] font-bold cursor-pointer"
              >
                {confirmMode === 'enable-auto'
                  ? 'Konfirmasi & Aktifkan 2 Arah'
                  : 'Konfirmasi & Simpan ke Spreadsheet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
