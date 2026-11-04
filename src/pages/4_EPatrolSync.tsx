// @ts-nocheck
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

type PatrolType = 'internal' | 'gabungan'
type StatusPatrol = 'safe' | 'warning' | 'overlap' | 'closed'

type KategoriTemuan = {
  group: string
  code: string
  label: string
  desc: string
  contoh: string
}

const KATEGORI_TEMUAN: KategoriTemuan[] = [
  { group: '1. Elemen CSMS (Prosedural & Sistem)', code: 'CSMS-ADM', label: 'Kepatuhan Administrasi (Administrative Compliance)', desc: 'Izin kerja tidak lengkap', contoh: 'Sika/PTW belum lengkap, JSA tidak tersedia, induksi belum dilakukan' },
  { group: '1. Elemen CSMS (Prosedural & Sistem)', code: 'CSMS-COMP', label: 'Kompetensi & Pelatihan (Competency & Training)', desc: 'Sertifikat tidak ada', contoh: 'SIO crane expired, welder tidak certified, scaffolder tanpa sertifikat' },
  { group: '1. Elemen CSMS (Prosedural & Sistem)', code: 'CSMS-MOC', label: 'Manajemen Perubahan (MOC)', desc: 'Perubahan metode kerja', contoh: 'Metode diubah tanpa review K3' },
  { group: '2. Fisik Lapangan (Unsafe Condition)', code: 'FISIK-APD', label: 'Alat Pelindung Diri (APD/PPE)', desc: 'APD tidak sesuai', contoh: 'Tidak pakai helmet, safety shoes, APD rusak, salah pakai' },
  { group: '2. Fisik Lapangan (Unsafe Condition)', code: 'FISIK-TOOLS', label: 'Peralatan & Perkakas (Tools & Equipment)', desc: 'Alat modifikasi / tidak inspeksi', contoh: 'Alat modifikasi, kabel terkelupas, tagging expired' },
  { group: '2. Fisik Lapangan (Unsafe Condition)', code: 'FISIK-HOUSE', label: 'Lingkungan Kerja & Housekeeping', desc: 'Lokasi berantakan', contoh: 'Material halangi evakuasi, ceceran oli/kimia, berantakan' },
  { group: '2. Fisik Lapangan (Unsafe Condition)', code: 'FISIK-BARIKADE', label: 'Pengamanan & Barikade (Barricading & Guarding)', desc: 'Area tanpa barikade', contoh: 'Lubang galian tanpa safety line, ketinggian tanpa barikade' },
  { group: '2. Fisik Lapangan (Unsafe Condition)', code: 'FISIK-EMER', label: 'Kesiapsiagaan Darurat (Emergency Preparedness)', desc: 'APAR / P3K tidak siap', contoh: 'APAR terhalang, P3K kosong, jalur evakuasi tidak jelas' },
  { group: '3. Perilaku Pekerja (Unsafe Act)', code: 'PERILAKU-SOP', label: 'Pelanggaran Prosedur (SOP Violation)', desc: 'Langgar SOP', contoh: 'Ketinggian tanpa harness, bypass pengaman mesin' },
  { group: '3. Perilaku Pekerja (Unsafe Act)', code: 'PERILAKU-POSISI', label: 'Posisi Kerja Berbahaya (Ergonomics & Positioning)', desc: 'Line of fire', contoh: 'Di bawah beban angkatan, posisi berisiko cedera' },
  { group: '3. Perilaku Pekerja (Unsafe Act)', code: 'PERILAKU-DISIPLIN', label: 'Kedisiplinan & Perilaku (Behavioral)', desc: 'Perilaku tidak aman', contoh: 'Bercanda berlebihan, merokok area terlarang, terburu-buru' },
  { group: '4. Tingkat Risiko (Prioritas)', code: 'RISK-CRITICAL', label: 'Kritis (Critical) - Stop Work', desc: 'Bisa fatality', contoh: 'Ruang terbatas tanpa detektor gas - WAJIB HENTI' },
  { group: '4. Tingkat Risiko (Prioritas)', code: 'RISK-MAJOR', label: 'Mayor (Major) - Perbaiki &lt;24 jam', desc: 'Cidera sedang-berat', contoh: 'Ketidaksesuaian berat standar K3' },
  { group: '4. Tingkat Risiko (Prioritas)', code: 'RISK-MINOR', label: 'Minor (Minor) - Perbaiki 3-7 hari', desc: 'Ringan administratif', contoh: 'Ketidaksesuaian ringan tidak bahaya langsung' },
]

type TemuanEntry = {
  id: number
  peserta: string
  subKategoriCode: string
  subKategoriLabel: string
  area: string
  temuan: string
  fotoBeforeName?: string
  fotoBeforeUrl?: string
  tindakan: string
  fotoAfterName?: string
  fotoAfterUrl?: string
  status: 'open' | 'progress' | 'closed'
}

type PesertaGabungan = {
  id: number
  nama: string
  jabatan: string
  bagian: string
}

export function EPatrolSync({ permits: propPermits = [], areas = [], vendors = [], usePatrolsHook = null, currentUser = null, appSettings = {} }: any) {
  const [patrols, setPatrols] = useState<any[]>([])
  const [activePermits, setActivePermits] = useState<any[]>([])
  const [filterRisk, setFilterRisk] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPatrolType, setFilterPatrolType] = useState('all')
  const [showOnlyActive, setShowOnlyActive] = useState(true) // FIX V36c: Filter hanya WP active dari file 2
  const [filterPeserta, setFilterPeserta] = useState('all') // FIX V37: Filter per peserta patrol - ide Bapak QR scan per peserta
  const [qrWP, setQrWP] = useState('') // FIX V37: QR Code untuk WP yang dipatrol
  const [showForm, setShowForm] = useState(false)
  const [patrolType, setPatrolType] = useState<PatrolType>('internal')
  const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString())

  // Form utama
  const [formData, setFormData] = useState<any>({
    nomor_wp: '', judul_pekerjaan: '', area_id: '', area_name: '', vendor_name: '',
    risk_level: 'medium', risk_score: 9, risk_likelihood: 3, risk_severity: 3,
    tgl_patrol: new Date().toISOString().split('T')[0],
    jam_patrol: new Date().toLocaleTimeString().slice(0,5),
    petugas: 'Safety Officer PT MRH',
    status_patrol: 'safe',
    tingkat_risiko: 'RISK-MINOR',
    batas_perbaikan: '3 hari',
    lat: -6.201, lng: 106.801, work_radius_m: 25
  })

  // V34 FIX: Multi select sub kategori - bukan radio single
  const [selectedSubKategori, setSelectedSubKategori] = useState<string[]>([])
  const [temuanList, setTemuanList] = useState<TemuanEntry[]>([])
  const [pesertaInternal, setPesertaInternal] = useState<string[]>(['Safety Officer PT MRH'])
  const [pesertaGabunganList, setPesertaGabunganList] = useState<PesertaGabungan[]>([
    { id: 1, nama: 'Budi Owner Area', jabatan: 'Owner Area E', bagian: 'Operation' },
    { id: 2, nama: 'Siti HSE', jabatan: 'HSE Officer', bagian: 'HSE' },
    { id: 3, nama: 'Joko Vendor', jabatan: 'Safety Vendor', bagian: 'PT MRH DigitalHub' },
  ])
  const [newPesertaNama, setNewPesertaNama] = useState('')
  const [newPesertaJabatan, setNewPesertaJabatan] = useState('')
  const [newPesertaBagian, setNewPesertaBagian] = useState('')

  // FIX V36b: Sync judul dari file 2 EWorkPermitFlow - cek semua kemungkinan kolom judul di Supabase work_permits
  const getJudulLengkap = (p:any) => {
    return (
      p.judul ||
      p.judul_pekerjaan ||
      p.pekerjaan ||
      p.nama_pekerjaan ||
      p.title ||
      p.deskripsi_pekerjaan ||
      p.pekerjaan_judul ||
      p.judul_pekerjaan_text ||
      p.judul_pekerjaan_original ||
      p.nama_pekerjaan_text ||
      p.pekerjaan_nama ||
      p.judul_text ||
      p.judul_pekerjaan_lengkap ||
      ''
    ).toString().trim()
  }

  const isWPActive = (p:any) => {
    // FIX V36c: Cek status approval dari file 2 EWorkPermitFlow - sync dengan DAFTAR WORK PERMIT
    const s1 = (p.status_approval || '').toString().toLowerCase()
    const s2 = (p.status || '').toString().toLowerCase()
    const s3 = (p.approval_status || '').toString().toLowerCase()
    const s4 = (p.statusApproval || '').toString().toLowerCase()
    // active bisa: active, approved_gm -> active, approved -> active, Level 5/4: GM approved -> Active
    if (s1.includes('active') || s2 === 'active' || s3.includes('active') || s4.includes('active')) return true
    if (s1.includes('approved_gm') && s1.includes('active')) return true
    if (s1 === 'active' || s2 === 'active' || s3 === 'active') return true
    return false
  }

  const generateQRUrl = (nomor_wp:string, pesertaNama:string, jabatan:string) => {
    // FIX V37: Ide Bapak - QR Code untuk nomer WP yang akan dipatrol - setiap peserta scan QR -> muncul form patrol 4 elemen
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://csms.mrhdigitalhub.com'
    return `${base}/patrol?wp=${encodeURIComponent(nomor_wp)}&peserta=${encodeURIComponent(pesertaNama)}&jabatan=${encodeURIComponent(jabatan)}&t=${Date.now()}`
  }

  const getRolePresets = (jabatan:string) => {
    // FIX V37: Ide saya - Role-based kategori preset - biar cepat sesuai jabatan
    const jb = jabatan.toLowerCase()
    if (jb.includes('owner')) return ['CSMS-MOC', 'RISK-CRITICAL', 'CSMS-ADM'] // Owner fokus MOC & Kritis
    if (jb.includes('hse')) return ['FISIK-APD', 'FISIK-TOOLS', 'FISIK-BARIKADE', 'FISIK-EMER', 'RISK-CRITICAL'] // HSE fokus APD, Tools, Barikade, Emergency
    if (jb.includes('vendor') || jb.includes('safety vendor')) return ['FISIK-HOUSE', 'PERILAKU-SOP', 'PERILAKU-POSISI', 'FISIK-TOOLS'] // Vendor fokus Housekeeping & Perilaku
    if (jb.includes('utility') || jb.includes('supervisor')) return ['FISIK-EMER', 'CSMS-COMP', 'RISK-MAJOR', 'FISIK-TOOLS'] // Utility fokus Emergency & Kompetensi
    return [] // default semua
  }




  useEffect(() => {
    loadActivePermits()
    loadPatrols()
    const channel = supabase.channel('e-patrol-v34')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'e_patrol' }, () => { loadPatrols(); setLastSync(new Date().toLocaleTimeString()) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_permits' }, () => { loadActivePermits(); setLastSync(new Date().toLocaleTimeString()) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [propPermits])


  // FIX V38: QR Scan di HP - Jika ?patrol=1&wp=...&peserta=... maka langsung tampilkan Form Temuan Patrol 4 Elemen + Upload Foto - Sync dengan file 4 E-Patrol
  const [qrMode, setQrMode] = useState(false)
  const [qrWp, setQrWp] = useState('')
  const [qrPeserta, setQrPeserta] = useState('')
  const [qrJabatan, setQrJabatan] = useState('')
  const [qrJudul, setQrJudul] = useState('')

  // FIX V39 - Ide Perbaikan Bapak - QR 2 Universal - Bisa dipakai siapa saja - Tidak perlu khusus per orang
  // Di Form E-Patrol nanti adalah Nama Peserta Patrol - Jabatan - Bagian Yang bisa diinput secara manual
  const [manualPeserta, setManualPeserta] = useState('')
  const [manualJabatan, setManualJabatan] = useState('')
  const [manualBagian, setManualBagian] = useState('')


  useEffect(()=>{
    const p = new URLSearchParams(window.location.search)
    if (p.get('patrol')==='1' || p.get('wp')) {
      setQrMode(true)
      setQrWp(p.get('wp')||'')
      setQrPeserta(p.get('peserta')||'')
      setQrJabatan(p.get('jabatan')||'')
      setQrJudul(p.get('judul')||'')
      // Auto set filter peserta jika bukan SCAN
      if (p.get('peserta') && p.get('peserta')!=='SCAN') {
        setFilterPeserta(p.get('peserta')!)
      }
    }
  }, [])

  // FIX V37b: QR Auto-open form 4 elemen - Baca URL ?wp=mrh-csmswp-2026-003&peserta=Siti HSE&jabatan=HSE Officer&mode=gabungan&autoOpen=1
  useEffect(()=>{
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const wpParam = params.get('wp')
    const pesertaParam = params.get('peserta')
    const jabatanParam = params.get('jabatan')
    const modeParam = params.get('mode') as PatrolType || 'gabungan'
    const autoOpen = params.get('autoOpen')
    if (wpParam) {
      // Cari permit dengan nomor_wp = wpParam
      const found = activePermits.find((p:any)=> p.nomor_wp===wpParam || p.nomor_wp?.includes(wpParam) || wpParam.includes(p.nomor_wp))
      if (found) {
        // Auto set peserta jika ada
        if (pesertaParam && pesertaParam !== 'SCAN') {
          // Jika pesertaParam ada, set filterPeserta dan tambahkan ke pesertaGabunganList jika belum ada
          setFilterPeserta(pesertaParam)
          if (jabatanParam) {
            setPesertaGabunganList(prev=>{
              const exists = prev.find(p=>p.nama===pesertaParam)
              if (exists) return prev
              return [...prev, { id: Date.now(), nama: pesertaParam, jabatan: jabatanParam, bagian: 'Auto dari QR Scan' }]
            })
          }
        }
        // Auto open form patrol gabungan/internal sesuai mode
        const type = modeParam==='internal' ? 'internal' : 'gabungan'
        // Delay sedikit biar activePermits sudah load
        setTimeout(()=> startPatrol(found, type), 800)
        // Jika autoOpen=1, langsung scroll ke form
        if (autoOpen==='1') {
          setQrWP(wpParam)
        }
      } else if (activePermits.length>0) {
        // Jika belum ketemu tapi activePermits sudah ada, coba lagi cari dengan includes
        const found2 = activePermits.find((p:any)=> p.nomor_wp?.toLowerCase().includes(wpParam.toLowerCase()) || wpParam.toLowerCase().includes(p.nomor_wp?.toLowerCase()))
        if (found2) {
          setTimeout(()=> startPatrol(found2, (modeParam as PatrolType)||'gabungan'), 800)
        }
      }
    }
  }, [activePermits])



  const loadActivePermits = async () => {
    try {
      const { data } = await supabase.from('work_permits').select('*').order('created_at',{ascending:false}).limit(20)
      let list = (data && data.length>0) ? data : (propPermits || [])
      // FIX V36b: Normalize judul dari file 2 - sync dengan 2_EWorkPermitFlow.tsx - biar WP 001/002 tidak abu-abu —Judul belum diisi—
      list = list.map((p:any)=>{
        const j = getJudulLengkap(p)
        return { ...p, judul: j || p.judul, judul_pekerjaan: j || p.judul_pekerjaan }
      })
      setActivePermits(list.slice(0,10))
    } catch {
      let list = (propPermits || []).slice(0,10)
      list = list.map((p:any)=>{
        const j = getJudulLengkap(p)
        return { ...p, judul: j || p.judul, judul_pekerjaan: j || p.judul_pekerjaan }
      })
      setActivePermits(list)
    }
    setLastSync(new Date().toLocaleTimeString())
  }

  const loadPatrols = async () => {
    try {
      const { data } = await supabase.from('e_patrol').select('*').order('created_at',{ascending:false}).limit(100)
      if (data) setPatrols(data)
      else if (usePatrolsHook?.patrols) setPatrols(usePatrolsHook.patrols)
    } catch {
      if (usePatrolsHook?.patrols) setPatrols(usePatrolsHook.patrols)
    }
  }

  const getRiskColor = (level:string) => {
    if (level==='high') return { bg:'bg-red-600', dot:'🔴' }
    if (level==='medium') return { bg:'bg-yellow-400', dot:'🟡' }
    return { bg:'bg-green-500', dot:'🟢' }
  }
  const getStatusColor = (status:string) => {
    if (status==='overlap') return { bg:'bg-red-600', text:'OVERLAP', dot:'🔴' }
    if (status==='warning') return { bg:'bg-yellow-400', text:'WARNING', dot:'🟡' }
    if (status==='safe') return { bg:'bg-green-500', text:'SAFE', dot:'🟢' }
    return { bg:'bg-slate-400', text:'CLOSED', dot:'⚪' }
  }
  const getTingkatBadge = (kode:string) => {
    if (kode==='RISK-CRITICAL') return { bg:'bg-red-700', text:'KRITIS - Stop Work', dot:'🔴' }
    if (kode==='RISK-MAJOR') return { bg:'bg-orange-500', text:'MAYOR &lt;24 jam', dot:'🟠' }
    return { bg:'bg-yellow-400', text:'MINOR 3-7 hari', dot:'🟡' }
  }

  const filteredPatrols = useMemo(()=>{
    return patrols.filter((p:any)=>{
      if (filterRisk!=='all' && (p.risk_level||'medium')!==filterRisk) return false
      if (filterStatus!=='all' && p.status_patrol!==filterStatus) return false
      if (filterPatrolType!=='all' && (p.patrol_type||'internal')!==filterPatrolType) return false
      return true
    })
  }, [patrols, filterRisk, filterStatus, filterPatrolType])

  const safeCount = patrols.filter(p=>p.status_patrol==='safe').length
  const warningCount = patrols.filter(p=>p.status_patrol==='warning').length
  const overlapCount = patrols.filter(p=>p.status_patrol==='overlap').length
  const internalCount = patrols.filter(p=>(p.patrol_type||'internal')==='internal').length
  const gabunganCount = patrols.filter(p=>p.patrol_type==='gabungan').length

  // V34 FIX: Toggle multi select - pilih salah satu tidak hapus yang sudah dipilih
  const toggleSubKategori = (code:string) => {
    const exists = selectedSubKategori.includes(code)
    let newSelected: string[]
    if (exists) {
      newSelected = selectedSubKategori.filter(c=>c!==code)
      // hapus dari temuanList
      setTemuanList(prev=>prev.filter(t=>t.subKategoriCode!==code))
    } else {
      newSelected = [...selectedSubKategori, code]
      // auto tambah ke temuanList
      const kat = KATEGORI_TEMUAN.find(k=>k.code===code)
      if (kat) {
        const defaultPeserta = patrolType==='internal' ? (pesertaInternal[0]||formData.petugas) : (pesertaGabunganList[0]?.nama||formData.petugas)
        const newEntry: TemuanEntry = {
          id: Date.now() + Math.floor(Math.random()*1000),
          peserta: defaultPeserta,
          subKategoriCode: kat.code,
          subKategoriLabel: kat.label,
          area: formData.area_name || formData.area_id,
          temuan: `${kat.label} - ${kat.contoh}`,
          tindakan: kat.code.includes('CRITICAL') ? 'HENTIKAN PEKERJAAN - Stop Work Authority - Evakuasi - Pasang detektor gas - HSE approve' : kat.code.includes('MAJOR') ? 'Perbaiki &lt;24 jam - Ganti APD, perbaiki barikade, rapikan housekeeping' : 'Perbaiki 3-7 hari - Lengkapi administrasi, tegur disiplin',
          status: 'open'
        }
        setTemuanList(prev=>[...prev, newEntry])
      }
    }
    setSelectedSubKategori(newSelected)
  }

  const startPatrol = (permit:any, type:PatrolType) => {
    setPatrolType(type)
    setSelectedSubKategori([])
    setTemuanList([])
    setFormData({
      nomor_wp: permit.nomor_wp,
      judul_pekerjaan: permit.judul || permit.judul_pekerjaan,
      area_id: permit.area_id,
      area_name: permit.area_name || permit.area_id,
      vendor_name: permit.vendor_name,
      risk_level: permit.risk_level || 'medium',
      risk_score: permit.risk_score || 9,
      risk_likelihood: permit.risk_likelihood || 3,
      risk_severity: permit.risk_severity || 3,
      tgl_patrol: new Date().toISOString().split('T')[0],
      jam_patrol: new Date().toLocaleTimeString().slice(0,5),
      petugas: type==='internal' ? 'Safety Officer PT MRH' : 'Tim Gabungan Owner+HSE+Vendor',
      status_patrol: 'safe',
      tingkat_risiko: 'RISK-MINOR',
      batas_perbaikan: '3 hari',
      lat: permit.lat, lng: permit.lng, work_radius_m: permit.work_radius_m || 25
    })
    setShowForm(true)
  }

  const addPesertaGabungan = () => {
    if (!newPesertaNama) return
    setPesertaGabunganList(prev=>[...prev, { id: Date.now(), nama: newPesertaNama, jabatan: newPesertaJabatan||'Peserta', bagian: newPesertaBagian||'Umum' }])
    setNewPesertaNama(''); setNewPesertaJabatan(''); setNewPesertaBagian('')
  }

  const updateTemuanField = (id:number, field:string, value:string) => {
    setTemuanList(prev=>prev.map(t=> t.id===id ? { ...t, [field]: value } : t))
  }

  const handleFotoBefore = (id:number, file:File) => {
    const url = URL.createObjectURL(file)
    setTemuanList(prev=>prev.map(t=> t.id===id ? { ...t, fotoBeforeName: file.name, fotoBeforeUrl: url } : t))
  }
  const handleFotoAfter = (id:number, file:File) => {
    const url = URL.createObjectURL(file)
    setTemuanList(prev=>prev.map(t=> t.id===id ? { ...t, fotoAfterName: file.name, fotoAfterUrl: url, status: 'closed' } : t))
  }
  const clearFotoBefore = (id:number) => {
    setTemuanList(prev=>prev.map(t=> t.id===id ? { ...t, fotoBeforeName: undefined, fotoBeforeUrl: undefined } : t))
  }
  const clearFotoAfter = (id:number) => {
    setTemuanList(prev=>prev.map(t=> t.id===id ? { ...t, fotoAfterName: undefined, fotoAfterUrl: undefined, status: 'open' } : t))
  }
  const deleteTemuanRow = (id:number) => {
    const row = temuanList.find(t=>t.id===id)
    if (row) setSelectedSubKategori(prev=>prev.filter(c=>c!==row.subKategoriCode))
    setTemuanList(prev=>prev.filter(t=>t.id!==id))
  }

  const savePatrol = async () => {
    const payload = {
      nomor_wp: formData.nomor_wp,
      judul_pekerjaan: formData.judul_pekerjaan,
      area_id: formData.area_id,
      area_name: formData.area_name,
      vendor_name: formData.vendor_name,
      risk_level: formData.risk_level,
      risk_score: formData.risk_score,
      risk_likelihood: formData.risk_likelihood,
      risk_severity: formData.risk_severity,
      tgl_patrol: formData.tgl_patrol,
      jam_patrol: formData.jam_patrol,
      patrol_type: patrolType,
      petugas: formData.petugas,
      status_patrol: formData.status_patrol,
      tingkat_risiko: formData.tingkat_risiko,
      batas_perbaikan: formData.batas_perbaikan,
      kategori_temuan_list: selectedSubKategori,
      temuan_list: temuanList,
      peserta_internal: pesertaInternal,
      peserta_gabungan: pesertaGabunganList,
      kategori: selectedSubKategori.join(','),
      temuan: temuanList.map(t=>`[${t.subKategoriCode}] ${t.temuan}`).join(' | '),
      tindakan: temuanList.map(t=>t.tindakan).join(' | '),
      lat: formData.lat, lng: formData.lng, work_radius_m: formData.work_radius_m,
      created_at: new Date().toISOString()
    }
    try {
      const { error } = await supabase.from('e_patrol').insert(payload)
      if (error) throw error
      setShowForm(false); loadPatrols()
    } catch {
      setPatrols(prev=>[{...payload, id: Date.now().toString()} as any, ...prev])
      setShowForm(false)
    }
  }

  const kategoriByGroup = useMemo(()=>{
    const groups: any = {}
    KATEGORI_TEMUAN.forEach(k=>{
      if (!groups[k.group]) groups[k.group]=[]
      groups[k.group].push(k)
    })
    return groups
  }, [])

  return (
    <div className="space-y-4 p-2">
      <div className="grid grid-cols-8 gap-2">
        <div className="bg-white border rounded-lg p-3 text-center"><p className="text-[10px]">WP Siap Patrol</p><p className="font-black">{activePermits.length}</p><p className="text-[8px]">Sync {lastSync}</p></div>
        <div className="bg-white border rounded-lg p-3 text-center"><p className="text-[10px]">Total Patrol</p><p className="font-black">{patrols.length}</p><p className="text-[8px]">{internalCount} Int {gabunganCount} Gab</p></div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center"><p className="text-[10px]">🔵 Internal</p><p className="font-black text-blue-700">{internalCount}</p><p className="text-[8px]">SO PT MRH</p></div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center"><p className="text-[10px]">🟣 Gabungan</p><p className="font-black text-purple-700">{gabunganCount}</p><p className="text-[8px]">Owner+HSE+Vendor</p></div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center"><p className="text-[10px]">🟢 SAFE</p><p className="font-black text-green-600">{safeCount}</p></div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center"><p className="text-[10px]">🟡 WARNING</p><p className="font-black">{warningCount}</p></div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center"><p className="text-[10px]">🔴 OVERLAP</p><p className="font-black text-red-600">{overlapCount}</p></div>
        <div className="bg-slate-900 text-white rounded-lg p-3 text-center"><p className="text-[10px]">Avg CSMS</p><p className="font-black">{patrols.length>0 ? Math.round((safeCount*100 + warningCount*70 + overlapCount*30)/patrols.length) : 0}</p></div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[11px]">
        <p className="font-bold">🚓 E-PATROL V34 FIX - Multi Select Sub Kategori Tanpa Hapus - Tabel Temuan + Foto Before/After - Internal Peserta List - Gabungan Peserta Jabatan Bagian - Tanpa Utility</p>
        <p className="mt-1">BUG FIX: Sebelumnya radio single - klik sub lain pindah & hapus yang sudah dipilih - Sekarang checkbox multi - pilih salah satu tidak hapus yang lain - Auto muncul di temuan patrol tabel No-Peserta-Sub Kategori-Area-Temuan-Upload Foto - Tindakan juga dari sub kategori sama - Sync upload foto after perbaikan.</p>
        <p className="mt-1">Internal: Tabel No-Peserta Patrol-Sub Kategori-Area-Temuan Patrol (text)-Upload dokumen photo bisa view download untuk Tindakan Perbaikan nya juga dibuat dari sub kategori temuan patrol dengan tabel kolom yang sama sehingga bisa sync dan ada upload dokumen photo after perbaikan.</p>
        <p className="mt-1">Gabungan: Konsep sama + tabel peserta No-Peserta-Jabatan-Bagian.</p>
        <p className="mt-1">Sync {lastSync} | WP {activePermits.length} | Total {patrols.length} Int {internalCount} Gab {gabunganCount} | Safe {safeCount} Warning {warningCount} Overlap {overlapCount}</p>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2 text-[11px]">
          <div className="font-black">📱 QR Patrol Per Peserta - Auto-open Form 4 Elemen - Konfirmasi: Scan QR di A4 Print - Langsung Buka Form Temuan Patrol</div>
          <div className="mt-1">QR URL: {typeof window !== 'undefined' ? `${window.location.origin}/patrol?wp=${activePermits[0]?.nomor_wp||'mrh-csmswp-2026-003'}&peserta=SCAN&mode=gabungan&autoOpen=1` : 'https://csms.mrhdigitalhub.com/patrol?wp=mrh-csmswp-2026-003&peserta=SCAN&mode=gabungan&autoOpen=1'} - Scan pakai HP - Auto open Form E-Patrol Gabungan - mrh-csmswp-2026-003 - TEST STRIC AREA E - Filter per peserta - Role-based preset - Submit ke WP untuk perbaikan kontraktor - Nama 0 = Belum scan/submit</div>
        </div>
        
        {qrMode && (
          <div className="bg-green-100 border-2 border-green-500 rounded-lg p-3 mb-3">
            <div className="font-black text-sm">📱 QR Scan Terdeteksi - HP - {qrWp} - {qrJudul || 'TEST STRIC AREA E'}</div>
            <div className="text-xs mt-1">Peserta: <b>{qrPeserta || 'SCAN - Pilih Peserta di bawah'}</b> - Jabatan: {qrJabatan || '-'} - Area: {new URLSearchParams(window.location.search).get('area')||'Area E'} - Vendor: {new URLSearchParams(window.location.search).get('vendor')||'PT MRH DigitalHub'}</div>
            <div className="text-[11px] mt-1">Info WP sudah ada dari QR - Sekarang Form Temuan Patrol 4 Elemen + Upload Foto Before/After sudah muncul di bawah - Pilih Peserta Patrol - Centang Kategori Temuan 4 Kelompok - Upload Foto Before - Submit ke WP untuk perbaikan kontraktor - Nama 0 = Belum scan/submit - Ide Perbaikan Bapak V27 - 2 QR Besar - QR2 Universal - Role-based preset</div>
          </div>
        )}

        <div className="flex justify-between items-center mb-2">
          <h3 className="font-black text-sm">Active WP Siap Patrol - {activePermits.filter(p=>!showOnlyActive || isWPActive(p)).length} WP {showOnlyActive ? '(Active Only)' : '(Semua)'} - Internal / Gabungan - Sync {lastSync}</h3>
          <div className="flex gap-1">
            <button onClick={()=>setShowOnlyActive(true)} className={`px-3 py-1 rounded text-xs font-bold ${showOnlyActive?'bg-green-600 text-white':'bg-white border'}`}>✅ Active Only - {activePermits.filter(isWPActive).length}</button>
            <button onClick={()=>setShowOnlyActive(false)} className={`px-3 py-1 rounded text-xs font-bold ${!showOnlyActive?'bg-slate-800 text-white':'bg-white border'}`}>📋 Semua WP - {activePermits.length}</button>
          </div>
        </div>
        <div className="flex gap-2 mb-3">
          <select value={filterRisk} onChange={e=>setFilterRisk(e.target.value)} className="border p-2 rounded text-xs"><option value="all">Semua Risk</option><option value="low">🟢 LOW 1-4</option><option value="medium">🟡 MEDIUM 5-12</option><option value="high">🔴 HIGH 13-25</option></select>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} className="border p-2 rounded text-xs"><option value="all">Semua Status</option><option value="safe">🟢 SAFE</option><option value="warning">🟡 WARNING</option><option value="overlap">🔴 OVERLAP</option></select>
          <select value={filterPatrolType} onChange={e=>setFilterPatrolType(e.target.value)} className="border p-2 rounded text-xs"><option value="all">Semua Type</option><option value="internal">🔵 Internal</option><option value="gabungan">🟣 Gabungan</option></select>
        </div>
        {activePermits.filter(p=>!showOnlyActive || isWPActive(p)).length===0 ? <div className="border-dashed border-2 border-green-300 bg-green-50 rounded-xl p-8 text-center">{showOnlyActive ? `0 WP Active - ${activePermits.length} WP pending_owner - Aktifkan di 2.E-Work Permit (Approval 4 Tingkat)` : `0 Active WP - Buat WP di 2.E-Work Permit`}</div> : (
          <div className="grid grid-cols-3 gap-2 items-stretch">
            {activePermits.filter((p:any)=>{ if (showOnlyActive && !isWPActive(p)) return false; if (filterRisk!=='all' && (p.risk_level||'medium')!==filterRisk) return false; return true; }).map((p:any,i:number)=>{
              const color = getRiskColor(p.risk_level||'medium')
              return (
                <div key={p.id||i} className={`border-2 rounded-lg p-2 ${color.bg==='bg-red-600'?'bg-red-50 border-red-300':color.bg==='bg-yellow-400'?'bg-yellow-50 border-yellow-300':'bg-green-50 border-green-300'} flex flex-col justify-between h-full min-h-[132px]`}>
                  <div>
                  <div className="flex justify-between"><span className="font-bold text-xs font-mono">{p.nomor_wp}</span><span className={`${color.bg} text-white px-1.5 py-0.5 rounded text-[9px]`}>{color.dot} {(p.risk_level||'medium').toUpperCase()} {p.risk_score||9}</span></div>
                  <div className={`text-[11px] font-bold mt-1 min-h-[18px] leading-tight ${getJudulLengkap(p)?'text-slate-900':'text-slate-400 italic'}`}>{getJudulLengkap(p)||'— Judul belum diisi —'}</div>
                  <div className="text-[10px]">{p.area_name||p.area_id} | {p.vendor_name}</div>
                  </div>
                  <div className="flex gap-1 mt-auto pt-2"><button onClick={()=>startPatrol(p,'internal')} className="flex-1 bg-blue-600 text-white py-1 rounded text-xs font-bold hover:bg-blue-700">🔵 Internal</button><button onClick={()=>startPatrol(p,'gabungan')} className="flex-1 bg-purple-600 text-white py-1 rounded text-xs font-bold hover:bg-purple-700">🟣 Gabungan</button></div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h3 className="font-black text-sm mb-2">History E-Patrol - {filteredPatrols.length} - Sync {lastSync}</h3>
        <div className="overflow-auto max-h-[400px] border rounded-lg">
          <table className="w-full text-xs"><thead><tr className="bg-slate-800 text-white"><th className="p-2 text-left">Tgl/Jam + Type</th><th className="p-2 text-left">No WP + Risk</th><th className="p-2 text-left">Peserta + Kategori</th><th className="p-2 text-left">Temuan + Foto Before + Tindakan + Foto After</th></tr></thead>
            <tbody>
              {filteredPatrols.map((p:any,i:number)=>{
                const riskColor = getRiskColor(p.risk_level||'medium')
                const statusColor = getStatusColor(p.status_patrol||'safe')
                const tingkatBadge = getTingkatBadge(p.tingkat_risiko||'RISK-MINOR')
                const list = p.temuan_list || []
                return (
                  <tr key={p.id||i} className="border-b hover:bg-slate-50">
                    <td className="p-2"><div className="font-bold">{p.tgl_patrol} {p.jam_patrol}</div><div className={`text-[9px] px-1.5 py-0.5 rounded font-bold inline-block mt-1 ${p.patrol_type==='gabungan'?'bg-purple-600 text-white':'bg-blue-600 text-white'}`}>{p.patrol_type==='gabungan'?'🟣 GABUNGAN':'🔵 INTERNAL'}</div><div className={`${statusColor.bg} text-white px-1 py-0.5 rounded text-[9px] inline-block mt-1 ml-1`}>{statusColor.dot} {statusColor.text}</div><div className={`${tingkatBadge.bg} text-white px-1 py-0.5 rounded text-[9px] inline-block mt-1`}>{tingkatBadge.dot} {tingkatBadge.text}</div></td>
                    <td className="p-2"><div className="font-mono font-bold">{p.nomor_wp} {riskColor.dot}</div><div className={`${riskColor.bg} text-white px-1 py-0.5 rounded text-[9px] inline-block mt-1`}>{(p.risk_level||'medium').toUpperCase()} {p.risk_score||9}</div><div className="text-[10px] mt-1">{p.judul_pekerjaan}</div></td>
                    <td className="p-2"><div className="text-[10px]"><b>Peserta:</b> {p.petugas}</div><div className="text-[10px]"><b>Kategori:</b> {p.kategori||p.kategori_temuan_list?.join(', ')||'-'}</div><div className="text-[9px] text-slate-500">{list.length} temuan - {p.peserta_gabungan?.length||0} peserta gabungan</div></td>
                    <td className="p-2">
                      {list.length>0 ? list.map((t:any,idx:number)=>(
                        <div key={idx} className="border rounded p-1 mb-1 bg-slate-50">
                          <div className="font-bold text-[10px]">{idx+1}. {t.subKategoriCode} - {t.subKategoriLabel} - Area {t.area} - Peserta {t.peserta}</div>
                          <div className="text-[10px]"><b>Temuan:</b> {t.temuan} {t.fotoBeforeName && <span className="bg-blue-100 px-1 rounded">📷 {t.fotoBeforeName} <a href={t.fotoBeforeUrl} target="_blank" className="text-blue-600 underline">View</a></span>}</div>
                          <div className="text-[10px]"><b>Tindakan:</b> {t.tindakan} {t.fotoAfterName && <span className="bg-green-100 px-1 rounded">📷 After {t.fotoAfterName} <a href={t.fotoAfterUrl} target="_blank" className="text-green-600 underline">View</a> Status {t.status}</span>}</div>
                        </div>
                      )) : <div className="text-[10px]">{p.temuan||'-'} | {p.tindakan||'-'}</div>}
                    </td>
                  </tr>
                )
              })}
              {filteredPatrols.length===0 && <tr><td colSpan={4} className="p-6 text-center text-gray-400">Belum ada patrol - Klik Internal / Gabungan di atas</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-xl w-full max-w-6xl max-h-[98vh] overflow-auto">
            <div className={`${patrolType==='gabungan'?'bg-purple-700':'bg-blue-700'} text-white p-4 flex justify-between items-center`}>
              <div><div className="font-black text-sm flex items-center gap-2">
                    <span>{patrolType==='gabungan'?'🟣 Form E-Patrol Gabungan':'🔵 Form E-Patrol Internal'} - {formData.nomor_wp} - {formData.judul_pekerjaan}</span>
                    {patrolType==='gabungan' && <span className="bg-white/20 px-2 py-0.5 rounded text-[10px]">📱 QR: {generateQRUrl(formData.nomor_wp, pesertaGabunganList[0]?.nama||'Peserta', pesertaGabunganList[0]?.jabatan||'').slice(0,60)}... - Scan per peserta - Submit per peserta ke WP</span>}
                  </div><div className="text-[11px] mt-1">Area: {formData.area_name} | Vendor: {formData.vendor_name} | Risk: {formData.risk_level} {formData.risk_score} ({formData.risk_likelihood}x{formData.risk_severity}) | Type: {patrolType==='gabungan'?'Owner+HSE+Vendor Mingguan Formal Berita Acara':'Safety Officer PT MRH Harian Rutin 1 orang'} | Selected: {selectedSubKategori.length} sub kategori - Multi select tanpa hapus</div></div>
              <button onClick={()=>setShowForm(false)} className="bg-white/20 px-3 py-1 rounded text-xs">✕ Tutup</button>
            </div>

            <div className="p-4 space-y-4 text-xs">
              {/* Patrol Type Switch */}
              <div className="grid grid-cols-2 gap-2">
                <button onClick={()=>setPatrolType('internal')} className={`py-2 rounded font-black ${patrolType==='internal'?'bg-blue-600 text-white':'bg-white border'}`}>🔵 Patrol Internal - Safety Officer PT MRH - Harian Rutin - 1 orang - Cek APD, Tools, Housekeeping - Multi select tidak hapus</button>
                <button onClick={()=>setPatrolType('gabungan')} className={`py-2 rounded font-black ${patrolType==='gabungan'?'bg-purple-600 text-white':'bg-white border'}`}>🟣 Patrol Gabungan - Owner+HSE+Vendor - Mingguan Formal - Berita Acara - Cek Kritis, MOC, Overlap - Multi select</button>
              </div>

              <div className="grid grid-cols-4 gap-3">
                <div><label className="font-bold">Tgl Patrol</label><input type="date" value={formData.tgl_patrol} onChange={e=>setFormData({...formData, tgl_patrol: e.target.value})} className="w-full border p-2 rounded mt-1"/></div>
                <div><label className="font-bold">Jam Patrol</label><input type="time" value={formData.jam_patrol} onChange={e=>setFormData({...formData, jam_patrol: e.target.value})} className="w-full border p-2 rounded mt-1"/></div>
                <div><label className="font-bold">Status Patrol</label><select value={formData.status_patrol} onChange={e=>setFormData({...formData, status_patrol: e.target.value})} className="w-full border p-2 rounded mt-1 font-bold"><option value="safe">🟢 SAFE - Aman lanjut - Pion Hijau - CSMS +10</option><option value="warning">🟡 WARNING - Hati-hati overlap open - Pion Kuning - CSMS -5</option><option value="overlap">🔴 OVERLAP - Stop reschedule - Pion Merah - CSMS -15</option><option value="closed">⚪ CLOSED - Selesai</option></select></div>
                <div><label className="font-bold">Batas Perbaikan</label><select value={formData.batas_perbaikan} onChange={e=>setFormData({...formData, batas_perbaikan: e.target.value})} className="w-full border p-2 rounded mt-1"><option value="Langsung">Langsung di tempat</option><option value="&lt;24 jam">Mayor &lt;24 jam</option><option value="3 hari">Minor 3 hari</option><option value="7 hari">Minor 7 hari</option><option value="Stop Work">Kritis - Stop Work Authority</option></select></div>
              </div>

              {/* PESERTA - INTERNAL vs GABUNGAN */}
              {patrolType==='internal' ? (
                <div className="border-2 border-blue-300 rounded-xl p-3 bg-blue-50">
                  <div className="font-black text-xs">🔵 Peserta Patrol Internal - No - Peserta Patrol - Untuk Tabel Temuan No-Peserta-Sub Kategori-Area-Temuan-Upload Foto Before - Tindakan-Upload Foto After</div>
                  <div className="mt-2 flex gap-2"><input value={pesertaInternal[0]||''} onChange={e=>setPesertaInternal([e.target.value])} className="flex-1 border p-2 rounded bg-white" placeholder="Safety Officer PT MRH"/><span className="text-[10px] self-center">Peserta internal bisa 1-2 orang - Nama akan muncul di tabel temuan - Kolom No-Peserta-Sub Kategori-Area-Temuan-Upload Foto</span></div>
                </div>
              ) : (
                <div className="border-2 border-purple-300 rounded-xl p-3 bg-purple-50">
                  <div className="font-black text-xs">🟣 Peserta Patrol Gabungan - Tabel No - Peserta Patrol - Jabatan - Bagian - Inti Perbedaan Internal vs Gabungan</div>
                  <div className="mt-2 grid grid-cols-4 gap-2"><input value={newPesertaNama} onChange={e=>setNewPesertaNama(e.target.value)} placeholder="Nama Peserta" className="border p-2 rounded bg-white"/><input value={newPesertaJabatan} onChange={e=>setNewPesertaJabatan(e.target.value)} placeholder="Jabatan" className="border p-2 rounded bg-white"/><input value={newPesertaBagian} onChange={e=>setNewPesertaBagian(e.target.value)} placeholder="Bagian" className="border p-2 rounded bg-white"/><button onClick={addPesertaGabungan} className="bg-purple-600 text-white rounded font-bold">+ Tambah Peserta</button></div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {pesertaGabunganList.map(p=> (
                      <button key={p.id} onClick={()=>{ const presets = getRolePresets(p.jabatan); setSelectedSubKategori(presets); /* auto generate temuanList for this peserta */ const newList: any[] = []; presets.forEach(code=>{ const kat = KATEGORI_TEMUAN.find(k=>k.code===code); if(kat){ newList.push({ id: Date.now()+Math.floor(Math.random()*1000), peserta: p.nama, subKategoriCode: kat.code, subKategoriLabel: kat.label, area: formData.area_name||formData.area_id, temuan: `${kat.label} - ${kat.contoh}`, tindakan: kat.code.includes('CRITICAL') ? 'HENTIKAN PEKERJAAN - Stop Work Authority' : kat.code.includes('MAJOR') ? 'Perbaiki <24 jam' : 'Perbaiki 3-7 hari', status: 'open' }) } }); setTemuanList(prev=> [...prev.filter(t=>t.peserta!==p.nama), ...newList]); setFilterPeserta(p.nama) }} className="px-2 py-1 bg-purple-100 border border-purple-300 rounded text-[10px] font-bold hover:bg-purple-200">⚡ Preset {p.nama.split(' ')[0]}: {getRolePresets(p.jabatan).join(', ')||'Semua'}</button>
                    ))}
                  </div>
                  <table className="w-full mt-2 text-[11px] bg-white border rounded">
                    <thead><tr className="bg-purple-100"><th className="p-2">No</th><th className="p-2 text-left">Peserta Patrol</th><th className="p-2 text-left">Jabatan</th><th className="p-2 text-left">Bagian</th><th className="p-2">Aksi</th></tr></thead>
                    <tbody>{pesertaGabunganList.map((p,idx)=><tr key={p.id} className="border-t"><td className="p-2 text-center">{idx+1}</td><td className="p-2 font-bold">{p.nama}</td><td className="p-2">{p.jabatan}</td><td className="p-2">{p.bagian}</td><td className="p-2 text-center"><button onClick={()=>setPesertaGabunganList(prev=>prev.filter(x=>x.id!==p.id))} className="text-red-600">✕</button></td></tr>)}</tbody>
                  </table>
                  <div className="text-[10px] mt-1">Tabel No-Peserta-Jabatan-Bagian - Inti perbedaan patrol gabungan - Peserta gabungan inti untuk berita acara formal mingguan.</div>
                </div>
              )}

              {/* KATEGORI TEMUAN MULTI SELECT - FIX BUG RADIO */}
              <div className="border-2 border-orange-300 rounded-xl overflow-hidden bg-orange-50">
                <div className="bg-orange-100 p-2 font-black text-xs">📋 Kategori Temuan Patrol - 4 Kelompok Referensi CSMS - FIX BUG: Checkbox Multi Select - Pilih salah satu tidak hapus yang sudah dipilih - Sebelumnya radio single - Sekarang multi - Auto muncul di tabel temuan</div>
                <div className="p-3 bg-white space-y-3 max-h-[300px] overflow-auto">
                  {Object.entries(kategoriByGroup).map(([group, items]:any)=>(
                    <div key={group} className="border rounded-lg p-2">
                      <div className="font-black text-[11px] mb-1">{group} - {items.length} sub</div>
                      <div className="grid grid-cols-1 gap-1">
                        {items.map((k:any)=>(
                          <label key={k.code} className={`flex items-start gap-2 border rounded px-2 py-1 cursor-pointer hover:bg-slate-50 ${selectedSubKategori.includes(k.code)?'bg-blue-50 border-blue-400 ring-1 ring-blue-400':''}`}>
                            <input type="checkbox" checked={selectedSubKategori.includes(k.code)} onChange={()=>toggleSubKategori(k.code)} className="mt-1"/>
                            <div className="flex-1"><div className="font-bold text-[11px]">{k.code} - {k.label} {selectedSubKategori.includes(k.code) && <span className="bg-blue-600 text-white px-1 rounded text-[9px]">✓ Terpilih - Muncul di tabel temuan auto</span>}</div><div className="text-[10px] text-slate-600">{k.desc} - Contoh: {k.contoh}</div></div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-2 bg-orange-50 text-[11px] font-bold">Terpilih: {selectedSubKategori.length} sub kategori - {selectedSubKategori.join(', ') || 'Belum pilih - Pilih checkbox di atas - Bisa multi - Tidak hapus yang sudah dipilih'} - Auto muncul di tabel temuan di bawah</div>
              </div>

              {/* TABEL TEMUAN PATROL - No - Peserta - Sub Kategori - Area - Temuan (text) - Upload foto - Tindakan - Upload foto after */}
              <div className="border-2 border-blue-300 rounded-xl overflow-hidden bg-blue-50">
                <div className="bg-blue-100 p-2 font-black text-xs">
                  <div>📋 Tabel List Temuan Patrol - No - Peserta Patrol - Sub Kategori - Area - Temuan Patrol (text) - Upload dokumen photo bisa view download untuk Tindakan Perbaikan nya juga dibuat dari sub kategori temuan patrol dengan tabel kolom yang sama sehingga bisa sync dan ada upload dokumen photo after perbaikan dari temuan - AUTO dari sub kategori yang dipilih - FIX V37 Per-Peserta Filter + QR</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <button onClick={()=>setFilterPeserta('all')} className={`px-2 py-1 rounded text-[10px] font-bold ${filterPeserta==='all'?'bg-blue-600 text-white':'bg-white border'}`}>📋 Semua ({temuanList.length})</button>
                    {pesertaGabunganList.map(p=> {
                      const count = temuanList.filter(t=>t.peserta===p.nama || t.peserta.includes(p.nama.split(' ')[0])).length
                      return <button key={p.id} onClick={()=>setFilterPeserta(p.nama)} className={`px-2 py-1 rounded text-[10px] font-bold ${filterPeserta===p.nama?'bg-purple-600 text-white':'bg-white border'}`}>👷 {p.nama} ({count}) - {p.jabatan}</button>
                    })}
                    {patrolType==='internal' && pesertaInternal.map((p,i)=> {
                      const count = temuanList.filter(t=>t.peserta===p).length
                      return <button key={i} onClick={()=>setFilterPeserta(p)} className={`px-2 py-1 rounded text-[10px] font-bold ${filterPeserta===p?'bg-blue-600 text-white':'bg-white border'}`}>🔵 {p} ({count})</button>
                    })}
                  </div>
                  <div className="mt-2 text-[10px] font-normal bg-white p-1 rounded border">
                    💡 Ide Bapak: QR Scan per peserta - Setiap peserta scan QR Code WP {formData.nomor_wp} - Muncul form patrol lock peserta {filterPeserta} - Centang temuan + upload Before - Submit ke WP untuk perbaikan kontraktor - Ide saya: Role-based preset - Owner: MOC+Kritis, HSE: APD+Tools+Barikade+Emer, Vendor: Housekeeping+Perilaku, Utility: Emer+Kompetensi
                  </div>
                </div>
                <div className="bg-white p-2">
                  {temuanList.length===0 ? (
                    <div className="border-2 border-dashed border-blue-200 rounded p-8 text-center text-gray-400">Belum ada temuan - Pilih sub kategori di atas (checkbox multi) - Auto muncul di sini - Contoh: Pilih FISIK-APD + FISIK-TOOLS + PERILAKU-SOP - Maka 3 baris muncul di tabel ini tanpa hapus yang sudah dipilih</div>
                  ) : (
                    <div className="overflow-auto">
                      <table className="w-full text-[11px] border">
                        <thead><tr className="bg-blue-600 text-white"><th className="p-2">No</th><th className="p-2 text-left">Peserta Patrol</th><th className="p-2 text-left">Sub Kategori</th><th className="p-2 text-left">Area</th><th className="p-2 text-left">Temuan Patrol (text) + Upload Foto Before View Download</th><th className="p-2 text-left">Tindakan Perbaikan (dari sub kategori sama) + Upload Foto After View Download + Status</th></tr></thead>
                        <tbody>
                          {temuanList.filter(t=> filterPeserta==='all' || t.peserta===filterPeserta || t.peserta.includes(filterPeserta.split(' ')[0]) || filterPeserta.includes(t.peserta.split(' ')[0])).map((t,idx)=>(
                            <tr key={t.id} className="border-b hover:bg-blue-50">
                              <td className="p-2 text-center font-bold"><div>{idx+1}</div><button onClick={()=>deleteTemuanRow(t.id)} className="mt-1 bg-red-500 hover:bg-red-600 text-white px-1 py-0.5 rounded text-[9px] font-bold w-full" title="Hapus baris temuan + uncheck kategori">🗑️ Hapus</button></td>
                              <td className="p-2">
                                <select value={t.peserta} onChange={e=>updateTemuanField(t.id,'peserta',e.target.value)} className="border p-1 rounded w-full text-[10px]">
                                  {patrolType==='internal' ? pesertaInternal.map((p,i)=><option key={i} value={p}>{p}</option>) : pesertaGabunganList.map(p=><option key={p.id} value={p.nama}>{p.nama} - {p.jabatan}</option>)}
                                </select>
                              </td>
                              <td className="p-2"><div className="font-mono font-bold text-[10px]">{t.subKategoriCode}</div><div className="text-[10px]">{t.subKategoriLabel}</div></td>
                              <td className="p-2"><input value={t.area} onChange={e=>updateTemuanField(t.id,'area',e.target.value)} className="border p-1 rounded w-full text-[10px]" placeholder="Area"/></td>
                              <td className="p-2">
                                <textarea value={t.temuan} onChange={e=>updateTemuanField(t.id,'temuan',e.target.value)} className="border p-1 rounded w-full h-16 text-[10px]" placeholder="Temuan Patrol (text) - Auto dari sub kategori - Bisa edit"/>
                                <div className="mt-1 flex gap-1 items-center"><input type="file" accept="image/*" onChange={e=> e.target.files && handleFotoBefore(t.id, e.target.files[0])} className="text-[9px]"/><span className="text-[9px]">{t.fotoBeforeName ? `📷 ${t.fotoBeforeName}` : 'Belum upload foto before'}</span>{t.fotoBeforeUrl && <button onClick={()=>clearFotoBefore(t.id)} className="ml-1 bg-red-500 hover:bg-red-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold" title="Delete foto before">🗑️ Delete</button>}</div>
                                {t.fotoBeforeUrl && <div className="mt-1 flex items-end gap-1"><img src={t.fotoBeforeUrl} className="w-20 h-20 object-cover border rounded"/><div><a href={t.fotoBeforeUrl} target="_blank" className="text-blue-600 underline text-[9px] ml-1">View Download Before</a><button onClick={()=>clearFotoBefore(t.id)} className="ml-1 bg-red-100 border border-red-300 text-red-600 px-2 py-0.5 rounded text-[9px] font-bold hover:bg-red-200" title="Hapus foto before">🗑️ Hapus Foto Before</button></div></div>}
                              </td>
                              <td className="p-2">
                                <textarea value={t.tindakan} onChange={e=>updateTemuanField(t.id,'tindakan',e.target.value)} className="border p-1 rounded w-full h-16 text-[10px]" placeholder="Tindakan Perbaikan dari sub kategori sama - Auto - Bisa edit"/>
                                <div className="mt-1 flex gap-1 items-center"><input type="file" accept="image/*" onChange={e=> e.target.files && handleFotoAfter(t.id, e.target.files[0])} className="text-[9px]"/><span className="text-[9px]">{t.fotoAfterName ? `📷 After ${t.fotoAfterName}` : 'Belum upload foto after perbaikan'}</span>{t.fotoAfterUrl && <button onClick={()=>clearFotoAfter(t.id)} className="ml-1 bg-red-500 hover:bg-red-600 text-white px-1.5 py-0.5 rounded text-[9px] font-bold" title="Delete foto after">🗑️ Delete</button>}</div>
                                {t.fotoAfterUrl && <div className="mt-1 flex items-end gap-1"><img src={t.fotoAfterUrl} className="w-20 h-20 object-cover border rounded"/><div><a href={t.fotoAfterUrl} target="_blank" className="text-green-600 underline text-[9px] ml-1">View Download After - Status Closed</a><button onClick={()=>clearFotoAfter(t.id)} className="ml-1 bg-red-100 border border-red-300 text-red-600 px-2 py-0.5 rounded text-[9px] font-bold hover:bg-red-200" title="Hapus foto after">🗑️ Hapus Foto After</button></div></div>}
                                <div className="mt-1"><select value={t.status} onChange={e=>updateTemuanField(t.id,'status',e.target.value)} className="border p-1 rounded text-[9px]"><option value="open">Open</option><option value="progress">Progress</option><option value="closed">Closed - Sudah perbaikan + foto after</option></select></div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><label className="font-bold">Tingkat Risiko Temuan - Untuk Prioritas Tindak Lanjut</label><select value={formData.tingkat_risiko} onChange={e=>setFormData({...formData, tingkat_risiko: e.target.value})} className="w-full border p-2 rounded mt-1 font-bold"><option value="RISK-CRITICAL">🔴 Kritis (Critical) - Stop Work Authority - Fatality</option><option value="RISK-MAJOR">🟠 Mayor (Major) - Perbaiki &lt;24 jam</option><option value="RISK-MINOR">🟡 Minor (Minor) - Perbaiki 3-7 hari</option></select></div>
                <div><label className="font-bold">Risk Matrix WP - Cek di Lapangan - Tanpa Utility</label><div className="border p-2 rounded bg-purple-50 text-[11px]">Risk: <span className={`${getRiskColor(formData.risk_level).bg} text-white px-2 py-1 rounded`}>{getRiskColor(formData.risk_level).dot} {formData.risk_level.toUpperCase()} {formData.risk_score} ({formData.risk_likelihood}x{formData.risk_severity})</span> | Low 1-4 🟢 Med 5-12 🟡 High 13-25 🔴 - Tanpa cek Utility sesuai permintaan</div></div>
              </div>

              <div className="bg-slate-50 border rounded p-3 text-[11px]">
                <div className="font-bold">Konsep Patrol {patrolType==='gabungan'?'Gabungan - Tabel Peserta No-Jabatan-Bagian':'Internal - Tabel Temuan No-Peserta-Sub Kategori-Area-Temuan-Upload Foto + Tindakan-Upload Foto After'} - FIX Multi Select Tanpa Hapus:</div>
                <div className="mt-1">BUG FIX: Sebelumnya radio single - klik FISIK-TOOLS pindah dari CSMS-ADM - Sekarang checkbox multi - Pilih CSMS-ADM + FISIK-TOOLS + PERILAKU-SOP = 3 baris muncul di tabel temuan - Pilih salah satu tidak hapus yang sudah dipilih - Auto muncul temuan patrol sub kategori yang dipilih secara auto di tabel list kolom No-Peserta-Sub Kategori-Area-Temuan (text)-Upload foto Before View Download - Tindakan Perbaikan juga dibuat dari sub kategori temuan patrol dengan tabel kolom yang sama sehingga bisa sync dan ada upload foto after perbaikan.</div>
                <div>Internal: Peserta Patrol Internal - Tabel No-Peserta-Sub Kategori-Area-Temuan-Upload Foto Before-Tindakan-Upload Foto After - Sync - Ada upload dokumen photo after perbaikan dari temuan - Multi select tidak hapus.</div>
                <div>Gabungan: Sama + tabel peserta No-Peserta-Jabatan-Bagian - Inti perbedaan patrol gabungan - Peserta gabungan inti untuk berita acara formal mingguan - Owner Area E, HSE Officer, Vendor Safety.</div>
              </div>

              <div className="flex gap-2">
                <button onClick={savePatrol} className={`flex-1 ${patrolType==='gabungan'?'bg-purple-700 hover:bg-purple-800':'bg-blue-700 hover:bg-blue-800'} text-white py-2 rounded font-black`}>💾 Simpan Patrol {patrolType==='gabungan'?'Gabungan':'Internal'} {formData.nomor_wp} - {selectedSubKategori.length} Sub Kategori - {temuanList.length} Temuan - {temuanList.filter(t=>t.fotoAfterUrl).length} Closed + Foto After</button>
                <button onClick={()=>setShowForm(false)} className="px-6 bg-white border py-2 rounded">Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EPatrolSync
