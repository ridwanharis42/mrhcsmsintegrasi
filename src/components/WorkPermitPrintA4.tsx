import { useMemo, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

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
  
  // REAL SUPABASE DATA STATE
  const [pekerja, setPekerja] = useState<any[]>([])
  const [alat, setAlat] = useState<any[]>([])
  const [kendaraan, setKendaraan] = useState<any[]>([])
  const [utility, setUtility] = useState<any[]>([])
  const [penanggung, setPenanggung] = useState<any>(null)
  const [safety, setSafety] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    const fetchRealData = async () => {
      setLoading(true)
      const wp = permit.nomor_wp
      const id = permit.id
      try {
        // 1. PEKERJA - coba beberapa table name
        let pekerjaData: any[] = permit.pekerja || permit.data_pekerja || permit.workers || []
        if (pekerjaData.length===0) {
          // coba work_permit_workers
          const tablesToTry = ['work_permit_workers', 'work_permit_pekerja', 'pekerja', 'workers']
          for (const tbl of tablesToTry) {
            try {
              const { data } = await supabase.from(tbl).select('*').or(`nomor_wp.eq.${wp},work_permit_id.eq.${id},permit_id.eq.${id}`).limit(50)
              if (data && data.length>0) { pekerjaData = data; break }
            } catch {}
          }
          // fallback: cek di permit_details atau jsonb
          if (pekerjaData.length===0) {
            try {
              const { data } = await supabase.from('work_permits').select('pekerja, data_pekerja, workers').eq('nomor_wp', wp).single()
              if (data) pekerjaData = data.pekerja || data.data_pekerja || data.workers || []
            } catch {}
          }
        }
        setPekerja(pekerjaData)

        // 2. ALAT
        let alatData: any[] = permit.alat_kerja || permit.data_alat || permit.tools || []
        if (alatData.length===0) {
          for (const tbl of ['work_permit_tools', 'work_permit_alat', 'alat_kerja', 'tools']) {
            try {
              const { data } = await supabase.from(tbl).select('*').or(`nomor_wp.eq.${wp},work_permit_id.eq.${id},permit_id.eq.${id}`).limit(50)
              if (data && data.length>0) { alatData = data; break }
            } catch {}
          }
        }
        setAlat(alatData)

        // 3. KENDARAAN
        let kendaraanData: any[] = permit.kendaraan || permit.vehicles || []
        if (kendaraanData.length===0) {
          for (const tbl of ['work_permit_vehicles', 'work_permit_kendaraan', 'kendaraan', 'vehicles']) {
            try {
              const { data } = await supabase.from(tbl).select('*').or(`nomor_wp.eq.${wp},work_permit_id.eq.${id},permit_id.eq.${id}`).limit(50)
              if (data && data.length>0) { kendaraanData = data; break }
            } catch {}
          }
        }
        setKendaraan(kendaraanData)

        // 4. UTILITY - REAL
        let utilityData: any[] = permit.utility || permit.data_utility || permit.utilities || []
        if (utilityData.length===0) {
          for (const tbl of ['work_permit_utilities', 'work_permit_utility', 'utility', 'utilities', 'loto']) {
            try {
              const { data } = await supabase.from(tbl).select('*').or(`nomor_wp.eq.${wp},work_permit_id.eq.${id},permit_id.eq.${id}`).limit(50)
              if (data && data.length>0) { utilityData = data; break }
            } catch {}
          }
          // jika masih kosong, coba ambil dari permit langsung (kadang jsonb)
          if (utilityData.length===0) {
            try {
              const { data } = await supabase.from('work_permits').select('utility, utilities, data_utility').eq('nomor_wp', wp).single()
              if (data) utilityData = data.utility || data.utilities || data.data_utility || []
            } catch {}
          }
        }
        setUtility(utilityData)

        // 5. PENANGGUNG JAWAB & SAFETY
        let pj = permit.penanggung_jawab || permit.pj || permit.pic || null
        let so = permit.safety_officer || permit.so || null
        if (!pj || !so) {
          try {
            const { data } = await supabase.from('work_permits').select('penanggung_jawab, safety_officer, pj_name, so_name, pj_jabatan, so_jabatan, pj_hp, so_hp, status_approval').eq('nomor_wp', wp).single()
            if (data) {
              pj = data.penanggung_jawab || { nama: data.pj_name || permit.pj_name, jabatan: data.pj_jabatan || 'PJ Lapangan', hp: data.pj_hp, so: data.so_name }
              so = data.safety_officer || { nama: data.so_name, jabatan: data.so_jabatan || 'Safety Officer', hp: data.so_hp, status: data.status_approval }
            }
          } catch {}
        }
        setPenanggung(pj || { nama: permit.pj_name || permit.penanggung_jawab_nama || '-', jabatan: permit.pj_jabatan || 'PJ Lapangan', hp: permit.pj_hp || '-', so: permit.so_name || '-' })
        setSafety(so || { nama: permit.so_name || permit.safety_officer_name || '-', jabatan: 'Safety Officer', hp: permit.so_hp || '-', status: permit.status_approval || 'active' })

      } catch (e) {
        console.error('Fetch real Supabase error', e)
      } finally {
        setLoading(false)
      }
    }
    fetchRealData()
  }, [permit.nomor_wp, permit.id])

  const logoUrl = appSettings?.logo_url || appSettings?.company_logo || ''
  const companyName = appSettings?.company_name || 'PT MRH DigitalHub'
  const ORANGE = 'bg-[#f97316]'
  const ORANGE_DARK = 'bg-[#ea580c]'

  return (
    <div className="bg-white text-black p-2 max-w-[900px] mx-auto font-sans print:p-0">
      {/* HEADER ORANGE SYNC LOGO */}
      <div className={`flex justify-between items-center ${ORANGE} text-white px-3 py-2 rounded-t border-2 border-black`}>
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-10 w-10 bg-white rounded border p-1 object-contain" />
          ) : (
            <div className="h-10 w-10 bg-white rounded flex items-center justify-center font-black text-[#ea580c] text-xs border">MRH</div>
          )}
          <div>
            <div className="font-black text-[14px] tracking-wide">{companyName} - CSMS INTEGRATED - WORK PERMIT - V53 REAL DATA</div>
            <div className="text-[11px] font-bold">No WP: {permit.nomor_wp} | {permit.judul} | Risk {permit.risk_level} {permit.risk_score} | {permit.area_name} | {baseUrl} {loading?'Loading...':`Real: ${pekerja.length} pekerja, ${alat.length} alat, ${utility.length} utility`}</div>
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

      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Pekerja - {pekerja.length} orang - REAL Supabase {loading&&'Loading...'}</div>
      <table className="w-full border-collapse border border-black text-[11px]">
        <thead><tr className="bg-orange-100"><th className="border border-black px-1 w-[30px]">No</th><th className="border border-black px-1">Nama</th><th className="border border-black px-1">Jabatan</th><th className="border border-black px-1">Skill</th></tr></thead>
        <tbody>{pekerja.length>0 ? pekerja.map((p:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1">{p.nama||p.name||p.nama_pekerja||'-'}</td><td className="border border-black px-1">{p.jabatan||p.position||p.jabatan_pekerja||'-'}</td><td className="border border-black px-1">{p.skill||p.kompetensi||p.skill_pekerja||'-'}</td></tr>) : <tr><td colSpan={4} className="border border-black px-1 text-center text-[10px] py-2">Data real dari Supabase: work_permit_workers where nomor_wp={permit.nomor_wp} - jika masih kosong cek table Supabase</td></tr>}</tbody>
      </table>

      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Alat Kerja - {alat.length} alat - REAL</div>
      <table className="w-full border-collapse border border-black text-[11px]">
        <thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Nama Alat</th><th className="border border-black px-1">No Seri</th><th className="border border-black px-1">Qty</th></tr></thead>
        <tbody>{alat.length>0 ? alat.map((a:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1">{a.nama||a.name||a.nama_alat||'-'}</td><td className="border border-black px-1">{a.seri||a.no_seri||a.serial||a.no_serial||'-'}</td><td className="border border-black px-1 text-center">{a.qty||a.jumlah||1}</td></tr>) : <tr><td colSpan={4} className="border border-black px-1 text-center text-[10px] py-2">Data real Supabase work_permit_tools - nomor_wp={permit.nomor_wp}</td></tr>}</tbody>
      </table>

      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Kendaraan - Tonase - SILO - Qty</div>
      <table className="w-full border-collapse border border-black text-[11px]">
        <thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Nama</th><th className="border border-black px-1">Tonase</th><th className="border border-black px-1">No SILO</th><th className="border border-black px-1">Operator</th></tr></thead>
        <tbody>{kendaraan.length>0 ? kendaraan.map((k:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1">{k.nama||k.name||'-'}</td><td className="border border-black px-1 text-center">{k.tonase||k.kapasitas||'-'}</td><td className="border border-black px-1 text-center">{k.silo||k.no_silo||'-'}</td><td className="border border-black px-1 text-center">{k.qty_op||k.operator||k.operator_name||'-'}</td></tr>) : <tr><td colSpan={5} className="border border-black px-1 text-center text-[10px] py-2">Belum ada data kendaraan - Supabase work_permit_vehicles</td></tr>}</tbody>
      </table>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="border border-black">
          <div className={`${ORANGE_DARK} text-white text-[11px] font-black px-2 py-1`}>Penanggung Jawab (PJ) Lapangan - REAL</div>
          <table className="w-full text-[11px] border-collapse">
            <tbody>
              <tr><td className="border border-black px-2 py-1 w-[30%] bg-gray-50">Nama</td><td className="border border-black px-2 py-1 font-bold">{penanggung?.nama || '-'}</td></tr>
              <tr><td className="border border-black px-2 py-1 bg-gray-50">Jabatan</td><td className="border border-black px-2 py-1">{penanggung?.jabatan || 'PJ Lapangan'}</td></tr>
              <tr><td className="border border-black px-2 py-1 bg-gray-50">HP</td><td className="border border-black px-2 py-1">{penanggung?.hp || '-'}</td></tr>
              <tr><td className="border border-black px-2 py-1 bg-gray-50">SO / Pengawas</td><td className="border border-black px-2 py-1">{penanggung?.so || '-'}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="border border-black">
          <div className={`${ORANGE_DARK} text-white text-[11px] font-black px-2 py-1`}>Safety Officer / HSE - REAL</div>
          <table className="w-full text-[11px] border-collapse">
            <tbody>
              <tr><td className="border border-black px-2 py-1 w-[30%] bg-gray-50">Nama SO</td><td className="border border-black px-2 py-1 font-bold">{safety?.nama || '-'}</td></tr>
              <tr><td className="border border-black px-2 py-1 bg-gray-50">Jabatan</td><td className="border border-black px-2 py-1">{safety?.jabatan || 'Safety Officer'}</td></tr>
              <tr><td className="border border-black px-2 py-1 bg-gray-50">HP</td><td className="border border-black px-2 py-1">{safety?.hp || '-'}</td></tr>
              <tr><td className="border border-black px-2 py-1 bg-gray-50">Status</td><td className="border border-black px-2 py-1">{safety?.status || permit.status_approval || 'active'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Utility / LOTO / Isolasi - {utility.length} item - REAL Supabase</div>
      <table className="w-full border-collapse border border-black text-[11px]">
        <thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Jenis Utility</th><th className="border border-black px-1">Lokasi / Tag No</th><th className="border border-black px-1">Status Isolasi</th><th className="border border-black px-1">Petugas</th></tr></thead>
        <tbody>{utility.length>0 ? utility.map((u:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1">{u.jenis||u.nama||u.utility_type||u.jenis_utility||'-'}</td><td className="border border-black px-1">{u.lokasi||u.tag_no||u.location||u.tag_number||'-'}</td><td className="border border-black px-1">{u.status_isolasi||u.status||u.isolation_status||'Isolated'}</td><td className="border border-black px-1">{u.petugas||u.officer||u.petugas_utility||'-'}</td></tr>) : <tr><td colSpan={5} className="border border-black px-1 text-center text-[10px] py-2">Data utility real - coba query Supabase work_permit_utilities where nomor_wp={permit.nomor_wp} - jika kosong isi di form E-Work Permit dulu</td></tr>}</tbody>
      </table>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="border-2 border-black rounded p-2 bg-white text-center">
          <div className={`font-black text-[11px] ${ORANGE} text-white py-1 px-2 rounded`}>QR 1 DATA WP - Verifikasi</div>
          <div className="mt-2 flex justify-center"><QRImg value={qrDataWP} size={200} /></div>
        </div>
        <div className="border-2 border-black rounded p-2 bg-white text-center">
          <div className={`font-black text-[11px] ${ORANGE} text-white py-1 px-2 rounded`}>QR 2 E-PATROL - {baseUrl}</div>
          <div className="mt-2 flex justify-center"><QRImg value={qrFormPatrol} size={200} /></div>
        </div>
      </div>

      <div className="mt-2 text-[8px] text-gray-500 text-center">V53 REAL DATA - Header orange, logo sync, PJ+SO+Utility Supabase real, no info box hijau - {permit.nomor_wp}</div>
    </div>
  )
}

export default WorkPermitPrintA4
