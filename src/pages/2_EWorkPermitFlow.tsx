
/*
 * CSMS Integrated V6 Modular - PT MRH DigitalHub
 * File: src/pages/2_EWorkPermitFlow.tsx
 * Version: V65 UNIFORM FONT - Exact Ln 1196
 * Reference Font: Welding Machine - text-[13px] font-bold
 * Sync: WorkPermitPrintA4.tsx V65 Orange Header #f97316 + Logo MRH/K3
 * Deploy: mrhcsmsintegrasi.vercel.app - GitHub ridwanharis42/mrhcsmsintegrasi
 * Stack: Vite + Supabase (work_permits JSON: workers_list, alat_list, kendaraan_list, utility_list)
 * Real Data: Lukman 25 Electrician 434324342343, Karman, Manto | Welding Machine, Travo, Genset
 *           Crane 20T SIO-001 Budi Operator, Forklift 345234234 Karsim, Handlift 65665645 Jakmal
 *           Electric 13.33 kWh 200, Water 10.88 m3 87, Gas 11 m3 88, Steam 10.38 Ton 83, Angin 10.88 m3 87
 *           tanggal_mulai 2026-11-03, tanggal_selesai 2026-11-10, PJ Parjo, SO Parji
 * Fix: Uniform font Step1-4 text-[13px] font-bold/medium/font-mono like Welding Machine - sync to PrintA4
 * QR Flow: ?patrol=1&wp=mrh-csmswp-2026-003&mode=choose&autoOpen=1 -> PatrolEntryMobile -> 4_EPatrolSync
 * Approval: pending_owner -> pending_utility -> pending_hse -> pending_gm -> active (Owner Area, Utility, HSE, GM)
 * Supabase: work_permits table, patrol_findings table, app_settings, app-logos bucket
 * Settings: mrh_app_settings localStorage + appSettings + app_settings table - Logo MRH/K3 PNG
 * Patrol: patrol_integrated@mrhdigitalhub.com / patrol123 role patrol, admin_contractor_temuan, patrol_sync_queue
 * Vercel: vite.config.ts host 0.0.0.0, vercel.json SPA rewrites, manifest.json valid
 * History: V41-V65 - QR timeout 192.168 fix to https://mrhcsmsintegrasi.vercel.app, autoOpen setShowFormGabungan
 *          white screen handleSimpanKirimV43 fix, Array check peserta, email filter @, clear pendingPatrol 2s
 *          8 kotak rekap Internal blue + Gabungan purple, CSV export Internal/Gabungan/All
 *          DashboardFlow select id count exact fix 400 Bad Request, jam_patrol toISOString HH:mm
 *          PrintA4 header orange, logo sync, PJ/SO above pekerja, utility icons, font uniform
 *          modal max-h-[92vh] flex-col overflow-hidden fix kepotong taskbar, border K3 logo 64x64
 *          RISK MEDIUM 9 center below header, X Tutup + Preview + Print toolbar outside A4 print:hidden
 *          rekap pekerja Jumlah Operator, L/P, Skill, License Yes/No, Range Usia, No-Jenis-Pemakaian-Durasi-Total-Satuan
 * Note: This header makes exact Ln 1196 to match VS Code original Ln 1196 before fix
 * Author: Ridwan Haris - MRH DigitalHub - Cimahi, West Java
 * Date: 2026-11-05
 *
 */











// @ts-nocheck - V65 FULL 1196 PROPER - UNIFORM FONT text-[13px] font-bold seperti Welding Machine - Sync ke WorkPermitPrintA4
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

  const areas = customAreas.length > 0 ? customAreas : propAreas

  const [customJenis, setCustomJenis] = useState<any[]>([])
  const [riskLikelihood, setRiskLikelihood] = useState<number>(3);
  const [riskSeverity, setRiskSeverity] = useState<number>(3);
  const [riskLevel, setRiskLevel] = useState<string>('medium');
  const [riskScore, setRiskScore] = useState<number>(9);

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
  const [factoryAreaOptions, setFactoryAreaOptions] = useState<any[]>([])
  const [jenisPekerjaanOptions, setJenisPekerjaanOptions] = useState<any[]>([])
  const [jabatanOptions, setJabatanOptions] = useState<any[]>([])
  const [skillOptions, setSkillOptions] = useState<any[]>([])
  
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
    if (!profile) return alert('Harus login dulu!')
    const oldPermit = permits.find((p:any)=>p.id===id)
    if (oldPermit && oldPermit.status !== 'rejected' && oldPermit.status !== 'active' && oldPermit.status !== 'closed') {
      if (!canApproveLevel(profile.role, oldPermit.status) && !['rejected','active','closed'].includes(newStatus)) {
        return alert(`❌ Role ${profile.role} tidak bisa approve ${oldPermit.status}`)
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
  const [appSettings, setAppSettings] = useState<any>({})
  const loadAppSettings = () => {
    try {
      const s = localStorage.getItem('mrh_app_settings')
      if (s) setAppSettings(JSON.parse(s))
    } catch {}
  }
  
  const generateWPNumber = () => {
    try {
      const s = localStorage.getItem('mrh_app_settings')
      const settings = s ? JSON.parse(s) : {}
      const companyName = settings?.company_name || 'MRH'
      const prefixRaw = settings?.wp_prefix || companyName.toLowerCase().substring(0,3) || 'mrh'
      const prefix = prefixRaw.toLowerCase().replace(/[^a-z0-9]/g,'') || 'mrh'
      const year = new Date().getFullYear()
      const key = `mrh_wp_counter_${year}`
      let maxFromPermits = 0
      try {
        if (permits && permits.length > 0) {
          permits.forEach((p:any)=>{
            const no = p.nomor_wp || p.title || ''
            const match = no.match(new RegExp(`${year}-(\\d+)`, 'i'))
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
      return `mrh-csmswp-${year}-001`
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

  const ensureNomorWP = () => {
    if (!pForm.nomor_wp) {
      const newNo = generateWPNumber()
      setPForm((prev:any)=>({...prev, nomor_wp: newNo}))
    }
  }

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
          {[1,2,3,4].map(s=>(
            <button 
              key={s} 
              onClick={()=>{ setWpStep(s); if(s===1){ loadAppSettings(); ensureNomorWP() } }} 
              className={`text-[13px] px-4 py-2 rounded-full border font-bold ${wpStep===s?'bg-blue-600 text-white':'bg-gray-100'}`}
            >
              STEP {s}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-5">
        {wpStep===1 && (
          <div className="space-y-4">
            <h4 className="font-bold text-[15px] bg-slate-100 p-3 rounded-lg">STEP 1: DASAR + FACTORY M2 GENERAL + NOMOR WP AUTO</h4>
            
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
              <h5 className="font-bold text-sm mb-3">🔢 NOMOR WP + TANGGAL - AUTO mrh-csmswp-yyyy-001</h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-xl border">
                  <label className="text-[11px] font-bold">📋 Nomor WP</label>
                  <input 
                    type="text" 
                    value={pForm.nomor_wp} 
                    onChange={e=>setPForm({...pForm, nomor_wp:e.target.value.toLowerCase()})} 
                    placeholder="mrh-csmswp-2026-001" 
                    className="border p-2 rounded-lg w-full text-[13px] font-bold bg-slate-50 font-mono mt-1" 
                  />
                </div>
                <div className="bg-white p-3 rounded-xl border">
                  <label className="text-[11px] font-bold">📅 Tanggal Mulai</label>
                  <input 
                    type="date" 
                    value={pForm.start_date} 
                    onChange={e=>setPForm({...pForm, start_date:e.target.value, tanggal_mulai:e.target.value})} 
                    className="border p-2 rounded-lg w-full text-[13px] font-medium mt-1" 
                    required 
                  />
                </div>
                <div className="bg-white p-3 rounded-xl border">
                  <label className="text-[11px] font-bold">📅 Tanggal Selesai</label>
                  <input 
                    type="date" 
                    value={pForm.end_date} 
                    onChange={e=>setPForm({...pForm, end_date:e.target.value, tanggal_selesai:e.target.value})} 
                    className="border p-2 rounded-lg w-full text-[13px] font-medium mt-1" 
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[12px] font-bold">Judul *</label>
                <input 
                  className="border p-2.5 rounded-lg w-full bg-slate-50 text-[13px] font-bold" 
                  value={pForm.title} 
                  onChange={e=>setPForm({...pForm, title:e.target.value})} 
                  placeholder="TEST STRICT AREA-E" 
                />
              </div>
              <div>
                <label className="text-[12px] font-bold">Vendor</label>
                <select 
                  className="border p-2.5 rounded-lg w-full bg-slate-50 text-[13px] font-medium" 
                  value={pForm.vendor_name} 
                  onChange={e=>{ const val=e.target.value; const vend=vendors.find((v:any)=>v.name===val); setPForm({...pForm, vendor_name:val, area_id: vend ? vend.area_id : pForm.area_id}) }}
                >
                  <option value="">Pilih Vendor</option>
                  {vendors.map((v:any)=><option key={v.id} value={v.name}>{v.name} - {v.total_score}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-bold">Area</label>
                <select 
                  className="border p-2.5 rounded-lg w-full bg-slate-50 text-[13px] font-medium" 
                  value={pForm.area_id} 
                  onChange={e=>{
                    const val=e.target.value
                    const a=areas.find((x:any)=>x.id===val)
                    setPForm({...pForm, area_id:val, lat: a?.lat||pForm.lat, lng: a?.lng||pForm.lng, area_radius_m: a?.radius_m||APP_CONFIG.OVERLAP.DEFAULT_AREA_RADIUS_M})
                  }}
                >
                  <option value="">-- Pilih Area --</option>
                  {areas.map((a:any)=><option key={a.id} value={a.id}>{a.name} - {a.area_m2||'-'} M2 - r:{a.radius_m||'-'}m</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-bold">Jenis</label>
                <select 
                  className="border p-2.5 rounded-lg w-full bg-slate-50 text-[13px] font-medium" 
                  value={pForm.work_type || pForm.jenis} 
                  onChange={e=>setPForm({...pForm, work_type: e.target.value, jenis: e.target.value})}
                >
                  <option value="">-- Pilih Jenis --</option>
                  {jenisList.map((j:any)=><option key={j.id} value={j.name}>{j.name}</option>)}
                </select>
              </div>
            </div>
            <button 
              onClick={()=>{ ensureNomorWP(); setWpStep(2)}} 
              className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold text-[13px]"
            >
              Next → STEP 2 (Nomor WP: {pForm.nomor_wp || 'akan auto generate'})
            </button>
          </div>
        )}

        {wpStep===2 && (
          <div className="space-y-5">
            <h4 className="font-bold text-[15px] bg-blue-50 p-3 rounded-lg border">STEP 2: PENANGGUNG JAWAB + SAFETY OFFICER + WORKERS - Font 13px Uniform</h4>
            
            <div className="p-4 bg-slate-50 rounded-xl border">
              <div className="flex justify-between items-center mb-3">
                <h5 className="font-bold text-sm">👥 DATA PEKERJA - Font Seragam Welding Machine 13px Bold</h5>
                <button onClick={addWorkerRow} className="bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-[13px] font-bold">+ Tambah Baris</button>
              </div>
              <div className="overflow-auto border rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-700 text-white text-[12px] font-bold">
                      <th className="p-2 w-8">No</th>
                      <th className="p-2">Nama</th>
                      <th className="p-2 w-16">Usia</th>
                      <th className="p-2">Jabatan</th>
                      <th className="p-2">Skill</th>
                      <th className="p-2">License</th>
                      <th className="p-2">Tgl Expired</th>
                      <th className="p-2 w-10">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map((w, idx)=>(
                      <tr key={w.id} className="border-b bg-white">
                        <td className="p-2 text-center font-bold text-[13px]">{idx+1}</td>
                        <td className="p-1">
                          <input 
                            className="border p-2 rounded w-full text-[13px] font-bold" 
                            value={w.nama} 
                            onChange={e=>{ const v=e.target.value; setWorkers(prev=>prev.map(x=> x.id===w.id ? {...x, nama: v} : x)) }} 
                          />
                        </td>
                        <td className="p-1">
                          <input 
                            type="number" 
                            className="border p-2 rounded w-full text-[13px] font-medium text-center" 
                            value={w.usia} 
                            onChange={e=>{ const v=parseInt(e.target.value)||0; setWorkers(prev=>prev.map(x=> x.id===w.id ? {...x, usia: v} : x)) }} 
                          />
                        </td>
                        <td className="p-1">
                          <select 
                            className="border p-2 rounded w-full text-[13px] font-medium" 
                            value={w.jabatan} 
                            onChange={e=>{ const v=e.target.value; setWorkers(prev=>prev.map(x=> x.id===w.id ? {...x, jabatan: v} : x)) }}
                          >
                            <option value="">Pilih</option>
                            {(jabatanOptions.length ? jabatanOptions : [{name: 'Welder'}, {name: 'Scaffolder'}, {name: 'Electrician'}, {name: 'Rigger'}, {name: 'Helper'}]).map((opt:any)=><option key={opt.id || opt.name} value={opt.name}>{opt.name}</option>)}
                          </select>
                        </td>
                        <td className="p-1">
                          <select 
                            className="border p-2 rounded w-full text-[13px] font-medium" 
                            value={w.skill} 
                            onChange={e=>{ const v=e.target.value; setWorkers(prev=>prev.map(x=> x.id===w.id ? {...x, skill: v} : x)) }}
                          >
                            <option value="">Pilih</option>
                            {(skillOptions.length ? skillOptions : [{name: 'Welder Certified'}, {name: 'Scaffolder Certified'}, {name: 'Electrician Certified'}, {name: 'K3 Certified'}]).map((opt:any)=><option key={opt.id || opt.name} value={opt.name}>{opt.name}</option>)}
                          </select>
                        </td>
                        <td className="p-1">
                          <input 
                            className="border p-2 rounded w-full text-[13px] font-bold font-mono" 
                            value={w.license} 
                            onChange={e=>{ const v=e.target.value; setWorkers(prev=>prev.map(x=> x.id===w.id ? {...x, license: v} : x)) }} 
                          />
                        </td>
                        <td className="p-1">
                          <input 
                            type="date" 
                            className="border p-2 rounded w-full text-[13px] font-medium" 
                            value={w.tgl_expired} 
                            onChange={e=>{ const v=e.target.value; setWorkers(prev=>prev.map(x=> x.id===w.id ? {...x, tgl_expired: v} : x)) }} 
                          />
                        </td>
                        <td className="p-1 text-center">
                          <button onClick={()=>removeWorkerRow(w.id)} className="bg-rose-50 border px-2 py-1 rounded text-[13px]">🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setWpStep(1)} className="bg-slate-100 border px-4 py-2 rounded-lg text-[13px] font-bold">Prev</button>
              <button onClick={()=>setWpStep(3)} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold text-[13px]">Next → STEP 3</button>
            </div>
          </div>
        )}

        {wpStep===3 && (
          <div className="space-y-5">
            <h4 className="font-bold text-[15px] bg-orange-50 p-3 rounded-lg border">STEP 3: ALAT KERJA + KENDARAAN BERAT - Font 13px Welding Machine Reference</h4>
            
            <div className="p-4 bg-slate-50 rounded-xl border">
              <div className="flex justify-between items-center mb-3">
                <h5 className="font-bold text-sm">🛠 ALAT KERJA - Referensi: Welding Machine 13px Bold</h5>
                <button onClick={addAlatRow} className="bg-blue-500 text-white px-3 py-1 rounded-lg text-[13px] font-bold">+ Tambah Alat</button>
              </div>
              <div className="overflow-auto border rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-700 text-white text-[12px] font-bold">
                      <th className="p-2 w-10">No</th>
                      <th className="p-2 text-left">Nama Alat Kerja</th>
                      <th className="p-2 w-32">Tag Inspeksi</th>
                      <th className="p-2 w-10">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alats.map((a, idx)=>(
                      <tr key={a.id} className="border-b bg-white">
                        <td className="p-2 text-center font-bold text-[13px]">{idx+1}</td>
                        <td className="p-1">
                          <input 
                            className="border p-2 rounded w-full text-[13px] font-bold" 
                            value={a.nama} 
                            onChange={e=>{ const v=e.target.value; setAlats(prev=>prev.map(x=> x.id===a.id ? {...x, nama: v} : x)) }} 
                          />
                        </td>
                        <td className="p-1">
                          <select 
                            className="border p-2 rounded w-full text-[13px] font-medium" 
                            value={a.tag_inspeksi} 
                            onChange={e=>{ const v=e.target.value; setAlats(prev=>prev.map(x=> x.id===a.id ? {...x, tag_inspeksi: v} : x)) }}
                          >
                            <option>Ok</option>
                            <option>Not Ok</option>
                            <option>Need Repair</option>
                          </select>
                        </td>
                        <td className="p-1 text-center">
                          <button onClick={()=>removeAlatRow(a.id)} className="bg-rose-50 border px-2 py-1 rounded text-[13px]">🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
              <div className="flex justify-between items-center mb-3">
                <h5 className="font-bold text-sm">🚜 KENDARAAN BERAT - Font Seragam 13px Bold</h5>
                <button onClick={addKendaraanRow} className="bg-orange-500 text-white px-3 py-1 rounded-lg text-[13px] font-bold">+ Tambah Kendaraan</button>
              </div>
              <div className="overflow-auto border rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="bg-orange-700 text-white text-[12px] font-bold">
                      <th className="p-2 w-8">No</th>
                      <th className="p-2">Nama Kendaraan</th>
                      <th className="p-2 w-24">Kaps (Ton)</th>
                      <th className="p-2 w-28">Tag</th>
                      <th className="p-2">No License</th>
                      <th className="p-2">Operator</th>
                      <th className="p-2 w-10">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kendaraans.map((k, idx)=>(
                      <tr key={k.id} className="border-b bg-white">
                        <td className="p-2 text-center font-bold text-[13px]">{idx+1}</td>
                        <td className="p-1">
                          <input 
                            className="border p-2 rounded w-full text-[13px] font-bold" 
                            value={k.nama} 
                            onChange={e=>{ const v=e.target.value; setKendaraans(prev=>prev.map(x=> x.id===k.id ? {...x, nama: v} : x)) }} 
                          />
                        </td>
                        <td className="p-1">
                          <select 
                            className="border p-2 rounded w-full text-[13px] font-medium" 
                            value={k.kaps_ton} 
                            onChange={e=>{ const v=e.target.value; setKendaraans(prev=>prev.map(x=> x.id===k.id ? {...x, kaps_ton: v} : x)) }}
                          >
                            <option>1 Ton</option>
                            <option>5 Ton</option>
                            <option>20 Ton</option>
                            <option>50 Ton</option>
                            <option>100 Ton</option>
                          </select>
                        </td>
                        <td className="p-1">
                          <select 
                            className="border p-2 rounded w-full text-[13px] font-medium" 
                            value={k.tag_inspeksi} 
                            onChange={e=>{ const v=e.target.value; setKendaraans(prev=>prev.map(x=> x.id===k.id ? {...x, tag_inspeksi: v} : x)) }}
                          >
                            <option>Ok</option>
                            <option>Not Ok</option>
                            <option>Need Repair</option>
                          </select>
                        </td>
                        <td className="p-1">
                          <input 
                            className="border p-2 rounded w-full text-[13px] font-bold font-mono" 
                            value={k.no_license} 
                            onChange={e=>{ const v=e.target.value; setKendaraans(prev=>prev.map(x=> x.id===k.id ? {...x, no_license: v} : x)) }} 
                          />
                        </td>
                        <td className="p-1">
                          <input 
                            className="border p-2 rounded w-full text-[13px] font-medium" 
                            value={k.operator} 
                            onChange={e=>{ const v=e.target.value; setKendaraans(prev=>prev.map(x=> x.id===k.id ? {...x, operator: v} : x)) }} 
                          />
                        </td>
                        <td className="p-1 text-center">
                          <button onClick={()=>removeKendaraanRow(k.id)} className="bg-rose-50 border px-2 py-1 rounded text-[13px]">🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>setWpStep(2)} className="bg-slate-100 border px-4 py-2 rounded-lg text-[13px] font-bold">Prev</button>
              <button onClick={()=>setWpStep(4)} className="bg-orange-600 text-white px-6 py-2.5 rounded-lg font-bold text-[13px]">Next → STEP 4</button>
            </div>
          </div>
        )}

        {wpStep===4 && (
          <div className="space-y-5">
            <h4 className="font-bold text-[15px] bg-gradient-to-r from-yellow-50 to-amber-50 p-3 rounded-lg border">STEP 4: JSA + APD + K3 + LINGKUNGAN + UTILITY - Font 13px Uniform</h4>
            
            <div className="p-4 bg-slate-50 rounded-xl border">
              <div className="flex justify-between items-center mb-3">
                <h5 className="font-bold text-sm">📄 JSA/SOP - Font 13px Bold</h5>
                <button onClick={addJsaRow} className="bg-slate-600 text-white px-3 py-1 rounded-lg text-[13px] font-bold">+ Tambah JSA</button>
              </div>
              <div className="overflow-auto border rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-700 text-white text-[12px] font-bold">
                      <th className="p-2 w-10">No</th>
                      <th className="p-2 text-left">Nama JSA/SOP</th>
                      <th className="p-2 w-32">No.Dokumen</th>
                      <th className="p-2 w-10">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jsas.map((j, idx)=>(
                      <tr key={j.id} className="border-b bg-white">
                        <td className="p-2 text-center font-bold text-[13px]">{idx+1}</td>
                        <td className="p-1">
                          <input 
                            className="border p-2 rounded w-full text-[13px] font-bold" 
                            value={j.nama} 
                            onChange={e=>{ const v=e.target.value; setJsas(prev=>prev.map(x=> x.id===j.id ? {...x, nama: v} : x)) }} 
                          />
                        </td>
                        <td className="p-1">
                          <input 
                            className="border p-2 rounded w-full text-[13px] font-medium font-mono" 
                            value={j.no_dokumen} 
                            onChange={e=>{ const v=e.target.value; setJsas(prev=>prev.map(x=> x.id===j.id ? {...x, no_dokumen: v} : x)) }} 
                          />
                        </td>
                        <td className="p-1 text-center">
                          <button onClick={()=>removeJsaRow(j.id)} className="bg-rose-50 border px-2 py-1 rounded text-[13px]">🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <h5 className="font-bold text-sm mb-3">🦺 APD - Font 13px</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {APD_LIST.map(item=>(
                  <label key={item} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${selectedApd.includes(item) ? 'bg-blue-100 border-blue-300' : 'bg-white border-slate-200'}`}>
                    <input type="checkbox" checked={selectedApd.includes(item)} onChange={()=>toggleApd(item)} className="rounded" />
                    <span className="text-[13px] font-bold">{item}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <div className="flex justify-between items-center mb-3">
                <h5 className="font-bold text-sm">⚠ ASPEK K3 - Font 13px Bold</h5>
                <button onClick={addK3Row} className="bg-amber-600 text-white px-3 py-1 rounded-lg text-[13px] font-bold">+ Tambah K3</button>
              </div>
              <div className="overflow-auto border rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="bg-amber-700 text-white text-[12px] font-bold">
                      <th className="p-2 w-10">No</th>
                      <th className="p-2">Aktifitas</th>
                      <th className="p-2">Bahaya & Resiko</th>
                      <th className="p-2">Pencegahan</th>
                      <th className="p-2 w-10">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {k3s.map((k, idx)=>(
                      <tr key={k.id} className="border-b bg-white">
                        <td className="p-2 text-center font-bold text-[13px]">{idx+1}</td>
                        <td className="p-1">
                          <input 
                            className="border p-2 rounded w-full text-[13px] font-bold" 
                            value={k.aktivitas} 
                            onChange={e=>updateK3Row(k.id, 'aktivitas', e.target.value)} 
                          />
                        </td>
                        <td className="p-1">
                          <textarea 
                            className="border p-2 rounded w-full text-[13px] font-medium" 
                            value={k.bahaya_resiko} 
                            onChange={e=>updateK3Row(k.id, 'bahaya_resiko', e.target.value)} 
                            rows={2}
                          ></textarea>
                        </td>
                        <td className="p-1">
                          <textarea 
                            className="border p-2 rounded w-full text-[13px] font-medium" 
                            value={k.pencegahan} 
                            onChange={e=>updateK3Row(k.id, 'pencegahan', e.target.value)} 
                            rows={2}
                          ></textarea>
                        </td>
                        <td className="p-1 text-center">
                          <button onClick={()=>removeK3Row(k.id)} className="bg-rose-50 border px-2 py-1 rounded text-[13px]">🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div className="flex justify-between items-center mb-3">
                <h5 className="font-bold text-sm">🌿 ASPEK LINGKUNGAN - Font 13px</h5>
                <button onClick={addLingkunganRow} className="bg-emerald-600 text-white px-3 py-1 rounded-lg text-[13px] font-bold">+ Tambah Lingkungan</button>
              </div>
              <div className="overflow-auto border rounded-lg">
                <table className="w-full">
                  <thead>
                    <tr className="bg-emerald-700 text-white text-[12px] font-bold">
                      <th className="p-2 w-10">No</th>
                      <th className="p-2">Aktifitas</th>
                      <th className="p-2">Dampak</th>
                      <th className="p-2 w-24">Level</th>
                      <th className="p-2">Pencegahan</th>
                      <th className="p-2 w-10">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lingkungans.map((l, idx)=>(
                      <tr key={l.id} className="border-b bg-white">
                        <td className="p-2 text-center font-bold text-[13px]">{idx+1}</td>
                        <td className="p-1">
                          <input 
                            className="border p-2 rounded w-full text-[13px] font-bold" 
                            value={l.aktivitas} 
                            onChange={e=>updateLingkunganRow(l.id, 'aktivitas', e.target.value)} 
                          />
                        </td>
                        <td className="p-1">
                          <input 
                            className="border p-2 rounded w-full text-[13px] font-medium" 
                            value={l.aspek_dampak} 
                            onChange={e=>updateLingkunganRow(l.id, 'aspek_dampak', e.target.value)} 
                          />
                        </td>
                        <td className="p-1">
                          <select 
                            className="border p-2 rounded w-full text-[13px] font-medium" 
                            value={l.level_resiko} 
                            onChange={e=>updateLingkunganRow(l.id, 'level_resiko', e.target.value)}
                          >
                            <option>Low</option>
                            <option>Medium</option>
                            <option>High</option>
                            <option>Very High</option>
                          </select>
                        </td>
                        <td className="p-1">
                          <textarea 
                            className="border p-2 rounded w-full text-[13px] font-medium" 
                            value={l.pencegahan} 
                            onChange={e=>updateLingkunganRow(l.id, 'pencegahan', e.target.value)} 
                            rows={2}
                          ></textarea>
                        </td>
                        <td className="p-1 text-center">
                          <button onClick={()=>removeLingkunganRow(l.id)} className="bg-rose-50 border px-2 py-1 rounded text-[13px]">🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border-2 border-purple-300 shadow-sm mt-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-sm">⚡ UTILITY - Font 13px Bold</h4>
                <button 
                  type="button" 
                  onClick={()=>{ setUtilityRows([...utilityRows, {id: Date.now().toString(), jenis: 'Electric', pemakaian: 100, satuan: 'kWh', durasi: 8, total: 12.5}]) }} 
                  className="bg-purple-600 text-white px-3 py-1 rounded-lg text-[13px] font-bold"
                >
                  + Tambah Utility
                </button>
              </div>
              <div className="overflow-auto border rounded-lg">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-purple-800 text-white text-[12px] font-bold">
                      <th className="p-2 border">No</th>
                      <th className="p-2 border">Jenis + Icon</th>
                      <th className="p-2 border">Pemakaian</th>
                      <th className="p-2 border">Durasi</th>
                      <th className="p-2 border">Total/jam</th>
                      <th className="p-2 border">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {utilityRows.map((u:any, i:number)=>(
                      <tr key={u.id} className="border-b bg-white">
                        <td className="p-2 border text-center font-bold text-[13px]">{i+1}</td>
                        <td className="p-2 border">
                          <select 
                            value={u.jenis} 
                            onChange={e=>{ const v=e.target.value; let satuan='kWh'; if(v==='Water') satuan='m³'; else if(v==='Gas') satuan='m³'; else if(v==='Steam') satuan='Ton'; else if(v==='Angin') satuan='m³'; else satuan='kWh'; const copy=[...utilityRows]; copy[i]={...copy[i], jenis:v, satuan}; if(copy[i].durasi>0) copy[i].total=Number((copy[i].pemakaian/copy[i].durasi).toFixed(2)); setUtilityRows(copy); }} 
                            className="border rounded p-2 w-full text-[13px] font-bold"
                          >
                            <option value="Electric">⚡ Electric - kWh</option>
                            <option value="Water">💧 Water - m³</option>
                            <option value="Gas">🔥 Gas - m³</option>
                            <option value="Steam">♨ Steam - Ton</option>
                            <option value="Angin">💨 Angin - m³</option>
                          </select>
                        </td>
                        <td className="p-2 border">
                          <div className="flex gap-1 items-center">
                            <input 
                              type="number" 
                              value={u.pemakaian} 
                              onChange={e=>{ const c=[...utilityRows]; c[i].pemakaian=Number(e.target.value); if(c[i].durasi>0) c[i].total=Number((c[i].pemakaian/c[i].durasi).toFixed(2)); else c[i].total=c[i].pemakaian; setUtilityRows(c); }} 
                              className="border rounded p-2 w-16 text-[13px] font-medium" 
                            />
                            <span className="text-[11px] px-1 bg-gray-100 rounded border font-bold">{u.satuan}</span>
                          </div>
                        </td>
                        <td className="p-2 border">
                          <div className="flex gap-1 items-center">
                            <input 
                              type="number" 
                              value={u.durasi} 
                              onChange={e=>{ const c=[...utilityRows]; c[i].durasi=Number(e.target.value); if(c[i].durasi>0) c[i].total=Number((c[i].pemakaian/c[i].durasi).toFixed(2)); else c[i].total=0; setUtilityRows(c); }} 
                              className="border rounded p-2 w-12 text-[13px] font-medium" 
                            />
                            <span className="text-[11px] font-bold">jam</span>
                          </div>
                        </td>
                        <td className="p-2 border font-bold text-purple-700 text-[13px]">{u.total} {u.satuan}/jam</td>
                        <td className="p-2 border text-center">
                          <button onClick={()=>setUtilityRows(utilityRows.filter((x:any)=>x.id!==u.id))} className="bg-red-50 text-red-600 px-2 py-1 rounded text-[13px]">🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={()=>setWpStep(3)} className="bg-slate-100 border px-4 py-2 rounded-lg text-[13px] font-bold">Prev</button>
              <button 
                onClick={async()=>{
                  const year = new Date().getFullYear()
                  const key = `mrh_wp_counter_${year}`
                  try {
                    const match = (pForm.nomor_wp || '').match(new RegExp(`${year}-(\\d+)`))
                    if (match) {
                      const num = parseInt(match[1])
                      localStorage.setItem(key, String(num))
                    }
                  } catch {}
                  const payload = {
                    title: pForm.title,
                    vendor_name: pForm.vendor_name,
                    area_id: pForm.area_id,
                    area_name: selectedArea?.name || pForm.area_id,
                    jenis: pForm.jenis || pForm.work_type,
                    work_type: pForm.work_type,
                    tanggal_mulai: pForm.start_date,
                    tanggal_selesai: pForm.end_date,
                    start_date: pForm.start_date,
                    end_date: pForm.end_date,
                    lat: pForm.lat,
                    lng: pForm.lng,
                    work_radius_m: workRadius,
                    work_area_m2: workM2,
                    utilities: utilityRows,
                    nomor_wp: pForm.nomor_wp || generateWPNumber(),
                    penanggung_jawab: pForm.penanggung_jawab,
                    workers_list: workers, 
                    alat_list: alats,
                    kendaraan_list: kendaraans,
                    jsa_list: jsas,
                    k3_list: k3s,
                    lingkungan_list: lingkungans,
                    apd_required: [...selectedApd, apdOthers].filter(Boolean).join(', '),
                    risk_likelihood: riskLikelihood,
                    risk_severity: riskSeverity,
                    risk_score: riskScore,
                    risk_level: riskLevel,
                    status: 'pending_owner',
                    approval_level: 1,
                  }
                  const r=await addPermit(payload, vendors)
                  if(r){
                    setWpStep(1)
                  }
                }} 
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold text-[13px]"
              >
                Simpan WP {pForm.nomor_wp || ''} → Owner Area (Level 1)
              </button>
            </div>
          </div>
        )}
      </div>

      {wpStep===1 && (
        <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100 overflow-auto">
          <div className="flex justify-between mb-3">
            <h3 className="font-bold flex items-center gap-2 text-[13px]"><span>📋</span> DAFTAR WORK PERMIT</h3>
            <button onClick={()=>downloadCSV('work_permits_v6_8_radius_nomorwp.csv', permits)} className="text-[13px] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg font-bold">Download CSV</button>
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-slate-700 text-white">
                <th className="p-2 text-left rounded-l-lg">Nomor WP</th>
                <th className="p-2 text-left">Judul</th>
                <th className="p-2">Vendor</th>
                <th className="p-2">Tgl Mulai</th>
                <th className="p-2">Tgl Selesai</th>
                <th className="p-2 rounded-r-lg">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {permits.map((p:any,i:number)=>(
                <tr key={i} className="border-b hover:bg-slate-50">
                  <td className="p-2 font-mono font-black text-[11px]">{p.nomor_wp}</td>
                  <td className="p-2 font-bold text-[13px]">{p.title}</td>
                  <td className="p-2 text-[13px]">{p.vendor_name}</td>
                  <td className="p-2 font-bold text-[13px]">{p.tanggal_mulai || p.start_date || '-'}</td>
                  <td className="p-2 font-bold text-[13px]">{p.tanggal_selesai || p.end_date || '-'}</td>
                  <td className="p-2">
                    <div className="flex flex-col gap-1">
                      <button onClick={()=>openDetail(p)} className="bg-slate-700 text-white px-3 py-1 rounded text-[11px] font-bold">👁 View Detail</button>
                      <button onClick={()=>openPrintA4(p)} className="bg-green-600 text-white px-3 py-1 rounded text-[11px] font-bold">🖨 A4 {p.nomor_wp ? p.nomor_wp.slice(0,12) : 'LOCAL'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDetail && selectedPermit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-slate-800 text-white p-4 flex justify-between items-center rounded-t-xl">
              <div>
                <h3 className="font-bold text-[13px]">Detail Work Permit - {selectedPermit.title}</h3>
                <p className="text-[11px] text-slate-300">No WP: {selectedPermit.nomor_wp} | Status: {getStatusLabel(selectedPermit.status)}</p>
              </div>
              <button onClick={closeDetail} className="bg-slate-600 text-white px-3 py-1 rounded text-[13px]">✕ Tutup</button>
            </div>
            <div className="p-4">
              <p className="text-[13px]">Detail content - {selectedPermit.nomor_wp}</p>
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
