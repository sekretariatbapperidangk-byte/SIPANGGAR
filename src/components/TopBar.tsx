import React from 'react';
import {
  ArrowLeftRight,
  Calendar,
  ChevronDown,
  FileSpreadsheet,
  Menu,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { QuarterId } from '../types/budget';
import { QUARTER_OPTIONS } from '../data/sipanggarData';
import { PimpinanAvatar } from './BrandAssets';

interface TopBarProps {
  selectedYear: number;
  onChangeYear: (year: number) => void;
  selectedQuarter: QuarterId;
  onChangeQuarter: (quarter: QuarterId) => void;
  userRole: string;
  onChangeRole: (role: string) => void;
  onOpenMobileMenu: () => void;
  onOpenSheetsModal: () => void;
  connectedSheetTitle: string | null;
  activeSourceLabel: string;
  autoSyncEnabled?: boolean;
  isSyncingNow?: boolean;
  perangkatDaerahSubtitle?: string;
}

const AVAILABLE_YEARS = [2026, 2025, 2024];
const AVAILABLE_ROLES = ['Pimpinan', 'Sekretaris', 'Operator Anggaran'];

export const TopBar: React.FC<TopBarProps> = ({
  selectedYear,
  onChangeYear,
  selectedQuarter,
  onChangeQuarter,
  userRole,
  onChangeRole,
  onOpenMobileMenu,
  onOpenSheetsModal,
  connectedSheetTitle,
  activeSourceLabel,
  autoSyncEnabled,
  isSyncingNow,
  perangkatDaerahSubtitle,
}) => {
  const spreadsheetDisplay = connectedSheetTitle || activeSourceLabel;

  return (
    <header className="w-full pt-4 pb-3 px-4 sm:px-6 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 no-print">
      {/* Left Brand Welcome Title */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden mt-0.5 sm:mt-0 p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs shrink-0"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Blue Bar-Trend Icon matching screenshot */}
        <div className="w-11 h-11 rounded-xl bg-white border border-blue-100 shadow-xs flex items-center justify-center shrink-0">
          <TrendingUp className="w-6 h-6 text-[#0E76F4] stroke-[2.4]" />
        </div>

        <div className="min-w-0">
          <h2 className="text-[20px] sm:text-[23px] font-extrabold tracking-tight text-[#0E264D] leading-tight">
            Selamat Datang di SIPANGGAR
          </h2>
          <p className="text-[12.5px] sm:text-[13px] font-medium text-[#2A436B] leading-snug">
            Dashboard Pemantauan Anggaran dan Realisasi Keuangan
          </p>
          <p className="text-[11.5px] text-slate-500 font-medium leading-snug truncate">
            {perangkatDaerahSubtitle ||
              'Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah Kabupaten Nagekeo'}
          </p>
        </div>
      </div>

      {/* Right Interactive Selectors: Spreadsheet, Tahun Anggaran, Periode, User Role */}
      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        {/* Google Sheets / 2-Way Spreadsheet Sync Trigger */}
        <button
          type="button"
          onClick={onOpenSheetsModal}
          className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 border shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
          title={`Sumber data 2 arah aktif: ${spreadsheetDisplay}`}
        >
          {isSyncingNow ? (
            <RefreshCw className="w-4 h-4 text-emerald-600 shrink-0 animate-spin" />
          ) : autoSyncEnabled ? (
            <ArrowLeftRight className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span className="text-[13px] font-bold max-w-[175px] truncate">
            {spreadsheetDisplay}
          </span>
        </button>

        {/* Tahun Anggaran Selector */}
        <div className="relative flex items-center gap-2.5 bg-white border border-slate-200/90 rounded-xl px-3.5 py-2 shadow-xs hover:border-blue-300 transition-colors">
          <Calendar className="w-4 h-4 text-[#0E264D] shrink-0" />
          <div className="flex flex-col leading-none pr-5">
            <span className="text-[10.5px] font-medium text-slate-500 mb-0.5 whitespace-nowrap">
              Tahun Anggaran
            </span>
            <span className="text-[14px] font-bold text-[#0E264D] tabular-nums">
              {selectedYear}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 pointer-events-none" />
          <select
            aria-label="Pilih Tahun Anggaran"
            value={selectedYear}
            onChange={(e) => onChangeYear(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            {AVAILABLE_YEARS.map((yr) => (
              <option key={yr} value={yr}>
                Tahun Anggaran {yr}
              </option>
            ))}
          </select>
        </div>

        {/* Periode Selector */}
        <div className="relative flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl px-3.5 py-2 shadow-xs hover:border-blue-300 transition-colors">
          <div className="flex flex-col leading-none pr-5">
            <span className="text-[10.5px] font-medium text-slate-500 mb-0.5 whitespace-nowrap">
              Periode
            </span>
            <span className="text-[14px] font-bold text-[#0E264D] whitespace-nowrap">
              {QUARTER_OPTIONS.find((q) => q.id === selectedQuarter)?.label}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 pointer-events-none" />
          <select
            aria-label="Pilih Periode Triwulan"
            value={selectedQuarter}
            onChange={(e) => onChangeQuarter(e.target.value as QuarterId)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            {QUARTER_OPTIONS.map((q) => (
              <option key={q.id} value={q.id}>
                {q.label} ({q.months})
              </option>
            ))}
          </select>
        </div>

        {/* User Profile Selector */}
        <div className="relative flex items-center gap-2.5 bg-white border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-xs hover:border-blue-300 transition-colors">
          <PimpinanAvatar className="w-8 h-8 shrink-0" />
          <div className="pr-5">
            <span className="text-[13.5px] font-bold text-[#0E264D] whitespace-nowrap block">
              {userRole}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-500 absolute right-2.5 pointer-events-none" />
          <select
            aria-label="Pilih Peran Pengguna"
            value={userRole}
            onChange={(e) => onChangeRole(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          >
            {AVAILABLE_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
