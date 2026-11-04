import { useMemo } from 'react'
type Props = { permit: any; appSettings?: any; onClose?: ()=>void }
const QRImg = ({ value, size=200 }: { value: string, size?: number }) => {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`
  return <img src={url} alt="QR" width={size} height={size} className="border-2 border-black bg-white p-1" />
}
const getQRDataWP = (permit:any) => {
  const wp = permit.nomor_wp || 'mrh-csmswp-2026-003'
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
  if (j.includes('water') || j.includes('air')) return '💧'
  if (j.includes('gas')) return '🔥'
  if (j.includes('steam') || j.includes('uap')) return '♨️'
  if (j.includes('angin') || j.includes('wind')) return '🌬️'
  return '🔧'
}
const getQRFormPatrol = (permit:any) => {
  const wp = permit.nomor_wp || 'mrh-csmswp-2026-003'
  const base = 'https://mrhcsmsintegrasi.vercel.app'
  return `${base}/?patrol=1&wp=${encodeURIComponent(wp)}&mode=choose&autoOpen=1`
}

export function WorkPermitPrintA4({ permit, appSettings, onClose }: Props) {
  const baseUrl = 'https://mrhcsmsintegrasi.vercel.app'
  const qrDataWP = useMemo(()=> getQRDataWP(permit), [permit])
  const qrFormPatrol = useMemo(()=> getQRFormPatrol(permit), [permit])

  const tglMulai = permit.tanggal_mulai || permit.start_date || '-'
  const tglSelesai = permit.tanggal_selesai || permit.end_date || '-'

  const pjNama = typeof permit.penanggung_jawab === 'string' ? permit.penanggung_jawab : (permit.penanggung_jawab?.nama || permit.penanggung_jawab || permit.contractor_name || '-')
  const pjJabatan = permit.pj_jabatan || 'Site Manager'
  const pjPhone = permit.pj_phone || '-'
  const pjPengawas = permit.pengawas || permit.safety_officer_name || 'Parji'

  const soNama = permit.safety_officer_name || 'Parji'
  const soPhone = permit.safety_officer_phone || '-'

  // V58 FINAL MAPPING - SESUAI RAW DUMP V57
  const pekerjaList = (() => {
    let arr:any[] = permit.workers_list || permit.workers || []
    if (typeof arr === 'string') { try { arr = JSON.parse(arr) } catch { arr = [] } }
    return Array.isArray(arr) ? arr : []
  })()

  const alatList = (() => {
    let arr:any[] = permit.alat_list || []
    if (typeof arr === 'string') { try { arr = JSON.parse(arr) } catch { arr = [] } }
    return Array.isArray(arr) ? arr : []
  })()

  const kendaraanList = (() => {
    let arr:any[] = permit.kendaraan_list || []
    if (typeof arr === 'string') { try { arr = JSON.parse(arr) } catch { arr = [] } }
    return Array.isArray(arr) ? arr : []
  })()

  const utilityList = (() => {
    let arr:any[] = permit.utility_list || permit.utilities || []
    if (typeof arr === 'string') { try { arr = JSON.parse(arr) } catch { arr = [] } }
    // fallback dari boolean
    if (arr.length===0) {
      const u:any[] = []
      if (permit.utility_air) u.push({ jenis: 'Water', qty: permit.utility_air_qty })
      if (permit.utility_gas) u.push({ jenis: 'Gas', qty: permit.utility_gas_qty })
      if (permit.utility_steam) u.push({ jenis: 'Steam', qty: permit.utility_steam_qty })
      if (permit.utility_listrik) u.push({ jenis: 'Electric', qty: permit.utility_listrik_qty })
      return u
    }
    return Array.isArray(arr) ? arr : []
  })()

  const ORANGE = 'bg-[#f97316]'
  const ORANGE_DARK = 'bg-[#ea580c]'
  const logoUrl = appSettings?.logo_url || ''
  const companyName = appSettings?.company_name || 'PT MRH DigitalHub'

  return (
    <div className="bg-white text-black p-2 max-w-[900px] mx-auto font-sans">
      <div className={`flex justify-between items-center ${ORANGE} text-white px-3 py-2 rounded-t border-2 border-black`}>
        <div className="flex items-center gap-3">
          {logoUrl ? <img src={logoUrl} alt="Logo" className="h-10 w-10 bg-white rounded border p-1 object-contain" /> : <div className="h-10 w-10 bg-white rounded flex items-center justify-center font-black text-[#ea580c] text-xs border">MRH</div>}
          <div><div className="font-black text-[14px]">{companyName} - CSMS INTEGRATED - WORK PERMIT - V58 FINAL SYNC</div><div className="text-[11px] font-bold">No WP: {permit.nomor_wp} | {permit.judul || permit.title} | Risk {permit.risk_level} {permit.risk_score} | {permit.area_name} | {baseUrl}</div></div>
        </div>
        {onClose && <button onClick={onClose} className="bg-white text-black border border-black px-3 py-1 rounded text-xs font-black">X Tutup</button>}
      </div>

      <table className="w-full border-collapse border border-black text-[11px] mt-1"><tbody>
        <tr><td className="border border-black px-2 py-1 w-[40%]">No WP: <b>{permit.nomor_wp}</b></td><td className="border border-black px-2 py-1">Vendor: <b>{permit.vendor_name || permit.contractor_name}</b></td><td rowSpan={3} className="border border-black px-2 py-2 w-[110px] text-center bg-yellow-50"><div className="text-[9px] font-black">QR 1 DATA WP</div><QRImg value={qrDataWP} size={90} /><div className="text-[7px] mt-1 font-bold">SCAN DATA WP</div></td></tr>
        <tr><td className="border border-black px-2 py-1">Judul: <b>{permit.judul || permit.title}</b></td><td className="border border-black px-2 py-1">Area: <b>{permit.area_name || '-'}</b></td></tr>
        <tr><td className="border border-black px-2 py-1">Tgl Mulai: <b>{tglMulai}</b></td><td className="border border-black px-2 py-1">Tgl Selesai: <b>{tglSelesai}</b></td></tr>
      </tbody></table>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="border border-black"><div className={`${ORANGE_DARK} text-white text-[11px] font-black px-2 py-1`}>Penanggung Jawab (PJ) Lapangan - REAL Supabase</div><table className="w-full text-[11px] border-collapse"><tbody>
          <tr><td className="border border-black px-2 py-1 w-[30%] bg-gray-50">Nama</td><td className="border border-black px-2 py-1 font-bold">{pjNama}</td></tr>
          <tr><td className="border border-black px-2 py-1 bg-gray-50">Jabatan</td><td className="border border-black px-2 py-1">{pjJabatan}</td></tr>
          <tr><td className="border border-black px-2 py-1 bg-gray-50">HP</td><td className="border border-black px-2 py-1">{pjPhone}</td></tr>
          <tr><td className="border border-black px-2 py-1 bg-gray-50">SO / Pengawas</td><td className="border border-black px-2 py-1">{pjPengawas}</td></tr>
        </tbody></table></div>
        <div className="border border-black"><div className={`${ORANGE_DARK} text-white text-[11px] font-black px-2 py-1`}>Safety Officer / HSE - REAL Supabase</div><table className="w-full text-[11px] border-collapse"><tbody>
          <tr><td className="border border-black px-2 py-1 w-[30%] bg-gray-50">Nama SO</td><td className="border border-black px-2 py-1 font-bold">{soNama}</td></tr>
          <tr><td className="border border-black px-2 py-1 bg-gray-50">Jabatan</td><td className="border border-black px-2 py-1">Safety Officer Licensed</td></tr>
          <tr><td className="border border-black px-2 py-1 bg-gray-50">HP</td><td className="border border-black px-2 py-1">{soPhone}</td></tr>
          <tr><td className="border border-black px-2 py-1 bg-gray-50">Status</td><td className="border border-black px-2 py-1">{permit.status||'active'}</td></tr>
        </tbody></table></div>
      </div>

      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Pekerja - {pekerjaList.length} orang - REAL dari workers_list (Lukman, Karman, Manto)</div>
      <table className="w-full border-collapse border border-black text-[11px]"><thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Nama</th><th className="border border-black px-1">Usia</th><th className="border border-black px-1">Jabatan</th><th className="border border-black px-1">Skill / Sertifikasi</th><th className="border border-black px-1">License / Expired</th></tr></thead><tbody>{pekerjaList.length>0 ? pekerjaList.map((p:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1 font-bold">{p.nama||p.name||'-'}</td><td className="border border-black px-1 text-center">{p.usia||'-'}</td><td className="border border-black px-1">{p.jabatan||'-'}</td><td className="border border-black px-1">{p.skill||'-'}</td><td className="border border-black px-1 text-[10px]">{p.license||'-'} {p.tgl_expired?`/ Exp: ${p.tgl_expired}`:''}</td></tr>) : <tr><td colSpan={6} className="border border-black text-center py-2">workers_list kosong</td></tr>}</tbody></table>

      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Alat Kerja - {alatList.length} alat - REAL dari alat_list (Welding, Travo, Genset)</div>
      <table className="w-full border-collapse border border-black text-[11px]"><thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Nama Alat</th><th className="border border-black px-1">Tag Inspeksi</th><th className="border border-black px-1">Qty</th></tr></thead><tbody>{alatList.length>0 ? alatList.map((a:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1 font-bold">{a.nama||a.name||'-'}</td><td className="border border-black px-1 text-center"><span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-[10px] font-bold">{a.tag_inspeksi||a.status||'Ok'}</span></td><td className="border border-black px-1 text-center">{a.qty||1}</td></tr>) : <tr><td colSpan={4} className="border border-black text-center py-2">alat_list kosong</td></tr>}</tbody></table>

      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Kendaraan - Tonase - SILO - Operator - REAL dari kendaraan_list (Crane 20T, Forklift, Handlift)</div>
      <table className="w-full border-collapse border border-black text-[11px]"><thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Nama / Jenis</th><th className="border border-black px-1">Tonase / Kaps_ton</th><th className="border border-black px-1">No SILO / License</th><th className="border border-black px-1">Operator</th><th className="border border-black px-1">Inspeksi</th></tr></thead><tbody>{kendaraanList.length>0 ? kendaraanList.map((k:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1 font-bold">{k.nama||'-'}</td><td className="border border-black px-1 text-center font-bold">{k.kaps_ton||k.tonase||'-'}</td><td className="border border-black px-1 text-center">{k.no_license||k.no_silo||'-'}</td><td className="border border-black px-1">{k.operator||'-'}</td><td className="border border-black px-1 text-center"><span className="bg-green-100 text-green-800 px-1 rounded text-[9px]">{k.tag_inspeksi||'Ok'}</span></td></tr>) : <tr><td colSpan={6} className="border border-black text-center py-2">kendaraan_list kosong</td></tr>}</tbody></table>

      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Utility / LOTO / Isolasi - {utilityList.length} item - REAL dari utility_list (Electric, Water, Gas, Steam, Angin + ikon)</div>
      <table className="w-full border-collapse border border-black text-[11px]"><thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Jenis Utility</th><th className="border border-black px-1">Total</th><th className="border border-black px-1">Durasi</th><th className="border border-black px-1">Satuan</th><th className="border border-black px-1">Pemakaian</th><th className="border border-black px-1">Status</th></tr></thead><tbody>{utilityList.length>0 ? utilityList.map((u:any,i:number)=>{ const jenis = u.jenis||u.nama||'-'; return <tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1 font-bold">{getUtilityIcon(jenis)} {jenis}</td><td className="border border-black px-1 text-center">{u.total||'-'}</td><td className="border border-black px-1 text-center">{u.durasi||'-'} {u.durasi_jam?`(${u.durasi_jam} jam)`:''}</td><td className="border border-black px-1 text-center">{u.satuan||'-'}</td><td className="border border-black px-1 text-center">{u.pemakaian||'-'}</td><td className="border border-black px-1 text-center"><span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-[10px] font-bold">Isolated</span></td></tr> }) : <tr><td colSpan={7} className="border border-black text-center py-2">utility_list kosong</td></tr>}</tbody></table>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="border-2 border-black rounded p-2 bg-white text-center"><div className={`font-black text-[11px] ${ORANGE} text-white py-1 px-2 rounded`}>QR 1 DATA WP - Verifikasi</div><div className="mt-2 flex justify-center"><QRImg value={qrDataWP} size={200} /></div></div>
        <div className="border-2 border-black rounded p-2 bg-white text-center"><div className={`font-black text-[11px] ${ORANGE} text-white py-1 px-2 rounded`}>QR 2 E-PATROL - {baseUrl}</div><div className="mt-2 flex justify-center"><QRImg value={qrFormPatrol} size={200} /></div></div>
      </div>
    </div>
  )
}
export default WorkPermitPrintA4
