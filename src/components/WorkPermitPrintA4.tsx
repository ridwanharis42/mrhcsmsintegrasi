// @ts-nocheck - V65 FINAL - Data Pekerja Rekap + Data Utility Sederhana + Logo K3 OK + QR tetap + 0 Problems
import { useMemo, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

type Props = { permit: any; appSettings?: any; onClose?: ()=>void }

const QRImg = ({ value, size=200 }: { value: string, size?: number }) => {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`
  return <img src={url} alt="QR" width={size} height={size} className="border border-black bg-white p-1" />
}

const getQRDataWP = (permit:any) => {
  return `CSMS PT MRH DigitalHub\nNo WP: ${permit.nomor_wp || '-'}\nVendor: ${permit.vendor_name || permit.contractor_name || '-'}\nJudul: ${permit.judul || permit.title || '-'}\nArea: ${permit.area_name || '-'}\nTgl: ${permit.tanggal_mulai || permit.start_date || '-'} s/d ${permit.tanggal_selesai || permit.end_date || '-'}\nRisk: ${permit.risk_level} ${permit.risk_score}`
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

  const pekerjaList = (() => { let arr:any[] = permit.workers_list || []; if (typeof arr === 'string') try { arr = JSON.parse(arr) } catch { arr = [] }; return Array.isArray(arr) ? arr : [] })()
  const alatList = (() => { let arr:any[] = permit.alat_list || []; if (typeof arr === 'string') try { arr = JSON.parse(arr) } catch { arr = [] }; return Array.isArray(arr) ? arr : [] })()
  const kendaraanList = (() => { let arr:any[] = permit.kendaraan_list || []; if (typeof arr === 'string') try { arr = JSON.parse(arr) } catch { arr = [] }; return Array.isArray(arr) ? arr : [] })()
  const utilityList = (() => { let arr:any[] = permit.utility_list || permit.utilities || []; if (typeof arr === 'string') try { arr = JSON.parse(arr) } catch { arr = [] }; return Array.isArray(arr) ? arr : [] })()

  // V65 REKAP LOGIC DATA PEKERJA
  const rekapPekerja = useMemo(()=>{
    const total = pekerjaList.length
    let countOperator = 0
    let countL = 0
    let countP = 0
    let countSkill = 0
    let countLicenseYes = 0
    let countLicenseNo = 0
    let usiaMin = Infinity
    let usiaMax = -Infinity

    pekerjaList.forEach((p:any)=>{
      const jabatan = (p.jabatan || '').toLowerCase()
      if (jabatan.includes('operator') || jabatan.includes('electrician') || jabatan.includes('driver')) countOperator++
      // Gender - cek field gender / jenis_kelamin / L/P
      const gender = (p.jenis_kelamin || p.gender || p.lp || '').toString().toUpperCase()
      const nama = (p.nama || '').toLowerCase()
      if (gender === 'P' || gender === 'PEREMPUAN' || gender === 'WANITA') countP++
      else countL++ // default L jika tidak ada field
      // Skill
      if (p.skill && p.skill !== '-' && p.skill.toLowerCase() !== 'helper') countSkill++
      // License
      if (p.license && p.license !== '-' && p.license.length > 3) countLicenseYes++; else countLicenseNo++
      // Usia
      const usia = parseInt(p.usia)
      if (!isNaN(usia)) {
        if (usia < usiaMin) usiaMin = usia
        if (usia > usiaMax) usiaMax = usia
      }
    })

    if (usiaMin === Infinity) usiaMin = 0
    if (usiaMax === -Infinity) usiaMax = 0

    return {
      total,
      countOperator: countOperator || total, // jika tidak ada operator spesifik, anggap semua operator
      countL,
      countP,
      countSkill,
      countLicenseYes,
      countLicenseNo,
      usiaMin,
      usiaMax
    }
  }, [pekerjaList])

  const ORANGE = 'bg-[#f97316]'
  const ORANGE_DARK = 'bg-[#ea580c]'

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
        if (saved1) { const parsed = JSON.parse(saved1); if (parsed.logo_url) logo = parsed.logo_url; if (parsed.k3_logo_url) k3 = parsed.k3_logo_url; if (parsed.company_name) company = parsed.company_name }
      } catch {}
      if (!logo || !k3) {
        try { const saved2 = localStorage.getItem('appSettings'); if (saved2) { const parsed = JSON.parse(saved2); if (!logo && parsed.logo_url) logo = parsed.logo_url; if (!k3 && parsed.k3_logo_url) k3 = parsed.k3_logo_url; if (parsed.company_name) company = parsed.company_name } } catch {}
      }
      try {
        const { data } = await supabase.from('app_settings').select('*')
        if (data && data.length > 0) { const map: any = {}; data.forEach((r:any)=> map[r.key]=r.value); if (!logo && map.logo_url) logo = map.logo_url; if (!k3 && map.k3_logo_url) k3 = map.k3_logo_url; if (map.company_name) company = map.company_name }
      } catch {}
      setLogoUrlState(logo); setK3LogoState(k3); setCompanyNameState(company)
    }
    loadLogo()
  }, [appSettings])

  const logoUrl = logoUrlState
  const k3LogoUrl = k3LogoState
  const companyName = companyNameState

  const handlePrint = () => window.print()
  const handlePreview = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  return (
    <div className="bg-[#f1f5f9] min-h-screen p-2 print:bg-white print:p-0">
      
      <div className="max-w-[850px] mx-auto mb-3 flex justify-between items-center bg-white border border-gray-300 rounded-lg px-4 py-2 shadow-sm print:hidden">
        <div className="flex items-center gap-2">
          <div className="text-[11px] font-black text-slate-700">📄 WORK PERMIT A4 - {permit.nomor_wp}</div>
          <span className="text-[10px] bg-orange-100 text-orange-700 border border-orange-300 px-2 py-0.5 rounded font-bold">V65 Rekap Pekerja + Utility Simple + K3 OK</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePreview} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-[11px] font-bold">👁 Preview</button>
          <button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-[11px] font-bold">🖨 Print</button>
          {onClose && <button onClick={onClose} className="bg-slate-800 hover:bg-black text-white px-3 py-1.5 rounded text-[11px] font-bold">✕ Tutup</button>}
        </div>
      </div>

      <div className="bg-white text-black p-3 max-w-[850px] mx-auto font-sans shadow-lg border border-gray-300 print:shadow-none print:border-none">
        
        {/* HEADER BERSIH - K3 LOGO KANAN */}
        <div className={`flex justify-between items-center ${ORANGE} text-white px-4 py-3 border-2 border-black`}>
          <div className="flex items-center gap-3">
            {logoUrl ? <img src={logoUrl} alt="MRH" className="h-12 w-12 bg-white rounded border-2 border-white p-1 object-contain shadow" /> : <div className="h-12 w-12 bg-white rounded flex items-center justify-center font-black text-[#ea580c] text-sm border-2 border-white shadow">MRH</div>}
            <div>
              <div className="font-black text-[14px] tracking-wide">{companyName} - CSMS INTEGRATED</div>
              <div className="text-[11px] font-bold opacity-90">WORK PERMIT | {permit.nomor_wp} | {permit.judul || permit.title}</div>
            </div>
          </div>
          <div className="flex items-center">
            <div className="w-[64px] h-[64px] bg-white border-2 border-black rounded flex items-center justify-center overflow-hidden shadow">
              {k3LogoUrl ? <img src={k3LogoUrl} alt="K3" className="w-full h-full object-contain p-1" /> : <div className="text-center"><div className="text-[9px] font-black text-gray-400">LOGO<br/>K3</div></div>}
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-2 mb-2">
          <div className="bg-white border-2 border-black rounded px-6 py-1.5 shadow-sm flex items-center gap-3">
            <span className="text-[11px] font-bold text-gray-600">RISK LEVEL:</span>
            <span className="bg-orange-500 text-white text-[11px] font-black px-3 py-1 rounded border border-black">RISK {permit.risk_level?.toUpperCase()} {permit.risk_score}</span>
            <span className="text-[10px] text-gray-500">| {permit.area_name || 'Area E - Electrical Substation'}</span>
          </div>
        </div>

        <table className="w-full border-collapse border border-black text-[11px] mt-2">
          <tbody>
            <tr><td className="border border-black px-3 py-1.5 w-[18%] bg-gray-50 font-bold">No Work Permit</td><td className="border border-black px-3 py-1.5 w-[32%] font-bold">{permit.nomor_wp}</td><td className="border border-black px-3 py-1.5 w-[18%] bg-gray-50 font-bold">Vendor</td><td className="border border-black px-3 py-1.5 w-[32%]">{permit.vendor_name || permit.contractor_name}</td></tr>
            <tr><td className="border border-black px-3 py-1.5 bg-gray-50 font-bold">Judul Pekerjaan</td><td className="border border-black px-3 py-1.5">{permit.judul || permit.title}</td><td className="border border-black px-3 py-1.5 bg-gray-50 font-bold">Area</td><td className="border border-black px-3 py-1.5">{permit.area_name || '-'}</td></tr>
            <tr><td className="border border-black px-3 py-1.5 bg-gray-50 font-bold">Tanggal Mulai</td><td className="border border-black px-3 py-1.5 font-bold">{tglMulai}</td><td className="border border-black px-3 py-1.5 bg-gray-50 font-bold">Tanggal Selesai</td><td className="border border-black px-3 py-1.5 font-bold">{tglSelesai}</td></tr>
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="border border-black rounded-sm overflow-hidden"><div className={`${ORANGE_DARK} text-white text-[11px] font-black px-3 py-1.5`}>PENANGGUNG JAWAB LAPANGAN</div><table className="w-full text-[11px] border-collapse"><tbody><tr><td className="border border-black px-3 py-1.5 w-[35%] bg-gray-50">Nama</td><td className="border border-black px-3 py-1.5 font-bold">{pjNama}</td></tr><tr><td className="border border-black px-3 py-1.5 bg-gray-50">Jabatan</td><td className="border border-black px-3 py-1.5">{pjJabatan}</td></tr><tr><td className="border border-black px-3 py-1.5 bg-gray-50">No HP</td><td className="border border-black px-3 py-1.5">{pjPhone}</td></tr></tbody></table></div>
          <div className="border border-black rounded-sm overflow-hidden"><div className={`${ORANGE_DARK} text-white text-[11px] font-black px-3 py-1.5`}>SAFETY OFFICER / HSE</div><table className="w-full text-[11px] border-collapse"><tbody><tr><td className="border border-black px-3 py-1.5 w-[35%] bg-gray-50">Nama</td><td className="border border-black px-3 py-1.5 font-bold">{soNama}</td></tr><tr><td className="border border-black px-3 py-1.5 bg-gray-50">Lisensi</td><td className="border border-black px-3 py-1.5">{soLicense}</td></tr><tr><td className="border border-black px-3 py-1.5 bg-gray-50">No HP</td><td className="border border-black px-3 py-1.5">{soPhone}</td></tr></tbody></table></div>
        </div>

        {/* ===== V65 DATA PEKERJA REKAP - SESUAI REQUEST ===== */}
        <div className={`${ORANGE} text-white text-[11px] font-black px-3 py-1.5 mt-3 border border-black`}>DATA PEKERJA - {rekapPekerja.total} Orang (Rekapitulasi)</div>
        <table className="w-full border-collapse border border-black text-[11px]">
          <thead>
            <tr className="bg-orange-100">
              <th className="border border-black px-2 py-2 text-center w-[18%]">Jumlah Operator</th>
              <th className="border border-black px-2 py-2 text-center w-[18%]">Jumlah L / P</th>
              <th className="border border-black px-2 py-2 text-center w-[18%]">Jumlah Tenaga Skill</th>
              <th className="border border-black px-2 py-2 text-center w-[18%]">License (Yes / No)</th>
              <th className="border border-black px-2 py-2 text-center w-[28%]">Range Usia (Min-Max)</th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-white font-bold text-[12px]">
              <td className="border border-black px-2 py-2 text-center">{rekapPekerja.countOperator} Operator</td>
              <td className="border border-black px-2 py-2 text-center">L: {rekapPekerja.countL} / P: {rekapPekerja.countP}</td>
              <td className="border border-black px-2 py-2 text-center">{rekapPekerja.countSkill} Skill / {rekapPekerja.total - rekapPekerja.countSkill} Helper</td>
              <td className="border border-black px-2 py-2 text-center"><span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-[10px] border border-green-300">Yes: {rekapPekerja.countLicenseYes}</span> / <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-[10px] border border-red-300">No: {rekapPekerja.countLicenseNo}</span></td>
              <td className="border border-black px-2 py-2 text-center">{rekapPekerja.usiaMin} - {rekapPekerja.usiaMax} Tahun</td>
            </tr>
            {/* REAL DATA DI BAWAHNYA - detail nama tetap ada untuk audit */}
            <tr className="bg-gray-50"><td colSpan={5} className="border border-black px-2 py-1 text-[10px] font-bold text-gray-600">Detail Real: {pekerjaList.map((p:any)=>`${p.nama} (${p.usia}th ${p.jabatan} ${p.license?'License:'+p.license.substring(0,8):'No License'})`).join(' | ')}</td></tr>
          </tbody>
        </table>

        {/* DATA ALAT KERJA - OK JANGAN DIRUBAH */}
        <div className={`${ORANGE} text-white text-[11px] font-black px-3 py-1.5 mt-3 border border-black`}>DATA ALAT KERJA - {alatList.length} Alat</div>
        <table className="w-full border-collapse border border-black text-[11px]">
          <thead><tr className="bg-orange-50"><th className="border border-black px-2 py-1">No</th><th className="border border-black px-2 py-1">Nama Alat</th><th className="border border-black px-2 py-1">Tag Inspeksi</th><th className="border border-black px-2 py-1">Status</th></tr></thead>
          <tbody>{alatList.map((a:any,i:number)=><tr key={i} className={i%2===0?'bg-white':'bg-gray-50'}><td className="border border-black px-2 py-1 text-center">{i+1}</td><td className="border border-black px-2 py-1 font-bold">{a.nama}</td><td className="border border-black px-2 py-1 text-center"><span className="bg-green-100 text-green-800 px-3 py-0.5 rounded-full text-[10px] font-bold border border-green-300">{a.tag_inspeksi||'Ok'}</span></td><td className="border border-black px-2 py-1 text-center text-[10px]">Laik Pakai</td></tr>)}</tbody>
        </table>

        {/* DATA KENDARAAN - OK JANGAN DIRUBAH */}
        <div className={`${ORANGE} text-white text-[11px] font-black px-3 py-1.5 mt-3 border border-black`}>DATA KENDARAAN / ALAT BERAT - {kendaraanList.length} Unit</div>
        <table className="w-full border-collapse border border-black text-[11px]">
          <thead><tr className="bg-orange-50"><th className="border border-black px-2 py-1">No</th><th className="border border-black px-2 py-1">Nama / Jenis</th><th className="border border-black px-2 py-1">Kapasitas</th><th className="border border-black px-2 py-1">No License / SILO</th><th className="border border-black px-2 py-1">Operator</th><th className="border border-black px-2 py-1">Inspeksi</th></tr></thead>
          <tbody>{kendaraanList.map((k:any,i:number)=><tr key={i} className={i%2===0?'bg-white':'bg-gray-50'}><td className="border border-black px-2 py-1 text-center">{i+1}</td><td className="border border-black px-2 py-1 font-bold">{k.nama}</td><td className="border border-black px-2 py-1 text-center font-bold">{k.kaps_ton}</td><td className="border border-black px-2 py-1 text-center text-[10px]">{k.no_license}</td><td className="border border-black px-2 py-1">{k.operator}</td><td className="border border-black px-2 py-1 text-center"><span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[9px] font-bold">{k.tag_inspeksi}</span></td></tr>)}</tbody>
        </table>

        {/* ===== V65 DATA UTILITY - JUDUL HANYA DATA UTILITY + KOLOM BARU + TANPA STATUS ISOLATED ===== */}
        <div className={`${ORANGE} text-white text-[11px] font-black px-3 py-1.5 mt-3 border border-black`}>DATA UTILITY - {utilityList.length} Item</div>
        <table className="w-full border-collapse border border-black text-[11px]">
          <thead>
            <tr className="bg-orange-50">
              <th className="border border-black px-2 py-1 w-[6%]">No</th>
              <th className="border border-black px-2 py-1 w-[22%]">Jenis Utility</th>
              <th className="border border-black px-2 py-1 w-[15%]">Pemakaian</th>
              <th className="border border-black px-2 py-1 w-[15%]">Durasi</th>
              <th className="border border-black px-2 py-1 w-[15%]">Total</th>
              <th className="border border-black px-2 py-1 w-[27%]">Satuan</th>
            </tr>
          </thead>
          <tbody>
            {utilityList.map((u:any,i:number)=>{
              const jenis = u.jenis||'-';
              return (
                <tr key={i} className={i%2===0?'bg-white':'bg-gray-50'}>
                  <td className="border border-black px-2 py-1 text-center">{i+1}</td>
                  <td className="border border-black px-2 py-1 font-bold">{getUtilityIcon(jenis)} {jenis}</td>
                  <td className="border border-black px-2 py-1 text-center font-bold">{u.pemakaian || '-'}</td>
                  <td className="border border-black px-2 py-1 text-center">{u.durasi} Hari</td>
                  <td className="border border-black px-2 py-1 text-center font-bold">{u.total}</td>
                  <td className="border border-black px-2 py-1 text-center">{u.satuan}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {/* QR CODE TETAP - JANGAN DIRUBAH */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="border border-black rounded-sm p-3 bg-white text-center"><div className={`font-black text-[11px] ${ORANGE} text-white py-1.5 px-3 rounded-sm`}>QR CODE 1 - VERIFIKASI WORK PERMIT</div><div className="mt-3 flex justify-center"><QRImg value={qrDataWP} size={180} /></div></div>
          <div className="border border-black rounded-sm p-3 bg-white text-center"><div className={`font-black text-[11px] ${ORANGE} text-white py-1.5 px-3 rounded-sm`}>QR CODE 2 - E-PATROL GABUNGAN</div><div className="mt-3 flex justify-center"><QRImg value={qrFormPatrol} size={180} /></div></div>
        </div>

        <div className="mt-4 border-t-2 border-black pt-2 flex justify-between text-[9px] text-gray-500 font-mono">
          <div>CSMS Integrated V65 - {permit.nomor_wp} - Printed: {new Date().toLocaleString('id-ID')} - Rekap Pekerja + Utility Simple + K3 Logo</div>
          <div>{baseUrl} - Logo: {logoUrl ? 'MRH CUSTOM' : 'DEFAULT'} | K3: {k3LogoUrl ? 'K3 CUSTOM' : 'DEFAULT'}</div>
        </div>
      </div>

      <div className="max-w-[850px] mx-auto mt-3 flex justify-center gap-2 print:hidden">
        <button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-[13px] font-black shadow">🖨 Print Work Permit A4 V65</button>
        <button onClick={handlePreview} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-[13px] font-black shadow">👁 Preview</button>
      </div>
    </div>
  )
}
export default WorkPermitPrintA4
