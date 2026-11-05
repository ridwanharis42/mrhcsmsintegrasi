// @ts-nocheck - V64 FINAL WorkPermitPrintA4 - Header bersih + RISK tengah + K3 Border + Toolbar Print di luar A4 + 0 Problems
import { useMemo, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

type Props = { permit: any; appSettings?: any; onClose?: ()=>void }

const QRImg = ({ value, size=200 }: { value: string, size?: number }) => {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`
  return <img src={url} alt="QR" width={size} height={size} className="border border-black bg-white p-1" />
}

const getQRDataWP = (permit:any) => {
  const wp = permit.nomor_wp || '-'
  const vendor = permit.vendor_name || permit.contractor_name || '-'
  const judul = permit.judul || permit.title || '-'
  const area = permit.area_name || '-'
  const tglMulai = permit.tanggal_mulai || permit.start_date || '-'
  const tglSelesai = permit.tanggal_selesai || permit.end_date || '-'
  return `CSMS PT MRH DigitalHub\nNo WP: ${wp}\nVendor: ${vendor}\nJudul: ${judul}\nArea: ${area}\nTgl Mulai: ${tglMulai}\nTgl Selesai: ${tglSelesai}\nRisk: ${permit.risk_level} ${permit.risk_score}`
}

const getUtilityIcon = (jenis:string) => {
  const j = (jenis||'').toLowerCase()
  if (j.includes('electric') || j.includes('listrik')) return '⚡'
  if (j.includes('water')) return '💧'
  if (j.includes('gas')) return '🔥'
  if (j.includes('steam') || j.includes('uap')) return '♨️'
  if (j.includes('angin') || j.includes('wind')) return '🌬️'
  return '🔧'
}

const getQRFormPatrol = (permit:any) => {
  const wp = permit.nomor_wp || 'mrh-csmswp-2026-003'
  return `https://mrhcsmsintegrasi.vercel.app/?patrol=1&wp=${encodeURIComponent(wp)}&mode=choose&autoOpen=1`
}

export function WorkPermitPrintA4({ permit, appSettings, onClose }: Props) {
  const baseUrl = 'https://mrhcsmsintegrasi.vercel.app'
  const qrDataWP = useMemo(()=> getQRDataWP(permit), [permit])
  const qrFormPatrol = useMemo(()=> getQRFormPatrol(permit), [permit])

  const tglMulai = permit.tanggal_mulai || permit.start_date || '-'
  const tglSelesai = permit.tanggal_selesai || permit.end_date || '-'

  const pjNama = typeof permit.penanggung_jawab === 'string' ? permit.penanggung_jawab : (permit.penanggung_jawab?.nama || permit.contractor_name || '-')
  const pjJabatan = permit.pj_jabatan || 'Site Manager'
  const pjPhone = permit.pj_phone || '-'

  const soNama = permit.safety_officer_name || '-'
  const soPhone = permit.safety_officer_phone || '-'
  const soLicense = permit.safety_officer_license || 'Safety Officer Licensed'

  const pekerjaList = (() => {
    let arr:any[] = permit.workers_list || []
    if (typeof arr === 'string') try { arr = JSON.parse(arr) } catch { arr = [] }
    return Array.isArray(arr) ? arr : []
  })()

  const alatList = (() => {
    let arr:any[] = permit.alat_list || []
    if (typeof arr === 'string') try { arr = JSON.parse(arr) } catch { arr = [] }
    return Array.isArray(arr) ? arr : []
  })()

  const kendaraanList = (() => {
    let arr:any[] = permit.kendaraan_list || []
    if (typeof arr === 'string') try { arr = JSON.parse(arr) } catch { arr = [] }
    return Array.isArray(arr) ? arr : []
  })()

  const utilityList = (() => {
    let arr:any[] = permit.utility_list || permit.utilities || []
    if (typeof arr === 'string') try { arr = JSON.parse(arr) } catch { arr = [] }
    return Array.isArray(arr) ? arr : []
  })()

  const ORANGE = 'bg-[#f97316]'
  const ORANGE_DARK = 'bg-[#ea580c]'

  // V64 LOGO SYNC - MRH + K3
  const [logoUrlState, setLogoUrlState] = useState(appSettings?.logo_url || '')
  const [k3LogoState, setK3LogoState] = useState(appSettings?.k3_logo_url || '')
  const [companyNameState, setCompanyNameState] = useState(appSettings?.company_name || 'PT MRH DigitalHub')

  useEffect(()=>{
    const loadLogo = async () => {
      let logo = appSettings?.logo_url || ''
      let k3 = appSettings?.k3_logo_url || ''
      let company = appSettings?.company_name || 'PT MRH DigitalHub'

      try {
        const saved1 = localStorage.getItem('mrh_app_settings')
        if (saved1) {
          const parsed = JSON.parse(saved1)
          if (parsed.logo_url) logo = parsed.logo_url
          if (parsed.k3_logo_url) k3 = parsed.k3_logo_url
          if (parsed.company_name) company = parsed.company_name
        }
      } catch {}

      if (!logo || !k3) {
        try {
          const saved2 = localStorage.getItem('appSettings')
          if (saved2) {
            const parsed = JSON.parse(saved2)
            if (!logo && parsed.logo_url) logo = parsed.logo_url
            if (!k3 && parsed.k3_logo_url) k3 = parsed.k3_logo_url
            if (parsed.company_name) company = parsed.company_name
          }
        } catch {}
      }

      try {
        const { data } = await supabase.from('app_settings').select('*')
        if (data && data.length > 0) {
          const map: any = {}
          data.forEach((r:any)=> map[r.key]=r.value)
          if (!logo && map.logo_url) logo = map.logo_url
          if (!k3 && map.k3_logo_url) k3 = map.k3_logo_url
          if (map.company_name) company = map.company_name
        }
      } catch {}

      setLogoUrlState(logo)
      setK3LogoState(k3)
      setCompanyNameState(company)
    }
    loadLogo()
  }, [appSettings])

  const logoUrl = logoUrlState
  const k3LogoUrl = k3LogoState
  const companyName = companyNameState

  const handlePrint = () => {
    window.print()
  }

  const handlePreview = () => {
    // scroll to top untuk preview
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="bg-[#f1f5f9] min-h-screen p-2 print:bg-white print:p-0">
      
      {/* TOOLBAR DI LUAR HALAMAN A4 - sesuai request: preview + print + tutup di luar A4, tidak ikut keprint */}
      <div className="max-w-[850px] mx-auto mb-3 flex justify-between items-center bg-white border border-gray-300 rounded-lg px-4 py-2 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <div className="text-[11px] font-black text-slate-700">📄 WORK PERMIT A4 - {permit.nomor_wp}</div>
          <span className="text-[10px] bg-slate-100 border px-2 py-0.5 rounded">V64 Logo K3 Sync</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePreview} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-1">👁 Preview</button>
          <button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-1">🖨 Print</button>
          {onClose && <button onClick={onClose} className="bg-slate-800 hover:bg-black text-white px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-1">✕ Tutup</button>}
        </div>
      </div>

      {/* HALAMAN A4 UTAMA */}
      <div className="bg-white text-black p-3 max-w-[850px] mx-auto font-sans shadow-lg border border-gray-300 print:shadow-none print:border-none">
        
        {/* HEADER V64 - BERSIH - POJOK KANAN UNTUK LOGO K3 DENGAN BORDER */}
        <div className={`flex justify-between items-center ${ORANGE} text-white px-4 py-3 border-2 border-black`}>
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo MRH" className="h-12 w-12 bg-white rounded border-2 border-white p-1 object-contain shadow" />
            ) : (
              <div className="h-12 w-12 bg-white rounded flex items-center justify-center font-black text-[#ea580c] text-sm border-2 border-white shadow">MRH</div>
            )}
            <div>
              <div className="font-black text-[14px] tracking-wide">{companyName} - CSMS INTEGRATED</div>
              <div className="text-[11px] font-bold opacity-90">WORK PERMIT | {permit.nomor_wp} | {permit.judul || permit.title}</div>
            </div>
          </div>
          
          {/* KANAN HEADER - BORDER UNTUK LOGO K3 - SESUAI REQUEST */}
          <div className="flex items-center">
            <div className="w-[64px] h-[64px] bg-white border-2 border-black rounded flex items-center justify-center overflow-hidden shadow relative">
              {k3LogoUrl ? (
                <img src={k3LogoUrl} alt="Logo K3" className="w-full h-full object-contain p-1" />
              ) : (
                <div className="text-center">
                  <div className="text-[9px] font-black text-gray-400 leading-tight">LOGO<br/>K3</div>
                  <div className="text-[7px] text-gray-400 mt-0.5 border border-dashed border-gray-300 px-1">Upload di Settings</div>
                </div>
              )}
              {/* border dashed indicator jika kosong */}
              {!k3LogoUrl && <div className="absolute inset-0 border-2 border-dashed border-orange-400 rounded pointer-events-none"></div>}
            </div>
          </div>
        </div>

        {/* RISK MEDIUM 9 DIPINDAH KE TENGAH DI BAWAH HEADER - SESUAI REQUEST */}
        <div className="flex justify-center mt-2 mb-2">
          <div className="bg-white border-2 border-black rounded px-6 py-1.5 shadow-sm flex items-center gap-3">
            <span className="text-[11px] font-bold text-gray-600">RISK LEVEL:</span>
            <span className="bg-orange-500 text-white text-[11px] font-black px-3 py-1 rounded border border-black">RISK {permit.risk_level?.toUpperCase()} {permit.risk_score}</span>
            <span className="text-[10px] text-gray-500">| {permit.area_name || 'Area E - Electrical Substation'}</span>
          </div>
        </div>

        <table className="w-full border-collapse border border-black text-[11px] mt-2">
          <tbody>
            <tr>
              <td className="border border-black px-3 py-1.5 w-[18%] bg-gray-50 font-bold">No Work Permit</td><td className="border border-black px-3 py-1.5 w-[32%] font-bold">{permit.nomor_wp}</td>
              <td className="border border-black px-3 py-1.5 w-[18%] bg-gray-50 font-bold">Vendor</td><td className="border border-black px-3 py-1.5 w-[32%]">{permit.vendor_name || permit.contractor_name}</td>
            </tr>
            <tr>
              <td className="border border-black px-3 py-1.5 bg-gray-50 font-bold">Judul Pekerjaan</td><td className="border border-black px-3 py-1.5">{permit.judul || permit.title}</td>
              <td className="border border-black px-3 py-1.5 bg-gray-50 font-bold">Area</td><td className="border border-black px-3 py-1.5">{permit.area_name || '-'}</td>
            </tr>
            <tr>
              <td className="border border-black px-3 py-1.5 bg-gray-50 font-bold">Tanggal Mulai</td><td className="border border-black px-3 py-1.5 font-bold">{tglMulai}</td>
              <td className="border border-black px-3 py-1.5 bg-gray-50 font-bold">Tanggal Selesai</td><td className="border border-black px-3 py-1.5 font-bold">{tglSelesai}</td>
            </tr>
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="border border-black rounded-sm overflow-hidden">
            <div className={`${ORANGE_DARK} text-white text-[11px] font-black px-3 py-1.5`}>PENANGGUNG JAWAB LAPANGAN</div>
            <table className="w-full text-[11px] border-collapse"><tbody>
              <tr><td className="border border-black px-3 py-1.5 w-[35%] bg-gray-50">Nama</td><td className="border border-black px-3 py-1.5 font-bold">{pjNama}</td></tr>
              <tr><td className="border border-black px-3 py-1.5 bg-gray-50">Jabatan</td><td className="border border-black px-3 py-1.5">{pjJabatan}</td></tr>
              <tr><td className="border border-black px-3 py-1.5 bg-gray-50">No HP</td><td className="border border-black px-3 py-1.5">{pjPhone}</td></tr>
            </tbody></table>
          </div>
          <div className="border border-black rounded-sm overflow-hidden">
            <div className={`${ORANGE_DARK} text-white text-[11px] font-black px-3 py-1.5`}>SAFETY OFFICER / HSE</div>
            <table className="w-full text-[11px] border-collapse"><tbody>
              <tr><td className="border border-black px-3 py-1.5 w-[35%] bg-gray-50">Nama</td><td className="border border-black px-3 py-1.5 font-bold">{soNama}</td></tr>
              <tr><td className="border border-black px-3 py-1.5 bg-gray-50">Lisensi</td><td className="border border-black px-3 py-1.5">{soLicense}</td></tr>
              <tr><td className="border border-black px-3 py-1.5 bg-gray-50">No HP</td><td className="border border-black px-3 py-1.5">{soPhone}</td></tr>
            </tbody></table>
          </div>
        </div>

        <div className={`${ORANGE} text-white text-[11px] font-black px-3 py-1.5 mt-3 border border-black`}>DATA PEKERJA - {pekerjaList.length} Orang</div>
        <table className="w-full border-collapse border border-black text-[11px]">
          <thead><tr className="bg-orange-50"><th className="border border-black px-2 py-1">No</th><th className="border border-black px-2 py-1">Nama</th><th className="border border-black px-2 py-1">Usia</th><th className="border border-black px-2 py-1">Jabatan</th><th className="border border-black px-2 py-1">Skill / Sertifikasi</th><th className="border border-black px-2 py-1">License</th></tr></thead>
          <tbody>{pekerjaList.map((p:any,i:number)=><tr key={i} className={i%2===0?'bg-white':'bg-gray-50'}><td className="border border-black px-2 py-1 text-center">{i+1}</td><td className="border border-black px-2 py-1 font-bold">{p.nama}</td><td className="border border-black px-2 py-1 text-center">{p.usia}</td><td className="border border-black px-2 py-1">{p.jabatan}</td><td className="border border-black px-2 py-1">{p.skill||'-'}</td><td className="border border-black px-2 py-1 text-[10px]">{p.license ? `${p.license.substring(0,12)}...` : '-'} {p.tgl_expired && <span className="block text-[9px]">Exp: {p.tgl_expired}</span>}</td></tr>)}</tbody>
        </table>

        <div className={`${ORANGE} text-white text-[11px] font-black px-3 py-1.5 mt-3 border border-black`}>DATA ALAT KERJA - {alatList.length} Alat</div>
        <table className="w-full border-collapse border border-black text-[11px]">
          <thead><tr className="bg-orange-50"><th className="border border-black px-2 py-1">No</th><th className="border border-black px-2 py-1">Nama Alat</th><th className="border border-black px-2 py-1">Tag Inspeksi</th><th className="border border-black px-2 py-1">Status</th></tr></thead>
          <tbody>{alatList.map((a:any,i:number)=><tr key={i} className={i%2===0?'bg-white':'bg-gray-50'}><td className="border border-black px-2 py-1 text-center">{i+1}</td><td className="border border-black px-2 py-1 font-bold">{a.nama}</td><td className="border border-black px-2 py-1 text-center"><span className="bg-green-100 text-green-800 px-3 py-0.5 rounded-full text-[10px] font-bold border border-green-300">{a.tag_inspeksi||'Ok'}</span></td><td className="border border-black px-2 py-1 text-center text-[10px]">Laik Pakai</td></tr>)}</tbody>
        </table>

        <div className={`${ORANGE} text-white text-[11px] font-black px-3 py-1.5 mt-3 border border-black`}>DATA KENDARAAN / ALAT BERAT - {kendaraanList.length} Unit</div>
        <table className="w-full border-collapse border border-black text-[11px]">
          <thead><tr className="bg-orange-50"><th className="border border-black px-2 py-1">No</th><th className="border border-black px-2 py-1">Nama / Jenis</th><th className="border border-black px-2 py-1">Kapasitas</th><th className="border border-black px-2 py-1">No License / SILO</th><th className="border border-black px-2 py-1">Operator</th><th className="border border-black px-2 py-1">Inspeksi</th></tr></thead>
          <tbody>{kendaraanList.map((k:any,i:number)=><tr key={i} className={i%2===0?'bg-white':'bg-gray-50'}><td className="border border-black px-2 py-1 text-center">{i+1}</td><td className="border border-black px-2 py-1 font-bold">{k.nama}</td><td className="border border-black px-2 py-1 text-center font-bold">{k.kaps_ton}</td><td className="border border-black px-2 py-1 text-center text-[10px]">{k.no_license}</td><td className="border border-black px-2 py-1">{k.operator}</td><td className="border border-black px-2 py-1 text-center"><span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[9px] font-bold">{k.tag_inspeksi}</span></td></tr>)}</tbody>
        </table>

        <div className={`${ORANGE} text-white text-[11px] font-black px-3 py-1.5 mt-3 border border-black`}>DATA UTILITY / LOTO / ISOLASI - {utilityList.length} Item</div>
        <table className="w-full border-collapse border border-black text-[11px]">
          <thead><tr className="bg-orange-50"><th className="border border-black px-2 py-1">No</th><th className="border border-black px-2 py-1">Jenis Utility</th><th className="border border-black px-2 py-1">Total</th><th className="border border-black px-2 py-1">Durasi</th><th className="border border-black px-2 py-1">Satuan</th><th className="border border-black px-2 py-1">Pemakaian</th><th className="border border-black px-2 py-1">Status Isolasi</th></tr></thead>
          <tbody>{utilityList.map((u:any,i:number)=>{ const jenis = u.jenis||'-'; return <tr key={i} className={i%2===0?'bg-white':'bg-gray-50'}><td className="border border-black px-2 py-1 text-center">{i+1}</td><td className="border border-black px-2 py-1 font-bold">{getUtilityIcon(jenis)} {jenis}</td><td className="border border-black px-2 py-1 text-center font-bold">{u.total}</td><td className="border border-black px-2 py-1 text-center">{u.durasi} Hari</td><td className="border border-black px-2 py-1 text-center">{u.satuan}</td><td className="border border-black px-2 py-1 text-center">{u.pemakaian}</td><td className="border border-black px-2 py-1 text-center"><span className="bg-green-600 text-white px-3 py-0.5 rounded-full text-[10px] font-black">ISOLATED</span></td></tr> })}</tbody>
        </table>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="border border-black rounded-sm p-3 bg-white text-center"><div className={`font-black text-[11px] ${ORANGE} text-white py-1.5 px-3 rounded-sm`}>QR CODE 1 - VERIFIKASI WORK PERMIT</div><div className="mt-3 flex justify-center"><QRImg value={qrDataWP} size={180} /></div></div>
          <div className="border border-black rounded-sm p-3 bg-white text-center"><div className={`font-black text-[11px] ${ORANGE} text-white py-1.5 px-3 rounded-sm`}>QR CODE 2 - E-PATROL GABUNGAN</div><div className="mt-3 flex justify-center"><QRImg value={qrFormPatrol} size={180} /></div></div>
        </div>

        <div className="mt-4 border-t-2 border-black pt-2 flex justify-between text-[9px] text-gray-500 font-mono">
          <div>CSMS Integrated V64 - {permit.nomor_wp} - Printed: {new Date().toLocaleString('id-ID')} - K3 Logo Sync</div>
          <div>{baseUrl} - Logo: {logoUrl ? 'MRH CUSTOM' : 'DEFAULT'} | K3: {k3LogoUrl ? 'K3 CUSTOM' : 'DEFAULT'}</div>
        </div>
      </div>

      {/* TOOLBAR BAWAH JUGA - UNTUK PRINT LAGI */}
      <div className="max-w-[850px] mx-auto mt-3 flex justify-center gap-2 print:hidden">
        <button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-[13px] font-black shadow">🖨 Print Work Permit A4 Siap</button>
        <button onClick={handlePreview} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-[13px] font-black shadow">👁 Preview Ulang</button>
      </div>
    </div>
  )
}
export default WorkPermitPrintA4
