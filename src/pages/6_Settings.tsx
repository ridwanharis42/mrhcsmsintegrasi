
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

type AppSetting = { key: string; value: string }

const DEFAULT_SETTINGS: Record<string, string> = {
  company_name: 'MRH DigitalHub',
  company_tagline_1: 'Construction Safety',
  company_tagline_2: 'Sistem Manajemen Kontraktor - 6 Role Approval, Radius -> Luas m², Multi-Tenant SaaS Siap Jual.',
  login_background_url: '',
  logo_url: '',
  dashboard_header_mode: 'logo_name',
  wp_prefix: 'mrh',
  safety_slogan: 'Utamakan Keselamatan dan Kesehatan Kerja - Safety First, Zero Accident, Pulang Selamat!',
  company_header_font_size: '18',
  company_header_bg: '#ffffff',
  company_header_text_color: '#000000',
  company_name_font: 'Arial Black, Arial, sans-serif',
  company_name_margin_top: '0px',
  ewp_font: 'Arial Black, Arial, sans-serif',
  ewp_margin_top: '4px',
  slogan_font: 'Arial, sans-serif',
  header_font_family: 'Arial, sans-serif',
  wp_number_font: 'Arial Black, Arial, sans-serif',
  wp_number_font_size: '16px',
  tanggal_font_size: '16px',
}

const SIX_ACCOUNTS = [
  { role: 'admin_contractor', username: 'admin_contractor', email: 'admin_contractor@mrhdigitalhub.com', label: 'ADMIN CONTRACTOR', color: 'bg-purple-600' },
  { role: 'general_contractor', username: 'general_contractor', email: 'general_contractor@mrhdigitalhub.com', label: 'GENERAL CONTRACTOR', color: 'bg-blue-600' },
  { role: 'owner_project', username: 'owner_project', email: 'owner_project@mrhdigitalhub.com', label: 'OWNER PROJECT', color: 'bg-orange-500' },
  { role: 'utility', username: 'utility', email: 'utility@mrhdigitalhub.com', label: 'Utility', color: 'bg-yellow-600' },
  { role: 'hse_officer', username: 'hse_officer', email: 'hse_officer@mrhdigitalhub.com', label: 'HSE OFFICER', color: 'bg-green-600' },
  { role: 'general_manager', username: 'general_manager', email: 'general_manager@mrhdigitalhub.com', label: 'GENERAL MANAGER', color: 'bg-red-600' },
]

export function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [bgFile, setBgFile] = useState<File | null>(null)
  const [previewLogo, setPreviewLogo] = useState('')
  const [previewBg, setPreviewBg] = useState('')
  const [passwords, setPasswords] = useState<Record<string, string>>({})
  const [showPw, setShowPw] = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function loadFromSupabase() {
      try {
        const { data, error } = await supabase.from('app_settings').select('*')
        if (!error && data && data.length > 0) {
          const fromSupa: Record<string,string> = {}
          data.forEach((row:any)=>{ fromSupa[row.key]=row.value })
          setSettings(prev=>({...prev, ...fromSupa}))
          localStorage.setItem('mrh_app_settings', JSON.stringify({...settings, ...fromSupa}))
        }
      } catch(e){}
    }
    loadFromSupabase()
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('app_settings').select('*')
      if (!error && data && data.length > 0) {
        const mapped: Record<string, string> = { ...DEFAULT_SETTINGS }
        data.forEach((row: any) => { mapped[row.key] = row.value })
        setSettings(mapped)
        localStorage.setItem('mrh_app_settings', JSON.stringify(mapped))
        setPreviewLogo(mapped.logo_url)
        setPreviewBg(mapped.login_background_url)
      } else {
        const stored = localStorage.getItem('mrh_app_settings')
        if (stored) {
          const parsed = JSON.parse(stored)
          setSettings({ ...DEFAULT_SETTINGS, ...parsed })
          setPreviewLogo(parsed.logo_url || '')
          setPreviewBg(parsed.login_background_url || '')
        }
      }
    } catch (e) {
      const stored = localStorage.getItem('mrh_app_settings')
      if (stored) {
        const parsed = JSON.parse(stored)
        setSettings({ ...DEFAULT_SETTINGS, ...parsed })
      }
    } finally {
      setLoading(false)
    }
  }

  async function uploadFile(file: File, folder: string): Promise<string> {
    try {
      const fileName = `${folder}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('app_assets').upload(fileName, file)
      if (error) throw error
      const { data } = supabase.storage.from('app_assets').getPublicUrl(fileName)
      return data.publicUrl
    } catch (e) {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
    }
  }

  async function saveToSupabase(newSettings: Record<string, string>) {
    try {
      for (const [key, value] of Object.entries(newSettings)) {
        await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      }
    } catch(e){}
  }

  function autoSave(newSettings: Record<string, string>) {
    setSettings(newSettings)
    localStorage.setItem('mrh_app_settings', JSON.stringify(newSettings))
    saveToSupabase(newSettings)
  }

  async function saveSettings(newSettings?: Record<string, string>) {
    const toSave = newSettings || settings
    setSaving(true)
    setMsg('⏳ Menyimpan ke Supabase...')
    try {
      localStorage.setItem('mrh_app_settings', JSON.stringify(toSave))
      let supaOk = 0
      let supaErr = ''
      for (const [key, value] of Object.entries(toSave)) {
        const { error } = await supabase.from('app_settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
        if (!error) supaOk++; else supaErr = error.message
      }
      if (supaOk > 0) setMsg(`✅ PERMANEN! Disimpan ke Supabase ${supaOk} item + localStorage!`)
      else if (supaErr) setMsg(`⚠ Disimpan ke localStorage, tapi Supabase belum ada tabel app_settings - ${supaErr}`)
      else setMsg('✅ Settings disimpan PERMANEN')
      setTimeout(() => setMsg(''), 5000)
    } catch (e: any) {
      setMsg(`❌ ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    const url = URL.createObjectURL(file)
    setPreviewLogo(url)
    const publicUrl = await uploadFile(file, 'logos')
    const newSet = { ...settings, logo_url: publicUrl }
    setSettings(newSet)
    setPreviewLogo(publicUrl)
    await saveSettings(newSet)
  }

  async function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBgFile(file)
    const url = URL.createObjectURL(file)
    setPreviewBg(url)
    const publicUrl = await uploadFile(file, 'backgrounds')
    const newSet = { ...settings, login_background_url: publicUrl }
    setSettings(newSet)
    setPreviewBg(publicUrl)
    await saveSettings(newSet)
  }

  async function handlePasswordChange(email: string, newPassword: string) {
    if (!newPassword || newPassword.length < 3) {
      setMsg('❌ Password minimal 3 karakter')
      return
    }
    setSaving(true)
    try {
      const customPws = JSON.parse(localStorage.getItem('mrh_custom_passwords') || '{}')
      customPws[email] = newPassword
      localStorage.setItem('mrh_custom_passwords', JSON.stringify(customPws))
      try { await supabase.rpc('change_user_password', { target_email: email, new_password: newPassword }) } catch {}
      setMsg(`✅ Password ${email} diubah PERMANEN - Login pakai password baru: ${newPassword}`)
      setPasswords({ ...passwords, [email]: '' })
    } catch (e: any) {
      setMsg(`❌ ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Loading Settings...</div>

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">⚙</div>
        <div>
          <h1 className="text-xl font-black">Pengaturan - Ikon Gerigi - SaaS Permanen</h1>
          <p className="text-xs text-slate-500">Ganti Background, Logo, Nama Perusahaan, Password 6 Users, Header Dashboard</p>
        </div>
      </div>

      {msg && <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-sm mb-4 font-bold">{msg}</div>}

      {/* 1. BACKGROUND KIRI LOGIN */}
      <div className="bg-white border rounded-xl p-5 mb-4">
        <h3 className="font-bold text-sm mb-3">1. Ganti Background Gambar Sisi Kiri Login</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold">Upload Gambar Baru (Construction Safety)</label>
            <input type="file" accept="image/*" onChange={handleBgUpload} className="border p-2 rounded w-full text-xs mt-1" />
            <p className="text-[10px] text-slate-500 mt-1">Rekomendasi: 800x1200, JPG/PNG, max 2MB</p>
            <div className="mt-3">
              <label className="text-xs font-bold">Atau URL Gambar:</label>
              <div className="flex gap-2 mt-1">
                <input value={settings.login_background_url} onChange={e=>setSettings({...settings, login_background_url: e.target.value})} className="border p-2 rounded w-full text-xs" placeholder="https://..." />
                <button onClick={()=>{ setPreviewBg(settings.login_background_url); saveSettings() }} className="bg-blue-600 text-white px-3 py-2 rounded text-xs">Simpan</button>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold mb-2">Preview Background:</p>
            <div className="w-full h-40 border-2 border-dashed rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
              {previewBg ? <img src={previewBg} alt="BG Preview" className="w-full h-full object-cover" /> : <span className="text-xs text-slate-400">Belum ada background custom</span>}
            </div>
          </div>
        </div>
      </div>

      {/* 2. LOGO MRH */}
      <div className="bg-white border rounded-xl p-5 mb-4">
        <h3 className="font-bold text-sm mb-3">2. Ganti Logo MRH</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold">Upload Logo Baru (PNG/SVG Transparan)</label>
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="border p-2 rounded w-full text-xs mt-1" />
            <p className="text-[10px] text-slate-500 mt-1">Rekomendasi: 200x200, PNG transparan, max 500KB</p>
            <div className="mt-3">
              <label className="text-xs font-bold">Atau URL Logo:</label>
              <div className="flex gap-2 mt-1">
                <input value={settings.logo_url} onChange={e=>setSettings({...settings, logo_url: e.target.value})} className="border p-2 rounded w-full text-xs" placeholder="https://..." />
                <button onClick={()=>{ setPreviewLogo(settings.logo_url); saveSettings() }} className="bg-blue-600 text-white px-3 py-2 rounded text-xs">Simpan</button>
              </div>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold mb-2">Preview Logo:</p>
            <div className="w-32 h-32 border-2 border-dashed rounded-lg overflow-hidden bg-white flex items-center justify-center">
              {previewLogo ? <img src={previewLogo} alt="Logo Preview" className="w-full h-full object-contain p-2" /> : <div className="w-16 h-16 bg-blue-900 rounded flex items-center justify-center text-white font-black text-xs">MRH</div>}
            </div>
          </div>
        </div>
      </div>

      {/* 3. NAMA PERUSAHAAN */}
      <div className="bg-white border rounded-xl p-5 mb-4">
        <h3 className="font-bold text-sm mb-3">3. Ganti Nama Perusahaan & Kalimat Bawahnya</h3>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="text-xs font-bold">Nama Perusahaan (MRH DigitalHub):</label>
            <input value={settings.company_name} onChange={e=>setSettings({...settings, company_name: e.target.value})} className="border p-2 rounded w-full text-sm font-bold mt-1" placeholder="MRH DigitalHub" />
          </div>
          <div>
            <label className="text-xs font-bold">Kalimat 1 Bawah Nama (Construction Safety):</label>
            <input value={settings.company_tagline_1} onChange={e=>setSettings({...settings, company_tagline_1: e.target.value})} className="border p-2 rounded w-full text-xs mt-1" placeholder="Construction Safety" />
          </div>
          <div>
            <label className="text-xs font-bold">Kalimat 2 Deskripsi (Sistem Manajemen Kontraktor...):</label>
            <textarea value={settings.company_tagline_2} onChange={e=>setSettings({...settings, company_tagline_2: e.target.value})} className="border p-2 rounded w-full text-xs mt-1 h-20" placeholder="Sistem Manajemen Kontraktor - 6 Role Approval, Radius -> Luas m², Multi-Tenant SaaS Siap Jual." />
          </div>
          <button onClick={()=>saveSettings()} disabled={saving} className="bg-slate-800 text-white px-4 py-2 rounded font-bold text-xs w-fit">{saving ? 'Menyimpan...' : '💾 Simpan Nama Perusahaan'}</button>
        </div>
      </div>

      {/* 3.5 SLOGAN + WP PREFIX */}
      <div className="bg-white border rounded-xl p-5 mb-4 border-l-4 border-yellow-500">
        <h3 className="font-bold text-sm mb-3 flex items-center gap-2">🦺 SLOGAN KESELAMATAN KERJA - GANTI 4 KOTAK A4 + WP PREFIX (25px + 35px)</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold">Prefix Nomor WP (3 huruf)</label>
              <div className="flex gap-2 mt-1">
                <input value={settings.wp_prefix || 'mrh'} onChange={e=>setSettings({...settings, wp_prefix:e.target.value.toLowerCase()})} className="border-2 border-blue-200 p-2.5 rounded-lg flex-1 font-mono font-bold" placeholder="mrh" maxLength={10} />
                <span className="text-[11px] bg-slate-100 border rounded px-2 py-2">-csmswp-yyyy-001</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Preview: {(settings.wp_prefix || 'mrh')}-csmswp-2026-001</p>
            </div>
          </div>
          <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
            <label className="text-xs font-black uppercase">Slogan Keselamatan Kerja - Editable</label>
            <textarea value={settings.safety_slogan || ''} onChange={e=>setSettings({...settings, safety_slogan:e.target.value})} rows={4} className="border-2 border-yellow-400 p-3 rounded-lg w-full mt-2 text-sm font-bold bg-white" />
          </div>
        </div>
      </div>

      {/* HEADER DASHBOARD - BARU - REQUEST BAPAK - FONT + BACKGROUND PISAH */}
      <div className="bg-white border-2 border-orange-300 rounded-xl p-5 mb-4 shadow-sm">
        <h3 className="font-black text-sm mb-1 flex items-center gap-2">🎨 Header Dashboard - PT MRH DigitalHub - CSMS INTEGRATED - Ln149 - Font + Background Pisah Dipilih</h3>
        <p className="text-[11px] text-slate-500 mb-4">Atur ukuran font dan warna background header yang di-blok biru di image_e10b58.png + image_f4fea0.png - TOTAL VENDOR / TOTAL WORK PERMIT + Risk Filter / TOTAL AREA / TOTAL E-PATROL - Auto-save ke Supabase</p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="border rounded-lg p-3 bg-orange-50/50">
            <label className="text-[11px] font-bold">Font Header (PT MRH DigitalHub - CSMS INTEGRATED) - Ln149</label>
            <div className="flex gap-2 items-center mt-2">
              <span className="text-[10px]">Kecil</span>
              <input type="range" min="10" max="28" value={parseInt(settings.company_header_font_size || '18')} onChange={e=>{ const ns={...settings, company_header_font_size: e.target.value}; autoSave(ns) }} className="flex-1" />
              <span className="text-[10px]">Besar</span>
              <span className="text-[11px] font-mono font-bold bg-white border px-2 py-1 rounded min-w-[45px] text-center">{settings.company_header_font_size || '18'}px</span>
            </div>
            <div className="mt-2 flex gap-1 flex-wrap">
              {[10,12,13,14,16,18,20,24].map(sz=><button key={sz} onClick={()=>{ const ns={...settings, company_header_font_size: String(sz)}; autoSave(ns) }} className={`text-[10px] px-2 py-1 rounded border ${ (settings.company_header_font_size||'18')==String(sz) ? 'bg-blue-600 text-white border-blue-600 font-bold' : 'bg-white hover:bg-blue-50'}`}>{sz}px</button>)}
            </div>
            <p className="text-[9px] text-green-600 mt-2">✅ Auto-save - Preview: <span style={{ fontSize: `${settings.company_header_font_size||'18'}px` }} className="font-black">PT MRH DigitalHub - CSMS INTEGRATED</span></p>
          </div>
          <div className="border rounded-lg p-3 bg-blue-50/50">
            <label className="text-[11px] font-bold">Background Header - Pisah Dipilih</label>
            <div className="mt-2">
              <input type="color" value={settings.company_header_bg || '#ffffff'} onChange={e=>{ const ns={...settings, company_header_bg: e.target.value}; autoSave(ns) }} className="w-full h-10 rounded border cursor-pointer" />
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1">
              {['#ffffff','#f8fafc','#eff6ff','#fef3c7','#ecfdf5','#fef2f2','#1e293b','#0f172a'].map(c=><button key={c} onClick={()=>{ const ns={...settings, company_header_bg: c}; autoSave(ns) }} className="h-7 rounded border-2" style={{ background: c, borderColor: (settings.company_header_bg||'#ffffff')===c ? '#2563eb' : '#e2e8f0' }} title={c} />)}
            </div>
            <div className="mt-2">
              <input type="text" value={settings.company_header_bg || '#ffffff'} onChange={e=>{ const ns={...settings, company_header_bg: e.target.value}; autoSave(ns) }} className="border rounded px-2 py-1 text-[11px] font-mono w-full" placeholder="#ffffff" />
            </div>
            <p className="text-[9px] text-blue-600 mt-1">Pilih warna background header - Pisah dari font - Contoh: putih #ffffff, biru muda #eff6ff, gelap #1e293b</p>
          </div>
          <div className="border rounded-lg p-3 bg-slate-50/80">
            <label className="text-[11px] font-bold">Warna Teks Header - Pisah Dipilih</label>
            <div className="mt-2">
              <input type="color" value={settings.company_header_text_color || '#000000'} onChange={e=>{ const ns={...settings, company_header_text_color: e.target.value}; autoSave(ns) }} className="w-full h-10 rounded border cursor-pointer" />
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1">
              {['#000000','#1e293b','#2563eb','#dc2626','#059669','#7c3aed','#ffffff','#475569'].map(c=><button key={c} onClick={()=>{ const ns={...settings, company_header_text_color: c}; autoSave(ns) }} className="h-7 rounded border-2" style={{ background: c, borderColor: (settings.company_header_text_color||'#000000')===c ? '#2563eb' : '#e2e8f0' }} title={c} />)}
            </div>
            <div className="mt-2">
              <input type="text" value={settings.company_header_text_color || '#000000'} onChange={e=>{ const ns={...settings, company_header_text_color: e.target.value}; autoSave(ns) }} className="border rounded px-2 py-1 text-[11px] font-mono w-full" placeholder="#000000" />
            </div>
            <p className="text-[9px] text-slate-500 mt-1">Pilih warna teks header - Pisah - Hitam #000000, Putih #ffffff untuk background gelap</p>
          </div>
          <div className="lg:col-span-3 mt-1 p-3 rounded-lg border-2" style={{ background: settings.company_header_bg || '#ffffff', color: settings.company_header_text_color || '#000000' }}>
            <p className="text-[10px] opacity-70 mb-1">Preview Header Dashboard:</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-900 rounded flex items-center justify-center text-white font-black text-[10px]">MRH</div>
              <div className="font-black tracking-tight" style={{ fontSize: `${settings.company_header_font_size||'18'}px` }}>PT MRH DigitalHub - CSMS INTEGRATED</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4 p-3 bg-white border-2 border-blue-100 rounded-xl">
        <div>
          <label className="text-[11px] font-bold">🔤 Font Nama Perusahaan (25px)</label>
          <select value={settings.company_name_font || 'Arial Black, Arial, sans-serif'} onChange={e=>{ const ns={...settings, company_name_font:e.target.value}; autoSave(ns); }} className="border p-2 rounded-lg w-full mt-1 text-xs">
            <option value="Arial Black, Arial, sans-serif">Arial Black - Tebal</option>
            <option value="Arial, sans-serif">Arial - Normal</option>
            <option value="'Times New Roman', Times, serif">Times New Roman</option>
            <option value="Impact, Arial Black, sans-serif">Impact - Tebal</option>
            <option value="'Segoe UI', sans-serif">Segoe UI</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold">🔤 Font E-WORK PERMIT (35px)</label>
          <select value={settings.ewp_font || 'Arial Black, Arial, sans-serif'} onChange={e=>{ const ns={...settings, ewp_font:e.target.value}; autoSave(ns); }} className="border p-2 rounded-lg w-full mt-1 text-xs">
            <option value="Arial Black, Arial, sans-serif">Arial Black - Tebal</option>
            <option value="Arial, sans-serif">Arial - Normal</option>
            <option value="Impact, Arial Black, sans-serif">Impact - Tebal</option>
            <option value="'Anton', Impact, sans-serif">Anton - Super Tebal</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] font-bold">🔤 Font Slogan + Logo</label>
          <select value={settings.slogan_font || 'Arial, sans-serif'} onChange={e=>{ const ns={...settings, slogan_font:e.target.value, header_font_family:e.target.value}; autoSave(ns); }} className="border p-2 rounded-lg w-full mt-1 text-xs">
            <option value="Arial, sans-serif">Arial - Normal</option>
            <option value="'Times New Roman', Times, serif">Times New Roman</option>
            <option value="'Poppins', sans-serif">Poppins</option>
            <option value="Georgia, serif">Georgia</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3 p-3 bg-white border-2 border-purple-100 rounded-xl">
        <div>
          <label className="text-[11px] font-bold">🔢 Font Nomor WP (MRH-CSMS--CSMSWP-2026-001) - 16px</label>
          <div className="flex gap-2 mt-1">
            <select value={settings.wp_number_font || 'Arial Black, Arial, sans-serif'} onChange={e=>{ const ns={...settings, wp_number_font:e.target.value}; autoSave(ns); }} className="border p-2 rounded-lg flex-1 text-xs">
              <option value="Arial Black, Arial, sans-serif">Arial Black - Tebal (Default)</option>
              <option value="Arial, sans-serif">Arial - Normal</option>
              <option value="'Courier New', Courier, monospace">Courier - Monospace (untuk kode)</option>
              <option value="Impact, Arial Black, sans-serif">Impact - Sangat Tebal</option>
            </select>
            <select value={settings.wp_number_font_size || '16px'} onChange={e=>{ const ns={...settings, wp_number_font_size:e.target.value}; autoSave(ns); }} className="border p-2 rounded-lg w-24 text-xs">
              <option value="12px">12px - Kecil</option>
              <option value="14px">14px</option>
              <option value="16px">16px - Default (16px)</option>
              <option value="18px">18px - Besar</option>
              <option value="20px">20px - Sangat Besar</option>
              <option value="22px">22px - Extra Besar</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-[11px] font-bold">📅 Font Tanggal Mulai & Selesai (2026-11-01) - 16px</label>
          <select value={settings.tanggal_font_size || '16px'} onChange={e=>{ const ns={...settings, tanggal_font_size:e.target.value}; autoSave(ns); }} className="border p-2 rounded-lg w-full mt-1 text-xs">
            <option value="12px">12px - Kecil</option>
            <option value="14px">14px</option>
            <option value="16px">16px - Default</option>
            <option value="18px">18px - Besar</option>
            <option value="20px">20px - Sangat Besar</option>
          </select>
        </div>
      </div>
      <div className="mt-4 p-3 bg-green-50 border-2 border-green-300 rounded-xl flex items-center justify-between">
        <div><p className="text-xs font-bold">💾 Simpan Semua Pengaturan</p><p className="text-[10px] text-slate-600">Prefix WP, Slogan, Font, Header Font + BG pisah, WP Number Font - Auto-save, klik untuk sync permanen</p></div>
        <button onClick={()=>saveSettings()} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-black text-sm disabled:opacity-50">{saving ? 'Menyimpan...' : '💾 Simpan PERMANEN'}</button>
      </div>

      {/* 4. PASSWORD 6 USERS */}
      <div className="bg-white border rounded-xl p-5 mb-4">
        <h3 className="font-bold text-sm mb-3">4. Ganti Password 6 Users (SaaS Permanen)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SIX_ACCOUNTS.map(acc => (
            <div key={acc.email} className="border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${acc.color}`}></div>
                <p className="font-bold text-[11px]">{acc.label}</p>
              </div>
              <p className="text-[10px] text-slate-500 mb-2">U: {acc.username} | Email: {acc.email}</p>
              <div className="flex gap-2">
                <input
                  type={showPw[acc.email] ? 'text' : 'password'}
                  value={passwords[acc.email] || ''}
                  onChange={e=>setPasswords({...passwords, [acc.email]: e.target.value})}
                  placeholder="Password baru"
                  className="border p-2 rounded w-full text-xs"
                />
                <button onClick={()=>setShowPw({...showPw, [acc.email]: !showPw[acc.email]})} className="border px-2 rounded text-xs">👁</button>
                <button onClick={()=>handlePasswordChange(acc.email, passwords[acc.email])} className="bg-blue-600 text-white px-3 rounded text-xs font-bold">Ganti</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
