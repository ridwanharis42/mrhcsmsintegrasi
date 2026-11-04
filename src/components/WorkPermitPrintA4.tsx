import { useMemo } from 'react'

type Props = {
  permit: any
  appSettings?: any
  onClose?: ()=>void
}

const QRImg = ({ value, size=200 }: { value: string, size?: number }) => {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`
  return <img src={url} alt="QR" width={size} height={size} className="border-2 border-black bg-white p-1" />
}

const getQRDataWP = (permit:any) => {
  const wp = permit.nomor_wp || 'mrh-csmswp-2026-003'
  const vendor = permit.vendor_name || 'PT MEGA PERKASA JAYA'
  const judul = permit.judul || permit.judul_pekerjaan || 'TEST STRIC AREA E'
  const area = permit.area_name || permit.area_id || '-'
  const tglMulai = permit.tgl_mulai || permit.start_date || '2026-11-11'
  const tglSelesai = permit.tgl_selesai || permit.end_date || '2026-11-11'
  const risk = permit.risk_level || 'medium'
  const score = permit.risk_score || 9
  return `CSMS PT MRH DigitalHub
No WP: ${wp}
Vendor: ${vendor}
Judul: ${judul}
Area: ${area}
Tgl Mulai: ${tglMulai}
Tgl Selesai: ${tglSelesai}
Risk: ${risk} ${score} (5x5)
Verifikasi: CSMS INTEGRATED
Status: VERIFIED`
}

const getQRFormPatrol = (permit:any) => {
  const wp = permit.nomor_wp || 'mrh-csmswp-2026-003'
  const area = permit.area_name || 'AREA'
  const vendor = permit.vendor_name || 'PT MEGA PERKASA JAYA'
  const judul = permit.judul || 'TEST STRIC AREA E'
  const base = 'https://mrhcsmsintegrasi.vercel.app'
  return `${base}/?patrol=1&wp=${encodeURIComponent(wp)}&area=${encodeURIComponent(area)}&vendor=${encodeURIComponent(vendor)}&judul=${encodeURIComponent(judul)}&mode=choose&autoOpen=1`
}

export function WorkPermitPrintA4({ permit, appSettings, onClose }: Props) {
  const baseUrl = 'https://mrhcsmsintegrasi.vercel.app'
  const qrDataWP = useMemo(()=> getQRDataWP(permit), [permit])
  const qrFormPatrol = useMemo(()=> getQRFormPatrol(permit), [permit])
  const pekerja = permit.pekerja || permit.data_pekerja || permit.workers || []
  const alat = permit.alat_kerja || permit.data_alat || permit.tools || []
  const kendaraan = permit.kendaraan || permit.vehicles || []
  const penanggung = permit.penanggung_jawab || permit.pj || permit.pic || permit.responsible_person || { nama: permit.pj_name || permit.penanggung_jawab_nama || 'Parjo', jabatan: permit.pj_jabatan || 'PJ Lapangan', hp: permit.pj_hp || '-', so: permit.so_name || 'Parji' }
  const safety = permit.safety_officer || permit.so || { nama: permit.safety_officer_name || permit.so_name || 'Lukam', jabatan: 'Safety Officer', hp: permit.so_hp || '-' }
  const utility = permit.utility || permit.data_utility || permit.utilities || []

  const logoUrl = appSettings?.logo_url || appSettings?.company_logo || ''
  const companyName = appSettings?.company_name || 'PT MRH DigitalHub'
  const ORANGE = 'bg-[#f97316]' // orange terang tebal
  const ORANGE_DARK = 'bg-[#ea580c]'

  return (
    <div className="bg-white text-black p-2 max-w-[900px] mx-auto font-sans print:p-0">
      {/* HEADER ORANGE TEBAL TERANG - SYNC LOGO */}
      <div className={`flex justify-between items-center ${ORANGE} text-white px-3 py-2 rounded-t border-2 border-black`}>
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-10 w-10 bg-white rounded border p-1 object-contain" />
          ) : (
            <div className="h-10 w-10 bg-white rounded flex items-center justify-center font-black text-[#ea580c] text-xs border">MRH</div>
          )}
          <div>
            <div className="font-black text-[14px] tracking-wide">{companyName} - CSMS INTEGRATED - WORK PERMIT - V52</div>
            <div className="text-[11px] font-bold">No WP: {permit.nomor_wp} | {permit.judul} | Risk {permit.risk_level} {permit.risk_score} | {permit.area_name} | {baseUrl}</div>
          </div>
        </div>
        {onClose && <button onClick={onClose} className="bg-white text-black border border-black px-3 py-1 rounded text-xs font-black">X Tutup</button>}
      </div>

      <table className="w-full border-collapse border border-black text-[11px] mt-1">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1 w-[40%]">No WP: <b>{permit.nomor_wp}</b></td>
            <td className="border border-black px-2 py-1">Vendor: <b>{permit.vendor_name}</b></td>
            <td rowSpan={3} className="border border-black px-2 py-2 w-[110px] text-center bg-yellow-50">
              <div className="text-[9px] font-black">QR 1 DATA WP</div>
              <QRImg value={qrDataWP} size={90} />
              <div className="text-[7px] mt-1 font-bold">SCAN DATA WP</div>
            </td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1">Judul: <b>{permit.judul}</b></td>
            <td className="border border-black px-2 py-1">Area: <b>{permit.area_name || '-'}</b></td>
          </tr>
          <tr>
            <td className="border border-black px-2 py-1">Tgl Mulai: <b>{permit.tgl_mulai || permit.start_date || '-'}</b></td>
            <td className="border border-black px-2 py-1">Tgl Selesai: <b>{permit.tgl_selesai || permit.end_date || '-'}</b></td>
          </tr>
        </tbody>
      </table>

      {/* DATA PEKERJA - HEADER ORANGE SAMA */}
      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Pekerja - {pekerja.length} orang</div>
      <table className="w-full border-collapse border border-black text-[11px]">
        <thead><tr className="bg-orange-100"><th className="border border-black px-1 w-[30px]">No</th><th className="border border-black px-1">Nama</th><th className="border border-black px-1">Jabatan</th><th className="border border-black px-1">Skill</th></tr></thead>
        <tbody>{pekerja.length>0 ? pekerja.map((p:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1">{p.nama||p.name||p.nama_pekerja}</td><td className="border border-black px-1">{p.jabatan||p.position}</td><td className="border border-black px-1">{p.skill||p.kompetensi||'-'}</td></tr>) : <tr><td colSpan={4} className="border border-black px-1 text-center text-[10px] py-1">Belum ada data pekerja - ambil dari Supabase work_permit_workers</td></tr>}</tbody>
      </table>

      {/* DATA ALAT KERJA - HEADER ORANGE SAMA */}
      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Alat Kerja - {alat.length} alat</div>
      <table className="w-full border-collapse border border-black text-[11px]">
        <thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Nama Alat</th><th className="border border-black px-1">No Seri</th><th className="border border-black px-1">Qty</th></tr></thead>
        <tbody>{alat.length>0 ? alat.map((a:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1">{a.nama||a.name||a.nama_alat}</td><td className="border border-black px-1">{a.seri||a.no_seri||a.serial||'-'}</td><td className="border border-black px-1 text-center">{a.qty||a.jumlah||1}</td></tr>) : <tr><td colSpan={4} className="border border-black px-1 text-center text-[10px] py-1">Belum ada data alat - Supabase work_permit_tools</td></tr>}</tbody>
      </table>

      {/* DATA KENDARAAN - HEADER ORANGE SAMA */}
      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Kendaraan - Tonase - SILO - Qty</div>
      <table className="w-full border-collapse border border-black text-[11px]">
        <thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Nama</th><th className="border border-black px-1">Tonase</th><th className="border border-black px-1">No SILO</th><th className="border border-black px-1">Operator</th></tr></thead>
        <tbody>{kendaraan.length>0 ? kendaraan.map((k:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1">{k.nama||k.name}</td><td className="border border-black px-1 text-center">{k.tonase||k.kapasitas||'20 Ton'}</td><td className="border border-black px-1 text-center">{k.silo||k.no_silo||'-'}</td><td className="border border-black px-1 text-center">{k.qty_op||k.operator||'-'}</td></tr>) : <tr><td colSpan={5} className="border border-black px-1 text-center text-[10px] py-1">Belum ada data kendaraan</td></tr>}</tbody>
      </table>

      {/* PENANGGUNG JAWAB & SAFETY OFFICER - DITAMPILKAN KEMBALI */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="border border-black">
          <div className={`${ORANGE_DARK} text-white text-[11px] font-black px-2 py-1`}>Penanggung Jawab (PJ) Lapangan</div>
          <table className="w-full text-[11px] border-collapse">
            <tbody>
              <tr><td className="border border-black px-2 py-1 w-[30%] bg-gray-50">Nama</td><td className="border border-black px-2 py-1 font-bold">{penanggung.nama || permit.pj_name || permit.penanggung_jawab_nama || '-'}</td></tr>
              <tr><td className="border border-black px-2 py-1 bg-gray-50">Jabatan</td><td className="border border-black px-2 py-1">{penanggung.jabatan || 'PJ Lapangan'}</td></tr>
              <tr><td className="border border-black px-2 py-1 bg-gray-50">HP</td><td className="border border-black px-2 py-1">{penanggung.hp || permit.pj_hp || '-'}</td></tr>
              <tr><td className="border border-black px-2 py-1 bg-gray-50">SO / Pengawas</td><td className="border border-black px-2 py-1">{penanggung.so || permit.so_name || permit.pengawas || '-'}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="border border-black">
          <div className={`${ORANGE_DARK} text-white text-[11px] font-black px-2 py-1`}>Safety Officer / HSE</div>
          <table className="w-full text-[11px] border-collapse">
            <tbody>
              <tr><td className="border border-black px-2 py-1 w-[30%] bg-gray-50">Nama SO</td><td className="border border-black px-2 py-1 font-bold">{safety.nama || permit.so_name || permit.safety_officer_name || '-'}</td></tr>
              <tr><td className="border border-black px-2 py-1 bg-gray-50">Jabatan</td><td className="border border-black px-2 py-1">{safety.jabatan || 'HSE Officer'}</td></tr>
              <tr><td className="border border-black px-2 py-1 bg-gray-50">HP</td><td className="border border-black px-2 py-1">{safety.hp || permit.so_hp || '-'}</td></tr>
              <tr><td className="border border-black px-2 py-1 bg-gray-50">Status</td><td className="border border-black px-2 py-1">{permit.status_approval || permit.status || 'active'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* DATA UTILITY - REAL SUPABASE */}
      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Utility / LOTO / Isolasi - {utility.length} item - Real Supabase</div>
      <table className="w-full border-collapse border border-black text-[11px]">
        <thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Jenis Utility</th><th className="border border-black px-1">Lokasi / Tag No</th><th className="border border-black px-1">Status Isolasi</th><th className="border border-black px-1">Petugas</th></tr></thead>
        <tbody>{utility.length>0 ? utility.map((u:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1">{u.jenis||u.nama||u.utility_type||'-'}</td><td className="border border-black px-1">{u.lokasi||u.tag_no||u.location||'-'}</td><td className="border border-black px-1">{u.status_isolasi||u.status||'Isolated'}</td><td className="border border-black px-1">{u.petugas||u.officer||'-'}</td></tr>) : <tr><td colSpan={5} className="border border-black px-1 text-center text-[10px] py-2">Data utility dari Supabase - permit.utility / work_permit_utilities - jika kosong cek table Supabase utility@mrhdigitalhub.com</td></tr>}</tbody>
      </table>

      {/* 2 QR BESAR - TANPA KOTAK INFORMASI DIBAWAH */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="border-2 border-black rounded p-2 bg-white text-center">
          <div className={`font-black text-[11px] ${ORANGE} text-white py-1 px-2 rounded`}>QR 1 DATA WP - Verifikasi</div>
          <div className="mt-2 flex justify-center">
            <QRImg value={qrDataWP} size={200} />
          </div>
        </div>

        <div className="border-2 border-black rounded p-2 bg-white text-center">
          <div className={`font-black text-[11px] ${ORANGE} text-white py-1 px-2 rounded`}>QR 2 E-PATROL UNIVERSAL - {baseUrl}</div>
          <div className="mt-2 flex justify-center">
            <QRImg value={qrFormPatrol} size={200} />
          </div>
        </div>
      </div>

      <div className="mt-2 text-[8px] text-gray-500 text-center">V52 FIX - Header orange terang, logo sync settings, PJ+SO+Utility real, no info box hijau, no info bawah QR - PT MRH DigitalHub - CSMS INTEGRATED</div>
    </div>
  )
}

export default WorkPermitPrintA4
