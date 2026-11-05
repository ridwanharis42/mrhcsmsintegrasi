import { useMemo } from 'react'
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
  const soLicense = permit.safety_officer_license || ''

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
  const logoUrl = appSettings?.logo_url || ''
  const companyName = appSettings?.company_name || 'PT MRH DigitalHub'

  return (
    <div className="bg-white text-black p-3 max-w-[850px] mx-auto font-sans print:p-0">
      {/* HEADER - RAPIH */}
      <div className={`flex justify-between items-center ${ORANGE} text-white px-4 py-3 border-2 border-black print:rounded-none`}>
        <div className="flex items-center gap-3">
          {logoUrl ? <img src={logoUrl} alt="Logo" className="h-12 w-12 bg-white rounded border p-1 object-contain" /> : <div className="h-12 w-12 bg-white rounded flex items-center justify-center font-black text-[#ea580c] text-sm border">MRH</div>}
          <div>
            <div className="font-black text-[15px] tracking-wide">{companyName} - CSMS INTEGRATED</div>
            <div className="text-[11px] font-bold opacity-90">WORK PERMIT | {permit.nomor_wp} | {permit.judul || permit.title}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="bg-white text-black text-[9px] font-black px-2 py-1 rounded border">RISK {permit.risk_level?.toUpperCase()} {permit.risk_score}</div>
          {onClose && <button onClick={onClose} className="mt-1 bg-white text-black border border-black px-3 py-1 rounded text-[10px] font-black print:hidden">✕ Tutup</button>}
        </div>
      </div>

      {/* INFO UTAMA */}
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

      {/* PJ & SO - RAPIH DI ATAS PEKERJA */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="border border-black rounded-sm overflow-hidden">
          <div className={`${ORANGE_DARK} text-white text-[11px] font-black px-3 py-1.5 tracking-wide`}>PENANGGUNG JAWAB LAPANGAN</div>
          <table className="w-full text-[11px] border-collapse"><tbody>
            <tr><td className="border border-black px-3 py-1.5 w-[35%] bg-gray-50">Nama</td><td className="border border-black px-3 py-1.5 font-bold">{pjNama}</td></tr>
            <tr><td className="border border-black px-3 py-1.5 bg-gray-50">Jabatan</td><td className="border border-black px-3 py-1.5">{pjJabatan}</td></tr>
            <tr><td className="border border-black px-3 py-1.5 bg-gray-50">No HP</td><td className="border border-black px-3 py-1.5">{pjPhone}</td></tr>
          </tbody></table>
        </div>
        <div className="border border-black rounded-sm overflow-hidden">
          <div className={`${ORANGE_DARK} text-white text-[11px] font-black px-3 py-1.5 tracking-wide`}>SAFETY OFFICER / HSE</div>
          <table className="w-full text-[11px] border-collapse"><tbody>
            <tr><td className="border border-black px-3 py-1.5 w-[35%] bg-gray-50">Nama</td><td className="border border-black px-3 py-1.5 font-bold">{soNama}</td></tr>
            <tr><td className="border border-black px-3 py-1.5 bg-gray-50">Lisensi</td><td className="border border-black px-3 py-1.5">{soLicense || 'Safety Officer Licensed'}</td></tr>
            <tr><td className="border border-black px-3 py-1.5 bg-gray-50">No HP</td><td className="border border-black px-3 py-1.5">{soPhone}</td></tr>
          </tbody></table>
        </div>
      </div>

      {/* PEKERJA */}
      <div className={`${ORANGE} text-white text-[11px] font-black px-3 py-1.5 mt-3 border border-black tracking-wide`}>DATA PEKERJA - {pekerjaList.length} Orang</div>
      <table className="w-full border-collapse border border-black text-[11px]">
        <thead><tr className="bg-orange-50"><th className="border border-black px-2 py-1 w-[5%]">No</th><th className="border border-black px-2 py-1 w-[25%]">Nama</th><th className="border border-black px-2 py-1 w-[10%]">Usia</th><th className="border border-black px-2 py-1 w-[20%]">Jabatan</th><th className="border border-black px-2 py-1 w-[20%]">Skill / Sertifikasi</th><th className="border border-black px-2 py-1 w-[20%]">License</th></tr></thead>
        <tbody>{pekerjaList.map((p:any,i:number)=><tr key={i} className={i%2===0?'bg-white':'bg-gray-50'}><td className="border border-black px-2 py-1 text-center">{i+1}</td><td className="border border-black px-2 py-1 font-bold">{p.nama}</td><td className="border border-black px-2 py-1 text-center">{p.usia}</td><td className="border border-black px-2 py-1">{p.jabatan}</td><td className="border border-black px-2 py-1">{p.skill||'-'}</td><td className="border border-black px-2 py-1 text-[10px]">{p.license ? `${p.license.substring(0,12)}...` : '-'} {p.tgl_expired && <span className="text-[9px] text-gray-600 block">Exp: {p.tgl_expired}</span>}</td></tr>)}</tbody>
      </table>

      {/* ALAT */}
      <div className={`${ORANGE} text-white text-[11px] font-black px-3 py-1.5 mt-3 border border-black tracking-wide`}>DATA ALAT KERJA - {alatList.length} Alat</div>
      <table className="w-full border-collapse border border-black text-[11px]">
        <thead><tr className="bg-orange-50"><th className="border border-black px-2 py-1 w-[5%]">No</th><th className="border border-black px-2 py-1 w-[45%]">Nama Alat</th><th className="border border-black px-2 py-1 w-[25%]">Tag Inspeksi</th><th className="border border-black px-2 py-1 w-[25%]">Status</th></tr></thead>
        <tbody>{alatList.map((a:any,i:number)=><tr key={i} className={i%2===0?'bg-white':'bg-gray-50'}><td className="border border-black px-2 py-1 text-center">{i+1}</td><td className="border border-black px-2 py-1 font-bold">{a.nama}</td><td className="border border-black px-2 py-1 text-center"><span className="bg-green-100 text-green-800 px-3 py-0.5 rounded-full text-[10px] font-bold border border-green-300">{a.tag_inspeksi||'Ok'}</span></td><td className="border border-black px-2 py-1 text-center text-[10px]">Laik Pakai</td></tr>)}</tbody>
      </table>

      {/* KENDARAAN */}
      <div className={`${ORANGE} text-white text-[11px] font-black px-3 py-1.5 mt-3 border border-black tracking-wide`}>DATA KENDARAAN / ALAT BERAT - {kendaraanList.length} Unit</div>
      <table className="w-full border-collapse border border-black text-[11px]">
        <thead><tr className="bg-orange-50"><th className="border border-black px-2 py-1 w-[5%]">No</th><th className="border border-black px-2 py-1 w-[25%]">Nama / Jenis</th><th className="border border-black px-2 py-1 w-[15%]">Kapasitas</th><th className="border border-black px-2 py-1 w-[20%]">No License / SILO</th><th className="border border-black px-2 py-1 w-[20%]">Operator</th><th className="border border-black px-2 py-1 w-[15%]">Inspeksi</th></tr></thead>
        <tbody>{kendaraanList.map((k:any,i:number)=><tr key={i} className={i%2===0?'bg-white':'bg-gray-50'}><td className="border border-black px-2 py-1 text-center">{i+1}</td><td className="border border-black px-2 py-1 font-bold">{k.nama}</td><td className="border border-black px-2 py-1 text-center font-bold">{k.kaps_ton}</td><td className="border border-black px-2 py-1 text-center text-[10px]">{k.no_license}</td><td className="border border-black px-2 py-1">{k.operator}</td><td className="border border-black px-2 py-1 text-center"><span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-[9px] font-bold">{k.tag_inspeksi}</span></td></tr>)}</tbody>
      </table>

      {/* UTILITY */}
      <div className={`${ORANGE} text-white text-[11px] font-black px-3 py-1.5 mt-3 border border-black tracking-wide`}>DATA UTILITY / LOTO / ISOLASI - {utilityList.length} Item</div>
      <table className="w-full border-collapse border border-black text-[11px]">
        <thead><tr className="bg-orange-50"><th className="border border-black px-2 py-1 w-[5%]">No</th><th className="border border-black px-2 py-1 w-[20%]">Jenis</th><th className="border border-black px-2 py-1 w-[15%]">Total</th><th className="border border-black px-2 py-1 w-[10%]">Durasi</th><th className="border border-black px-2 py-1 w-[10%]">Satuan</th><th className="border border-black px-2 py-1 w-[15%]">Pemakaian</th><th className="border border-black px-2 py-1 w-[25%]">Status Isolasi</th></tr></thead>
        <tbody>{utilityList.map((u:any,i:number)=>{ const jenis = u.jenis||'-'; return <tr key={i} className={i%2===0?'bg-white':'bg-gray-50'}><td className="border border-black px-2 py-1 text-center">{i+1}</td><td className="border border-black px-2 py-1 font-bold">{getUtilityIcon(jenis)} {jenis}</td><td className="border border-black px-2 py-1 text-center font-bold">{u.total}</td><td className="border border-black px-2 py-1 text-center">{u.durasi} Hari</td><td className="border border-black px-2 py-1 text-center">{u.satuan}</td><td className="border border-black px-2 py-1 text-center">{u.pemakaian}</td><td className="border border-black px-2 py-1 text-center"><span className="bg-green-600 text-white px-3 py-0.5 rounded-full text-[10px] font-black tracking-wide">ISOLATED</span></td></tr> })}</tbody>
      </table>

      {/* QR CODE - RAPIH */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="border border-black rounded-sm p-3 bg-white text-center">
          <div className={`font-black text-[11px] ${ORANGE} text-white py-1.5 px-3 rounded-sm tracking-wide`}>QR CODE 1 - VERIFIKASI WORK PERMIT</div>
          <div className="mt-3 flex justify-center"><QRImg value={qrDataWP} size={180} /></div>
          <div className="mt-2 text-[9px] text-gray-600 font-mono">Scan untuk verifikasi data WP</div>
        </div>
        <div className="border border-black rounded-sm p-3 bg-white text-center">
          <div className={`font-black text-[11px] ${ORANGE} text-white py-1.5 px-3 rounded-sm tracking-wide`}>QR CODE 2 - E-PATROL GABUNGAN</div>
          <div className="mt-3 flex justify-center"><QRImg value={qrFormPatrol} size={180} /></div>
          <div className="mt-2 text-[9px] text-gray-600 font-mono">{baseUrl}/?patrol=1&wp=...</div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-4 border-t-2 border-black pt-2 flex justify-between text-[9px] text-gray-500 font-mono">
        <div>CSMS Integrated V6 - PT MRH DigitalHub - {permit.nomor_wp} - Printed: {new Date().toLocaleString('id-ID')}</div>
        <div>{baseUrl}</div>
      </div>
    </div>
  )
}
export default WorkPermitPrintA4
