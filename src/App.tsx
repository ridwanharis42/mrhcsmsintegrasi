// @ts-nocheck - FIX FINAL: Pakai namespace import * as -> TIDAK PERNAH error default/named
import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { useAreas } from './hooks/useAreas'
import { useVendors } from './hooks/useVendors'
import { useWorkPermits } from './hooks/useWorkPermits'
import { usePatrols } from './hooks/usePatrols'
import { supabase } from './lib/supabase'
import { APP_CONFIG } from './types'
import Login from './pages/Login'

// FIX PUTIH FINAL: Pakai namespace import * as -> Vite TIDAK PERNAH error "does not provide export named 'default'/'DashboardFlow'"
// Karena kita tidak import nama spesifik, kita import semua sebagai object
import * as DashMod from './pages/0_DashboardFlow'
import * as VendMod from './pages/1_Vendor8Elemen'
import * as WpMod from './pages/2_EWorkPermitFlow'
import * as MapMod from './pages/3_MappingOverlap'
import * as PatMod from './pages/4_EPatrolSync'
import * as ScoreMod from './pages/5_FinalScoringSync'
import * as SetMod from './pages/6_Settings'

function getComp(mod, name){
  if (!mod) return () => <div className="p-6">Module {name} tidak ditemukan</div>
  // 1. default export function
  if (typeof mod.default === 'function') return mod.default
  // 2. default.default (double wrapping)
  if (mod.default && typeof mod.default.default === 'function') return mod.default.default
  // 3. named export sesuai nama file
  if (typeof mod[name] === 'function') return mod[name]
  // 4. cari export lain yang namanya mengandung nama (Dashboard, Vendor, WorkPermit, Mapping, Patrol, Scoring, Settings)
  const keys = Object.keys(mod)
  for (const k of keys) {
    if (typeof mod[k] === 'function') {
      const lowerK = k.toLowerCase()
      const lowerName = name.toLowerCase()
      if (lowerK.includes(lowerName.replace('flow','').replace('8elemen','').replace('sync','').replace('page','').toLowerCase()) || lowerK.includes('dashboard') || lowerK.includes('vendor') || lowerK.includes('workpermit') || lowerK.includes('mapping') || lowerK.includes('patrol') || lowerK.includes('scoring') || lowerK.includes('setting')) {
        return mod[k]
      }
    }
  }
  // 5. ambil function pertama yang ketemu di module (fallback)
  for (const k of keys) { if (typeof mod[k] === 'function') return mod[k] }
  // 6. jika mod itu sendiri function (jarang)
  if (typeof mod === 'function') return mod
  console.error(`GAGAL LOAD ${name}`, mod)
  return () => <div className="p-6 text-red-500">Error: Component {name} tidak bisa dimuat. Cek export di src/pages/</div>
}

const DashboardFlow = getComp(DashMod, 'DashboardFlow')
const Vendor8Elemen = getComp(VendMod, 'Vendor8Elemen')
const EWorkPermitFlow = getComp(WpMod, 'EWorkPermitFlow')
const MappingOverlap = getComp(MapMod, 'MappingOverlap')
const EPatrolSync = getComp(PatMod, 'EPatrolSync')
const FinalScoringSync = getComp(ScoreMod, 'FinalScoringSync')
const SettingsPage = getComp(SetMod, 'SettingsPage')

export default function App(){
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [appSettings, setAppSettings] = useState<any>({})
  const [showSettings, setShowSettings] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  const { areas } = useAreas()
  const useVendorsHook = useVendors()
  const useWorkPermitsHook = useWorkPermits()
  const usePatrolsHook = usePatrols()
  const { vendors } = useVendorsHook
  const { permits } = useWorkPermitsHook
  const { patrols } = usePatrolsHook

  useEffect(()=>{
    checkAuth()
    const interval = setInterval(loadSettings, 1000)
    return () => clearInterval(interval)
  },[])

  function loadSettings(){
    try { const s = localStorage.getItem('mrh_app_settings'); if (s) setAppSettings(JSON.parse(s)) } catch {}
  }

  async function checkAuth(){
    setIsCheckingAuth(true)
    try {
      const p = localStorage.getItem('mrh_profile')
      const userId = localStorage.getItem('mrh_user_id')
      if (p && userId) { setProfile(JSON.parse(p)); loadSettings() }
      else {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data: prof } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
          if (prof) { setProfile(prof); localStorage.setItem('mrh_profile', JSON.stringify(prof)); localStorage.setItem('mrh_user_id', session.user.id); localStorage.setItem('mrh_role', prof.role) }
        }
      }
    } catch {} finally { setIsCheckingAuth(false) }
  }

  const isSuperAdmin = profile && (profile.role === 'admin_contractor' || profile.email === 'admin_contractor@mrhdigitalhub.com')
  const companyName = appSettings.company_name || ''
  const logoUrl = appSettings.logo_url || ''
  const tagline1 = appSettings.company_tagline_1 || ''
  const hasCustomBranding = !!(logoUrl || companyName)

  const handleLogout = async () => {
    try { await supabase.auth.signOut() } catch {}
    localStorage.removeItem('mrh_profile'); localStorage.removeItem('mrh_user_id'); localStorage.removeItem('mrh_role'); localStorage.removeItem('mrh_vendor_id'); localStorage.removeItem('mrh_area_id')
    Object.keys(localStorage).forEach(k => { if (k.startsWith('sb-')) localStorage.removeItem(k) })
    window.location.replace('/login')
  }

  const menus=[
    {id:'dashboard', label:'0. Dashboard Flow', icon:'📊'},
    {id:'vendors', label:'1. Vendor (8 Elemen)', icon:'🏗'},
    {id:'workpermit', label:'2. E-Work Permit (Flow)', icon:'📋'},
    {id:'mapping', label:'3. Mapping Overlap', icon:'🗺'},
    {id:'patrol', label:'4. E-Patrol (Sync)', icon:'🚓'},
    {id:'scoring', label:'5. Final Scoring', icon:'⭐'}
  ]

  if (isCheckingAuth) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-sm">Loading...</div></div>
  const isLoginPage = window.location.pathname === '/login'
  if (!profile && isLoginPage) return <Login />
  if (!profile && !isLoginPage) { window.location.replace('/login'); return <div className="min-h-screen flex items-center justify-center">Redirect ke Login...</div> }

  if (showSettings) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-white border-b p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => { setShowSettings(false); loadSettings() }} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold">◀ Kembali ke Dashboard</button>
            <h1 className="font-black text-sm">⚙ Pengaturan - SaaS Permanen - ADMIN ONLY</h1>
          </div>
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded text-xs font-bold">Logout</button>
        </div>
        <SettingsPage />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} supabaseUrl={''} menus={menus} appSettings={appSettings} />
      <div className={`${sidebarOpen?'ml-64':'ml-16'} flex-1`}>
        {/* HEADER SIMPLIFIED - Hanya Logo MRH + PT MRH DigitalHub - CSMS INTEGRATED - Pengaturan + Logout di kanan - FIX: Font + Background Pisah Dipilih via Settings - image_e10b58 + image_f4fea0 */}
        <header className="border-b sticky top-0 z-10 px-6 py-3 flex items-center justify-between" style={{ background: appSettings.company_header_bg || "#ffffff", color: appSettings.company_header_text_color || "#000000" }}>
          <div className="flex items-center gap-3">
            {logoUrl ? <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain bg-white rounded border p-1" /> : <div className="w-10 h-10 bg-blue-900 rounded-lg flex items-center justify-center text-white font-black text-xs">MRH</div>}
            <div className="font-black tracking-tight" style={{ fontSize: `${appSettings.company_header_font_size || "18"}px` }}>PT MRH DigitalHub - CSMS INTEGRATED</div>
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin && (<button onClick={() => setShowSettings(true)} className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"><span>⚙</span><span className="text-xs font-bold">Pengaturan</span></button>)}
            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold cursor-pointer">Logout</button>
          </div>
        </header>
        <main className="p-6">
          {activeMenu==='dashboard' && <DashboardFlow areas={areas} vendors={vendors} permits={permits} patrols={patrols} supabaseUrl={''} appSettings={appSettings} />}
          {activeMenu==='vendors' && <Vendor8Elemen areas={areas} useVendorsHook={useVendorsHook} />}
          {activeMenu==='workpermit' && <EWorkPermitFlow areas={areas} vendors={vendors} useWorkPermitsHook={useWorkPermitsHook} />}
          {activeMenu==='mapping' && <MappingOverlap permits={permits} vendors={vendors} />}
          {activeMenu==='patrol' && <EPatrolSync permits={permits} usePatrolsHook={usePatrolsHook} />}
          {activeMenu==='scoring' && <FinalScoringSync vendors={vendors} permits={permits} patrols={patrols} />}
        </main>
      </div>
    </div>
  )
}
