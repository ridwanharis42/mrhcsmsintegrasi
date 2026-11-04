
// CSMS V6 MODULAR PERMANEN - NO TIME LIMIT - DINAMIS PER CUSTOMER
// Siap jual ke pihak lain, semua threshold & config bisa disetting
export type Area = { 
  id: string; 
  name: string; 
  lat?: number; 
  lng?: number;
  // V6.8 RADIUS - General per factory
  type?: 'open' | 'closed' | 'open_without_wall' // open_without_wall = area terbuka tanpa tembok pembatas
  area_m2?: number // luas area M2
  radius_m?: number // radius coverage meter (auto dari M2 atau manual)
  is_open?: boolean // true = terbuka tanpa tembok, bisa overlap antar area
  factory_section?: string // misal: Factory A, Workshop, Warehouse
}

export type Vendor = {
  id?: string
  name: string
  area_id: string
  element_1?: number; element_2?: number; element_3?: number; element_4?: number
  element_5?: number; element_6?: number; element_7?: number; element_8?: number
  alamat?: string
  pj_name?: string
  pj_jabatan?: string
  pj_phone?: string
  total_score?: number
  status?: string
  permit_count?: number
  scoring_detail?: Record<string, {score:number, fileName?:string}>
  documents?: any[]
  created_at?: string
}

export type WorkPermit = {
  id?: string
  title: string
  description?: string
  area_id: string
  vendor_name: string
  lat: number
  lng: number
  work_type?: string
  start_date?: string
  end_date?: string
  apd_required?: string
  hazards?: string
  controls?: string
  approver?: string
  status?: string
  workflow_step?: number
  safety_reviewed_by?: string
  approved_by?: string
  approved_at?: string
  closed_at?: string
  penanggung_jawab?: string
  contractor_name?: string
  contractor_address?: string
  pj_phone?: string
  pj_jabatan?: string
  pj_photo?: string
  safety_officer_name?: string
  safety_officer_phone?: string
  safety_officer_license?: string
  safety_officer_expired?: string
  safety_officer_dokumen?: string
  safety_officer_photo?: string
  workers_count?: number
  workers_skill?: string
  alat_kerja?: string
  operator_name?: string
  licensi_alat_berat?: string
  tonase?: string
  utility_air?: string
  utility_air_qty?: string
  utility_gas?: string
  utility_gas_qty?: string
  utility_steam?: string
  utility_steam_qty?: string
  utility_listrik?: string
  utility_listrik_qty?: string
  jsa_sop?: string
  aspek_k3?: string
  aspek_lingkungan?: string
  identifikasi_bahaya?: string
  // V6.8 RADIUS + M2
  work_radius_m?: number // radius pekerjaan meter
  work_area_m2?: number // luas pekerjaan M2 auto πr²
  area_radius_m?: number // radius area
  factory_total_m2?: number
  // V6.8 Approval bertingkat
  approval_level?: number // 1 Owner, 2 Utility, 3 HSE/SHE, 4 Manager/GM
  current_approver_role?: string
  approval_history?: { level: number; role: string; name: string; status: 'approved'|'rejected'; date: string; note?: string }[]
  rejection_reason?: string
  created_at?: string
  workers_list?: any[]
  alat_list?: any[]
  kendaraan_list?: any[]
  jsa_list?: any[]
  k3_list?: any[]
  lingkungan_list?: any[]
}

export type Patrol = {
  id?: string
  title: string
  area_id: string
  work_permit_id?: string
  vendor_name?: string
  findings?: string
  status?: string
  patrol_type?: string
  created_at?: string
}

export const APP_CONFIG = {
  APP_NAME: 'CSMS INTEGRATED',
  VERSION: 'V6 MODULAR PERMANEN - RADIUS + M2 + APPROVAL 4 TINGKAT',
  COMPANY_DEFAULT: 'PT. CONSTRUCTION',
  SCORE_THRESHOLD: {
    LOLOS: 160,
    BERSYARAT: 140,
    MAX_SCORE: 200,
    MIN_SCORE: 60,
    TOTAL_QUESTIONS: 20,
  },
  SCORE_LEGEND: {
    LOLOS: '≥160 (80%) - LOLOS langsung bisa buat WP',
    BERSYARAT: '140-159 (70-79%) - BERSYARAT dengan catatan',
    TIDAK_LOLOS: '<140 (<70%) - TIDAK LOLOS harus perbaiki dulu',
  },
  OVERLAP: {
    CRITICAL_METER: 100,
    WARNING_METER: 250,
    // V6.8 RADIUS SYSTEM - General per factory
    USE_RADIUS: true, // true = pakai radius coverage, false = pakai point distance saja
    DEFAULT_WORK_RADIUS_M: 25, // default radius pekerjaan 25m (bisa diubah per WP)
    DEFAULT_AREA_RADIUS_M: 50, // default radius area 50m
    // Rumus overlap: distance < (radius1 + radius2) = OVERLAP
    // Untuk open area tanpa tembok: tetap hitung overlap walau beda area
    // Untuk closed area dengan tembok: hanya hitung jika area_id sama
  },
  // V6.8 FACTORY CONFIG - General per perusahaan, bisa di set di awal
  FACTORY: {
    DEFAULT_TOTAL_M2: 10000, // default luas factory 10.000 M2, bisa diubah per customer
    DEFAULT_OPEN_M2: 6000, // area terbuka tanpa tembok
    DEFAULT_CLOSED_M2: 4000, // area tertutup dengan tembok
    // Contoh: Factory 10.000 M2, radius total = sqrt(10000/π) = ~56m
    // Area terbuka 6000 M2 = bisa di set radius besar, overlap antar area dihitung
    // Area tertutup 4000 M2 = overlap hanya dalam area yang sama
  },
  // V6.8 APPROVAL FLOW BERTINGKAT - 4 tingkat + reject
  APPROVAL_FLOW: {
    LEVELS: [
      { level: 1, role: 'Owner Area', key: 'owner', desc: 'Pemilik area / Area Owner - cek kelengkapan data lapangan', can_reject: true },
      { level: 2, role: 'Utility', key: 'utility', desc: 'Utility - cek kebutuhan Water, Gas, Steam, Electric', can_reject: true },
      { level: 3, role: 'HSE/SHE', key: 'hse', desc: 'HSE/SHE - cek JSA, APD, K3, Lingkungan', can_reject: true },
      { level: 4, role: 'Manager HSE/GM', key: 'gm', desc: 'Manager HSE / GM - final approval, aktivasi WP', can_reject: true },
    ],
    REJECT_TO: 'draft', // jika reject balik ke draft untuk perbaiki
    // Flow: draft -> pending_owner -> pending_utility -> pending_hse -> pending_gm -> active -> closed
    // Bisa reject di tiap level -> rejected + alasan -> kembali ke draft
  },
  LICENSE: {
    TYPE: 'PERMANENT',
    EXPIRY: null,
  }
}

// Helper hitung radius dari M2: r = sqrt(area/π)
export function calcRadiusFromM2(m2: number): number {
  return Math.sqrt(m2 / Math.PI)
}
export function calcM2FromRadius(radius: number): number {
  return Math.PI * radius * radius
}
// Overlap pakai radius: distance < (r1 + r2) = overlap
export function isOverlapWithRadius(distance: number, r1: number, r2: number): boolean {
  return distance < (r1 + r2)
}

export const ELEMEN_TEMPLATE: Record<number, {name: string, questions: {no: string, text: string}[]}> = {
  1: { name: 'Komitmen & Kebijakan K3', questions: [
    {no:'1.1', text:'Kebijakan K3 tertulis ditandatangani direksi'},
    {no:'1.2', text:'Komitmen K3 disosialisasikan ke semua pekerja'},
    {no:'1.3', text:'Struktur organisasi K3 yang jelas'},
  ]},
  2: { name: 'Perencanaan K3 (HIRADC & JSA)', questions: [
    {no:'2.1', text:'HIRADC untuk semua pekerjaan'},
    {no:'2.2', text:'Prosedur kerja aman (JSA/SOP)'},
    {no:'2.3', text:'Target dan program K3 tahunan'},
  ]},
  3: { name: 'Implementasi (Training, APD, TBM)', questions: [
    {no:'3.1', text:'Induksi K3 & training sesuai risiko'},
    {no:'3.2', text:'APD disediakan & digunakan sesuai standar'},
    {no:'3.3', text:'Toolbox meeting harian'},
  ]},
  4: { name: 'Pemantauan & Evaluasi', questions: [
    {no:'4.1', text:'Inspeksi K3 rutin dicatat'},
    {no:'4.2', text:'Pengukuran kinerja K3 (leading/lagging)'},
    {no:'4.3', text:'Audit internal K3'},
  ]},
  5: { name: 'Pengendalian Dokumen & Pelaporan', questions: [
    {no:'5.1', text:'Dokumen K3 terkendali versi terbaru di lapangan'},
    {no:'5.2', text:'Sistem pelaporan insiden & near miss'},
  ]},
  6: { name: 'Manajemen Kontraktor', questions: [
    {no:'6.1', text:'Proses seleksi & evaluasi kontraktor berbasis K3'},
    {no:'6.2', text:'Kontraktor briefing K3 sebelum kerja'},
  ]},
  7: { name: 'Tanggap Darurat', questions: [
    {no:'7.1', text:'Prosedur tanggap darurat tersedia & disosialisasikan'},
    {no:'7.2', text:'Drill tanggap darurat periodik'},
  ]},
  8: { name: 'Tinjauan Manajemen', questions: [
    {no:'8.1', text:'Manajemen tinjauan K3 berkala'},
    {no:'8.2', text:'Continuous improvement dari audit/insiden'},
  ]},
}

export const WORKFLOW_STEPS = [
  { step:1, label:'Vendor Daftar', color:'bg-gray-100', desc:'Daftar + Score 8 Elemen' },
  { step:2, label:'Draft WP', color:'bg-gray-100', desc:'Isi form dasar + radius + M2' },
  { step:3, label:'Owner Area (L1)', color:'bg-blue-100', desc:'Tingkat 1 - Owner Area cek lapangan + bisa reject' },
  { step:4, label:'Utility (L2)', color:'bg-amber-100', desc:'Tingkat 2 - Utility cek Water/Gas/Steam/Electric + bisa reject' },
  { step:5, label:'HSE/SHE (L3)', color:'bg-orange-100', desc:'Tingkat 3 - HSE cek JSA/APD/K3/Lingkungan + bisa reject' },
  { step:6, label:'Manager HSE/GM (L4)', color:'bg-purple-100', desc:'Tingkat 4 - Manager HSE/GM final approval + bisa reject' },
  { step:7, label:'Active', color:'bg-green-100', desc:'Siap kerja + Mapping Radius Overlap' },
  { step:8, label:'Patrol', color:'bg-purple-100', desc:'E-Patrol Sync WP Active' },
  { step:9, label:'Closed', color:'bg-slate-100', desc:'Selesai + Final Report' },
]

export const AREAS_FALLBACK: Area[] = [
  { id: 'AREA-A', name: 'Area A - Office & Warehouse', lat: -6.201, lng: 106.801, type: 'closed', area_m2: 2000, radius_m: 25, is_open: false, factory_section: 'Factory Utama' },
  { id: 'AREA-B', name: 'Area B - Pipe Rack & Welding', lat: -6.202, lng: 106.802, type: 'open_without_wall', area_m2: 1500, radius_m: 22, is_open: true, factory_section: 'Factory Utama' },
  { id: 'AREA-C', name: 'Area C - Scaffolding & Structure', lat: -6.203, lng: 106.803, type: 'open_without_wall', area_m2: 3000, radius_m: 31, is_open: true, factory_section: 'Open Area' },
  { id: 'AREA-D', name: 'Area D - Tank Farm', lat: -6.204, lng: 106.804, type: 'closed', area_m2: 1000, radius_m: 18, is_open: false, factory_section: 'Utility' },
  { id: 'AREA-E', name: 'Area E - Electrical Substation', lat: -6.205, lng: 106.805, type: 'closed', area_m2: 800, radius_m: 16, is_open: false, factory_section: 'Utility' },
  { id: 'AREA-F', name: 'Area F - Excavation & Civil', lat: -6.206, lng: 106.806, type: 'open_without_wall', area_m2: 2500, radius_m: 28, is_open: true, factory_section: 'Open Area' },
]
