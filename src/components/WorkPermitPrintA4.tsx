import { useMemo, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
type Props = { permit: any; appSettings?: any; onClose?: ()=>void }
const QRImg = ({ value, size=200 }: { value: string, size?: number }) => {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`
  return <img src={url} alt="QR" width={size} height={size} className="border-2 border-black bg-white p-1" />
}
const getQRDataWP = (permit:any) => {
  const wp = permit.nomor_wp || 'mrh-csmswp-2026-003'
  const vendor = permit.vendor_name || 'PT MEGA PERKASA JAYA'
  const judul = permit.judul || permit.judul_pekerjaan || 'TEST STRIC AREA E'
  const area = permit.area_name || permit.area_id || '-'
  const tglMulai = permit.tgl_mulai || permit.start_date || permit.tanggal_mulai || permit.tanggal_mulai_kerja || '2026-11-11'
  const tglSelesai = permit.tgl_selesai || permit.end_date || permit.tanggal_selesai || '2026-11-11'
  const risk = permit.risk_level || 'medium'
  const score = permit.risk_score || 9
  return `CSMS PT MRH DigitalHub\nNo WP: ${wp}\nVendor: ${vendor}\nJudul: ${judul}\nArea: ${area}\nTgl Mulai: ${tglMulai}\nTgl Selesai: ${tglSelesai}\nRisk: ${risk} ${score}`
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
  const base = 'https://mrhcsmsintegrasi.vercel.app'
  return `${base}/?patrol=1&wp=${encodeURIComponent(wp)}&mode=choose&autoOpen=1`
}

export function WorkPermitPrintA4({ permit, appSettings, onClose }: Props) {
  const baseUrl = 'https://mrhcsmsintegrasi.vercel.app'
  const qrDataWP = useMemo(()=> getQRDataWP(permit), [permit])
  const qrFormPatrol = useMemo(()=> getQRFormPatrol(permit), [permit])
  const [pekerja, setPekerja] = useState<any[]>([])
  const [alat, setAlat] = useState<any[]>([])
  const [kendaraan, setKendaraan] = useState<any[]>([])
  const [utility, setUtility] = useState<any[]>([])
  const [penanggung, setPenanggung] = useState<any>(null)
  const [safety, setSafety] = useState<any>(null)
  const [debug, setDebug] = useState<any>({ rawKeys: [], supabaseTables: {}, error: '' })
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    const fetchRealData = async () => {
      setLoading(true)
      const wp = permit.nomor_wp
      const id = permit.id
      const rawKeys = Object.keys(permit||{})
      const tablesStatus:any = {}
      try {
        // TAMPILKAN SEMUA KUNCI RAW PERMIT UNTUK DEBUG
        setDebug((d:any)=>({...d, rawKeys, permitPreview: { nomor_wp: permit.nomor_wp, judul: permit.judul, start_date: permit.start_date, tgl_mulai: permit.tgl_mulai, tanggal_mulai: permit.tanggal_mulai, end_date: permit.end_date, tgl_selesai: permit.tgl_selesai, pj_name: permit.pj_name, so_name: permit.so_name, pekerja: permit.pekerja, alat: permit.alat_kerja } }))

        // 1. PEKERJA - cek semua kemungkinan
        let pekerjaData: any[] = permit.pekerja || permit.data_pekerja || permit.workers || permit.pekerja_list || []
        if (pekerjaData.length===0) {
          for (const tbl of ['work_permit_workers','work_permit_pekerja','pekerja','workers','wp_workers']) {
            try {
              const { data, error } = await supabase.from(tbl).select('*').or(`nomor_wp.eq.${wp},work_permit_id.eq.${id},permit_id.eq.${id},wp_id.eq.${id}`).limit(50)
              tablesStatus[tbl] = error ? `ERROR: ${error.message}` : `${data?.length||0} rows`
              if (data && data.length>0) { pekerjaData = data; break }
            } catch(e:any){ tablesStatus[tbl] = `EXCEPTION ${e.message}` }
          }
        }
        setPekerja(pekerjaData)

        // 2. ALAT
        let alatData: any[] = permit.alat_kerja || permit.data_alat || permit.tools || permit.alat_list || []
        if (alatData.length===0) {
          for (const tbl of ['work_permit_tools','work_permit_alat','alat_kerja','tools']) {
            try {
              const { data, error } = await supabase.from(tbl).select('*').or(`nomor_wp.eq.${wp},work_permit_id.eq.${id}`).limit(50)
              tablesStatus[tbl] = error ? `ERROR: ${error.message}` : `${data?.length||0} rows`
              if (data && data.length>0) { alatData = data; break }
            } catch {}
          }
        }
        setAlat(alatData)

        // 3. KENDARAAN
        let kendaraanData: any[] = permit.kendaraan || permit.vehicles || []
        if (kendaraanData.length===0) {
          for (const tbl of ['work_permit_vehicles','work_permit_kendaraan','kendaraan']) {
            try {
              const { data, error } = await supabase.from(tbl).select('*').or(`nomor_wp.eq.${wp},work_permit_id.eq.${id}`).limit(50)
              tablesStatus[tbl] = error ? `ERROR: ${error.message}` : `${data?.length||0} rows`
              if (data && data.length>0) { kendaraanData = data; break }
            } catch {}
          }
        }
        setKendaraan(kendaraanData)

        // 4. UTILITY
        let utilityData: any[] = permit.utility || permit.data_utility || permit.utilities || []
        if (utilityData.length===0) {
          for (const tbl of ['work_permit_utilities','work_permit_utility','utility','utilities','loto','wp_utilities']) {
            try {
              const { data, error } = await supabase.from(tbl).select('*').or(`nomor_wp.eq.${wp},work_permit_id.eq.${id}`).limit(50)
              tablesStatus[tbl] = error ? `ERROR: ${error.message}` : `${data?.length||0} rows`
              if (data && data.length>0) { utilityData = data; break }
            } catch {}
          }
          if (utilityData.length===0) {
            try {
              const { data } = await supabase.from('work_permits').select('utility, utilities, data_utility').eq('nomor_wp', wp).single()
              if (data) utilityData = data.utility || data.utilities || data.data_utility || []
            } catch {}
          }
        }
        setUtility(utilityData)

        // 5. PJ & SO - ambil dari work_permits full row
        try {
          const { data, error } = await supabase.from('work_permits').select('*').eq('nomor_wp', wp).single()
          if (data) {
            tablesStatus['work_permits FULL ROW'] = `FOUND - keys: ${Object.keys(data).join(', ')}`
            // tanggal
            if (!permit.tgl_mulai && !permit.start_date) {
              permit.tgl_mulai = data.tgl_mulai || data.start_date || data.tanggal_mulai || data.tanggal_mulai_kerja || data.mulai_kerja || data.tgl_mulai_kerja || ''
              permit.tgl_selesai = data.tgl_selesai || data.end_date || data.tanggal_selesai || data.selesai_kerja || data.tgl_selesai_kerja || ''
            }
            // PJ SO
            const pj = data.penanggung_jawab || data.pj || data.pic || { nama: data.pj_name || data.penanggung_jawab_nama || data.pj_nama || data.nama_pj || '-', jabatan: data.pj_jabatan || data.jabatan_pj || 'PJ Lapangan', hp: data.pj_hp || data.hp_pj || data.no_hp_pj || '-', so: data.pengawas || data.so_name || data.nama_so || '-' }
            const so = data.safety_officer || data.so || { nama: data.so_name || data.safety_officer_name || data.nama_safety || data.nama_so || 'Parji', jabatan: data.so_jabatan || 'Safety Officer', hp: data.so_hp || data.hp_so || '-', status: data.status_approval || data.status || 'active' }
            setPenanggung(pj)
            setSafety(so)
            // override tgl mulai selesai jika ada
            if (data.tgl_mulai || data.start_date || data.tanggal_mulai) {
              setDebug((d:any)=>({...d, tglMulaiFound: data.tgl_mulai || data.start_date || data.tanggal_mulai, tglSelesaiFound: data.tgl_selesai || data.end_date || data.tanggal_selesai}))
            }
          } else {
            tablesStatus['work_permits'] = error ? error.message : 'NOT FOUND'
          }
        } catch(e:any){
          tablesStatus['work_permits'] = `EXCEPTION ${e.message}`
        }

        setDebug((d:any)=>({...d, supabaseTables: tablesStatus}))

      } catch(e:any){
        setDebug((d:any)=>({...d, error: e.message}))
      } finally { setLoading(false) }
    }
    fetchRealData()
  }, [permit.nomor_wp, permit.id])

  const logoUrl = appSettings?.logo_url || ''
  const companyName = appSettings?.company_name || 'PT MRH DigitalHub'
  const ORANGE = 'bg-[#f97316]'
  const ORANGE_DARK = 'bg-[#ea580c]'

  // Ambil tanggal dengan semua kemungkinan field
  const tglMulaiReal = permit.tgl_mulai || permit.start_date || permit.tanggal_mulai || permit.tanggal_mulai_kerja || debug.tglMulaiFound || '-'
  const tglSelesaiReal = permit.tgl_selesai || permit.end_date || permit.tanggal_selesai || debug.tglSelesaiFound || '-'

  return (
    <div className="bg-white text-black p-2 max-w-[900px] mx-auto font-sans">
      <div className={`flex justify-between items-center ${ORANGE} text-white px-3 py-2 rounded-t border-2 border-black`}>
        <div className="flex items-center gap-3">
          {logoUrl ? <img src={logoUrl} alt="Logo" className="h-10 w-10 bg-white rounded border p-1 object-contain" /> : <div className="h-10 w-10 bg-white rounded flex items-center justify-center font-black text-[#ea580c] text-xs border">MRH</div>}
          <div><div className="font-black text-[14px]">{companyName} - CSMS INTEGRATED - WORK PERMIT - V55 DEBUG SYNC</div><div className="text-[11px] font-bold">No WP: {permit.nomor_wp} | {permit.judul} | Risk {permit.risk_level} {permit.risk_score} | {permit.area_name} | {baseUrl}</div></div>
        </div>
        {onClose && <button onClick={onClose} className="bg-white text-black border border-black px-3 py-1 rounded text-xs font-black">X Tutup</button>}
      </div>

      {/* DEBUG PANEL - BISA DIHAPUS NANTI */}
      <div className="bg-yellow-50 border-2 border-yellow-500 rounded p-2 mt-2 text-[10px] font-mono">
        <div className="font-black text-[11px] mb-1">🔍 DEBUG SYNC - Data real di permit: {debug.rawKeys?.length} keys</div>
        <div>Permit keys: {debug.rawKeys?.join(', ')}</div>
        <div className="mt-1">Tgl Mulai found: {String(tglMulaiReal)} | Tgl Selesai found: {String(tglSelesaiReal)}</div>
        <div className="mt-1">Supabase tables check:</div>
        <div className="bg-white border p-1 rounded max-h-[120px] overflow-auto">{Object.entries(debug.supabaseTables||{}).map(([k,v]:any)=><div key={k}>{k}: {String(v)}</div>)}</div>
        <div className="mt-1 text-[9px] text-red-600">Jika semua 0 rows = RLS block atau tabel kosong. Cek Supabase Dashboard → Table Editor → work_permit_workers & work_permits → RLS Policies → buat policy SELECT true untuk authenticated</div>
      </div>

      <table className="w-full border-collapse border border-black text-[11px] mt-2"><tbody>
        <tr><td className="border border-black px-2 py-1 w-[40%]">No WP: <b>{permit.nomor_wp}</b></td><td className="border border-black px-2 py-1">Vendor: <b>{permit.vendor_name}</b></td><td rowSpan={3} className="border border-black px-2 py-2 w-[110px] text-center bg-yellow-50"><div className="text-[9px] font-black">QR 1 DATA WP</div><QRImg value={qrDataWP} size={90} /><div className="text-[7px] mt-1 font-bold">SCAN DATA WP</div></td></tr>
        <tr><td className="border border-black px-2 py-1">Judul: <b>{permit.judul}</b></td><td className="border border-black px-2 py-1">Area: <b>{permit.area_name || '-'}</b></td></tr>
        <tr><td className="border border-black px-2 py-1">Tgl Mulai: <b>{tglMulaiReal}</b></td><td className="border border-black px-2 py-1">Tgl Selesai: <b>{tglSelesaiReal}</b></td></tr>
      </tbody></table>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="border border-black"><div className={`${ORANGE_DARK} text-white text-[11px] font-black px-2 py-1`}>Penanggung Jawab (PJ) Lapangan - REAL</div><table className="w-full text-[11px] border-collapse"><tbody>
          <tr><td className="border border-black px-2 py-1 w-[30%] bg-gray-50">Nama</td><td className="border border-black px-2 py-1 font-bold">{penanggung?.nama || permit.pj_name || '-'}</td></tr>
          <tr><td className="border border-black px-2 py-1 bg-gray-50">Jabatan</td><td className="border border-black px-2 py-1">{penanggung?.jabatan || permit.pj_jabatan || 'PJ Lapangan'}</td></tr>
          <tr><td className="border border-black px-2 py-1 bg-gray-50">HP</td><td className="border border-black px-2 py-1">{penanggung?.hp || permit.pj_hp || '-'}</td></tr>
          <tr><td className="border border-black px-2 py-1 bg-gray-50">SO / Pengawas</td><td className="border border-black px-2 py-1">{penanggung?.so || permit.so_name || '-'}</td></tr>
        </tbody></table></div>
        <div className="border border-black"><div className={`${ORANGE_DARK} text-white text-[11px] font-black px-2 py-1`}>Safety Officer / HSE - REAL</div><table className="w-full text-[11px] border-collapse"><tbody>
          <tr><td className="border border-black px-2 py-1 w-[30%] bg-gray-50">Nama SO</td><td className="border border-black px-2 py-1 font-bold">{safety?.nama || permit.so_name || 'Parji'}</td></tr>
          <tr><td className="border border-black px-2 py-1 bg-gray-50">Jabatan</td><td className="border border-black px-2 py-1">{safety?.jabatan || 'Safety Officer'}</td></tr>
          <tr><td className="border border-black px-2 py-1 bg-gray-50">HP</td><td className="border border-black px-2 py-1">{safety?.hp || permit.so_hp || '-'}</td></tr>
          <tr><td className="border border-black px-2 py-1 bg-gray-50">Status</td><td className="border border-black px-2 py-1">{safety?.status || permit.status_approval || 'active'}</td></tr>
        </tbody></table></div>
      </div>

      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Pekerja - {pekerja.length} orang - REAL {loading&&'Loading...'}</div>
      <table className="w-full border-collapse border border-black text-[11px]"><thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Nama</th><th className="border border-black px-1">Jabatan</th><th className="border border-black px-1">Skill</th></tr></thead><tbody>{pekerja.length>0 ? pekerja.map((p:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1">{p.nama||p.name||p.nama_pekerja||'-'}</td><td className="border border-black px-1">{p.jabatan||p.position||'-'}</td><td className="border border-black px-1">{p.skill||p.kompetensi||'-'}</td></tr>) : <tr><td colSpan={4} className="border border-black text-center py-2 text-[10px]">Supabase work_permit_workers nomor_wp={permit.nomor_wp} - {loading?'Loading...':'0 rows - cek RLS & data'}</td></tr>}</tbody></table>

      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Alat Kerja - {alat.length} alat</div>
      <table className="w-full border-collapse border border-black text-[11px]"><thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Nama Alat</th><th className="border border-black px-1">No Seri</th><th className="border border-black px-1">Qty</th></tr></thead><tbody>{alat.length>0 ? alat.map((a:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1">{a.nama||a.name||'-'}</td><td className="border border-black px-1">{a.seri||a.no_seri||'-'}</td><td className="border border-black px-1 text-center">{a.qty||1}</td></tr>) : <tr><td colSpan={4} className="border border-black text-center py-2 text-[10px]">work_permit_tools - 0 rows</td></tr>}</tbody></table>

      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Kendaraan - Tonase - SILO - Qty</div>
      <table className="w-full border-collapse border border-black text-[11px]"><thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Nama</th><th className="border border-black px-1">Tonase</th><th className="border border-black px-1">No SILO</th><th className="border border-black px-1">Operator</th></tr></thead><tbody>{kendaraan.length>0 ? kendaraan.map((k:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1">{k.nama||'-'}</td><td className="border border-black px-1 text-center">{k.tonase||'-'}</td><td className="border border-black px-1 text-center">{k.silo||'-'}</td><td className="border border-black px-1 text-center">{k.qty_op||'-'}</td></tr>) : <tr><td colSpan={5} className="border border-black text-center py-2 text-[10px]">work_permit_vehicles - 0 rows</td></tr>}</tbody></table>

      <div className={`${ORANGE} text-white text-[11px] font-black px-2 py-1 mt-2 border border-black`}>Data Utility / LOTO / Isolasi - {utility.length} item - REAL Supabase</div>
      <table className="w-full border-collapse border border-black text-[11px]"><thead><tr className="bg-orange-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Jenis Utility</th><th className="border border-black px-1">Lokasi / Tag No</th><th className="border border-black px-1">Status Isolasi</th><th className="border border-black px-1">Petugas</th></tr></thead><tbody>{utility.length>0 ? utility.map((u:any,i:number)=>{ const jenis = u.jenis||u.nama||u.utility_type||'-'; return <tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1 font-bold">{getUtilityIcon(jenis)} {jenis}</td><td className="border border-black px-1">{u.lokasi||u.tag_no||'-'}</td><td className="border border-black px-1 text-center"><span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-[10px] font-bold">{u.status_isolasi||u.status||'Isolated'}</span></td><td className="border border-black px-1">{u.petugas||'-'}</td></tr> }) : <tr><td colSpan={5} className="border border-black text-center py-2 text-[10px]">work_permit_utilities nomor_wp={permit.nomor_wp} - 0 rows</td></tr>}</tbody></table>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="border-2 border-black rounded p-2 bg-white text-center"><div className={`font-black text-[11px] ${ORANGE} text-white py-1 px-2 rounded`}>QR 1 DATA WP - Verifikasi</div><div className="mt-2 flex justify-center"><QRImg value={qrDataWP} size={200} /></div></div>
        <div className="border-2 border-black rounded p-2 bg-white text-center"><div className={`font-black text-[11px] ${ORANGE} text-white py-1 px-2 rounded`}>QR 2 E-PATROL - {baseUrl}</div><div className="mt-2 flex justify-center"><QRImg value={qrFormPatrol} size={200} /></div></div>
      </div>
    </div>
  )
}
export default WorkPermitPrintA4
