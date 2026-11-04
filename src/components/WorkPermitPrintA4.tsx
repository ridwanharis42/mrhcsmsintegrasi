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
  return `CSMS PT MRH DigitalHub\nNo WP: ${wp}\nVendor: ${vendor}\nJudul: ${judul}\nArea: ${area}\nTgl Mulai: ${tglMulai}\nTgl Selesai: ${tglSelesai}`
}
const getQRFormPatrol = (permit:any) => {
  const wp = permit.nomor_wp || 'mrh-csmswp-2026-003'
  const base = 'https://mrhcsmsintegrasi.vercel.app'
  return `${base}/?patrol=1&wp=${encodeURIComponent(wp)}&mode=choose&autoOpen=1`
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

export function WorkPermitPrintA4({ permit, appSettings, onClose }: Props) {
  const baseUrl = 'https://mrhcsmsintegrasi.vercel.app'
  const qrDataWP = useMemo(()=> getQRDataWP(permit), [permit])
  const qrFormPatrol = useMemo(()=> getQRFormPatrol(permit), [permit])

  const tglMulai = permit.tanggal_mulai || permit.start_date || '-'
  const tglSelesai = permit.tanggal_selesai || permit.end_date || '-'

  const pjNama = typeof permit.penanggung_jawab === 'string' ? permit.penanggung_jawab : (permit.penanggung_jawab?.nama || permit.penanggung_jawab || permit.contractor_name || '-')
  const pjJabatan = permit.pj_jabatan || 'PJ Lapangan'
  const pjPhone = permit.pj_phone || '-'
  const pjPengawas = permit.pengawas || permit.safety_officer_name || '-'

  const soNama = permit.safety_officer_name || '-'
  const soPhone = permit.safety_officer_phone || '-'

  // RAW DUMP untuk mapping final
  const rawWorkers = permit.workers
  const rawAlatList = permit.alat_list
  const rawKendaraanList = permit.kendaraan_list
  const rawUtilityList = permit.utility_list || permit.utilities
  const rawWorkersList = permit.workers_list

  // Parsing pekerja dengan semua kemungkinan key
  const parsePekerja = () => {
    let arr:any[] = []
    const candidates = [permit.workers, permit.workers_list, permit.pekerja, permit.data_pekerja]
    for (const c of candidates) {
      if (!c) continue
      let parsed = c
      if (typeof c === 'string') { try { parsed = JSON.parse(c) } catch { continue } }
      if (Array.isArray(parsed) && parsed.length>0) { arr = parsed; break }
    }
    return arr
  }
  const pekerjaArr = parsePekerja()

  const parseAlat = () => {
    let arr:any[] = []
    const candidates = [permit.alat_list, permit.alat_kerja]
    for (const c of candidates) {
      if (!c) continue
      let parsed = c
      if (typeof c === 'string') { try { parsed = JSON.parse(c) } catch { if (c) { arr = [{ nama: c }]; break } continue } }
      if (Array.isArray(parsed) && parsed.length>0) { arr = parsed; break }
    }
    return arr
  }
  const alatArr = parseAlat()

  const parseKendaraan = () => {
    let arr:any[] = []
    const candidates = [permit.kendaraan_list, permit.kendaraan]
    for (const c of candidates) {
      if (!c) continue
      let parsed = c
      if (typeof c === 'string') { try { parsed = JSON.parse(c) } catch { continue } }
      if (Array.isArray(parsed) && parsed.length>0) { arr = parsed; break }
    }
    // jika kosong tapi ada tonase/operator, buat dummy dari field terpisah
    if (arr.length===0 && (permit.tonase || permit.operator_name || permit.lisensi_alat_berat)) {
      arr = [{ nama: permit.jenis || 'Kendaraan', tonase: permit.tonase, silo: permit.lisensi_alat_berat, operator: permit.operator_name }]
    }
    return arr
  }
  const kendaraanArr = parseKendaraan()

  let utility:any[] = []
  if (Array.isArray(permit.utility_list) && permit.utility_list.length>0) utility = permit.utility_list
  else if (Array.isArray(permit.utilities) && permit.utilities.length>0) utility = permit.utilities
  else {
    const u:any[] = []
    if (permit.utility_air) u.push({ jenis: 'Water', qty: permit.utility_air_qty })
    if (permit.utility_gas) u.push({ jenis: 'Gas', qty: permit.utility_gas_qty })
    if (permit.utility_steam) u.push({ jenis: 'Steam', qty: permit.utility_steam_qty })
    if (permit.utility_listrik) u.push({ jenis: 'Electric', qty: permit.utility_listrik_qty })
    utility = u
  }

  const ORANGE = 'bg-[#f97316]'
  const ORANGE_DARK = 'bg-[#ea580c]'
  const logoUrl = appSettings?.logo_url || ''
  const companyName = appSettings?.company_name || 'PT MRH DigitalHub'

  return (
    <div className="bg-white text-black p-2 max-w-[900px] mx-auto font-sans">
      <div className={`flex justify-between items-center ${ORANGE} text-white px-3 py-2 rounded-t border-2 border-black`}>
        <div className="flex items-center gap-3">
          {logoUrl ? <img src={logoUrl} alt="Logo" className="h-10 w-10 bg-white rounded border p-1 object-contain" /> : <div className="h-10 w-10 bg-white rounded flex items-center justify-center font-black text-[#ea580c] text-xs border">MRH</div>}
          <div><div className="font-black text-[14px]">{companyName} - CSMS INTEGRATED - V57 RAW DUMP</div><div className="text-[11px] font-bold">No WP: {permit.nomor_wp} | {permit.judul || permit.title} | {permit.area_name} | {baseUrl}</div></div>
        </div>
        {onClose && <button onClick={onClose} className="bg-white text-black border border-black px-3 py-1 rounded text-xs font-black">X Tutup</button>}
      </div>

      {/* RAW JSON DUMP - UNTUK FINAL MAPPING */}
      <div className="bg-yellow-50 border-2 border-yellow-500 rounded p-2 mt-2 text-[10px] font-mono">
        <div className="font-black text-[11px] mb-1">🔍 V57 RAW JSON DUMP - Copy ini kirim ke dev biar V58 100% akurat</div>
        <div className="grid grid-cols-2 gap-2">
          <div><b>workers type:</b> {typeof rawWorkers} | isArray: {String(Array.isArray(rawWorkers))} | length: {Array.isArray(rawWorkers)?rawWorkers.length:'-'}</div>
          <div><b>workers_list type:</b> {typeof rawWorkersList} | isArray: {String(Array.isArray(rawWorkersList))}</div>
          <div><b>alat_list type:</b> {typeof rawAlatList} | isArray: {String(Array.isArray(rawAlatList))}</div>
          <div><b>kendaraan_list type:</b> {typeof permit.kendaraan_list} | isArray: {String(Array.isArray(permit.kendaraan_list))}</div>
        </div>
        <div className="mt-2 bg-white border p-1 rounded max-h-[200px] overflow-auto">
          <div><b>workers raw (first 500 chars):</b> {JSON.stringify(rawWorkers||'').substring(0,500)}</div>
          <div className="mt-1"><b>workers_list raw:</b> {JSON.stringify(rawWorkersList||'').substring(0,500)}</div>
          <div className="mt-1"><b>alat_list raw:</b> {JSON.stringify(rawAlatList||'').substring(0,500)}</div>
          <div className="mt-1"><b>kendaraan_list raw:</b> {JSON.stringify(permit.kendaraan_list||'').substring(0,500)}</div>
          <div className="mt-1"><b>utility_list raw:</b> {JSON.stringify(rawUtilityList||'').substring(0,500)}</div>
          <div className="mt-1"><b>Full permit sample keys:</b> tonase={String(permit.tonase)} | operator={String(permit.operator_name)} | lisensi={String(permit.lisensi_alat_berat)} | workers_count={String(permit.workers_count)} | jenis_pekerjaan={String(permit.jenis_pekerjaan)} | workers_skill={String(permit.workers_skill)}</div>
        </div>
      </div>

      <table className="w-full border-collapse border border-black text-[11px] mt-2"><tbody>
        <tr><td className="border border-black px-2 py-1 w-[40%]">No WP: <b>{permit.nomor_wp}</b></td><td className="border border-black px-2 py-1">Vendor: <b>{permit.vendor_name || permit.contractor_name}</b></td><td rowSpan={3} className="border border-black px-2 py-2 w-[110px] text-center bg-yellow-50"><div className="text-[9px] font-black">QR 1 DATA WP</div><QRImg value={qrDataWP} size={90} /></td></tr>
        <tr><td className="border border-black px-2 py-1">Judul: <b>{permit.judul || permit.title}</b></td><td className="border border-black px-2 py-1">Area: <b>{permit.area_name || '-'}</b></td></tr>
        <tr><td className="border border-black px-2 py-1">Tgl Mulai: <b>{tglMulai}</b></td><td className="border border-black px-2 py-1">Tgl Selesai: <b>{tglSelesai}</b></td></tr>
      </tbody></table>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="border border-black"><div className={`${ORANGE_DARK} text-white text-[11px] font-black px-2 py-1`}>Penanggung Jawab (PJ) Lapangan - REAL</div><table className="w-full text-[11px] border-collapse"><tbody>
          <tr><td className="border border-black px-2 py-1 w-[30%] bg-gray-50">Nama</td><td className="border border-black px-2 py-1 font-bold">{pjNama}</td></tr>
          <tr><td className="border border-black px-2 py-1 bg-gray-50">Jabatan</td><td className="border border-black px-2 py-1">{pjJabatan}</td></tr>
          <tr><td className="border border-black px-2 py-1 bg-gray-50">HP</td><td className="border border-black px-2 py-1">{pjPhone}</td></tr>
          <tr><td className="border border-black px-2 py-1 bg-gray-50">SO / Pengawas</td><td className="border border-black px-2 py-1">{pjPengawas}</td></tr>
        </tbody></table></div>
        <div className="border border-black"><div className={`${ORANGE_DARK} text-white text-[11px] font-black px-2 py-1`}>Safety Officer / HSE - REAL</div><table className="w-full text-[11px] border-collapse"><tbody>
          <tr><td className="border border-black px-2 py-1 w-[30%] bg-gray-50">Nama SO</td><td className="border border-black px-2 py-1 font-bold">{soNama}</td></tr>
          <tr><td className="border border-black px-2 py-1 bg-gray-50">Jabatan</td><td className="border border-black px-2 py-1">Safety Officer</td></tr>
          <tr><td className="border border-black px-2 py-1 bg-gray-50">HP</td><td className="border border-black px-2 py-1">{soPhone}</td></tr>
          <tr><td className="border border-black px-2 py-1 bg-gray-50">Status</td><td className="border border-black px-2 py-1">{permit.status||'active'}</td></tr>
        </tbody></table></div>
      </div>

      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Pekerja - {pekerjaArr.length} orang - REAL Parsed</div>
      <table className="w-full border-collapse border border-black text-[11px]"><thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Nama</th><th className="border border-black px-1">Jabatan / Jenis</th><th className="border border-black px-1">Skill / All Keys</th></tr></thead><tbody>{pekerjaArr.length>0 ? pekerjaArr.map((p:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1">{typeof p === 'string' ? p : (p.nama||p.name||p.nama_pekerja||JSON.stringify(p).substring(0,50))}</td><td className="border border-black px-1">{typeof p === 'object' ? (p.jabatan||p.position||p.jenis||permit.jenis_pekerjaan||'-') : '-'}</td><td className="border border-black px-1 text-[9px]">{typeof p === 'object' ? (Object.keys(p).join(',') + ' = ' + (p.skill||p.kompetensi||'-')) : '-'}</td></tr>) : <tr><td colSpan={4} className="border border-black text-center py-2">workers_count={permit.workers_count} - raw kosong</td></tr>}</tbody></table>

      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Alat Kerja - {alatArr.length} alat</div>
      <table className="w-full border-collapse border border-black text-[11px]"><thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Nama Alat</th><th className="border border-black px-1">Lisensi / No Seri</th><th className="border border-black px-1">Raw JSON</th></tr></thead><tbody>{alatArr.length>0 ? alatArr.map((a:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1">{typeof a === 'string' ? a : (a.nama||a.name||JSON.stringify(a).substring(0,50))}</td><td className="border border-black px-1">{typeof a === 'object' ? (a.seri||a.lisensi||a.no_seri||'-') : '-'}</td><td className="border border-black px-1 text-[8px]">{typeof a === 'object' ? Object.keys(a).join(',') : '-'}</td></tr>) : <tr><td colSpan={4} className="border border-black text-center py-2">alat_kerja={String(permit.alat_kerja)}</td></tr>}</tbody></table>

      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Kendaraan - {kendaraanArr.length} - REAL</div>
      <table className="w-full border-collapse border border-black text-[11px]"><thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Nama / Jenis</th><th className="border border-black px-1">Tonase</th><th className="border border-black px-1">No SILO / Lisensi</th><th className="border border-black px-1">Operator / Raw</th></tr></thead><tbody>{kendaraanArr.length>0 ? kendaraanArr.map((k:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1">{typeof k === 'string' ? k : (k.nama||k.name||k.jenis||'-')}</td><td className="border border-black px-1 text-center">{typeof k === 'object' ? (k.tonase||k.berat||permit.tonase||'-') : '-'}</td><td className="border border-black px-1 text-center">{typeof k === 'object' ? (k.silo||k.lisensi||k.no_silo||permit.lisensi_alat_berat||'-') : '-'}</td><td className="border border-black px-1 text-center text-[9px]">{typeof k === 'object' ? (k.operator||k.operator_name||Object.keys(k).join(',') ) : '-'}</td></tr>) : <tr><td colSpan={5} className="border border-black text-center py-2">tonase={permit.tonase} operator={permit.operator_name} lisensi={permit.lisensi_alat_berat}</td></tr>}</tbody></table>

      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Utility - {utility.length} item</div>
      <table className="w-full border-collapse border border-black text-[11px]"><thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Jenis Utility</th><th className="border border-black px-1">Lokasi</th><th className="border border-black px-1">Status</th><th className="border border-black px-1">Qty</th></tr></thead><tbody>{utility.length>0 ? utility.map((u:any,i:number)=>{ const jenis = u.jenis||u.nama||u.utility_type||'-'; return <tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1 font-bold">{getUtilityIcon(jenis)} {jenis}</td><td className="border border-black px-1">{u.lokasi||permit.area_name||'-'}</td><td className="border border-black px-1 text-center"><span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-[10px] font-bold">{u.status_isolasi||'Isolated'}</span></td><td className="border border-black px-1">{u.qty||u.jumlah||'-'}</td></tr> }) : <tr><td colSpan={5} className="border border-black text-center py-2">air={String(permit.utility_air)} qty={permit.utility_air_qty} | gas={String(permit.utility_gas)} | listrik={String(permit.utility_listrik)}</td></tr>}</tbody></table>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="border-2 border-black rounded p-2 bg-white text-center"><div className={`font-black text-[11px] ${ORANGE} text-white py-1 px-2 rounded`}>QR 1 DATA WP</div><div className="mt-2 flex justify-center"><QRImg value={qrDataWP} size={200} /></div></div>
        <div className="border-2 border-black rounded p-2 bg-white text-center"><div className={`font-black text-[11px] ${ORANGE} text-white py-1 px-2 rounded`}>QR 2 E-PATROL - {baseUrl}</div><div className="mt-2 flex justify-center"><QRImg value={qrFormPatrol} size={200} /></div></div>
      </div>
    </div>
  )
}
export default WorkPermitPrintA4
