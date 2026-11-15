export type NavSection =
  | 'dashboard'
  | 'data-anggaran'
  | 'spreadsheet'
  | 'monitoring'
  | 'peringatan'
  | 'laporan'
  | 'riwayat';

export type QuarterId = 'TW1' | 'TW2' | 'TW3' | 'TW4';

export type ProgramCategory =
  | 'Semua Program'
  | 'Pelayanan Umum'
  | 'Perekonomian'
  | 'Pembangunan'
  | 'Penunjang';

export type RealizationStatus = 'Baik' | 'Perlu Perhatian' | 'Belum Terealisasi';

export interface QuarterlyBudgetItem {
  id: QuarterId;
  label: string;
  shortLabel: string;
  months: string;
  anggaranMiliar: number; // in Rp Miliar
  realisasiMiliar: number; // in Rp Miliar
  persentase: number;
  trendYearPercent: number;
  prevYearPercent: number;
}

export interface ProgramRealizationItem {
  id: Exclude<ProgramCategory, 'Semua Program'>;
  name: Exclude<ProgramCategory, 'Semua Program'>;
  pagu: number;
  realisasi: number;
  persentase: number;
  color: string;
  subCount: number;
}

export interface KegiatanItem {
  id: string;
  kode: string;
  nama: string;
  program: Exclude<ProgramCategory, 'Semua Program'>;
  pagu: number;
  realisasi: number;
  persentase: number;
  status: RealizationStatus;
  jumlahSubkegiatan: number;
  bidangPenanggungJawab: string;
}

export interface SubkegiatanItem {
  id: string;
  kode: string;
  program: Exclude<ProgramCategory, 'Semua Program'>;
  kegiatan: string;
  nama: string;
  triwulan: 'I' | 'II' | 'III' | 'IV';
  pagu: number;
  realisasi: number;
  persentase: number;
  status: RealizationStatus;
  unitPelaksana: string;
  catatanKendala?: string;
  tindakLanjut?: string;
}

export interface AuditLogItem {
  id: string;
  tanggal: string;
  waktu: string;
  pengguna: string;
  jabatan: string;
  aksi: 'Input Realisasi SP2D' | 'Pergeseran Pagu' | 'Verifikasi Triwulan' | 'Tindak Lanjut Peringatan';
  keterangan: string;
  nominal?: number;
}

export interface FiscalYearDataset {
  year: number;
  totalAnggaran: number;
  totalRealisasi: number;
  sisaAnggaran: number;
  persentaseRealisasi: number;
  deltaYoY: number;
  quarterly: QuarterlyBudgetItem[];
  programs: ProgramRealizationItem[];
  kegiatanList: KegiatanItem[];
  statusCounts: {
    baik: number;
    perluPerhatian: number;
    belumTerealisasi: number;
    total: number;
  };
}
