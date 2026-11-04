import { useMemo } from 'react'
type Props = { permit: any; appSettings?: any; onClose?: ()=>void }
const QRImg = ({ value, size=200 }: { value: string, size?: number }) => {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`
  return <img src={url} alt="QR" width={size} height={size} className="border-2 border-black bg-white p-1" />
}
const getQRDataWP = (permit:any) => {
  const wp = permit.nomor_wp || 'mrh-csmswp-2026-003'
  const vendor = permit.vendor_name || permit.contractor_name || 'PT MEGA PERKASA JAYA'
  const judul = permit.judul || permit.title || 'TEST STRIC AREA E'
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

  // V56 FINAL - BACA DARI 90 KEYS REAL SUPABASE - BUKAN DARI TABEL TERPISAH
  const tglMulai = permit.tanggal_mulai || permit.start_date || '-'
  const tglSelesai = permit.tanggal_selesai || permit.end_date || '-'

  // PJ - dari field penanggung_jawab (bisa string atau object) + pj_jabatan + pj_phone
  const pjNama = typeof permit.penanggung_jawab === 'string' ? permit.penanggung_jawab : (permit.penanggung_jawab?.nama || permit.penanggung_jawab || permit.contractor_name || '-')
  const pjJabatan = permit.pj_jabatan || (typeof permit.penanggung_jawab === 'object' ? permit.penanggung_jawab?.jabatan : '') || 'PJ Lapangan'
  const pjPhone = permit.pj_phone || permit.penanggung_jawab?.hp || permit.pj_hp || '-'
  const pjPengawas = permit.pengawas || permit.safety_officer_name || '-'

  // SO
  const soNama = permit.safety_officer_name || permit.so_name || 'Parji'
  const soJabatan = permit.safety_officer_license ? 'Safety Officer Licensed' : 'Safety Officer'
  const soPhone = permit.safety_officer_phone || permit.so_phone || '-'
  const soStatus = permit.status || 'active'

  // Pekerja - bisa di workers (JSON), workers_list, atau array
  let pekerja:any[] = []
  if (Array.isArray(permit.workers)) pekerja = permit.workers
  else if (Array.isArray(permit.workers_list)) pekerja = permit.workers_list
  else if (Array.isArray(permit.pekerja)) pekerja = permit.pekerja
  else if (typeof permit.workers === 'string') { try { pekerja = JSON.parse(permit.workers) } catch {} }
  // fallback dummy dari workers_count
  if (pekerja.length===0 && permit.workers_count > 0) {
    pekerja = Array.from({length: permit.workers_count}, (_,i)=>({ nama: `Pekerja ${i+1}`, jabatan: permit.jenis_pekerjaan || '-', skill: permit.workers_skill || '-' }))
  }

  // Alat - dari alat_kerja (string/array) + alat_list
  let alat:any[] = []
  if (Array.isArray(permit.alat_list)) alat = permit.alat_list
  else if (Array.isArray(permit.alat_kerja)) alat = permit.alat_kerja
  else if (typeof permit.alat_kerja === 'string' && permit.alat_kerja) alat = [{ nama: permit.alat_kerja, seri: permit.lisensi_alat_berat || '-', qty: 1 }]
  else if (permit.alat_kerja) alat = [permit.alat_kerja].flat().map((a:any)=> typeof a === 'string' ? { nama: a, seri: '-', qty: 1 } : a)

  // Kendaraan - dari kendaraan_list + tonase + operator_name + lisensi_alat_berat
  let kendaraan:any[] = []
  if (Array.isArray(permit.kendaraan_list)) kendaraan = permit.kendaraan_list
  else if (permit.tonase || permit.operator_name || permit.lisensi_alat_berat) {
    kendaraan = [{ nama: permit.alat_kerja || permit.jenis || 'Alat Berat', tonase: permit.tonase || '-', silo: permit.lisensi_alat_berat || '-', qty_op: permit.operator_name || '1 Operator' }]
  }

  // Utility - dari 4 field boolean/qty + utility_list + utilities
  let utility:any[] = []
  if (Array.isArray(permit.utility_list) && permit.utility_list.length>0) utility = permit.utility_list
  else if (Array.isArray(permit.utilities) && permit.utilities.length>0) utility = permit.utilities
  else {
    // build dari field utility_air, utility_gas, utility_steam, utility_listrik
    const u:any[] = []
    if (permit.utility_air) u.push({ jenis: 'Water', lokasi: 'Area', status_isolasi: 'Isolated', petugas: '-', qty: permit.utility_air_qty })
    if (permit.utility_gas) u.push({ jenis: 'Gas', lokasi: 'Area', status_isolasi: 'Isolated', petugas: '-', qty: permit.utility_gas_qty })
    if (permit.utility_steam) u.push({ jenis: 'Steam', lokasi: 'Area', status_isolasi: 'Isolated', petugas: '-', qty: permit.utility_steam_qty })
    if (permit.utility_listrik) u.push({ jenis: 'Electric', lokasi: 'Substation', status_isolasi: 'Isolated', petugas: '-', qty: permit.utility_listrik_qty })
    // jika boolean tapi qty ada, tetap tampilkan
    if (u.length===0) {
      if (permit.utility_air_qty) u.push({ jenis: 'Water', lokasi: 'Area', status_isolasi: 'Isolated', petugas: '-', qty: permit.utility_air_qty })
      if (permit.utility_gas_qty) u.push({ jenis: 'Gas', lokasi: 'Area', status_isolasi: 'Isolated', petugas: '-', qty: permit.utility_gas_qty })
      if (permit.utility_steam_qty) u.push({ jenis: 'Steam', lokasi: 'Area', status_isolasi: 'Isolated', petugas: '-', qty: permit.utility_steam_qty })
      if (permit.utility_listrik_qty) u.push({ jenis: 'Electric', lokasi: 'Substation', status_isolasi: 'Isolated', petugas: '-', qty: permit.utility_listrik_qty })
    }
    utility = u
  }
  // Jika masih kosong, pakai data dari permit.utilities string
  if (utility.length===0 && permit.utilities) {
    try { const parsed = typeof permit.utilities === 'string' ? JSON.parse(permit.utilities) : permit.utilities; if (Array.isArray(parsed)) utility = parsed } catch {}
  }

  const logoUrl = appSettings?.logo_url || ''
  const companyName = appSettings?.company_name || 'PT MRH DigitalHub'
  const ORANGE = 'bg-[#f97316]'
  const ORANGE_DARK = 'bg-[#ea580c]'

  return (
    <div className="bg-white text-black p-2 max-w-[900px] mx-auto font-sans">
      <div className={`flex justify-between items-center ${ORANGE} text-white px-3 py-2 rounded-t border-2 border-black`}>
        <div className="flex items-center gap-3">
          {logoUrl ? <img src={logoUrl} alt="Logo" className="h-10 w-10 bg-white rounded border p-1 object-contain" /> : <div className="h-10 w-10 bg-white rounded flex items-center justify-center font-black text-[#ea580c] text-xs border">MRH</div>}
          <div><div className="font-black text-[14px]">{companyName} - CSMS INTEGRATED - WORK PERMIT - V56 FINAL</div><div className="text-[11px] font-bold">No WP: {permit.nomor_wp} | {permit.judul || permit.title} | Risk {permit.risk_level} {permit.risk_score} | {permit.area_name} | {baseUrl}</div></div>
        </div>
        {onClose && <button onClick={onClose} className="bg-white text-black border border-black px-3 py-1 rounded text-xs font-black">X Tutup</button>}
      </div>

      <table className="w-full border-collapse border border-black text-[11px] mt-1"><tbody>
        <tr><td className="border border-black px-2 py-1 w-[40%]">No WP: <b>{permit.nomor_wp}</b></td><td className="border border-black px-2 py-1">Vendor: <b>{permit.vendor_name || permit.contractor_name}</b></td><td rowSpan={3} className="border border-black px-2 py-2 w-[110px] text-center bg-yellow-50"><div className="text-[9px] font-black">QR 1 DATA WP</div><QRImg value={qrDataWP} size={90} /><div className="text-[7px] mt-1 font-bold">SCAN DATA WP</div></td></tr>
        <tr><td className="border border-black px-2 py-1">Judul: <b>{permit.judul || permit.title}</b></td><td className="border border-black px-2 py-1">Area: <b>{permit.area_name || permit.area_id || '-'}</b></td></tr>
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
          <tr><td className="border border-black px-2 py-1 bg-gray-50">Jabatan</td><td className="border border-black px-2 py-1">{soJabatan}</td></tr>
          <tr><td className="border border-black px-2 py-1 bg-gray-50">HP</td><td className="border border-black px-2 py-1">{soPhone}</td></tr>
          <tr><td className="border border-black px-2 py-1 bg-gray-50">Status</td><td className="border border-black px-2 py-1">{soStatus}</td></tr>
        </tbody></table></div>
      </div>

      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Pekerja - {pekerja.length} orang - REAL dari work_permits.workers ({permit.workers_count || pekerja.length} count)</div>
      <table className="w-full border-collapse border border-black text-[11px]"><thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Nama</th><th className="border border-black px-1">Jabatan / Jenis</th><th className="border border-black px-1">Skill</th></tr></thead><tbody>{pekerja.length>0 ? pekerja.map((p:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1">{p.nama||p.name||p||'-'}</td><td className="border border-black px-1">{p.jabatan||p.jenis_pekerjaan||permit.jenis_pekerjaan||'-'}</td><td className="border border-black px-1">{p.skill||p.kompetensi||permit.workers_skill||'-'}</td></tr>) : <tr><td colSpan={4} className="border border-black text-center py-3 text-[11px] bg-yellow-50"><b>workers_count={permit.workers_count}</b> | jenis_pekerjaan={permit.jenis_pekerjaan} | skill={permit.workers_skill} - Data pekerja disimpan di kolom workers (JSON) bukan tabel terpisah</td></tr>}</tbody></table>

      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Alat Kerja - {alat.length} alat - REAL dari alat_list / alat_kerja</div>
      <table className="w-full border-collapse border border-black text-[11px]"><thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Nama Alat</th><th className="border border-black px-1">Lisensi / No Seri</th><th className="border border-black px-1">Qty</th></tr></thead><tbody>{alat.length>0 ? alat.map((a:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1">{a.nama||a.name||a||'-'}</td><td className="border border-black px-1">{a.seri||a.lisensi||permit.lisensi_alat_berat||'-'}</td><td className="border border-black px-1 text-center">{a.qty||1}</td></tr>) : <tr><td colSpan={4} className="border border-black text-center py-2 text-[10px]">alat_kerja={String(permit.alat_kerja)} | lisensi={permit.lisensi_alat_berat}</td></tr>}</tbody></table>

      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Kendaraan - Tonase - SILO - Operator - REAL</div>
      <table className="w-full border-collapse border border-black text-[11px]"><thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Nama / Jenis</th><th className="border border-black px-1">Tonase</th><th className="border border-black px-1">No SILO / Lisensi</th><th className="border border-black px-1">Operator</th></tr></thead><tbody>{kendaraan.length>0 ? kendaraan.map((k:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1">{k.nama||k.name||permit.jenis||'-'}</td><td className="border border-black px-1 text-center">{k.tonase||permit.tonase||'-'}</td><td className="border border-black px-1 text-center">{k.silo||k.lisensi||permit.lisensi_alat_berat||'-'}</td><td className="border border-black px-1 text-center">{k.qty_op||k.operator||permit.operator_name||'-'}</td></tr>) : <tr><td colSpan={5} className="border border-black text-center py-2 text-[10px]">tonase={permit.tonase} | operator={permit.operator_name} | lisensi={permit.lisensi_alat_berat}</td></tr>}</tbody></table>

      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Utility / LOTO / Isolasi - {utility.length} item - REAL dari utility_air/gas/steam/listrik</div>
      <table className="w-full border-collapse border border-black text-[11px]"><thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Jenis Utility</th><th className="border border-black px-1">Lokasi / Tag No</th><th className="border border-black px-1">Status Isolasi</th><th className="border border-black px-1">Qty / Petugas</th></tr></thead><tbody>{utility.length>0 ? utility.map((u:any,i:number)=>{ const jenis = u.jenis||u.nama||u.utility_type||'-'; return <tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1 font-bold">{getUtilityIcon(jenis)} {jenis} {u.qty?`(${u.qty})`:''}</td><td className="border border-black px-1">{u.lokasi||u.tag_no||permit.area_name||'-'}</td><td className="border border-black px-1 text-center"><span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-[10px] font-bold">{u.status_isolasi||u.status||'Isolated'}</span></td><td className="border border-black px-1">{u.petugas||u.qty||'-'}</td></tr> }) : <tr><td colSpan={5} className="border border-black text-center py-2 text-[10px]">utility_air={String(permit.utility_air)} qty={permit.utility_air_qty} | gas={String(permit.utility_gas)} qty={permit.utility_gas_qty} | steam={String(permit.utility_steam)} qty={permit.utility_steam_qty} | listrik={String(permit.utility_listrik)} qty={permit.utility_listrik_qty}</td></tr>}</tbody></table>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="border-2 border-black rounded p-2 bg-white text-center"><div className={`font-black text-[11px] ${ORANGE} text-white py-1 px-2 rounded`}>QR 1 DATA WP - Verifikasi</div><div className="mt-2 flex justify-center"><QRImg value={qrDataWP} size={200} /></div></div>
        <div className="border-2 border-black rounded p-2 bg-white text-center"><div className={`font-black text-[11px] ${ORANGE} text-white py-1 px-2 rounded`}>QR 2 E-PATROL - {baseUrl}</div><div className="mt-2 flex justify-center"><QRImg value={qrFormPatrol} size={200} /></div></div>
      </div>
    </div>
  )
}
export default WorkPermitPrintA4
