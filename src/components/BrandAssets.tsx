import React from 'react';

export const NagekeoCrest: React.FC<{ className?: string }> = ({ className = 'w-14 h-16' }) => (
  <img
    src="/assets/aistudio/LOGO-KABUPATEN-NAGEKEO-NUSA-TENGGARA-TIMUR_932d31fb.png"
    alt="Lambang Kabupaten Nagekeo"
    className={`object-contain ${className}`}
  />
);

export const PimpinanAvatar: React.FC<{ className?: string }> = ({ className = 'w-9 h-9' }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
    <circle cx="32" cy="32" r="32" fill="#DCE9FA" />
    {/* Suit / Shoulders */}
    <path d="M12 60C14 48 22 43 32 43C42 43 50 48 52 60H12Z" fill="#143A73" />
    {/* Shirt & Tie */}
    <path d="M27 43L32 54L37 43H27Z" fill="#FFFFFF" />
    <path d="M30.5 45L32 55L33.5 45L32 43.5L30.5 45Z" fill="#0E76F4" />
    {/* Neck */}
    <rect x="28" y="36" width="8" height="9" rx="4" fill="#E8B998" />
    {/* Head */}
    <ellipse cx="32" cy="27" rx="10" ry="11.5" fill="#F2C8A9" />
    {/* Hair */}
    <path
      d="M22 25C22 18 26.5 14 32.5 14C38.5 14 42 18.5 42 25C40 21 36.5 19.5 32 19.5C27.5 19.5 24 21 22 25Z"
      fill="#1E293B"
    />
    {/* Eyes & Friendly Expression */}
    <circle cx="28.5" cy="27" r="1.1" fill="#1E293B" />
    <circle cx="35.5" cy="27" r="1.1" fill="#1E293B" />
    <path d="M29 32.5C30.8 34 33.2 34 35 32.5" stroke="#B46E52" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

export const NagekeoSidebarLandscape: React.FC = () => (
  <div className="relative w-full h-48 overflow-hidden select-none mt-auto shrink-0">
    {/* Foto Rumah Adat & Peo Kabupaten Nagekeo */}
    <img
      src="/assets/aistudio/DSC_0438-scaled_c45ba74e.jpg"
      alt="Rumah Adat Kabupaten Nagekeo"
      className="w-full h-full object-cover object-center block"
    />

    {/* Top fade into sidebar background & bottom dark navy scrim for motto legibility */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'linear-gradient(180deg, #071D41 0%, rgba(7,29,65,0.38) 24%, rgba(7,29,65,0.12) 48%, rgba(6,24,54,0.82) 76%, #061836 100%)',
      }}
    />

    {/* Motto Daerah Kabupaten Nagekeo */}
    <div className="absolute bottom-2.5 inset-x-0 px-3.5 text-center">
      <p className="font-script-tagline italic text-[12px] font-semibold leading-[1.35] text-white tracking-wide drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
        Nagekeo Maju, Mandiri dan Berdaya Saing berlandaskan Iman dan Budaya
      </p>
    </div>
  </div>
);
