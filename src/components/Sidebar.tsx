import React from 'react';
import {
  AlertTriangle,
  ClipboardEdit,
  Database,
  FileText,
  History,
  Home,
  LogOut,
  TrendingUp,
  X,
} from 'lucide-react';
import { NavSection, UserRole } from '../types/budget';
import { NagekeoCrest, NagekeoSidebarLandscape } from './BrandAssets';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  alertCount: number;
  userRole: UserRole;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'data-anggaran', label: 'Data Anggaran', icon: Database },
  { id: 'input-realisasi', label: 'Input Realisasi', icon: ClipboardEdit, adminOnly: true },
  { id: 'monitoring', label: 'Monitoring Realisasi', icon: TrendingUp },
  { id: 'peringatan', label: 'Peringatan Realisasi', icon: AlertTriangle },
  { id: 'laporan', label: 'Laporan', icon: FileText },
  { id: 'riwayat', label: 'Riwayat Pembaruan', icon: History },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  alertCount,
  userRole,
  onLogout,
  mobileOpen,
  onCloseMobile,
}) => {
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || userRole === 'Administrator'
  );

  const sidebarBody = (
    <aside
      className="w-[248px] h-full flex flex-col text-white shrink-0 select-none overflow-y-auto"
      style={{
        background: 'linear-gradient(180deg, #0D2D62 0%, #09224D 58%, #071D41 100%)',
      }}
    >
      {/* Top Crest & Brand Identity */}
      <div className="px-5 pt-5 pb-4 flex flex-col items-center text-center relative">
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden absolute top-3 right-3 p-1.5 rounded-lg text-white/75 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Tutup menu navigasi"
        >
          <X className="w-5 h-5" />
        </button>

        <NagekeoCrest className="w-11 h-13 mb-2 drop-shadow-md" />
        <h1 className="text-[22px] font-extrabold tracking-tight text-white leading-none">
          SIPANGGAR
        </h1>
        <p className="mt-1.5 text-[11.5px] leading-[1.35] text-blue-100/85 font-medium max-w-[190px]">
          Sistem Informasi Pemantauan Anggaran dan Realisasi Keuangan
        </p>

        <div className="w-full h-px bg-white/15 my-3.5" />

        <div className="text-[12.5px] leading-snug font-semibold text-white/95">
          Bapperida
          <br />
          Kab. Nagekeo
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="px-3 flex-1 space-y-1" aria-label="Menu Utama SIPANGGAR">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl text-[13.5px] font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
                isActive
                  ? 'bg-[#0E76F4] text-white shadow-[0_4px_14px_rgba(14,118,244,0.45)]'
                  : 'text-blue-100/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-white' : 'text-blue-200/85'}`} />
                <span className="truncate">{item.label}</span>
              </span>
              {item.id === 'peringatan' && alertCount > 0 && (
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md tabular-nums ${
                    isActive ? 'bg-white/20 text-white' : 'bg-rose-500/90 text-white'
                  }`}
                >
                  {alertCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Account Session Footer + Logout */}
      <div className="px-3 pt-3 pb-1">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-blue-100 hover:text-white text-[12px] font-bold transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar ({userRole})</span>
        </button>
      </div>

      {/* Bottom Nagekeo Scenic Graphic */}
      <NagekeoSidebarLandscape />
    </aside>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <div className="hidden lg:block sticky top-0 h-screen shrink-0 no-print">
        {sidebarBody}
      </div>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{sidebarBody}</div>
        </div>
      )}
    </>
  );
};
