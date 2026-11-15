import React from 'react';

export const NagekeoCrest: React.FC<{ className?: string }> = ({ className = 'w-12 h-14' }) => (
  <svg viewBox="0 0 80 92" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Lambang Kabupaten Nagekeo">
    {/* Outer Shield */}
    <path
      d="M40 4L72 15V46C72 67 57 81 40 88C23 81 8 67 8 46V15L40 4Z"
      fill="#0D3B82"
      stroke="#FACC15"
      strokeWidth="3.5"
    />
    <path
      d="M40 9L67 18.5V46C67 64 54 76 40 82.5C26 76 13 64 13 46V18.5L40 9Z"
      fill="#1255B5"
    />
    {/* Top Golden Star */}
    <path
      d="M40 16L42.5 21.8L48.8 22.3L44 26.4L45.5 32.5L40 29.2L34.5 32.5L36 26.4L31.2 22.3L37.5 21.8L40 16Z"
      fill="#FDE047"
    />
    {/* Rice & Cotton Wreath */}
    <path
      d="M21 57C18 47 20 35 26 28"
      stroke="#FDE047"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M59 57C62 47 60 35 54 28"
      stroke="#F8FAFC"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Mountain (Gunung Ebulobo) */}
    <path d="M18 62L40 36L62 62H18Z" fill="#16A34A" />
    <path d="M40 36L52 62H28L40 36Z" fill="#15803D" />
    {/* Sea Waves */}
    <path
      d="M20 65C26 62 33 68 40 65C47 62 54 68 60 65V72C53 76 46 79 40 81C34 79 27 76 20 72V65Z"
      fill="#0284C7"
    />
    {/* Bottom Ribbon */}
    <rect x="22" y="70" width="36" height="9" rx="4.5" fill="#DC2626" stroke="#FACC15" strokeWidth="1.2" />
    <text
      x="40"
      y="76.5"
      textAnchor="middle"
      fill="#FFFFFF"
      fontSize="5.5"
      fontWeight="700"
      fontFamily="sans-serif"
    >
      NAGEKEO
    </text>
  </svg>
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
  <div className="relative w-full h-44 overflow-hidden select-none mt-auto shrink-0">
    {/* Seamless top gradient blend into sidebar navy */}
    <svg
      viewBox="0 0 260 180"
      preserveAspectRatio="xMidYMid slice"
      className="w-full h-full block"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#082047" />
          <stop offset="32%" stopColor="#1B5598" />
          <stop offset="62%" stopColor="#6AA7DB" />
          <stop offset="100%" stopColor="#B8D9F2" />
        </linearGradient>
        <linearGradient id="seaGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0E4B8A" />
          <stop offset="50%" stopColor="#1268B5" />
          <stop offset="100%" stopColor="#0B3B72" />
        </linearGradient>
        <linearGradient id="volcanoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2A4D6E" />
          <stop offset="60%" stopColor="#1B3C59" />
          <stop offset="100%" stopColor="#122B43" />
        </linearGradient>
        <linearGradient id="ridgeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2E7D32" />
          <stop offset="55%" stopColor="#1F5E28" />
          <stop offset="100%" stopColor="#0D2E1A" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="260" height="180" fill="url(#skyGrad)" />

      {/* Soft Clouds */}
      <ellipse cx="62" cy="52" rx="34" ry="7" fill="#FFFFFF" fillOpacity="0.22" />
      <ellipse cx="185" cy="44" rx="44" ry="9" fill="#FFFFFF" fillOpacity="0.26" />
      <ellipse cx="206" cy="48" rx="28" ry="6" fill="#FFFFFF" fillOpacity="0.18" />

      {/* Distant Mountain Range */}
      <path d="M0 95 L42 78 L88 89 L145 72 L210 88 L260 76 V120 H0 Z" fill="#2A5885" fillOpacity="0.6" />

      {/* Mount Ebulobo Iconic Cone */}
      <path d="M22 106 L82 48 L142 106 Z" fill="url(#volcanoGrad)" />
      <path d="M82 48 L118 106 H82 Z" fill="#15314B" fillOpacity="0.65" />

      {/* Coastal Bay Water */}
      <path d="M0 98 H260 V180 H0 Z" fill="url(#seaGrad)" />
      <path d="M40 112 Q120 107 195 113" stroke="#7CC6F8" strokeWidth="1.2" strokeOpacity="0.45" fill="none" />
      <path d="M12 126 Q85 121 155 127" stroke="#9AD6FA" strokeWidth="1" strokeOpacity="0.35" fill="none" />

      {/* Peninsula & Green Coastal Hills */}
      <path d="M110 106 Q165 92 225 104 Q248 109 260 106 V132 Q205 130 162 119 Q130 110 110 106 Z" fill="#266434" />
      <path d="M0 114 Q45 102 96 118 Q138 134 195 148 L260 154 V180 H0 Z" fill="url(#ridgeGrad)" />
      <path d="M150 132 Q205 118 260 128 V180 H130 Z" fill="#184C26" />

      {/* Subtle Golden Sunlit Coastal Highlights */}
      <path d="M0 128 Q58 118 105 134 Q68 145 0 142 Z" fill="#4CA64C" fillOpacity="0.35" />
      <path d="M188 134 Q225 126 260 134 V145 Q220 140 188 134 Z" fill="#5CB85C" fillOpacity="0.28" />
    </svg>

    {/* Top fade into sidebar background & Bottom dark navy scrim for tagline */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'linear-gradient(180deg, #071D41 0%, rgba(7,29,65,0.28) 28%, rgba(7,29,65,0.05) 55%, rgba(6,24,54,0.88) 85%, #061836 100%)',
      }}
    />

    {/* Tagline matching screenshot */}
    <div className="absolute bottom-3.5 inset-x-0 px-4 text-center">
      <p className="font-script-tagline italic text-[19px] leading-tight text-white/95 tracking-wide drop-shadow-sm">
        Nagekeo
        <br />
        Maju Bersama
      </p>
    </div>
  </div>
);
