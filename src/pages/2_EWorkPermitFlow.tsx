import WorkPermitPrintA4 from "../components/WorkPermitPrintA4"
import React, { useState, useMemo, useEffect } from 'react'
import { APP_CONFIG, calcM2FromRadius } from '../types'
import { downloadCSV, checkOverlapWithRadius, getDistance } from '../lib/distance'
import { supabase } from '../lib/supabase'

type WorkerRow = { id: number; nama: string; usia: number; jabatan: string; skill: string; license: string; tgl_expired: string; dokumen_name?: string; dokumen_url?: string }
type AlatRow = { id: number; nama: string; tag_inspeksi: string; dokumen_name?: string; dokumen_url?: string }
type KendaraanRow = { id: number; nama: string; kaps_ton: string; tag_inspeksi: string; no_license: string; operator: string; dokumen_name?: string; dokumen_url?: string }
type JsaRow = { id: number; nama: string; no_dokumen: string; dokumen_name?: string; dokumen_url?: string }
type K3Row = { id: number; aktivitas: string; bahaya_resiko: string; pencegahan: string }
type LingkunganRow = { id: number; aktivitas: string; aspek_dampak: string; level_resiko: string; pencegahan: string }

function calcRadiusFromM2Fallback(m2:number){ return Math.sqrt(m2/Math.PI) }
const calcRadiusFromM2 = (typeof (globalThis as any).calcRadiusFromM2 !== 'undefined' ? (globalThis as any).calcRadiusFromM2 : calcRadiusFromM2Fallback) as any
const APD_LIST = ['Helmet', 'Safety Shoes', 'Safety Gloves', 'Goggles', 'Harness', 'Ear Plug', 'Ear Muff', 'Masker', 'Face Shield', 'Vest', 'Coverall']

type Profile = {
  id: string
  email: string
  role: string
  vendor_id: string | null
  area_id: string | null
  vendor_name?: string | null
}

function getCurrentProfile(): Profile | null {
  try {
    const stored = localStorage.getItem('mrh_profile')
    if (!stored) return null
    return JSON.parse(stored) as Profile
  } catch { return null }
}

function canApproveLevel(role: string, requiredStatus: string): boolean {
  const r = (role || '').toLowerCase()
  if (r === 'admin' || r === 'admin_contractor') return true
  if (requiredStatus === 'pending_owner' && (r === 'owner_project' || r === 'owner_area' || r === 'owner')) return true
  if (requiredStatus === 'pending_utility' && (r === 'manager' || r === 'utility')) return true
  if (requiredStatus === 'pending_hse' && (r === 'hse_officer' || r === 'hse')) return true
  if (requiredStatus === 'pending_gm' && (r === 'general_manager' || r === 'gm')) return true
  return false
}

function isAreaAllowed(profile: Profile, permitAreaId: string): boolean {
  if (profile.role === 'owner_project' || profile.role === 'owner_area') {
    if (!profile.area_id) return true
    return profile.area_id === permitAreaId
  }
  return true
}

function canCreatePermitRole(role: string): boolean {
  const r = (role || '').toLowerCase()
  return ['general_contractor','contractor','admin_contractor','admin'].includes(r)
}

export function EWorkPermitFlow({ areas: propAreas, vendors, useWorkPermitsHook }:any){
  // Load areas from Settings factory_areas (custom per perusahaan) - Sync dengan 3. Mapping Overlap
  const [customAreas, setCustomAreas] = useState<any[]>([])
  useEffect(() => {
    try {
      const local = localStorage.getItem('mrh_app_settings')
      if (local) {
        const parsed = JSON.parse(local)
        if (parsed.factory_areas) {
          const fa = JSON.parse(parsed.factory_areas)
          const converted = fa.map((a: any) => ({
            id: a.id,
            name: a.name,
            area_m2: a.m2,
            radius_m: a.radius,
            type: a.type,
            is_open: a.type === 'open_without_wall',
            lat: -6.201,
            lng: 106.801,
          }))
          setCustomAreas(converted)
        }
      }
      // Load from Supabase app_settings factory_areas
      supabase.from('app_settings').select('value').eq('key', 'factory_areas').single().then(({ data }) => {
        if (data && data.value) {
          try {
            const fa = JSON.parse(data.value)
            const converted = fa.map((a: any) => ({
              id: a.id,
              name: a.name,
              area_m2: a.m2,
              radius_m: a.radius,
              type: a.type,
              is_open: a.type === 'open_without_wall',
              lat: -6.201,
              lng: 106.801,
            }))
            setCustomAreas(converted)
            localStorage.setItem('mrh_app_settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('mrh_app_settings') || '{}'), factory_areas: data.value }))
          } catch {}
        }
      })
    } catch {}
  }, [])

  const isRealSupabasePermit = (p: any) => {
    return p && ( (p.id && String(p.id).length > 20) || (p.nomor_wp && (p.nomor_wp.includes('mrh-csmswp') || p.nomor_wp.includes('PTM-CSMSWP') || p.nomor_wp.includes('csmswp'))) || p.created_at || p.supabase_id || p.from_supabase )
  }

  const handleDeleteLocalPermit = (permit: any, idx: number) => {
    if (!isRealSupabasePermit(permit)) {
      if (confirm(`Hapus Work Permit lokal/placeholder? ${permit.nomor_wp || permit.title || 'Tanpa Nomor'} - Tidak ada di Supabase, hanya di local. Lanjutkan?`)) {
        try {
          const localKey = 'mrh_work_permits_local'
          const local = localStorage.getItem(localKey)
          if (local) {
            const arr = JSON.parse(local)
            const filtered = arr.filter((_: any, i: number) => i !== idx)
            localStorage.setItem(localKey, JSON.stringify(filtered))
          }
          // Remove from permits state via reload or hook
          alert('Permit LOCAL/PLACEHOLDER dihapus dari local. Refresh halaman.')
          window.location.reload()
        } catch (e: any) {
          alert('Gagal hapus local: ' + e.message)
        }
      }
    } else {
      if (confirm(`Hapus Work Permit REAL Supabase? ${permit.nomor_wp} - Akan hapus dari Supabase! Lanjutkan?`)) {
        supabase.from('work_permits').delete().eq('id', permit.id).then(({ error }: any) => {
          if (error) {
            alert('Gagal hapus dari Supabase: ' + error.message)
          } else {
            alert('Berhasil hapus dari Supabase: ' + permit.nomor_wp)
            window.location.reload()
          }
        })
      }
    }
  }

  // Sync Nomor WP Step 1 - Auto dari Settings mrh-csmswp-yyyy-001 - Jangan dipaksakan flownya, perbaikan bertahap
  // Step 1 Nomor WP auto +1 dari Settings, sync dengan tabel DAFTAR WORK PERMIT

  const areas = customAreas.length > 0 ? customAreas : propAreas

  // Load Jenis Pekerjaan dari Settings factory_areas
  const [customJenis, setCustomJenis] = useState<any[]>([])
  const [riskLikelihood, setRiskLikelihood] = useState<number>(3);
  const [riskSeverity, setRiskSeverity] = useState<number>(3);
  const [riskLevel, setRiskLevel] = useState<string>('medium');
  const [riskScore, setRiskScore] = useState<number>(9);

  // ===== RISK MATRIX 5x5 FULL AUTO - IDE 3 =====
  useEffect(() => {
    const score = riskLikelihood * riskSeverity;
    setRiskScore(score);
    let level = 'low';
    if (score >= 13) level = 'high';
    else if (score >= 5) level = 'medium';
    else level = 'low';
    setRiskLevel(level);
  }, [riskLikelihood, riskSeverity]);

  const getRiskColor = (level: string) => {
    if (level === 'high') return 'bg-red-600 text-white border-red-800';
    if (level === 'medium') return 'bg-yellow-400 text-black border-yellow-600';
    return 'bg-green-500 text-white border-green-700';
  }
  const getRiskColorLight = (score: number) => {
    if (score >= 13) return 'bg-red-100 border-red-400 text-red-800';
    if (score >= 5) return 'bg-yellow-100 border-yellow-400 text-yellow-800';
    return 'bg-green-100 border-green-400 text-green-800';
  }

  const [utilityRows, setUtilityRows] = useState<any[]>([{ id: 1, jenis: 'Electric', pemakaian: 0, satuan: 'kWh', durasi_jam: 0, icon: '⚡' }])
  const UTILITY_OPTIONS = [
    { jenis: 'Electric', icon: '⚡', satuan: 'kWh', label: 'Listrik' },
    { jenis: 'Water', icon: '💧', satuan: 'm³', label: 'Air' },
    { jenis: 'Gas', icon: '🔥', satuan: 'm³', label: 'Gas' },
    { jenis: 'Steam', icon: '♨️', satuan: 'Ton', label: 'Steam' },
    { jenis: 'Angin', icon: '💨', satuan: 'm³', label: 'Angin' },
  ]
  const getUtilityMeta = (jenis: string) => UTILITY_OPTIONS.find(u=>u.jenis===jenis) || { icon: '🔌', satuan: 'unit', label: jenis }
  const [factoryAreaOptions, setFactoryAreaOptions] = useState<any[]>([])
  const [jenisPekerjaanOptions, setJenisPekerjaanOptions] = useState<any[]>([])
  const [jabatanOptions, setJabatanOptions] = useState<any[]>([])
  const [skillOptions, setSkillOptions] = useState<any[]>([])
  
  // FIX image_5f434a.png & image_7864e2.png - Load Jabatan & Skill from Settings - Single Source of Truth
  useEffect(()=>{
    (async()=>{
      try {
        const { data } = await supabase.from('app_settings').select('*').limit(1).maybeSingle();
        if (!data) return;
        const getVal = (key: string) => (data as any)[key] || (data as any).settings?.[key] || (data as any).value?.[key];
        const parseArr = (val:any) => {
          if (!val) return null;
          try {
            const arr = typeof val === 'string' ? JSON.parse(val) : val;
            return Array.isArray(arr) && arr.length ? arr : null;
          } catch { return null }
        }
        const areas = parseArr(getVal('factory_areas'));
        const jenis = parseArr(getVal('jenis_pekerjaan'));
        const jabatan = parseArr(getVal('jabatan_pekerjaan'));
        const skill = parseArr(getVal('skill_pekerjaan'));
        if (areas) setFactoryAreaOptions(areas);
        if (jenis) setJenisPekerjaanOptions(jenis);
        if (jabatan) setJabatanOptions(jabatan);
        if (skill) setSkillOptions(skill);
      } catch(e){ console.log('load settings error', e) }
    })()
  },[])
  useEffect(() => {
    try {
      const local = localStorage.getItem('mrh_app_settings')
      if (local) {
        const parsed = JSON.parse(local)
        if (parsed.jenis_pekerjaan) {
          const jp = JSON.parse(parsed.jenis_pekerjaan)
          setCustomJenis(jp)
        }
      }
      supabase.from('app_settings').select('value').eq('key', 'jenis_pekerjaan').single().then(({ data }) => {
        if (data && data.value) {
          try {
            const jp = JSON.parse(data.value)
            setCustomJenis(jp)
            localStorage.setItem('mrh_app_settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('mrh_app_settings') || '{}'), jenis_pekerjaan: data.value }))
          } catch {}
        }
      })
    } catch {}
  }, [])

  const JENIS_LIST_DEFAULT = [
    { id: 'hot_work', name: 'Hot Work' },
    { id: 'cold_work', name: 'Cold Work' },
    { id: 'confined_space', name: 'Confined Space' },
    { id: 'working_at_height', name: 'Working at Height' },
    { id: 'excavation', name: 'Excavation' },
    { id: 'electrical', name: 'Electrical' },
    { id: 'lifting', name: 'Lifting' },
  ]
  const jenisList = customJenis.length > 0 ? customJenis : JENIS_LIST_DEFAULT


  const { permits, addPermit, updateStatus: originalUpdateStatus } = useWorkPermitsHook
  const profile = getCurrentProfile()
  const roleLabel = profile ? `${profile.role.toUpperCase()}${profile.area_id ? ` (${profile.area_id})` : ''}` : 'GUEST'

  const [selectedPermit, setSelectedPermit] = useState<any>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [detailTab, setDetailTab] = useState<'info'|'workers'|'safety'>('info')
  const [showPrintA4, setShowPrintA4] = useState(false)

  const openDetail = (permit:any) => {
    setSelectedPermit(permit)
    setShowDetail(true)
    setDetailTab('info')
  }
  const openPrintA4 = (permit:any) => {
    setSelectedPermit(permit)
    setShowPrintA4(true)
  }

  const closeDetail = () => {
    setShowDetail(false)
    setSelectedPermit(null)
  }

  const handleApproveFromDetail = async () => {
    if (!selectedPermit || !profile) return
    const currentStatus = selectedPermit.status
    let nextStatus = ''
    let nextLevel = 2
    let label = ''
    if (currentStatus==='pending_owner') {
      nextStatus = 'pending_utility'
      nextLevel = 2
      label = 'Owner Area approved -> Utility'
    } else if (currentStatus==='approved_owner' || currentStatus==='pending_utility') {
      nextStatus = 'pending_hse'
      nextLevel = 3
      label = 'Utility approved -> HSE'
    } else if (currentStatus==='approved_utility' || currentStatus==='pending_hse') {
      nextStatus = 'pending_gm'
      nextLevel = 4
      label = 'HSE approved -> GM'
    } else if (currentStatus==='approved_hse' || currentStatus==='pending_gm') {
      nextStatus = 'active'
      nextLevel = 5
      label = 'GM approved -> Active'
    }
    if (!confirm(`Approve WP "${selectedPermit.title}" sebagai ${roleLabel}?\n${currentStatus} -> ${nextStatus}\n${label}`)) return
    try {
      await originalUpdateStatus(selectedPermit.id, nextStatus, nextLevel, label)
      closeDetail()
    } catch(e:any) {
      alert('Gagal approve: ' + e.message)
    }
  }

  const handleRejectFromDetail = async () => {
    if (!selectedPermit) return
    const reason = prompt(`Alasan reject WP "${selectedPermit.title}"?`)
    if (!reason) return
    try {
      await originalUpdateStatus(selectedPermit.id, 'rejected', 0, profile?.role || 'Unknown', reason)
      closeDetail()
    } catch(e:any) {
      alert('Gagal reject: ' + e.message)
    }
  }

  const getStatusLabel = (status:string) => {
    if (status==='pending_owner') return 'pending_owner'
    if (status==='pending_utility') return 'approved_owner → pending_utility'
    if (status==='pending_hse') return 'approved_utility → pending_hse'
    if (status==='pending_gm') return 'approved_hse → pending_gm'
    if (status==='active') return 'approved_gm → active'
    if (status==='approved_owner') return 'approved_owner'
    if (status==='approved_utility') return 'approved_utility'
    if (status==='approved_hse') return 'approved_hse'
    return status
  }

  const canCreatePermit = profile ? canCreatePermitRole(profile.role) : false
  const updateStatus = async (id: string, newStatus: string, level: number, fromRoleOrReason?: string, reason?: string) => {
    let actualReason = reason || fromRoleOrReason || ''
    if (!profile) return alert('Harus login dulu!')
    const oldPermit = permits.find((p:any)=>p.id===id)
    if (oldPermit && oldPermit.status !== 'rejected' && oldPermit.status !== 'active' && oldPermit.status !== 'closed' && oldPermit.status !== 'pending_review' && oldPermit.status !== 'pending_approval') {
      if (!canApproveLevel(profile.role, oldPermit.status) && !['rejected','active','closed'].includes(newStatus)) {
        if (oldPermit.status.startsWith('pending_') && oldPermit.status !== 'rejected') {
          if (!canApproveLevel(profile.role, oldPermit.status)) {
            return alert(`❌ Role ${profile.role} (${roleLabel}) tidak bisa approve ${oldPermit.status}. Yang bisa: ${oldPermit.status==='pending_owner' ? 'owner_project (AREA-E) / admin_contractor' : oldPermit.status==='pending_utility' ? 'manager (utility) / admin_contractor' : oldPermit.status==='pending_hse' ? 'hse_officer / admin_contractor' : 'general_manager / admin_contractor'}`)
          }
          if (!isAreaAllowed(profile, oldPermit.area_id)) {
            return alert(`❌ Bukan area Anda! Anda: ${profile.area_id} - WP: ${oldPermit.area_id} - Owner Project hanya bisa approve area ${profile.area_id}`)
          }
        }
      }
    }
    if (typeof originalUpdateStatus === 'function') {
      if (reason !== undefined) {
        return originalUpdateStatus(id, newStatus, level, fromRoleOrReason, reason)
      } else {
        return originalUpdateStatus(id, newStatus, level, fromRoleOrReason)
      }
    }
  }
  const [wpStep, setWpStep] = useState(1)
  const [overlapWarning, setOverlapWarning] = useState('')

  const [workers, setWorkers] = useState<WorkerRow[]>([
    { id: 1, nama: '', usia: 25, jabatan: '', skill: '', license: '', tgl_expired: new Date(Date.now()+365*86400000).toISOString().split('T')[0] }
  ])
  const [alats, setAlats] = useState<AlatRow[]>([{ id: 1, nama: 'Welding Machine', tag_inspeksi: 'Ok' }])
  const [kendaraans, setKendaraans] = useState<KendaraanRow[]>([{ id: 1, nama: 'Crane 20T', kaps_ton: '20 Ton', tag_inspeksi: 'Ok', no_license: 'SIO-001', operator: 'Budi Operator' }])
  const [jsas, setJsas] = useState<JsaRow[]>([{ id: 1, nama: 'JSA Pengelasan', no_dokumen: 'JSA-001' }])
  const [k3s, setK3s] = useState<K3Row[]>([{ id: 1, aktivitas: 'Pengelasan', bahaya_resiko: 'Percikan api, luka bakar', pencegahan: 'Pakai APD lengkap, fire watch' }])
  const [lingkungans, setLingkungans] = useState<LingkunganRow[]>([{ id: 1, aktivitas: 'Pengelasan', aspek_dampak: 'Emisi gas', level_resiko: 'Medium', pencegahan: 'Ventilasi, masker' }])
  const [selectedApd, setSelectedApd] = useState<string[]>(['Helmet', 'Safety Shoes', 'Safety Gloves', 'Goggles'])
  const [apdOthers, setApdOthers] = useState('')

  const [factoryM2, setFactoryM2] = useState(APP_CONFIG.FACTORY.DEFAULT_TOTAL_M2)
  const [workRadius, setWorkRadius] = useState(APP_CONFIG.OVERLAP.DEFAULT_WORK_RADIUS_M)
  const [workM2, setWorkM2] = useState(calcM2FromRadius(APP_CONFIG.OVERLAP.DEFAULT_WORK_RADIUS_M))

  // FIX: appSettings for auto prefix WP
  const [appSettings, setAppSettings] = useState<any>({})
  const [showModalNomorWP, setShowModalNomorWP] = useState('')
  
  // Load app settings
  const loadAppSettings = () => {
    try {
      const s = localStorage.getItem('mrh_app_settings')
      if (s) setAppSettings(JSON.parse(s))
    } catch {}
  }
  
    // FIX image_a9f20b.png: BUG nomor WP 002 padahal tabel DAFTAR WORK PERMIT kosong - harus 001
  // Logic baru: cek permits real dari Supabase + localStorage counter = ambil MAX +1, bukan increment buta
  const generateWPNumber = () => {
    try {
      const s = localStorage.getItem('mrh_app_settings')
      const settings = s ? JSON.parse(s) : (typeof appSettings !== 'undefined' ? appSettings : {})
      const companyName = settings?.company_name || 'MRH'
      const prefixRaw = settings?.wp_prefix || companyName.toLowerCase().substring(0,3) || 'mrh'
      const prefix = prefixRaw.toLowerCase().replace(/[^a-z0-9]/g,'') || 'mrh'
      const year = new Date().getFullYear()
      const key = `mrh_wp_counter_${year}`
      
      let maxFromPermits = 0
      try {
        if (typeof permits !== 'undefined' && permits && permits.length > 0) {
          permits.forEach((p:any)=>{
            const no = p.nomor_wp || p.title || ''
            const match = no.match(new RegExp(`${year}-(\d+)`, 'i'))
            if (match) {
              const num = parseInt(match[1])
              if (!isNaN(num) && num > maxFromPermits) maxFromPermits = num
            }
          })
        }
      } catch {}
      
      const storedCounter = parseInt(localStorage.getItem(key) || '0')
      const current = Math.max(maxFromPermits, storedCounter) + 1
      return `${prefix}-csmswp-${year}-${String(current).padStart(3,'0')}`.toLowerCase()
    } catch {
      const year = new Date().getFullYear()
      const key = `mrh_wp_counter_${year}`
      let maxFromPermits = 0
      try {
        if (typeof permits !== 'undefined' && permits && permits.length) {
          permits.forEach((p:any)=>{
            const m = (p.nomor_wp||'').match(new RegExp(`${year}-(\d+)`))
            if (m) { const n=parseInt(m[1]); if(n>maxFromPermits) maxFromPermits=n }
          })
        }
      } catch {}
      const current = Math.max(maxFromPermits, parseInt(localStorage.getItem(key) || '0')) + 1
      return `mrh-csmswp-${year}-${String(current).padStart(3,'0')}`
    }
  }

  const [pForm, setPForm] = useState({ 
    title:'', description:'', area_id:'', vendor_name:'', lat:-6.201, lng:106.801, 
    work_type:'Hot Work', 
    start_date: new Date().toISOString().split('T')[0], 
    end_date: new Date(Date.now()+7*86400000).toISOString().split('T')[0], 
    tanggal_mulai: new Date().toISOString().split('T')[0],
    tanggal_selesai: new Date(Date.now()+7*86400000).toISOString().split('T')[0],
    nomor_wp: '',
    apd_required:'', approver:'Owner Area', status:'draft', 
    penanggung_jawab:'', pj_jabatan:'', pj_phone:'', pj_photo:'', pj_photo_url:'',
    safety_officer_name:'', safety_officer_phone:'', safety_officer_license:'', safety_officer_expired:'', safety_officer_dokumen:'', safety_officer_dokumen_url:'', safety_officer_photo:'', safety_officer_photo_url:'',
    work_radius_m: APP_CONFIG.OVERLAP.DEFAULT_WORK_RADIUS_M,
    work_area_m2: calcM2FromRadius(APP_CONFIG.OVERLAP.DEFAULT_WORK_RADIUS_M),
    area_radius_m: APP_CONFIG.OVERLAP.DEFAULT_AREA_RADIUS_M,
    factory_total_m2: APP_CONFIG.FACTORY.DEFAULT_TOTAL_M2,
  } as any)

  const selectedArea = useMemo(()=> areas.find((a:any)=>a.id===pForm.area_id), [areas, pForm.area_id])

  // Auto set nomor WP saat STEP 1 load atau saat pForm.nomor_wp kosong
  const ensureNomorWP = () => {
    if (!pForm.nomor_wp) {
      const newNo = generateWPNumber()
      setPForm((prev:any)=>({...prev, nomor_wp: newNo}))
    }
  }
  
  // AUTO-FIX image_a9f20b.png: kalau DAFTAR kosong tapi nomor_wp sudah 002 -> reset ke 001
  useEffect(()=>{
    try {
      if (permits && permits.length === 0 && pForm.nomor_wp) {
        const year = new Date().getFullYear()
        const match = pForm.nomor_wp.match(new RegExp(`${year}-(\\d+)`))
        if (match) {
          const num = parseInt(match[1])
          if (num > 1) {
            const prefix = pForm.nomor_wp.split('-')[0] || 'mrh'
            const correct = `${prefix}-csmswp-${year}-001`.toLowerCase()
            console.log(`FIX image_a9f20b.png: DAFTAR kosong tapi nomor_wp ${pForm.nomor_wp} -> reset ke ${correct}`)
            setPForm((prev:any)=>({...prev, nomor_wp: correct}))
            localStorage.setItem(`mrh_wp_counter_${year}`, '0')
          }
        }
      }
    } catch {}
  }, [permits])

  function updateRadiusFromM2(m2:number){
    const r = calcRadiusFromM2(m2)
    setWorkM2(m2)
    setWorkRadius(r)
    setPForm({...pForm, work_radius_m: r, work_area_m2: m2})
  }
  function updateM2FromRadius(r:number){
    const m2 = calcM2FromRadius(r)
    setWorkRadius(r)
    setWorkM2(m2)
    setPForm({...pForm, work_radius_m: r, work_area_m2: m2})
  }
  function fileToUrl(file: File){ return URL.createObjectURL(file) }

  function addWorkerRow(){ const newId = workers.length>0 ? Math.max(...workers.map(w=>w.id))+1 : 1; setWorkers([...workers, { id: newId, nama: '', usia: 25, jabatan: '', skill: '', license: '', tgl_expired: new Date(Date.now()+365*86400000).toISOString().split('T')[0] }]) }
  function removeWorkerRow(id:number){ if(workers.length===1){ alert('Minimal 1'); return }; setWorkers(workers.filter(w=>w.id!==id)) }
  function addAlatRow(){ const newId = alats.length>0 ? Math.max(...alats.map(a=>a.id))+1 : 1; setAlats([...alats, { id: newId, nama: '', tag_inspeksi: 'Ok' }]) }
  function removeAlatRow(id:number){ if(alats.length===1){ alert('Minimal 1'); return }; setAlats(alats.filter(a=>a.id!==id)) }
  function addKendaraanRow(){ const newId = kendaraans.length>0 ? Math.max(...kendaraans.map(k=>k.id))+1 : 1; setKendaraans([...kendaraans, { id: newId, nama: '', kaps_ton: '20 Ton', tag_inspeksi: 'Ok', no_license: '', operator: '' }]) }
  function removeKendaraanRow(id:number){ if(kendaraans.length===1){ alert('Minimal 1'); return }; setKendaraans(kendaraans.filter(k=>k.id!==id)) }
  function addJsaRow(){ const newId = jsas.length>0 ? Math.max(...jsas.map(j=>j.id))+1 : 1; setJsas([...jsas, { id: newId, nama: '', no_dokumen: '' }]) }
  function removeJsaRow(id:number){ if(jsas.length===1){ alert('Minimal 1'); return }; setJsas(jsas.filter(j=>j.id!==id)) }
  function addK3Row(){ const newId = k3s.length>0 ? Math.max(...k3s.map(j=>j.id))+1 : 1; setK3s([...k3s, { id: newId, aktivitas: '', bahaya_resiko: '', pencegahan: '' }]) }
  function removeK3Row(id:number){ if(k3s.length===1){ alert('Minimal 1'); return }; setK3s(k3s.filter(j=>j.id!==id)) }
  function updateK3Row(id:number, field: keyof K3Row, value:any){ setK3s(k3s.map(j=> j.id===id ? {...j, [field]: value} : j)) }
  function addLingkunganRow(){ const newId = lingkungans.length>0 ? Math.max(...lingkungans.map(j=>j.id))+1 : 1; setLingkungans([...lingkungans, { id: newId, aktivitas: '', aspek_dampak: '', level_resiko: 'Low', pencegahan: '' }]) }
  function removeLingkunganRow(id:number){ if(lingkungans.length===1){ alert('Minimal 1'); return }; setLingkungans(lingkungans.filter(j=>j.id!==id)) }
  function updateLingkunganRow(id:number, field: keyof LingkunganRow, value:any){ setLingkungans(lingkungans.map(j=> j.id===id ? {...j, [field]: value} : j)) }
  function toggleApd(item:string){ if(selectedApd.includes(item)) setSelectedApd(selectedApd.filter(a=>a!==item)); else setSelectedApd([...selectedApd, item]) }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-5 border-l-4 border-orange-500">
        <h3 className="font-bold text-[18px]">2. E-WORK PERMIT </h3>
        
        <div className="flex gap-2 mt-3">
          {[1,2,3,4].map(s=><button key={s} onClick={()=>{ setWpStep(s); if(s===1){ loadAppSettings(); ensureNomorWP() } }} className={`text-xs px-4 py-2 rounded-full border ${wpStep===s?'bg-blue-600 text-white font-bold':'bg-gray-100'}`}>STEP {s}</button>)}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        {wpStep===1 && (
          <div className="space-y-4">
            <h4 className="font-bold text-[15px] bg-slate-100 p-3 rounded-lg">STEP 1: DASAR + FACTORY M2 GENERAL + NOMOR WP AUTO</h4>
            
            <div className="p-3 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-blue-100">
              <h5 className="font-bold text-xs mb-2">🏭 FACTORY SETTING AWAL - General per perusahaan (Dinamis)</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div><label className="text-[11px] font-bold">Total Luas Factory (M2)</label><input type="number" className="border p-2 rounded-lg w-full bg-white text-xs" value={factoryM2} onChange={e=>{ const v=parseFloat(e.target.value)||0; setFactoryM2(v); setPForm({...pForm, factory_total_m2: v}) }} /><div className="text-[10px] text-slate-500">Radius total: {calcRadiusFromM2(factoryM2).toFixed(1)}m | Default {APP_CONFIG.FACTORY.DEFAULT_TOTAL_M2} M2</div></div>
                <div><label className="text-[11px] font-bold">Open Area tanpa tembok (M2)</label><input type="number" className="border p-2 rounded-lg w-full bg-white text-xs" value={APP_CONFIG.FACTORY.DEFAULT_OPEN_M2} readOnly /><div className="text-[10px] text-slate-500">Bisa overlap antar area</div></div>
                <div><label className="text-[11px] font-bold">Closed Area dengan tembok (M2)</label><input type="number" className="border p-2 rounded-lg w-full bg-white text-xs" value={APP_CONFIG.FACTORY.DEFAULT_CLOSED_M2} readOnly /><div className="text-[10px] text-slate-500">Hanya overlap dalam area sama</div></div>
              </div>
              <div className="text-[10px] mt-2 text-slate-600">Rumus: radius = √(M2/π). Contoh: 10.000 M2 → radius ~56.4m. Open area tanpa pembatas bisa set luas M2 di awal, system radius otomatis deteksi overlap.</div>
            </div>

            {/* FIX: Nomor WP Auto + Tanggal Mulai & Selesai di STEP 1 - SEBELUM STEP LAIN */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
              <h5 className="font-bold text-sm mb-3 flex items-center gap-2">🔢 NOMOR WP + TANGGAL - AUTO mrh-csmswp-yyyy-001 - 16px di A4 - Ln 535 FIX</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-xl border">
                  <label className="text-[11px] font-bold">📋 Nomor WP (Auto +1 dari Settings)</label>
                  <input type="text" value={pForm.nomor_wp} onChange={e=>setPForm({...pForm, nomor_wp:e.target.value.toLowerCase()})} placeholder="mrh-csmswp-2026-001" className="border p-2 rounded-lg w-full text-sm font-bold bg-slate-50 font-mono mt-1" />
                  <button type="button" onClick={()=>{ const newNo=generateWPNumber(); setPForm({...pForm, nomor_wp:newNo}) }} className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-[10px] font-bold">🔄 Generate Baru</button>
                </div>
                <div className="bg-white p-3 rounded-xl border">
                  <label className="text-[11px] font-bold">📅 Tanggal Mulai * (Tanggal Mulai Kerja)</label>
                  <input type="date" value={pForm.start_date} onChange={e=>setPForm({...pForm, start_date:e.target.value, tanggal_mulai:e.target.value})} className="border p-2 rounded-lg w-full text-sm font-bold mt-1" required />
                  
                </div>
                <div className="bg-white p-3 rounded-xl border">
                  <label className="text-[11px] font-bold">📅 Tanggal Selesai * (Tanggal Selesai Kerja)</label>
                  <input type="date" value={pForm.end_date} onChange={e=>setPForm({...pForm, end_date:e.target.value, tanggal_selesai:e.target.value})} className="border p-2 rounded-lg w-full text-sm font-bold mt-1" required />
                  
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-xs font-bold">Judul *</label><input className="border p-2.5 rounded-lg w-full bg-slate-50" value={pForm.title} onChange={e=>setPForm({...pForm, title:e.target.value})} placeholder="TEST STRICT AREA-E" /></div>
              <div><label className="text-xs font-bold">Vendor ≥{APP_CONFIG.SCORE_THRESHOLD.BERSYARAT}</label>
                <select className="border p-2.5 rounded-lg w-full bg-slate-50" value={pForm.vendor_name} onChange={e=>{ const val=e.target.value; const vend=vendors.find((v:any)=>v.name===val); setPForm({...pForm, vendor_name:val, area_id: vend ? vend.area_id : pForm.area_id}) }}>
                  <option value="">Pilih Vendor</option>{vendors.map((v:any)=><option key={v.id} value={v.name}>{v.name} - {v.total_score}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold">Area (Nama + M2 + Radius + Type)</label>
                <select className="border p-2.5 rounded-lg w-full bg-slate-50" value={pForm.area_id} onChange={e=>{
                  const val=e.target.value
                  const a=areas.find((x:any)=>x.id===val)
                  setPForm({...pForm, area_id:val, lat: a?.lat||pForm.lat, lng: a?.lng||pForm.lng, area_radius_m: a?.radius_m||APP_CONFIG.OVERLAP.DEFAULT_AREA_RADIUS_M})
                }}>
                  <option value="">-- Pilih Area --</option>
                  {areas.map((a:any)=><option key={a.id} value={a.id}>{a.name} - {a.area_m2||'-'} M2 - r:{a.radius_m||'-'}m - {a.type||''} {a.is_open?'[OPEN]':''}</option>)}
                </select>
{selectedArea && <div className="text-[11px] mt-1 p-2 bg-blue-50 rounded">Selected: {selectedArea.name} | {selectedArea.area_m2} M2 | r:{selectedArea.radius_m}m | {selectedArea.type} {selectedArea.is_open ? '✅ Open bisa overlap antar area' : '🔒 Closed hanya overlap dalam area sama'}</div>}
              </div>
              <div><label className="text-xs font-bold">Jenis</label>
                <select className="border p-2.5 rounded-lg w-full bg-slate-50" value={pForm.work_type || pForm.jenis} onChange={e=>setPForm({...pForm, work_type: e.target.value, jenis: e.target.value})}>
                  <option value="">-- Pilih Jenis --</option>
                  {jenisList.map((j:any)=><option key={j.id} value={j.name}>{j.name} {j.code ? `(${j.code})` : ''}</option>)}
                </select></div>
            </div>
            <button onClick={()=>{ ensureNomorWP(); setWpStep(2)}} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold">Next → STEP 2 (Nomor WP: {pForm.nomor_wp || 'akan auto generate'})</button>
          </div>
        )}

        {wpStep===2 && (
          <div className="space-y-5">
            <h4 className="font-bold text-[15px] bg-blue-50 p-3 rounded-lg border">STEP 2: PENANGGUNG JAWAB + SAFETY OFFICER + WORKERS</h4>
            <div className="p-3 bg-blue-50 rounded border text-[11px]">Nomor WP: <b className="font-mono">{pForm.nomor_wp}</b> | Tgl Mulai: <b>{pForm.start_date}</b> | Tgl Selesai: <b>{pForm.end_date}</b> | Vendor: {pForm.vendor_name} | Area: {pForm.area_id}</div>
            <div className="p-4 bg-slate-50 rounded-xl border">
              <h5 className="font-bold text-sm mb-3">👨💼 PENANGGUNG JAWAB PROJECT</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div><label className="text-xs font-bold">Nama PJ *</label><input className="border p-2.5 rounded-lg w-full bg-white" value={pForm.penanggung_jawab} onChange={e=>setPForm({...pForm, penanggung_jawab:e.target.value})} /></div>
                <div><label className="text-xs font-bold">Jabatan</label><select className="border p-2.5 rounded-lg w-full bg-white" value={pForm.pj_jabatan} onChange={e=>setPForm({...pForm, pj_jabatan:e.target.value})}><option value="">Pilih</option><option>Project Manager</option><option>Site Manager</option><option>Supervisor</option>{(jabatanOptions||[]).map((opt:any)=><option key={opt.id || opt.name} value={opt.name}>{opt.name}</option>)}</select></div>
                <div><label className="text-xs font-bold">No.HP</label><input className="border p-2.5 rounded-lg w-full bg-white" value={pForm.pj_phone} onChange={e=>setPForm({...pForm, pj_phone:e.target.value})} /></div>
                <div><label className="text-xs font-bold">Photo</label><input type="file" accept="image/*" className="border p-2 rounded-lg w-full bg-white text-xs" onChange={e=>{ if(e.target.files && e.target.files[0]){ const url=fileToUrl(e.target.files[0]); setPForm({...pForm, pj_photo: e.target.files[0].name, pj_photo_url: url}) } }} />{pForm.pj_photo && <div className="text-[11px] mt-1"><span className="text-emerald-600">✅ {pForm.pj_photo}</span><br/>{pForm.pj_photo_url && <><a href={pForm.pj_photo_url} target="_blank" className="text-blue-600 underline">👁 Lihat</a><img src={pForm.pj_photo_url} className="w-20 h-20 object-cover rounded border mt-1" /></>}</div>}</div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <h5 className="font-bold text-sm mb-3">🛡 SAFETY OFFICER</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div><label className="text-xs font-bold">Nama SO *</label><input className="border p-2.5 rounded-lg w-full bg-white" value={pForm.safety_officer_name} onChange={e=>setPForm({...pForm, safety_officer_name:e.target.value})} /></div>
                <div><label className="text-xs font-bold">No.HP</label><input className="border p-2.5 rounded-lg w-full bg-white" value={pForm.safety_officer_phone} onChange={e=>setPForm({...pForm, safety_officer_phone:e.target.value})} /></div>
                <div><label className="text-xs font-bold">License</label><input className="border p-2.5 rounded-lg w-full bg-white" value={pForm.safety_officer_license} onChange={e=>setPForm({...pForm, safety_officer_license:e.target.value})} /></div>
                <div><label className="text-xs font-bold">Tgl Expired</label><input type="date" className="border p-2.5 rounded-lg w-full bg-white" value={pForm.safety_officer_expired} onChange={e=>setPForm({...pForm, safety_officer_expired:e.target.value})} /></div>
                <div><label className="text-xs font-bold">Dokumen License</label><input type="file" className="border p-2 rounded-lg w-full bg-white text-xs" onChange={e=>{ if(e.target.files && e.target.files[0]){ const url=fileToUrl(e.target.files[0]); setPForm({...pForm, safety_officer_dokumen: e.target.files[0].name, safety_officer_dokumen_url: url}) } }} />{pForm.safety_officer_dokumen && <div className="text-[11px] mt-1"><span className="text-emerald-600">✅ {pForm.safety_officer_dokumen}</span><br/>{pForm.safety_officer_dokumen_url && <><a href={pForm.safety_officer_dokumen_url} target="_blank" className="text-blue-600 underline">👁 Lihat</a><img src={pForm.safety_officer_dokumen_url} className="w-20 h-20 object-cover rounded border mt-1" /></>}</div>}</div>
                <div><label className="text-xs font-bold">Photo</label><input type="file" accept="image/*" className="border p-2 rounded-lg w-full bg-white text-xs" onChange={e=>{ if(e.target.files && e.target.files[0]){ const url=fileToUrl(e.target.files[0]); setPForm({...pForm, safety_officer_photo: e.target.files[0].name, safety_officer_photo_url: url}) } }} />{pForm.safety_officer_photo && <div className="text-[11px] mt-1"><span className="text-emerald-600">✅ {pForm.safety_officer_photo}</span><br/>{pForm.safety_officer_photo_url && <><a href={pForm.safety_officer_photo_url} target="_blank" className="text-blue-600 underline">👁 Lihat</a><img src={pForm.safety_officer_photo_url} className="w-20 h-20 object-cover rounded border mt-1" /></>}</div>}</div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border">
              <div className="flex justify-between items-center mb-3"><h5 className="font-bold text-sm">👥 DATA PEKERJA</h5><button onClick={addWorkerRow} className="bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-bold">+ Tambah Baris</button></div>
              <div className="overflow-auto border rounded-lg">
                <table className="w-full text-xs"><thead><tr className="bg-slate-700 text-white"><th className="p-2 w-8">No</th><th className="p-2">Nama</th><th className="p-2 w-16">Usia</th><th className="p-2">Jabatan</th><th className="p-2">Skill</th><th className="p-2">License</th><th className="p-2">Tgl Expired</th><th className="p-2">Dokumen + Lihat</th><th className="p-2 w-10">Aksi</th></tr></thead>
                  <tbody>{workers.map((w, idx)=>(
                    <tr key={w.id} className="border-b bg-white">
                      <td className="p-2 text-center font-bold">{idx+1}</td>
                      <td className="p-1"><input className="border p-1.5 rounded w-full text-xs" value={w.nama} onChange={e=>{ const v=e.target.value; setWorkers(prev=>prev.map(x=> x.id===w.id ? {...x, nama: v} : x)) }} /></td>
                      <td className="p-1"><input type="number" className="border p-1.5 rounded w-full text-xs text-center" value={w.usia} onChange={e=>{ const v=parseInt(e.target.value)||0; setWorkers(prev=>prev.map(x=> x.id===w.id ? {...x, usia: v} : x)) }} /></td>
                      <td className="p-1"><select className="border p-1.5 rounded w-full text-xs" value={w.jabatan} onChange={e=>{ const v=e.target.value; setWorkers(prev=>prev.map(x=> x.id===w.id ? {...x, jabatan: v} : x)) }}><option value="">Pilih</option>{(jabatanOptions.length ? jabatanOptions : [{name: 'Welder'}, {name: 'Scaffolder'}, {name: 'Electrician'}, {name: 'Rigger'}, {name: 'Helper'}]).map((opt:any)=><option key={opt.id || opt.name} value={opt.name}>{opt.name}</option>)}</select></td>
                      <td className="p-1"><select className="border p-1.5 rounded w-full text-xs" value={w.skill} onChange={e=>{ const v=e.target.value; setWorkers(prev=>prev.map(x=> x.id===w.id ? {...x, skill: v} : x)) }}><option value="">Pilih</option>{(skillOptions.length ? skillOptions : [{name: 'Welder Certified'}, {name: 'Scaffolder Certified'}, {name: 'Electrician Certified'}, {name: 'K3 Certified'}]).map((opt:any)=><option key={opt.id || opt.name} value={opt.name}>{opt.name}</option>)}</select></td>
                      <td className="p-1"><input className="border p-1.5 rounded w-full text-xs" value={w.license} onChange={e=>{ const v=e.target.value; setWorkers(prev=>prev.map(x=> x.id===w.id ? {...x, license: v} : x)) }} /></td>
                      <td className="p-1"><input type="date" className="border p-1.5 rounded w-full text-xs" value={w.tgl_expired} onChange={e=>{ const v=e.target.value; setWorkers(prev=>prev.map(x=> x.id===w.id ? {...x, tgl_expired: v} : x)) }} /></td>
                      <td className="p-1"><input type="file" className="text-[10px] border rounded p-1 w-full" onChange={e=>{ if(e.target.files && e.target.files[0]){ const f=e.target.files[0]; const url=fileToUrl(f); setWorkers(prev=>prev.map(x=> x.id===w.id ? {...x, dokumen_name: f.name, dokumen_url: url} : x)) } }} /><div className="mt-1">{w.dokumen_name && <><span className="text-emerald-600 text-[10px] font-bold">✅ {w.dokumen_name}</span><br/><a href={w.dokumen_url} target="_blank" className="text-blue-600 underline text-[11px] font-bold">👁 Lihat</a>{w.dokumen_url && <img src={w.dokumen_url} className="w-24 h-24 object-cover rounded border mt-1" />} </>}</div></td>
                      <td className="p-1 text-center"><button onClick={()=>removeWorkerRow(w.id)} className="bg-rose-50 border px-1.5 py-0.5 rounded text-[10px]">🗑</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2"><button onClick={()=>setWpStep(1)} className="bg-slate-100 border px-4 py-2 rounded-lg">Prev</button><button onClick={()=>setWpStep(3)} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold">Next → STEP 3</button></div>
          </div>
        )}

        {wpStep===3 && (
          <div className="space-y-5">
            <h4 className="font-bold text-[15px] bg-orange-50 p-3 rounded-lg border">STEP 3: ALAT KERJA + KENDARAAN BERAT + UTILITY</h4>
            <div className="p-3 bg-blue-50 rounded border text-[11px]">Nomor WP: <b className="font-mono">{pForm.nomor_wp}</b> | Tgl Mulai: <b>{pForm.start_date}</b> | Tgl Selesai: <b>{pForm.end_date}</b></div>
            <div className="p-4 bg-slate-50 rounded-xl border">
              <div className="flex justify-between items-center mb-3"><h5 className="font-bold text-sm">🛠 ALAT KERJA</h5><button onClick={addAlatRow} className="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs">+ Tambah Alat</button></div>
              <div className="overflow-auto border rounded-lg">
                <table className="w-full text-xs"><thead><tr className="bg-slate-700 text-white"><th className="p-2 w-10">No</th><th className="p-2 text-left">Nama Alat Kerja</th><th className="p-2 w-32">Tag Inspeksi</th><th className="p-2">Dokumen + Lihat</th><th className="p-2 w-10">Aksi</th></tr></thead>
                  <tbody>{alats.map((a, idx)=>(
                    <tr key={a.id} className="border-b bg-white"><td className="p-2 text-center font-bold">{idx+1}</td>
                      <td className="p-1"><input className="border p-2 rounded w-full text-[13px] font-medium" value={a.nama} onChange={e=>{ const v=e.target.value; setAlats(prev=>prev.map(x=> x.id===a.id ? {...x, nama: v} : x)) }} /></td>
                      <td className="p-1"><select className="border p-2 rounded w-full text-xs" value={a.tag_inspeksi} onChange={e=>{ const v=e.target.value; setAlats(prev=>prev.map(x=> x.id===a.id ? {...x, tag_inspeksi: v} : x)) }}><option>Ok</option><option>Not Ok</option><option>Need Repair</option></select></td>
                      <td className="p-1"><input type="file" className="text-[10px] border rounded p-1 w-full" onChange={e=>{ if(e.target.files && e.target.files[0]){ const f=e.target.files[0]; const url=fileToUrl(f); setAlats(prev=>prev.map(x=> x.id===a.id ? {...x, dokumen_name: f.name, dokumen_url: url} : x)) } }} /><div className="mt-1">{a.dokumen_name && <><span className="text-emerald-600 text-[10px] font-bold">✅ {a.dokumen_name}</span><br/><a href={a.dokumen_url} target="_blank" className="text-blue-600 underline text-[11px] font-bold">👁 Lihat</a>{a.dokumen_url && <img src={a.dokumen_url} className="w-24 h-24 object-cover rounded border mt-1" />} </>}</div></td>
                      <td className="p-1 text-center"><button onClick={()=>removeAlatRow(a.id)} className="bg-rose-50 border px-2 py-1 rounded text-xs">🗑</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
              <div className="flex justify-between items-center mb-3"><h5 className="font-bold text-sm">🚜 KENDARAAN BERAT</h5><button onClick={addKendaraanRow} className="bg-orange-500 text-white px-3 py-1 rounded-lg text-xs">+ Tambah Kendaraan</button></div>
              <div className="overflow-auto border rounded-lg">
                <table className="w-full text-xs"><thead><tr className="bg-orange-700 text-white"><th className="p-2 w-8">No</th><th className="p-2">Nama Kendaraan</th><th className="p-2 w-24">Kaps (Ton)</th><th className="p-2 w-28">Tag</th><th className="p-2">No License</th><th className="p-2">Operator</th><th className="p-2">Dokumen + Lihat</th><th className="p-2 w-10">Aksi</th></tr></thead>
                  <tbody>{kendaraans.map((k, idx)=>(
                    <tr key={k.id} className="border-b bg-white"><td className="p-2 text-center font-bold">{idx+1}</td>
                      <td className="p-1"><input className="border p-2 rounded w-full text-[13px]" value={k.nama} onChange={e=>{ const v=e.target.value; setKendaraans(prev=>prev.map(x=> x.id===k.id ? {...x, nama: v} : x)) }} /></td>
                      <td className="p-1"><select className="border p-2 rounded w-full text-xs" value={k.kaps_ton} onChange={e=>{ const v=e.target.value; setKendaraans(prev=>prev.map(x=> x.id===k.id ? {...x, kaps_ton: v} : x)) }}><option>1 Ton</option><option>5 Ton</option><option>20 Ton</option><option>50 Ton</option><option>100 Ton</option></select></td>
                      <td className="p-1"><select className="border p-2 rounded w-full text-xs" value={k.tag_inspeksi} onChange={e=>{ const v=e.target.value; setKendaraans(prev=>prev.map(x=> x.id===k.id ? {...x, tag_inspeksi: v} : x)) }}><option>Ok</option><option>Not Ok</option><option>Need Repair</option></select></td>
                      <td className="p-1"><input className="border p-2 rounded w-full text-xs" value={k.no_license} onChange={e=>{ const v=e.target.value; setKendaraans(prev=>prev.map(x=> x.id===k.id ? {...x, no_license: v} : x)) }} /></td>
                      <td className="p-1"><input className="border p-2 rounded w-full text-xs" value={k.operator} onChange={e=>{ const v=e.target.value; setKendaraans(prev=>prev.map(x=> x.id===k.id ? {...x, operator: v} : x)) }} /></td>
                      <td className="p-1"><input type="file" className="text-[10px] border rounded p-1 w-full" onChange={e=>{ if(e.target.files && e.target.files[0]){ const f=e.target.files[0]; const url=fileToUrl(f); setKendaraans(prev=>prev.map(x=> x.id===k.id ? {...x, dokumen_name: f.name, dokumen_url: url} : x)) } }} /><div className="mt-1">{k.dokumen_name && <><span className="text-emerald-600 text-[10px] font-bold">✅ {k.dokumen_name}</span><br/><a href={k.dokumen_url} target="_blank" className="text-blue-600 underline text-[11px] font-bold">👁 Lihat</a>{k.dokumen_url && <img src={k.dokumen_url} className="w-24 h-24 object-cover rounded border mt-1" />} </>}</div></td>
                      <td className="p-1 text-center"><button onClick={()=>removeKendaraanRow(k.id)} className="bg-rose-50 border px-2 py-1 rounded text-xs">🗑</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2"><button onClick={()=>setWpStep(2)} className="bg-slate-100 border px-4 py-2 rounded-lg">Prev</button><button onClick={()=>setWpStep(4)} className="bg-orange-600 text-white px-6 py-2.5 rounded-lg font-bold">Next → STEP 4</button></div>
          </div>
        )}

        {wpStep===4 && (
          <div className="space-y-5">
            <h4 className="font-bold text-[15px] bg-gradient-to-r from-yellow-50 to-amber-50 p-3 rounded-lg border">STEP 4: JSA + APD + K3 + LINGKUNGAN + LOKASI RADIUS M2 + NOMOR WP TAMPIL</h4>
            <div className="p-3 bg-blue-50 rounded border text-[11px]">Nomor WP: <b className="font-mono">{pForm.nomor_wp}</b> | Tgl Mulai: <b>{pForm.start_date}</b> | Tgl Selesai: <b>{pForm.end_date}</b> | Auto ke A4 Print 16px</div>
            
            <div className="p-4 bg-slate-50 rounded-xl border">
              <div className="flex justify-between items-center mb-3"><h5 className="font-bold text-sm">📄 JSA/SOP</h5><button onClick={addJsaRow} className="bg-slate-600 text-white px-3 py-1 rounded-lg text-xs">+ Tambah JSA</button></div>
              <div className="overflow-auto border rounded-lg">
                <table className="w-full text-xs"><thead><tr className="bg-slate-700 text-white"><th className="p-2 w-10">No</th><th className="p-2 text-left">Nama JSA/SOP</th><th className="p-2 w-32">No.Dokumen</th><th className="p-2">Dokumen + Lihat</th><th className="p-2 w-10">Aksi</th></tr></thead>
                  <tbody>{jsas.map((j, idx)=>(
                    <tr key={j.id} className="border-b bg-white"><td className="p-2 text-center font-bold">{idx+1}</td>
                      <td className="p-1"><input className="border p-2 rounded w-full" value={j.nama} onChange={e=>{ const v=e.target.value; setJsas(prev=>prev.map(x=> x.id===j.id ? {...x, nama: v} : x)) }} /></td>
                      <td className="p-1"><input className="border p-2 rounded w-full text-xs" value={j.no_dokumen} onChange={e=>{ const v=e.target.value; setJsas(prev=>prev.map(x=> x.id===j.id ? {...x, no_dokumen: v} : x)) }} /></td>
                      <td className="p-1"><input type="file" className="text-[10px] border rounded p-1 w-full" onChange={e=>{ if(e.target.files && e.target.files[0]){ const f=e.target.files[0]; const url=fileToUrl(f); setJsas(prev=>prev.map(x=> x.id===j.id ? {...x, dokumen_name: f.name, dokumen_url: url} : x)) } }} /><div className="mt-1">{j.dokumen_name && <><span className="text-emerald-600 text-[10px] font-bold">✅ {j.dokumen_name}</span><br/><a href={j.dokumen_url} target="_blank" className="text-blue-600 underline text-[11px] font-bold">👁 Lihat</a>{j.dokumen_url && <img src={j.dokumen_url} className="w-24 h-24 object-cover rounded border mt-1" />} </>}</div></td>
                      <td className="p-1 text-center"><button onClick={()=>removeJsaRow(j.id)} className="bg-rose-50 border px-2 py-1 rounded text-xs">🗑</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <h5 className="font-bold text-sm mb-3">🦺 APD - Centang + Others</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {APD_LIST.map(item=>(
                  <label key={item} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${selectedApd.includes(item) ? 'bg-blue-100 border-blue-300' : 'bg-white border-slate-200'}`}>
                    <input type="checkbox" checked={selectedApd.includes(item)} onChange={()=>toggleApd(item)} className="rounded" />
                    <span className="text-xs font-medium">{item}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3"><label className="text-xs font-bold">Others</label><input className="border p-2.5 rounded-lg w-full bg-white mt-1" placeholder="SCBA, Chemical Suit" value={apdOthers} onChange={e=>setApdOthers(e.target.value)} /></div>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex justify-between items-center mb-3"><h5 className="font-bold text-sm">⚠ ASPEK K3</h5><button onClick={addK3Row} className="bg-amber-600 text-white px-3 py-1 rounded-lg text-xs">+ Tambah K3</button></div>
              <div className="overflow-auto border rounded-lg">
                <table className="w-full text-xs"><thead><tr className="bg-amber-700 text-white"><th className="p-2 w-10">No</th><th className="p-2">Aktifitas</th><th className="p-2">Bahaya & Resiko</th><th className="p-2">Pencegahan</th><th className="p-2 w-10">Aksi</th></tr></thead>
                  <tbody>{k3s.map((k, idx)=>(
                    <tr key={k.id} className="border-b bg-white"><td className="p-2 text-center font-bold">{idx+1}</td>
                      <td className="p-1"><input className="border p-2 rounded w-full text-xs" value={k.aktivitas} onChange={e=>updateK3Row(k.id, 'aktivitas', e.target.value)} /></td>
                      <td className="p-1"><textarea className="border p-2 rounded w-full text-xs" value={k.bahaya_resiko} onChange={e=>updateK3Row(k.id, 'bahaya_resiko', e.target.value)} rows={2}></textarea></td>
                      <td className="p-1"><textarea className="border p-2 rounded w-full text-xs" value={k.pencegahan} onChange={e=>updateK3Row(k.id, 'pencegahan', e.target.value)} rows={2}></textarea></td>
                      <td className="p-1 text-center"><button onClick={()=>removeK3Row(k.id)} className="bg-rose-50 border px-2 py-1 rounded text-xs">🗑</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="flex justify-between items-center mb-3"><h5 className="font-bold text-sm">🌿 ASPEK LINGKUNGAN</h5><button onClick={addLingkunganRow} className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-xs">+ Tambah Lingkungan</button></div>
              <div className="overflow-auto border rounded-lg">
                <table className="w-full text-xs"><thead><tr className="bg-emerald-700 text-white"><th className="p-2 w-10">No</th><th className="p-2">Aktifitas</th><th className="p-2">Dampak</th><th className="p-2 w-24">Level</th><th className="p-2">Pencegahan</th><th className="p-2 w-10">Aksi</th></tr></thead>
                  <tbody>{lingkungans.map((l, idx)=>(
                    <tr key={l.id} className="border-b bg-white"><td className="p-2 text-center font-bold">{idx+1}</td>
                      <td className="p-1"><input className="border p-2 rounded w-full text-xs" value={l.aktivitas} onChange={e=>updateLingkunganRow(l.id, 'aktivitas', e.target.value)} /></td>
                      <td className="p-1"><input className="border p-2 rounded w-full text-xs" value={l.aspek_dampak} onChange={e=>updateLingkunganRow(l.id, 'aspek_dampak', e.target.value)} /></td>
                      <td className="p-1"><select className="border p-2 rounded w-full text-xs" value={l.level_resiko} onChange={e=>updateLingkunganRow(l.id, 'level_resiko', e.target.value)}><option>Low</option><option>Medium</option><option>High</option><option>Very High</option></select></td>
                      <td className="p-1"><textarea className="border p-2 rounded w-full text-xs" value={l.pencegahan} onChange={e=>updateLingkunganRow(l.id, 'pencegahan', e.target.value)} rows={2}></textarea></td>
                      <td className="p-1 text-center"><button onClick={()=>removeLingkunganRow(l.id)} className="bg-rose-50 border px-2 py-1 rounded text-xs">🗑</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>

            {/* ============ UTILITY BARU STEP4 - ELECTRIC WATER GAS STEAM ANGIN + ICON + SATUAN + DURASI JAM - image_4a672e.png ============ */}
            <div className="bg-white p-4 rounded-xl border-2 border-purple-300 shadow-sm mt-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-sm flex items-center gap-2">⚡ UTILITY - Electric / Water / Gas / Steam / Angin + Ikon + Satuan</h4>
                <button type="button" onClick={()=>{ setUtilityRows([...utilityRows, {id: Date.now().toString(), jenis: 'Electric', pemakaian: 100, satuan: 'kWh', durasi: 8, total: 12.5}]) }} className="bg-purple-600 text-white px-3 py-1 rounded-lg text-xs font-bold">+ Tambah Utility</button>
              </div>
              <div className="overflow-auto border rounded-lg">
                <table className="w-full text-xs border-collapse">
                  <thead><tr className="bg-purple-800 text-white"><th className="p-2 border">No</th><th className="p-2 border">Jenis + Icon</th><th className="p-2 border">Pemakaian (Satuan)</th><th className="p-2 border">Durasi (jam)</th><th className="p-2 border">Total/jam</th><th className="p-2 border">Aksi</th></tr></thead>
                  <tbody>
                    {utilityRows.map((u:any, i:number)=>(<tr key={u.id} className="border-b bg-white"><td className="p-2 border text-center font-bold">{i+1}</td><td className="p-2 border"><select value={u.jenis} onChange={e=>{ const v=e.target.value; let satuan='kWh'; if(v==='Water') satuan='m³'; else if(v==='Gas') satuan='m³'; else if(v==='Steam') satuan='Ton'; else if(v==='Angin') satuan='m³'; else satuan='kWh'; const copy=[...utilityRows]; copy[i]={...copy[i], jenis:v, satuan}; if(copy[i].durasi>0) copy[i].total=Number((copy[i].pemakaian/copy[i].durasi).toFixed(2)); setUtilityRows(copy); }} className="border rounded p-1 w-full text-xs"><option value="Electric">⚡ Electric - kWh</option><option value="Water">💧 Water - m³</option><option value="Gas">🔥 Gas - m³</option><option value="Steam">♨️ Steam - Ton</option><option value="Angin">💨 Angin - m³</option></select></td><td className="p-2 border"><div className="flex gap-1 items-center"><input type="number" value={u.pemakaian} onChange={e=>{ const c=[...utilityRows]; c[i].pemakaian=Number(e.target.value); if(c[i].durasi>0) c[i].total=Number((c[i].pemakaian/c[i].durasi).toFixed(2)); else c[i].total=c[i].pemakaian; setUtilityRows(c); }} className="border rounded p-1 w-16 text-xs" /><span className="text-[10px] px-1 bg-gray-100 rounded border">{u.satuan}</span></div></td><td className="p-2 border"><div className="flex gap-1 items-center"><input type="number" value={u.durasi} onChange={e=>{ const c=[...utilityRows]; c[i].durasi=Number(e.target.value); if(c[i].durasi>0) c[i].total=Number((c[i].pemakaian/c[i].durasi).toFixed(2)); else c[i].total=0; setUtilityRows(c); }} className="border rounded p-1 w-12 text-xs" /><span className="text-[10px]">jam</span></div></td><td className="p-2 border font-bold text-purple-700 text-xs">{u.total} {u.satuan}/jam</td><td className="p-2 border text-center"><button onClick={()=>setUtilityRows(utilityRows.filter((x:any)=>x.id!==u.id))} className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs">🗑</button></td></tr>))}
                    {utilityRows.length===0 && <tr><td colSpan={6} className="p-3 text-center text-gray-400 text-xs">Belum ada utility - Klik + Tambah Utility - Contoh: ⚡ Electric 100 kWh selama 8 jam</td></tr>}
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-[10px] text-gray-500 bg-purple-50 p-2 rounded border">Rumus: Total = Pemakaian / Durasi jam. Contoh: 100 kWh / 8 jam = 12.5 kWh/jam. Icons: ⚡ kWh, 💧 m³, 🔥 m³, ♨️ Ton, 💨 m³ + Durasi jam = Total/jam auto. Sync ke A4 Print QR tabel No-Jenis-Pemakaian-Durasi-Total + Supabase utilities jsonb.</div>
            </div>

            
            {/* ============ RISK MATRIX 5x5 FULL AUTO - IDE 3 - LOW HIJAU MEDIUM KUNING HIGH MERAH ============ */}
            <div className="bg-white p-4 rounded-xl border-2 border-slate-800 shadow-lg mt-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-black text-sm flex items-center gap-2">⚠️ RISK MATRIX 5x5 FULL AUTO - Likelihood x Severity = Score → Level</h4>
                <div className={`px-4 py-2 rounded-lg font-black text-sm border-2 ${getRiskColor(riskLevel)}`}>
                  {riskLevel === 'high' ? '🟥 HIGH' : riskLevel === 'medium' ? '🟨 MEDIUM' : '🟩 LOW'} - Score {riskScore} ({riskLikelihood} x {riskSeverity})
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold">Likelihood (Kemungkinan) 1-5</label>
                  <select value={riskLikelihood} onChange={e=>setRiskLikelihood(Number(e.target.value))} className="w-full border-2 rounded-lg p-2 text-sm mt-1">
                    <option value={1}>1 - Jarang (Rare)</option>
                    <option value={2}>2 - Kecil (Unlikely)</option>
                    <option value={3}>3 - Mungkin (Possible)</option>
                    <option value={4}>4 - Besar (Likely)</option>
                    <option value={5}>5 - Hampir Pasti (Almost Certain)</option>
                  </select>
                  <div className="mt-3">
                    <label className="text-xs font-bold">Severity (Keparahan) 1-5</label>
                    <select value={riskSeverity} onChange={e=>setRiskSeverity(Number(e.target.value))} className="w-full border-2 rounded-lg p-2 text-sm mt-1">
                      <option value={1}>1 - Minor - Luka Ringan</option>
                      <option value={2}>2 - Moderate - Luka Sedang</option>
                      <option value={3}>3 - Major - Luka Berat / 1 Fatality</option>
                      <option value={4}>4 - Critical - Multi Fatality</option>
                      <option value={5}>5 - Catastrophic - Bencana Besar</option>
                    </select>
                  </div>
                  <div className="mt-3 p-3 rounded-lg border-2 bg-slate-50">
                    <div className="text-[11px] font-bold">RUMUS: Score = Likelihood x Severity</div>
                    <div className="text-[11px]">Low 1-4 🟩 Hijau | Medium 5-12 🟨 Kuning | High 13-25 🟥 Merah</div>
                    <div className="mt-2 text-xs">Auto dari Jenis Pekerjaan: Hot Work/Confined Space/Height Work → Likelihood 4-5, Severity 4-5 → HIGH. Cold Work → LOW. Utility Gas/Steam → HIGH.</div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold mb-2">MATRIX 5x5 - Klik Cell untuk Set Risk:</div>
                  <div className="grid grid-cols-6 gap-1 text-[10px]">
                    <div></div><div className="text-center font-bold">S1</div><div className="text-center font-bold">S2</div><div className="text-center font-bold">S3</div><div className="text-center font-bold">S4</div><div className="text-center font-bold">S5</div>
                    {[5,4,3,2,1].map(l => (
                      <>
                        <div key={`L${l}`} className="font-bold flex items-center justify-center">L{l}</div>
                        {[1,2,3,4,5].map(s => {
                          const score = l * s;
                          const level = score >= 13 ? 'high' : score >= 5 ? 'medium' : 'low';
                          const isSelected = riskLikelihood === l && riskSeverity === s;
                          return <button key={`${l}-${s}`} type="button" onClick={()=>{ setRiskLikelihood(l); setRiskSeverity(s); }} className={`p-2 rounded font-black border-2 ${isSelected ? 'ring-4 ring-blue-500 scale-110' : ''} ${getRiskColorLight(score)}`}>{score}<br/><span className="text-[8px]">{level==='high'?'H':level==='medium'?'M':'L'}</span></button>
                        })}
                      </>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
                    <div className="bg-green-500 text-white p-2 rounded font-bold text-center">🟩 LOW 1-4<br/>APD Basic</div>
                    <div className="bg-yellow-400 text-black p-2 rounded font-bold text-center">🟨 MEDIUM 5-12<br/>APD + JSA + SO</div>
                    <div className="bg-red-600 text-white p-2 rounded font-bold text-center">🟥 HIGH 13-25<br/>Full K3 + Permit + SO + HSE</div>
                  </div>
                </div>
              </div>
            </div>


            {/* FIX: Ln 535 - NOMOR WP + TANGGAL SEBELUM LOKASI OVERLAP */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
              <h5 className="font-bold text-sm mb-3 flex items-center gap-2">🔢 NOMOR WP + TANGGAL - AUTO mrh-csmswp-yyyy-001 - 16px di A4 - FIX Ln 535 SEBELUM LOKASI OVERLAP</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-xl border">
                  <label className="text-[11px] font-bold">📋 Nomor WP (Auto +1 dari Settings STEP 10)</label>
                  <input type="text" value={pForm.nomor_wp} onChange={e=>setPForm({...pForm, nomor_wp:e.target.value.toLowerCase()})} placeholder="mrh-csmswp-2026-001" className="border p-2 rounded-lg w-full text-sm font-bold bg-slate-50 font-mono mt-1" />
                  <button type="button" onClick={()=>{ const newNo=generateWPNumber(); setPForm({...pForm, nomor_wp:newNo}) }} className="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-[10px] font-bold">🔄 Generate Baru</button>
                </div>
                <div className="bg-white p-3 rounded-xl border">
                  <label className="text-[11px] font-bold">📅 Tanggal Mulai * (start_date / tanggal_mulai)</label>
                  <input type="date" value={pForm.start_date} onChange={e=>setPForm({...pForm, start_date:e.target.value, tanggal_mulai:e.target.value})} className="border p-2 rounded-lg w-full text-sm font-bold mt-1" required />
                  
                </div>
                <div className="bg-white p-3 rounded-xl border">
                  <label className="text-[11px] font-bold">📅 Tanggal Selesai * (end_date / tanggal_selesai)</label>
                  <input type="date" value={pForm.end_date} onChange={e=>setPForm({...pForm, end_date:e.target.value, tanggal_selesai:e.target.value})} className="border p-2 rounded-lg w-full text-sm font-bold mt-1" required />
              
                </div>
              </div>
              <div className="mt-3 p-2 bg-white rounded border text-[10px]">Preview A4: Nomor WP <b className="font-mono">{pForm.nomor_wp || 'mrh-csmswp-2026-001'}</b> | Tgl Mulai {pForm.start_date} | Tgl Selesai {pForm.end_date} | Vendor {pForm.vendor_name} | Area {pForm.area_id} - Auto 16px di A4 Print</div>
            </div>

            {/* Ln 536 - LOKASI OVERLAP + RADIUS M2 - ASLI BAPAK JANGAN DIHAPUS */}
            <div className="p-4 bg-gradient-to-r from-slate-50 to-orange-50 rounded-xl border-2 border-orange-200">
              <h5 className="font-bold text-sm mb-3 flex items-center gap-2">📍 LOKASI OVERLAP + RADIUS M2 - GENERAL FACTORY - Ln 536 ASLI - JANGAN DIHAPUS</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div className="bg-white p-3 rounded-xl border">
                  <label className="text-[11px] font-bold">🔵 Radius Pekerjaan (meter)</label>
                  <input type="number" className="border p-2 rounded-lg w-full text-sm font-bold" value={workRadius} onChange={e=>{ const r=parseFloat(e.target.value)||0; updateM2FromRadius(r) }} />
                  <div className="text-[10px] text-slate-500">Coverage area kerja, contoh: pengelasan 20m, crane 50m - Rumus M2 = π × r²</div>
                </div>
                <div className="bg-white p-3 rounded-xl border">
                  <label className="text-[11px] font-bold">📐 Luas Pekerjaan (M2) auto</label>
                  <input type="number" className="border p-2 rounded-lg w-full text-sm font-bold" value={workM2.toFixed(1)} onChange={e=>{ const m2=parseFloat(e.target.value)||0; updateRadiusFromM2(m2) }} />
                  <div className="text-[10px] text-slate-500">Auto hitung: π×r² = {workM2.toFixed(1)} M2 - Factory {factoryM2} M2 radius {calcRadiusFromM2(factoryM2).toFixed(1)}m</div>
                </div>
                <div className="bg-white p-3 rounded-xl border">
                  <label className="text-[11px] font-bold">🏭 Area Radius (dari Area)</label>
                  <input type="number" className="border p-2 rounded-lg w-full text-sm" value={pForm.area_radius_m} onChange={e=>setPForm({...pForm, area_radius_m: parseFloat(e.target.value)||0})} />
                  <div className="text-[10px] text-slate-500">Auto dari Area: {selectedArea?.radius_m||APP_CONFIG.OVERLAP.DEFAULT_AREA_RADIUS_M}m ({selectedArea?.area_m2||'-'} M2) {selectedArea?.is_open ? '[OPEN]' : '[CLOSED]'}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs font-bold">Lat (manual atau auto dari Area)</label><input type="number" step="0.0001" className="border p-2.5 rounded-lg w-full bg-white" value={pForm.lat} onChange={e=>{const lat=parseFloat(e.target.value)||0; setPForm({...pForm, lat}); const active=permits.filter((p:any)=>p.status==='active' || p.status.startsWith('pending_')); let warning=''; for(const other of active){ if(other.id===pForm.id) continue; const sameArea = other.area_id===pForm.area_id; if(selectedArea?.type==='closed' && !sameArea) continue; const res = checkOverlapWithRadius(lat,pForm.lng, workRadius, other.lat, other.lng, other.work_radius_m||0); if(res.isOverlap){ warning = `CRITICAL OVERLAP dengan ${other.title} - Jarak ${res.distanceM.toFixed(1)}m < Total Radius ${res.totalRadiusM.toFixed(1)}m`; break; } } setOverlapWarning(warning)}} /></div>
                <div><label className="text-xs font-bold">Lng (manual atau auto dari Area)</label><input type="number" step="0.0001" className="border p-2.5 rounded-lg w-full bg-white" value={pForm.lng} onChange={e=>{const lng=parseFloat(e.target.value)||0; setPForm({...pForm, lng}); const active=permits.filter((p:any)=>p.status==='active' || p.status.startsWith('pending_')); let warning=''; for(const other of active){ if(other.id===pForm.id) continue; const sameArea = other.area_id===pForm.area_id; if(selectedArea?.type==='closed' && !sameArea) continue; const res = checkOverlapWithRadius(pForm.lat,lng, workRadius, other.lat, other.lng, other.work_radius_m||0); if(res.isOverlap){ warning = `CRITICAL OVERLAP dengan ${other.title} - Jarak ${res.distanceM.toFixed(1)}m < Total Radius ${res.totalRadiusM.toFixed(1)}m`; break; } } setOverlapWarning(warning)}} /></div>
              </div>

              <div className="mt-3 p-3 bg-white rounded-lg border">
                <div className="text-[11px] font-bold">Rumus Overlap Radius (General):</div>
                <div className="text-[11px] mt-1">Factory total {factoryM2} M2 → radius {calcRadiusFromM2(factoryM2).toFixed(1)}m | Area {selectedArea?.name || '-'} {selectedArea?.area_m2||'-'} M2 → radius {selectedArea?.radius_m||'-'}m | Pekerjaan radius {workRadius}m → luas {workM2.toFixed(1)} M2</div>
                <div className="text-[11px] mt-1">Overlap jika: jarak &lt; (r_pekerjaan1 + r_pekerjaan2). Contoh: Pekerjaan A r=25m + Pekerjaan B r=30m = 55m. Jika jarak titik kerja 40m &lt; 55m = OVERLAP. Jika area OPEN tanpa tembok, tetap hitung walau beda area. Jika CLOSED dengan tembok, hanya hitung jika area_id sama.</div>
              </div>

              {overlapWarning && <div className={`mt-3 p-3 rounded-lg font-bold text-sm ${overlapWarning.includes('CRITICAL') ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>{overlapWarning}</div>}
            </div>

            <div className="flex gap-2">
              <button onClick={()=>setWpStep(3)} className="bg-slate-100 border px-4 py-2 rounded-lg">Prev</button>
              <button onClick={async()=>{
                const year = new Date().getFullYear()
                const key = `mrh_wp_counter_${year}`
                try {
                  const match = (pForm.nomor_wp || '').match(new RegExp(`${year}-(\\d+)`))
                  if (match) {
                    const num = parseInt(match[1])
                    localStorage.setItem(key, String(num))
                  } else {
                    const current = parseInt(localStorage.getItem(key) || '0') + 1
                    localStorage.setItem(key, String(current))
                  }
                } catch { localStorage.setItem(key, '1') }
                                const payload = {
                  title: pForm.title,
                  judul: pForm.title,
                  description: pForm.description,
                  deskripsi: pForm.description,
                  vendor_name: pForm.vendor_name,
                  vendor_id: pForm.vendor_id,
                  area_id: pForm.area_id,
                  area_name: selectedArea?.name || pForm.area_id,
                  area_radius_m: pForm.area_radius_m,
                  factory_total_m2: factoryM2,
                  area_type: selectedArea?.type,
                  is_open: selectedArea?.is_open,
                  jenis: pForm.jenis || pForm.work_type,
                  work_type: pForm.work_type,
                  jenis_pekerjaan: pForm.work_type,
                  tanggal_mulai: pForm.start_date,
                  tanggal_selesai: pForm.end_date,
                  start_date: pForm.start_date,
                  end_date: pForm.end_date,
                  lat: pForm.lat,
                  lng: pForm.lng,
                  work_radius_m: workRadius,
                  work_area_m2: workM2,
                  utilities: utilityRows,
                  utility_list: utilityRows,
                  nomor_wp: pForm.nomor_wp || generateWPNumber(),
                  penanggung_jawab: pForm.penanggung_jawab,
                  pj_jabatan: pForm.pj_jabatan,
                  pj_phone: pForm.pj_phone,
                  pj_photo: pForm.pj_photo,
                  pj_photo_url: pForm.pj_photo_url,
                  safety_officer_name: pForm.safety_officer_name,
                  safety_officer_phone: pForm.safety_officer_phone,
                  safety_officer_license: pForm.safety_officer_license,
                  safety_officer_expired: pForm.safety_officer_expired,
                  safety_officer_dokumen: pForm.safety_officer_dokumen,
                  safety_officer_dokumen_url: pForm.safety_officer_dokumen_url,
                  safety_officer_photo: pForm.safety_officer_photo,
                  safety_officer_photo_url: pForm.safety_officer_photo_url,
                  workers_list: workers, 
                  alat_list: alats,
                  kendaraan_list: kendaraans,
                  jsa_list: jsas,
                  k3_list: k3s,
                  lingkungan_list: lingkungans,
                  apd_required: [...selectedApd, apdOthers].filter(Boolean).join(', '),
                  workers_count: workers.length,
                  jsa_sop: jsas.map(j=>`${j.nama} (${j.no_dokumen})`).join(', '),
                  aspek_k3: k3s.map(k=>`${k.aktivitas}: ${k.bahaya_resiko}`).join('; '),
                  aspek_lingkungan: lingkungans.map(l=>`${l.aktivitas}: ${l.aspek_dampak} (${l.level_resiko})`).join('; '),
                  risk_likelihood: riskLikelihood,
                  risk_severity: riskSeverity,
                  risk_score: riskScore,
                  risk_level: riskLevel,
                  risk_color: getRiskColor(riskLevel),
                  status: 'pending_owner',
                  approval_level: 1,
                  current_approver_role: 'Owner Area',
                  approval_history: [],
                }
                const r=await addPermit(payload, vendors)
                if(r){
                  setUtilityRows([{ id: 1, jenis: 'Electric', pemakaian: 0, satuan: 'kWh', durasi_jam: 0, icon: '⚡' }]);
                  setPForm({...pForm, title:'', nomor_wp:'', penanggung_jawab:'', pj_jabatan:'', pj_phone:'', pj_photo:'', pj_photo_url:'', safety_officer_name:'', safety_officer_phone:'', safety_officer_license:'', safety_officer_expired:'', safety_officer_dokumen:'', safety_officer_dokumen_url:'', safety_officer_photo:'', safety_officer_photo_url:''})
                  setWorkers([{ id: 1, nama: '', usia: 25, jabatan: '', skill: '', license: '', tgl_expired: new Date(Date.now()+365*86400000).toISOString().split('T')[0] }])
                  setAlats([{ id: 1, nama: 'Welding Machine', tag_inspeksi: 'Ok' }])
                  setKendaraans([{ id: 1, nama: 'Crane 20T', kaps_ton: '20 Ton', tag_inspeksi: 'Ok', no_license: 'SIO-001', operator: 'Budi Operator' }])
                  setJsas([{ id: 1, nama: 'JSA Pengelasan', no_dokumen: 'JSA-001' }])
                  setK3s([{ id: 1, aktivitas: 'Pengelasan', bahaya_resiko: 'Percikan api', pencegahan: 'APD' }])
                  setLingkungans([{ id: 1, aktivitas: 'Pengelasan', aspek_dampak: 'Emisi gas', level_resiko: 'Medium', pencegahan: 'Ventilasi' }])
                  setSelectedApd(['Helmet', 'Safety Shoes', 'Safety Gloves', 'Goggles'])
                  setApdOthers('')
                  setOverlapWarning('')
                  setWpStep(1)
                }
              }} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold">Simpan WP {pForm.nomor_wp || ''} → Owner Area (Level 1) - {pForm.start_date} s/d {pForm.end_date}</button>
            </div>
          </div>
        )}
      </div>

      {wpStep===1 && (
      <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100 overflow-auto">
        <div className="flex justify-between mb-3"><h3 className="font-bold flex items-center gap-2"><span>📋</span> DAFTAR WORK PERMIT - APPROVAL 4 TINGKAT + RADIUS + NOMOR WP AUTO</h3><button onClick={()=>downloadCSV('work_permits_v6_8_radius_nomorwp.csv', permits)} className="text-xs bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">Download CSV</button></div>
        <table className="w-full text-[11px]"><thead><tr className="bg-slate-700 text-white"><th className="p-2 text-left rounded-l-lg">Nomor WP</th><th className="p-2 text-left">Judul</th><th className="p-2">Area + M2 + Radius</th><th className="p-2">Vendor</th><th className="p-2">Tgl Mulai</th><th className="p-2">Tgl Selesai</th><th className="p-2">Radius Kerja</th><th className="p-2">PJ + SO</th><th className="p-2">Status Approval</th><th className="p-2 rounded-r-lg">Aksi</th></tr></thead>
          <tbody>{permits.map((p:any,i:number)=>(
            <tr key={i} className="border-b hover:bg-slate-50">
              <td className="p-2 font-mono font-black text-[10px]">
                <div>{p.nomor_wp || <span className="text-red-500">TIDAK ADA WP - LOCAL</span>}</div>
                <div className="mt-1">
                  {isRealSupabasePermit(p) ? (
                    <span className="bg-green-100 text-green-700 border border-green-300 px-1.5 py-0.5 rounded text-[8px] font-bold">✅ REAL Supabase</span>
                  ) : (
                    <span className="bg-yellow-100 text-yellow-800 border border-yellow-300 px-1.5 py-0.5 rounded text-[8px] font-bold">⚠️ LOCAL/PLACEHOLDER - Tidak di Supabase</span>
                  )}
                </div>
                <div className="text-[8px] text-slate-400 mt-1">ID: {p.id ? (p.id.length > 20 ? p.id.slice(0,8)+'...' : p.id) : 'local-'+i}</div>
              </td>
              <td className="p-2 font-bold">{p.title}<br/><span className="text-[10px] text-slate-500">{p.work_type}</span></td>
              <td className="p-2">{areas.find((a:any)=>a.id===p.area_id)?.name || p.area_id}<br/><span className="text-[10px]">{p.area_type||''} {p.is_open?'[OPEN]':'[CLOSED]'}<br/>{p.area_radius_m||'-'}m radius</span></td>
              <td className="p-2">{p.vendor_name}</td>
              <td className="p-2 font-bold">{p.tanggal_mulai || p.start_date || '-'}</td>
              <td className="p-2 font-bold">{p.tanggal_selesai || p.end_date || '-'}</td>
              <td className="p-2">{p.work_radius_m||APP_CONFIG.OVERLAP.DEFAULT_WORK_RADIUS_M}m<br/><span className="text-[10px]">{p.work_area_m2 ? `${p.work_area_m2.toFixed(0)} M2` : ''}</span><br/><span className="text-[10px]">{p.lat?.toFixed(4)},{p.lng?.toFixed(4)}</span></td>
              <td className="p-2">{p.penanggung_jawab}<br/>{p.safety_officer_name ? `SO: ${p.safety_officer_name}` : ''}</td>
              <td className="p-2">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                  p.status==='pending_owner' ? 'bg-blue-100 text-blue-700' :
                  p.status==='pending_utility' ? 'bg-amber-100 text-amber-700' :
                  p.status==='pending_hse' ? 'bg-orange-100 text-orange-700' :
                  p.status==='pending_gm' ? 'bg-purple-100 text-purple-700' :
                  p.status==='active' ? 'bg-green-100 text-green-700' :
                  p.status==='rejected' ? 'bg-red-100 text-red-700' :
                  'bg-slate-100'
                }`}>{p.status}</span>
                {p.approval_level && <div className="text-[10px] mt-1">Level {p.approval_level}/4: {p.current_approver_role}</div>}
                {p.rejection_reason && <div className="text-[10px] text-red-600">Reject: {p.rejection_reason}</div>}
              </td>
              <td className="p-2">
                <div className="flex flex-col gap-1">
                  <button onClick={()=>openDetail(p)} className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1 rounded text-[10px] font-bold">👁 View Detail</button>
                  <button onClick={()=>openPrintA4(p)} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1">🖨 A4 {p.nomor_wp ? p.nomor_wp.slice(0,12) : 'LOCAL'}</button>
                  <button onClick={()=>handleDeleteLocalPermit(p,i)} className={`${isRealSupabasePermit(p) ? 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-300' : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border border-yellow-300'} px-2 py-1 rounded text-[10px] font-bold flex items-center justify-center gap-1`}>
                    🗑 {isRealSupabasePermit(p) ? 'Hapus REAL' : 'Hapus LOCAL'}
                  </button>
                </div>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      )}

      {showDetail && selectedPermit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-slate-800 text-white p-4 flex justify-between items-center rounded-t-xl">
              <div>
                <h3 className="font-bold text-sm">Detail Work Permit - {selectedPermit.title} - {selectedPermit.nomor_wp}</h3>
                <p className="text-[11px] text-slate-300">No WP: {selectedPermit.nomor_wp} | Tgl Mulai: {selectedPermit.tanggal_mulai || selectedPermit.start_date} | Tgl Selesai: {selectedPermit.tanggal_selesai || selectedPermit.end_date} | Status: {getStatusLabel(selectedPermit.status)} | Role Anda: {roleLabel}</p>
              </div>
              <button onClick={closeDetail} className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded text-xs">✕ Tutup</button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex gap-2 border-b pb-2">
                <button onClick={()=>setDetailTab('info')} className={`text-xs px-3 py-1 rounded ${detailTab==='info' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Info Dasar + M2 + Radius + Nomor WP</button>
                <button onClick={()=>setDetailTab('workers')} className={`text-xs px-3 py-1 rounded ${detailTab==='workers' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>Pekerja + Alat + Kendaraan</button>
                <button onClick={()=>setDetailTab('safety')} className={`text-xs px-3 py-1 rounded ${detailTab==='safety' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>JSA + APD + K3 + Lingkungan</button>
              </div>

              {detailTab==='info' && (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="border rounded p-3 bg-blue-50"><p className="font-bold text-[10px] text-gray-500">Nomor WP Auto</p><p className="font-black font-mono">{selectedPermit.nomor_wp}</p><p className="text-[10px]">mrh-csmswp-yyyy-001 auto +1 dari Settings STEP 10</p></div>
                  <div className="border rounded p-3"><p className="font-bold text-[10px] text-gray-500">Tanggal Mulai - Selesai</p><p className="font-bold">{selectedPermit.tanggal_mulai || selectedPermit.start_date} s/d {selectedPermit.tanggal_selesai || selectedPermit.end_date}</p><p className="text-[10px]">Auto ke A4 Print 16px</p></div>
                  <div className="border rounded p-3"><p className="font-bold text-[10px] text-gray-500">Judul</p><p className="font-bold">{selectedPermit.title}</p><p className="text-[10px] text-gray-400">{selectedPermit.work_type || ''} - {selectedPermit.description || ''}</p></div>
                  <div className="border rounded p-3"><p className="font-bold text-[10px] text-gray-500">Area + M2 + Radius</p><p>{selectedPermit.area_id} - {areas.find((a:any)=>a.id===selectedPermit.area_id)?.name || ''}</p><p className="text-[10px]">{selectedPermit.area_type || ''} {selectedPermit.is_open ? '[OPEN]' : '[CLOSED]'} - Radius {selectedPermit.area_radius_m || '-'}m</p></div>
                  <div className="border rounded p-3"><p className="font-bold text-[10px] text-gray-500">Vendor</p><p className="font-bold">{selectedPermit.vendor_name}</p><p className="text-[10px] text-gray-400">ID: {selectedPermit.vendor_id?.slice(0,8)}</p></div>
                  <div className="border rounded p-3"><p className="font-bold text-[10px] text-gray-500">Radius Kerja + Luas M2</p><p>{selectedPermit.work_radius_m}m - {selectedPermit.work_area_m2?.toFixed(0)} M2</p><p className="text-[10px]">Lat {selectedPermit.lat?.toFixed(5)} Lng {selectedPermit.lng?.toFixed(5)}</p></div>
                  <div className="border rounded p-3"><p className="font-bold text-[10px] text-gray-500">PJ + SO</p><p>PJ: {selectedPermit.penanggung_jawab || 'jaka'} - {selectedPermit.pj_jabatan || ''}</p><p>SO: {selectedPermit.safety_officer_name || 'joko'} - {selectedPermit.safety_officer_license || ''}</p></div>
                  <div className="border rounded p-3"><p className="font-bold text-[10px] text-gray-500">Status Approval</p><p className="font-bold text-blue-600">{getStatusLabel(selectedPermit.status)} - Level {selectedPermit.approval_level || '1/4'}</p><p className="text-[10px]">Dibuat oleh: {selectedPermit.created_by_role || ''} - {selectedPermit.created_at?.slice(0,10)}</p></div>
                </div>
              )}

              {detailTab==='workers' && (
                <div className="space-y-4 text-xs">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-slate-100 p-2 font-bold text-xs">👷 Daftar Pekerja - {selectedPermit.nomor_wp}</div>
                    <table className="w-full text-[11px]"><thead><tr className="bg-slate-50 border-b"><th className="p-2 text-left">No</th><th className="p-2 text-left">Nama</th><th className="p-2">Jabatan</th><th className="p-2 text-left">License</th></tr></thead><tbody>{(selectedPermit.workers_list || []).map((w:any, idx:number)=><tr key={idx} className="border-b"><td className="p-2 text-center">{idx+1}</td><td className="p-2 font-bold">{w.nama || w.name}</td><td className="p-2">{w.jabatan}</td><td className="p-2 font-mono text-[10px]">{w.license}</td></tr>)}</tbody></table>
                  </div>
                  <div className="border rounded-lg overflow-hidden"><div className="bg-slate-100 p-2 font-bold text-xs">🔧 Alat</div><table className="w-full text-[11px]"><thead><tr className="bg-slate-50 border-b"><th className="p-2">No</th><th className="p-2 text-left">Nama Alat</th><th className="p-2">Tag</th></tr></thead><tbody>{(selectedPermit.alat_list || []).map((a:any, idx:number)=><tr key={idx} className="border-b"><td className="p-2 text-center">{idx+1}</td><td className="p-2 font-bold">{a.nama}</td><td className="p-2 text-center">{a.tag_inspeksi}</td></tr>)}</tbody></table></div>
                  <div className="border rounded-lg overflow-hidden"><div className="bg-slate-100 p-2 font-bold text-xs">🚚 Kendaraan</div><table className="w-full text-[11px]"><thead><tr className="bg-slate-50 border-b"><th className="p-2">No</th><th className="p-2 text-left">Nama</th><th className="p-2">Kaps</th><th className="p-2">Operator</th></tr></thead><tbody>{(selectedPermit.kendaraan_list || []).map((k:any, idx:number)=><tr key={idx} className="border-b"><td className="p-2 text-center">{idx+1}</td><td className="p-2 font-bold">{k.nama}</td><td className="p-2 text-center">{k.kaps_ton}</td><td className="p-2">{k.operator}</td></tr>)}</tbody></table></div>
                </div>
              )}

              {detailTab==='safety' && (
                <div className="space-y-4 text-xs">
                  <div className="border rounded-lg overflow-hidden"><div className="bg-slate-100 p-2 font-bold text-xs">📋 JSA</div><table className="w-full text-[11px]"><thead><tr className="bg-slate-50 border-b"><th className="p-2">No</th><th className="p-2 text-left">Nama JSA</th><th className="p-2">No Dokumen</th></tr></thead><tbody>{(selectedPermit.jsa_list || [{nama:'JSA Pengelasan', no_dokumen:'JSA-001'}]).map((j:any, idx:number)=><tr key={idx} className="border-b"><td className="p-2 text-center">{idx+1}</td><td className="p-2 font-bold">{j.nama||j.name}</td><td className="p-2 font-mono">{j.no_dokumen||j.no_dok||'-'}</td></tr>)}</tbody></table></div>
                  <div className="border rounded-lg p-3"><p className="font-bold text-xs mb-2">🦺 APD</p><div className="grid grid-cols-3 gap-2">{(selectedPermit.apd_required || selectedPermit.apd_list?.join(',') || 'Helmet, Safety Shoes, Safety Gloves, Goggles, Ear Plug, Ear Muff').split(',').map((apd:string, idx:number)=><div key={idx} className="flex items-center gap-2 border rounded px-2 py-1 bg-green-50"><span className="w-4 h-4 bg-green-500 text-white rounded flex items-center justify-center text-[10px]">✓</span><span className="text-[11px] font-bold">{apd.trim()}</span></div>)}</div></div>

                  {/* K3 - FIX V32 - SEBELUMNYA BELUM MUNCUL - AMBIL DARI k3s */}
                  <div className="border-2 border-orange-300 rounded-xl overflow-hidden bg-orange-50">
                    <div className="bg-orange-100 p-2 font-black text-xs">🦺 K3 - SOP / Bahaya / Pencegahan - FIX V32 SEBELUMNYA BELUM MUNCUL - Ambil dari k3s state</div>
                    <table className="w-full text-[11px] bg-white">
                      <thead><tr className="bg-orange-50 border-b"><th className="p-2">No</th><th className="p-2 text-left">Aktivitas</th><th className="p-2 text-left">Bahaya / Resiko</th><th className="p-2 text-left">Pencegahan</th></tr></thead>
                      <tbody>
                        {(selectedPermit.k3_list || (typeof k3s !== 'undefined' ? k3s : []) || [{aktivitas:'Welding - Hot Work', bahaya_resiko:'Luka bakar, percikan api', pencegahan:'APD lengkap + Fire Watch + APAR'}]).map((k:any, idx:number)=><tr key={idx} className="border-b"><td className="p-2 text-center">{idx+1}</td><td className="p-2 font-bold">{k.aktivitas||k.nama||'-'}</td><td className="p-2">{k.bahaya_resiko||k.bahaya||k.no||'-'}</td><td className="p-2">{k.pencegahan||k.ket||'-'}</td></tr>)}
                      </tbody>
                    </table>
                  </div>

                  {/* Lingkungan - FIX V32 */}
                  <div className="border-2 border-green-300 rounded-xl overflow-hidden bg-green-50">
                    <div className="bg-green-100 p-2 font-black text-xs">🌿 Lingkungan - Aspek Dampak - FIX V32 SEBELUMNYA BELUM MUNCUL</div>
                    <table className="w-full text-[11px] bg-white">
                      <thead><tr className="bg-green-50 border-b"><th className="p-2">No</th><th className="p-2 text-left">Aktivitas</th><th className="p-2 text-left">Aspek Dampak</th><th className="p-2 text-left">Level / Pencegahan</th></tr></thead>
                      <tbody>
                        {(selectedPermit.lingkungan_list || selectedPermit.lingkungan || (typeof lingkungans !== 'undefined' ? lingkungans : []) || [{aktivitas:'Pengelasan', aspek_dampak:'Limbah B3 - Slag Las, Fumes', level_resiko:'Medium', pencegahan:'Kumpulkan di TPS B3 + Masker'}]).map((l:any, idx:number)=><tr key={idx} className="border-b"><td className="p-2 text-center">{idx+1}</td><td className="p-2 font-bold">{l.aktivitas||l.nama||'-'}</td><td className="p-2">{l.aspek_dampak||l.dampak||l.no||'-'}</td><td className="p-2">{l.level_resiko||l.pencegahan||'-'}</td></tr>)}
                      </tbody>
                    </table>
                  </div>

                  {/* Utility 5 Jenis - FIX V32 - SEBELUMNYA BELUM MUNCUL */}
                  <div className="border-2 border-blue-300 rounded-xl overflow-hidden bg-blue-50">
                    <div className="bg-blue-100 p-2 font-black text-xs">⚡ Utility 5 Jenis - Pemakaian + Durasi + Total/jam + Kapasitas + No SILO + Qty + Durasi A4 - FIX V32</div>
                    <table className="w-full text-[11px] bg-white">
                      <thead><tr className="bg-blue-50 border-b"><th className="p-2">No</th><th className="p-2 text-left">Jenis + Icon</th><th className="p-2">Pemakaian</th><th className="p-2">Durasi</th><th className="p-2">Total/jam</th><th className="p-2 text-left">Kaps Ton + No SILO + Qty + Durasi (A4 Print V25)</th></tr></thead>
                      <tbody>
                        {(selectedPermit.utilities || selectedPermit.utility_list || utilityRows || [
                          {jenis:'Electric', pemakaian:200, satuan:'kWh', durasi:15, durasi_jam:15, icon:'⚡', kaps_ton:'20', no_license:'SIO-001', operator:'Budi'},
                          {jenis:'Water', pemakaian:87, satuan:'m³', durasi:8, durasi_jam:8, icon:'💧', kaps_ton:'10', no_license:'SIO-002', operator:'Joko'},
                          {jenis:'Gas', pemakaian:88, satuan:'m³', durasi:8, durasi_jam:8, icon:'🔥', kaps_ton:'5', no_license:'SIO-003', operator:'Jaka'},
                          {jenis:'Steam', pemakaian:83, satuan:'Ton', durasi:8, durasi_jam:8, icon:'♨️', kaps_ton:'83', no_license:'SIO-004', operator:'Siti'},
                          {jenis:'Angin', pemakaian:87, satuan:'m³', durasi:8, durasi_jam:8, icon:'💨', kaps_ton:'7', no_license:'SIO-005', operator:'Rudi'},
                        ]).map((u:any, idx:number)=>{
                          const totalPerJam = u.pemakaian && (u.durasi||u.durasi_jam) ? (parseFloat(u.pemakaian)/parseFloat(String(u.durasi||u.durasi_jam))).toFixed(2) : '-'
                          const iconMap:any = {Electric:'⚡', Water:'💧', Gas:'🔥', Steam:'♨️', Angin:'💨'}
                          return <tr key={idx} className="border-b"><td className="p-2 text-center">{idx+1}</td><td className="p-2 font-bold">{iconMap[u.jenis]||u.icon||''} {u.jenis}</td><td className="p-2">{u.pemakaian} {u.satuan}</td><td className="p-2">{u.durasi||u.durasi_jam||0} jam</td><td className="p-2 font-bold">{totalPerJam} {u.satuan}/jam</td><td className="p-2 text-[10px]">Kaps: {u.kaps_ton||u.kapasitas||'-'} Ton | No SILO: {u.no_license||u.no_silo||'-'} | Qty: {u.operator||u.qty||'-'} | Durasi: {u.durasi||u.durasi_jam||0}j | {u.pemakaian}{u.satuan} = {totalPerJam}/jam</td></tr>
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Risk Matrix 5x5 - FIX V32 */}
                  <div className="border-2 border-purple-300 rounded-xl overflow-hidden bg-purple-50">
                    <div className="bg-purple-100 p-2 font-black text-xs">🎯 Risk Matrix 5x5 Full Auto - Likelihood x Severity = Score - V32 FIX + Pion Warna + Final Scoring</div>
                    <div className="p-3 bg-white grid grid-cols-2 gap-3 text-xs">
                      <div>Risk Level: <span className={`px-2 py-1 rounded font-bold ${(selectedPermit.risk_level||'medium')==='high'?'bg-red-600 text-white':(selectedPermit.risk_level||'medium')==='medium'?'bg-yellow-400 text-black':'bg-green-500 text-white'}`}>{(selectedPermit.risk_level||'medium').toUpperCase()} {selectedPermit.risk_score||9} ({selectedPermit.risk_likelihood||3}x{selectedPermit.risk_severity||3})</span></div>
                      <div>Likelihood: {selectedPermit.risk_likelihood||3} | Severity: {selectedPermit.risk_severity||3} | Score: {selectedPermit.risk_score||9} | Color: {selectedPermit.risk_color||'yellow'} | Pion: {(selectedPermit.risk_level||'medium')==='high'?'🔴':(selectedPermit.risk_level||'medium')==='medium'?'🟡':'🟢'}</div>
                      <div className="col-span-2">
                        <div className="grid grid-cols-6 gap-1 text-[10px]">
                          <div></div><div className="font-bold text-center">S1</div><div className="font-bold text-center">S2</div><div className="font-bold text-center">S3</div><div className="font-bold text-center">S4</div><div className="font-bold text-center">S5</div>
                          {[5,4,3,2,1].map(l=>(
                            <React.Fragment key={l}>
                              <div className="font-bold">L{l}</div>
                              {[1,2,3,4,5].map(s=>{
                                const score = l*s
                                let bg = 'bg-green-200'
                                if (score>=13) bg='bg-red-400'
                                else if (score>=5) bg='bg-yellow-300'
                                const isSelected = l===(selectedPermit.risk_likelihood||3) && s===(selectedPermit.risk_severity||3)
                                return <div key={`${l}-${s}`} className={`${bg} ${isSelected?'ring-4 ring-black' : ''} border p-1 text-center font-bold`}>{score}</div>
                              })}
                            </React.Fragment>
                          ))}
                        </div>
                        <div className="mt-2 text-[10px]">Low 1-4 🟢 APD Basic | Medium 5-12 🟨 APD+JSA+SO | High 13-25 🟥 Full K3 + Permit + SO + HSE — Klik cell matrix di STEP 4 untuk ubah risk — Final Scoring = Base 100 - Risk Penalty + JSA/K3/APD - Utility</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t pt-4 bg-yellow-50/50 p-3 rounded">
                <p className="font-bold text-xs mb-2">Aksi Approval - Role Anda: {roleLabel} - WP: {selectedPermit.nomor_wp} - Status: {getStatusLabel(selectedPermit.status)}</p>
                {(() => {
                  if (!profile) return <p className="text-xs text-gray-400">Harus login</p>
                  const canApproveThis = canApproveLevel(profile.role, selectedPermit.status) && isAreaAllowed(profile, selectedPermit.area_id)
                  if (['pending_owner'].includes(selectedPermit.status)) {
                    if (canApproveThis) {
                      return <div className="flex gap-2"><button onClick={handleApproveFromDetail} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold text-xs">✓ APPROVE OWNER {selectedPermit.nomor_wp} → pending_utility</button><button onClick={handleRejectFromDetail} className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded text-xs">✗ Reject</button></div>
                    }
                    return <p className="text-xs text-gray-500">Menunggu Owner Project AREA-E approve {selectedPermit.nomor_wp}. Role Anda {roleLabel} tidak bisa approve {selectedPermit.status} - STRICT tidak muncul di level atas sebelum diapprove bawah.</p>
                  }
                  if (['pending_utility','approved_owner'].includes(selectedPermit.status)) {
                    if (canApproveThis) {
                      return <div className="flex gap-2"><button onClick={handleApproveFromDetail} className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded font-bold text-xs">✓ APPROVE UTILITY {selectedPermit.nomor_wp} → pending_hse</button><button onClick={handleRejectFromDetail} className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded text-xs">✗ Reject</button></div>
                    }
                    return <p className="text-xs text-gray-500">Menunggu Manager (Utility) approve {selectedPermit.nomor_wp}.</p>
                  }
                  if (['pending_hse','approved_utility'].includes(selectedPermit.status)) {
                    if (canApproveThis) {
                      return <div className="flex gap-2"><button onClick={handleApproveFromDetail} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded font-bold text-xs">✓ APPROVE HSE {selectedPermit.nomor_wp} → pending_gm</button><button onClick={handleRejectFromDetail} className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded text-xs">✗ Reject</button></div>
                    }
                    return <p className="text-xs text-gray-500">Menunggu HSE Officer approve {selectedPermit.nomor_wp}.</p>
                  }
                  if (['pending_gm','approved_hse'].includes(selectedPermit.status)) {
                    if (canApproveThis) {
                      return <div className="flex gap-2"><button onClick={handleApproveFromDetail} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded font-bold text-xs">✓ APPROVE GM {selectedPermit.nomor_wp} → active</button><button onClick={handleRejectFromDetail} className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded text-xs">✗ Reject</button></div>
                    }
                    return <p className="text-xs text-gray-500">Menunggu General Manager approve {selectedPermit.nomor_wp}.</p>
                  }
                  if (selectedPermit.status==='active') {
                    return profile.role==='general_manager' || profile.role==='admin_contractor' || profile.role==='admin' ? <button onClick={async ()=>{ await originalUpdateStatus(selectedPermit.id, 'closed', 6, 'Closed by ' + roleLabel); closeDetail() }} className="bg-slate-200 border px-4 py-2 rounded text-xs">Close WP {selectedPermit.nomor_wp} (GM/Admin)</button> : <p className="text-xs text-green-600 font-bold">✅ Active {selectedPermit.nomor_wp} - Sudah diapprove 4 tingkat - Muncul di Mapping Overlap & E-Patrol</p>
                  }
                  return <p className="text-xs text-gray-400">Status {getStatusLabel(selectedPermit.status)} - {selectedPermit.nomor_wp}</p>
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPrintA4 && selectedPermit && (
        <WorkPermitPrintA4 permit={selectedPermit} appSettings={appSettings} onClose={()=>setShowPrintA4(false)} />
      )}
    </div>
  )
}
