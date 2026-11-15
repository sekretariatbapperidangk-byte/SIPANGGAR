import React, { useState } from 'react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { AuthSession, UserRole } from '../types/budget';
import { NagekeoCrest } from './BrandAssets';

interface LoginViewProps {
  onLoginSuccess: (session: AuthSession) => void;
}

interface RoleAccountConfig {
  role: UserRole;
  username: string;
  password: string;
  displayName: string;
  jabatan: string;
  tagline: string;
  permissions: string[];
}

const ROLE_ACCOUNTS: Record<UserRole, RoleAccountConfig> = {
  Administrator: {
    role: 'Administrator',
    username: 'admin',
    password: 'sipanggar2026',
    displayName: 'Administrator Anggaran',
    jabatan: 'Administrator Keuangan · Bapperida',
    tagline: 'Akses Penuh (Kelola Data, Input Realisasi SP2D & Sinkron Spreadsheet)',
    permissions: [
      'Menginput dan memperbarui realisasi SP2D',
      'Mencatat tindak lanjut subkegiatan belum terealisasi',
      'Menghubungkan & menyinkronkan Google Sheets 2 arah',
    ],
  },
  Pimpinan: {
    role: 'Pimpinan',
    username: 'pimpinan',
    password: 'pimpinan2026',
    displayName: 'Pimpinan Bapperida',
    jabatan: 'Kepala Bapperida Kab. Nagekeo',
    tagline: 'Mode Pemantauan (Hanya Lihat Realisasi Tanpa Hak Edit)',
    permissions: [
      'Memantau capaian KPI, grafik triwulan, dan progres per program',
      'Melihat rincian data anggaran, peringatan, dan riwayat pembaruan',
      'Mengunduh & mencetak laporan resmi (tanpa mengubah data anggaran)',
    ],
  },
};

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('Administrator');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeConfig = ROLE_ACCOUNTS[selectedRole];

  const handleRoleSwitch = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMsg(null);
  };

  const completeLogin = (config: RoleAccountConfig) => {
    onLoginSuccess({
      role: config.role,
      username: config.username,
      displayName: config.displayName,
      jabatan: config.jabatan,
      loggedInAt: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const normalizedUser = username.trim().toLowerCase();
    const matchedConfig = ROLE_ACCOUNTS[selectedRole];

    if (
      normalizedUser === matchedConfig.username &&
      password === matchedConfig.password
    ) {
      completeLogin(matchedConfig);
      return;
    }

    setErrorMsg(
      `Username atau kata sandi ${selectedRole} tidak sesuai. Periksa kembali atau gunakan tombol isi cepat di bawah.`
    );
  };

  const handleQuickDemoLogin = (role: UserRole) => {
    const config = ROLE_ACCOUNTS[role];
    setSelectedRole(role);
    setUsername(config.username);
    setPassword(config.password);
    setErrorMsg(null);
    completeLogin(config);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 sm:p-6"
      style={{
        background:
          'linear-gradient(145deg, #071D41 0%, #0D2D62 52%, #134084 100%)',
      }}
    >
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden shadow-2xl border border-white/15 bg-white">
        {/* Left Institutional Panel */}
        <div
          className="lg:col-span-5 p-7 sm:p-8 text-white flex flex-col justify-between"
          style={{
            background:
              'linear-gradient(180deg, #0D2D62 0%, #09224D 65%, #071D41 100%)',
          }}
        >
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <NagekeoCrest className="w-12 h-14 drop-shadow-md shrink-0" />
              <div>
                <h1 className="text-[24px] font-extrabold tracking-tight leading-none">
                  SIPANGGAR
                </h1>
                <p className="text-[11.5px] text-blue-100/85 font-medium mt-1 leading-snug">
                  Sistem Informasi Pemantauan Anggaran & Realisasi Keuangan
                </p>
              </div>
            </div>

            <div className="h-px bg-white/15" />

            <div className="space-y-1">
              <div className="text-[11px] uppercase tracking-wider font-bold text-blue-200/80">
                Instansi Pengelola
              </div>
              <div className="text-[15px] font-bold leading-snug">
                Bapperida Kabupaten Nagekeo
              </div>
              <p className="text-[12px] text-blue-100/80 leading-relaxed">
                Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah Kabupaten Nagekeo — Tahun Anggaran 2026.
              </p>
            </div>

            {/* Active Role Permission Preview */}
            <div className="rounded-2xl bg-white/10 border border-white/15 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-[12.5px] font-bold text-white">
                {selectedRole === 'Administrator' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                ) : (
                  <Eye className="w-4 h-4 text-sky-300 shrink-0" />
                )}
                <span>Hak Akses: {selectedRole}</span>
              </div>
              <p className="text-[11.5px] text-blue-100/85 leading-snug">
                {activeConfig.tagline}
              </p>
              <ul className="space-y-1.5 text-[11.5px] text-blue-50/90">
                {activeConfig.permissions.map((perm) => (
                  <li key={perm} className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" />
                    <span>{perm}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-6 text-[11px] text-blue-200/75">
            Nagekeo Maju Bersama · Pemantauan Realisasi SP2D Terintegrasi
          </div>
        </div>

        {/* Right Login Form Panel */}
        <div className="lg:col-span-7 p-7 sm:p-9 flex flex-col justify-center bg-white">
          <div className="mb-6">
            <h2 className="text-[22px] font-extrabold text-[#0E264D]">
              Masuk ke Sistem SIPANGGAR
            </h2>
            <p className="text-[13px] text-slate-600 mt-1">
              Pilih peran pengguna Anda untuk melanjutkan ke dashboard realisasi anggaran.
            </p>
          </div>

          {/* Role Switcher */}
          <div className="grid grid-cols-2 gap-2.5 mb-5">
            {(['Administrator', 'Pimpinan'] as UserRole[]).map((role) => {
              const active = selectedRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => handleRoleSwitch(role)}
                  className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    active
                      ? 'border-[#0E76F4] bg-blue-50/70 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      active
                        ? 'bg-[#0E76F4] text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {role === 'Administrator' ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : (
                      <UserCheck className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13.5px] font-extrabold text-[#0E264D]">
                      {role}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {role === 'Administrator' ? 'Kelola & Input SP2D' : 'Hanya Pantau (View)'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12.5px] text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-username"
                className="block text-[12px] font-bold text-[#0E264D] mb-1.5"
              >
                Username ({selectedRole})
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={`Masukkan username (${activeConfig.username})`}
                required
                autoComplete="username"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-[13.5px] text-[#0E264D] focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-[12px] font-bold text-[#0E264D] mb-1.5"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-[13.5px] text-[#0E264D] focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#0E76F4] hover:bg-[#0C64D2] text-white text-[13.5px] font-bold shadow-xs transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk sebagai {selectedRole}</span>
            </button>
          </form>

          {/* Fast Demo Access Strip */}
          <div className="mt-6 pt-5 border-t border-slate-200 space-y-2.5">
            <div className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wide">
              Akses Cepat / Info Kredensial Akun
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('Administrator')}
                className="flex flex-col items-start px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-colors text-left cursor-pointer"
              >
                <span className="text-[12px] font-extrabold text-[#0E264D]">
                  Masuk Cepat: Administrator
                </span>
                <span className="text-[11px] text-slate-600 font-mono">
                  admin / sipanggar2026
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoLogin('Pimpinan')}
                className="flex flex-col items-start px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 transition-colors text-left cursor-pointer"
              >
                <span className="text-[12px] font-extrabold text-[#0E264D]">
                  Masuk Cepat: Pimpinan
                </span>
                <span className="text-[11px] text-slate-600 font-mono">
                  pimpinan / pimpinan2026
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
