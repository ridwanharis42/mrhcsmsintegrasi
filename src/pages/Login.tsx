import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_SETTINGS = {
  company_name: 'MRH DigitalHub',
  company_tagline_1: 'Construction Safety',
  company_tagline_2: 'Sistem Manajemen Kontraktor - 6 Role Approval, Radius -> Luas m2, Multi-Tenant SaaS Siap Jual.',
  login_background_url: '',
  logo_url: '',
  company_tagline_full: 'V.01-CSMS INTEGRASI Copyright-by mrhdigitalhub-2026',
}

const LAMP_COLORS = [
  { name: 'OFF', bg: '#0f172a', glow: 'transparent', cardGlow: 'transparent', btn: 'bg-slate-800' },
  { name: 'BLUE', bg: '#1e3a5f', glow: 'rgba(59,130,246,0.85)', cardGlow: 'rgba(59,130,246,0.25)', btn: 'bg-blue-600 hover:bg-blue-700' },
  { name: 'GREEN', bg: '#0f3d2e', glow: 'rgba(34,197,94,0.85)', cardGlow: 'rgba(34,197,94,0.28)', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  { name: 'PINK', bg: '#4a1942', glow: 'rgba(236,72,153,0.85)', cardGlow: 'rgba(236,72,153,0.28)', btn: 'bg-pink-600 hover:bg-pink-700' },
]

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [appSettings, setAppSettings] = useState<any>(DEFAULT_SETTINGS)
  const [lampOn, setLampOn] = useState(false)
  const [lampColorIdx, setLampColorIdx] = useState(1)
  const [pulling, setPulling] = useState(false)
  const [pullY, setPullY] = useState(0)

  useEffect(() => {
    try {
      const s = localStorage.getItem('mrh_app_settings')
      if (s) setAppSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s) })
    } catch {}
  }, [])

  const handlePull = () => {
    setPulling(true)
    setPullY(24)
    setTimeout(() => {
      const willTurnOn = !lampOn
      setLampOn(willTurnOn)
      if (willTurnOn) setLampColorIdx((prev) => (prev + 1) % LAMP_COLORS.length || 1)
      setPullY(0)
      setPulling(false)
    }, 180)
  }

  const changeColor = () => {
    if (!lampOn) setLampOn(true)
    setLampColorIdx((prev) => (prev + 1) % LAMP_COLORS.length ? prev + 1 : 1)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      let email = username.trim()
      if (!email.includes('@')) email = `${email}@mrhdigitalhub.com`
      let authData: any = null
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) {
        const customPws = JSON.parse(localStorage.getItem('mrh_custom_passwords') || '{}')
        if (customPws[email]) {
          const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({ email, password: customPws[email] })
          if (retryError) throw retryError
          authData = retryData
        } else throw authError
      } else authData = data
      if (!authData?.user) throw new Error('User tidak ditemukan')
      const { data: profile, error: pe } = await supabase.from('profiles').select('*').eq('id', authData.user.id).single()
      if (pe) throw new Error(`Profile belum ada: ${pe.message}`)
      localStorage.setItem('mrh_profile', JSON.stringify(profile))
      localStorage.setItem('mrh_user_id', authData.user.id)
      localStorage.setItem('mrh_role', profile.role)
      localStorage.setItem('mrh_vendor_id', profile.vendor_id || '')
      localStorage.setItem('mrh_area_id', profile.area_id || '')
      window.location.replace('/')
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Gagal login')
    } finally { setLoading(false) }
  }

  const fillAccount = (u: string, p: string) => { setUsername(u); setPassword(p); setShowPassword(false) }
  const bgUrl = appSettings.login_background_url
  const logoUrl = appSettings.logo_url
  const currentColor = lampOn ? LAMP_COLORS[lampColorIdx] : LAMP_COLORS[0]

  return (
    <div className="w-screen h-[100dvh] overflow-hidden flex justify-center items-center p-2 md:p-3 gap-3 box-border" style={{ background: currentColor.bg, transition: 'background 0.6s ease' }}>
      <div className="w-full max-w-[1600px] h-[calc(100dvh-16px)] md:h-[calc(100dvh-24px)] flex flex-col md:flex-row gap-3 md:gap-4 box-border">
        {/* LEFT - NO SCROLL - MARGIN LEFT-RIGHT-TOP-BOTTOM - TIDAK TERTUTUP TASKBAR */}
        <div className="w-full md:w-1/2 relative hidden md:flex flex-col items-center justify-between p-4 md:p-5 rounded-2xl shadow-2xl h-full overflow-hidden box-border">
          {bgUrl ? (
            <img src={bgUrl} alt="Background" className="absolute inset-0 w-full h-full object-cover rounded-2xl" style={{ opacity: lampOn ? 0.35 : 0.15, transition: 'opacity 0.6s' }} />
          ) : (
            <div className="absolute inset-0 rounded-2xl" style={{ background: `radial-gradient(ellipse at 50% 0%, ${currentColor.glow} 0%, transparent 65%)`, opacity: lampOn ? 1 : 0.3, transition: 'opacity 0.6s' }} />
          )}
          <div className="absolute inset-0 bg-black/40 rounded-2xl" style={{ opacity: lampOn ? 0.2 : 0.65, transition: 'opacity 0.6s' }} />

          <div className="relative z-20 w-full flex items-center gap-3 text-white shrink-0">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden shadow-lg">
              {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" /> : <span className="font-black text-blue-900 text-[11px]">MRH</span>}
            </div>
            <div><p className="font-black text-[13px]">{appSettings.company_name}</p><p className="text-[10px] text-blue-100 opacity-80">{appSettings.company_tagline_1}</p></div>
          </div>

          <div className="relative z-20 flex flex-col items-center justify-center flex-1 min-h-0 w-full">
            <div className="relative scale-[0.85] md:scale-90 origin-center">
              <div className="absolute top-[72px] left-1/2 -translate-x-1/2 w-[420px] h-[360px] pointer-events-none" style={{ background: `conic-gradient(from 180deg at 50% 0%, ${currentColor.glow} 0deg, transparent 30deg, transparent 330deg, ${currentColor.glow} 360deg)`, clipPath: 'polygon(45% 0%, 55% 0%, 100% 100%, 0% 100%)', opacity: lampOn ? 0.55 : 0, filter: 'blur(1px)', transition: 'opacity 0.4s ease' }} />
              <div className="absolute top-[56px] left-1/2 -translate-x-1/2 w-24 h-24 rounded-full blur-xl pointer-events-none" style={{ background: currentColor.glow, opacity: lampOn ? 0.9 : 0, transition: 'opacity 0.4s' }} />
              <div className="relative w-48 h-52 flex flex-col items-center">
                <div className="w-[2px] h-10 bg-gradient-to-b from-zinc-600 to-zinc-400" />
                <div className="relative" style={{ transform: `translateY(${pullY * 0.3}px)`, transition: pulling ? 'transform 0.18s' : 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
                  <div className="w-20 h-4 bg-gradient-to-b from-zinc-700 to-zinc-900 rounded-t-[10px] mx-auto shadow-lg" />
                  <div className="w-36 h-20 relative -mt-1" style={{ background: lampOn ? `linear-gradient(180deg, ${currentColor.glow} 0%, #1a1a1a 100%)` : 'linear-gradient(180deg, #2a2a2a 0%, #0f0f0f 100%)', clipPath: 'polygon(8% 0%, 92% 0%, 100% 100%, 0% 100%)', boxShadow: lampOn ? `0 0 32px ${currentColor.glow}, inset 0 2px 8px rgba(255,255,255,0.15)` : 'inset 0 2px 4px rgba(255,255,255,0.08)', transition: 'all 0.4s' }} />
                  <div className="w-36 h-2 bg-gradient-to-r from-amber-700 via-amber-400 to-amber-700 rounded-full mx-auto -mt-1 shadow-md" />
                  <div className="absolute top-16 left-1/2 -translate-x-1/2 w-10 h-10">
                    <div className="w-full h-full rounded-full bg-gradient-to-b from-white/90 to-amber-100/60 shadow-inner" style={{ opacity: lampOn ? 0.95 : 0.08, boxShadow: lampOn ? `0 0 20px ${currentColor.glow}` : 'none', transition: 'opacity 0.3s, box-shadow 0.3s' }} />
                  </div>
                </div>
                <div className="relative flex flex-col items-center -mt-1">
                  <div className="flex flex-col items-center gap-[2px]" style={{ transform: `translateY(${pullY}px)`, transition: pulling ? 'transform 0.18s' : 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)' }}>
                    <div className="w-[2px] h-5 bg-gradient-to-b from-amber-300 to-amber-600" />
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="w-2.5 h-2.5 rounded-full bg-gradient-to-b from-amber-200 to-amber-600 border border-amber-800 shadow-sm" />
                    ))}
                    <button onClick={handlePull} className="mt-1 w-6 h-6 rounded-full bg-gradient-to-b from-amber-100 via-amber-300 to-amber-600 border-2 border-amber-800 shadow-[0_4px_12px_rgba(0,0,0,0.4),inset_0_2px_3px_rgba(255,255,255,0.6)] hover:scale-110 active:scale-95 transition-transform cursor-pointer flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-amber-900/30" />
                    </button>
                  </div>
                  <div className="absolute -right-20 top-10 bg-black/80 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap pointer-events-none backdrop-blur-sm border border-white/10" style={{ opacity: pulling ? 0 : 0.9 }}>
                    Pull to turn {lampOn ? 'off' : 'on'}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 text-center text-white max-w-sm">
              <h1 className="text-[26px] font-black leading-tight drop-shadow-lg">CSMS Integrated<br /><span style={{ color: lampOn ? '#a5f3fc' : '#93c5fd' }}>V6 Modular</span></h1>
              <p className="text-[10px] mt-1.5 text-blue-100/80 leading-relaxed line-clamp-2">{appSettings.company_tagline_2}</p>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="text-[9px] px-2 py-1 rounded-full bg-white/10 border border-white/20">{lampOn ? '💡 ' + currentColor.name : '🌙 OFF'}</span>
                <button onClick={changeColor} className="text-[9px] px-2 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 transition">Change Color</button>
              </div>
              <p className="text-[8px] mt-1 text-blue-200/60">{appSettings.company_tagline_full}</p>
            </div>
          </div>

          <div className="relative z-20 w-full grid grid-cols-3 gap-2 shrink-0 mt-2">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-2 text-center text-white" style={{ boxShadow: lampOn ? `0 0 20px ${currentColor.cardGlow}` : 'none' }}>
              <p className="font-black text-[15px]">6</p><p className="text-[9px] opacity-80">Role Approval</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-2 text-center text-white" style={{ boxShadow: lampOn ? `0 0 20px ${currentColor.cardGlow}` : 'none' }}>
              <p className="font-black text-[15px]">8</p><p className="text-[9px] opacity-80">Elemen Vendor</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-2 text-center text-white" style={{ boxShadow: lampOn ? `0 0 20px ${currentColor.cardGlow}` : 'none' }}>
              <p className="font-black text-[15px]">∞</p><p className="text-[9px] opacity-80">Vendor-SaaS</p>
            </div>
          </div>
        </div>

        <div className="w-full md:w-1/2 bg-gray-50 flex items-center justify-center p-3 md:p-4 relative rounded-2xl shadow-2xl h-full overflow-hidden box-border">
          <div className="absolute inset-0 pointer-events-none rounded-2xl" style={{ background: `radial-gradient(ellipse at 0% 50%, ${currentColor.cardGlow} 0%, transparent 60%)`, opacity: lampOn ? 1 : 0, transition: 'opacity 0.6s' }} />
          <div className="w-full max-w-[360px] bg-white rounded-2xl shadow-xl p-4 border relative z-10 transition-all duration-500" style={{ boxShadow: lampOn ? `0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px ${currentColor.cardGlow}, 0 0 40px ${currentColor.cardGlow}` : '0 20px 60px rgba(0,0,0,0.08)', transform: lampOn ? 'translateY(-2px)' : 'translateY(0)' }}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-[16px]">Login</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: lampOn ? currentColor.glow : '#94a3b8', boxShadow: lampOn ? `0 0 8px ${currentColor.glow}` : 'none' }} />
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border" style={{ borderColor: lampOn ? currentColor.glow : '#e2e8f0', color: lampOn ? currentColor.glow : '#64748b' }}>{lampOn ? currentColor.name : 'OFF'}</span>
              </div>
            </div>
            <p className="text-[9px] text-slate-500 mb-2">Pilih akun di bawah untuk auto-fill — Tarik lampu di kiri untuk nyala 💡</p>
            <form onSubmit={handleLogin} className="space-y-2">
              <div><label className="text-[10px] font-bold">Username / Email</label><input type="text" value={username} onChange={e=>setUsername(e.target.value)} placeholder="admin_contractor" className="border rounded-lg p-2 w-full text-[13px] mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" /></div>
              <div>
                <label className="text-[10px] font-bold">Password</label>
                <div className="relative mt-1">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e=>setPassword(e.target.value)} className="border rounded-lg p-2 w-full text-[13px] pr-9 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500" />
                  <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 p-1">
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.94 10.94 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.59 9.59 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 p-2 rounded text-[11px]">{error}</div>}
              <button disabled={loading} className={`${currentColor.btn} text-white rounded-lg p-2 w-full font-bold text-[13px] shadow-lg active:scale-[0.98] transition-all`}>{loading ? 'Loading...' : 'Login'}</button>
            </form>
            <div className="mt-2.5">
              <p className="text-[9px] font-black mb-1">6 AKUN - KLIK AUTO-FILL:</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={()=>fillAccount('admin_contractor','admin123')} className="border rounded-lg p-1.5 text-left hover:bg-purple-50 transition"><p className="text-[9px] font-black">ADMIN CONTRACTOR</p><p className="text-[8px] text-slate-500">admin123</p></button>
                <button onClick={()=>fillAccount('general_contractor','123456')} className="border rounded-lg p-1.5 text-left hover:bg-blue-50 transition"><p className="text-[9px] font-black">GENERAL CONTRACTOR</p><p className="text-[8px] text-slate-500">123456</p></button>
                <button onClick={()=>fillAccount('owner_project','owner123')} className="border rounded-lg p-1.5 text-left hover:bg-orange-50 transition"><p className="text-[9px] font-black">OWNER PROJECT</p><p className="text-[8px] text-slate-500">owner123</p></button>
                <button onClick={()=>fillAccount('utility','utility123')} className="border rounded-lg p-1.5 text-left hover:bg-yellow-50 transition"><p className="text-[9px] font-black">UTILITY</p><p className="text-[8px] text-slate-500">utility123</p></button>
                <button onClick={()=>fillAccount('hse_officer','hse123')} className="border rounded-lg p-1.5 text-left hover:bg-green-50 transition"><p className="text-[9px] font-black">HSE OFFICER</p><p className="text-[8px] text-slate-500">hse123</p></button>
                <button onClick={()=>fillAccount('general_manager','gmmanager123')} className="border rounded-lg p-1.5 text-left hover:bg-red-50 transition"><p className="text-[9px] font-black">GENERAL MANAGER</p><p className="text-[8px] text-slate-500">gmmanager123</p></button>
              </div>
            </div>
            <div className="mt-2 bg-slate-900 rounded-lg p-1.5 text-[8px] font-mono text-slate-300 border border-slate-700/50 flex items-center gap-1.5">
              <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"/><span className="w-1.5 h-1.5 rounded-full bg-yellow-500"/><span className="w-1.5 h-1.5 rounded-full bg-green-500"/></div>
              <span className="opacity-60 truncate">💡 {lampOn ? 'ON' : 'OFF'} {currentColor.name} — Pull chain — No sound — No scroll — Margin OK</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
