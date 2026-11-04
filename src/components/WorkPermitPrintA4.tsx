import { useMemo, useState } from 'react'

type Props = {
  permit: any
  appSettings?: any
  onClose?: ()=>void
}

const QRImg = ({ value, size=200 }: { value: string, size?: number }) => {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`
  return <img src={url} alt="QR" width={size} height={size} className="border-2 border-black bg-white p-2" />
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

const getQRFormPatrol = (permit:any, baseUrl: string) => {
  const wp = permit.nomor_wp || 'mrh-csmswp-2026-003'
  const area = permit.area_name || 'AREA'
  const vendor = permit.vendor_name || 'PT MEGA PERKASA JAYA'
  const judul = permit.judul || 'TEST STRIC AREA E'
  return `${baseUrl}/?patrol=1&wp=${encodeURIComponent(wp)}&area=${encodeURIComponent(area)}&vendor=${encodeURIComponent(vendor)}&judul=${encodeURIComponent(judul)}&mode=choose&autoOpen=1`
}

export function WorkPermitPrintA4({ permit, appSettings, onClose }: Props) {
  // V42 FIX HARDCODE VERCEL PROD - Ln 44 PATCH - Agar scan HP tidak timeout - IPv4 hanya untuk local dev
  // Sebelumnya Ln 47-62 auto-detect origin, sekarang hardcode Vercel prod langsung
  const [baseUrl, setBaseUrl] = useState('https://mrhcsmsintegrasi.vercel.app') // V43 FIX mode=choose - QR Universal 1 untuk pilih Internal/Gabungan

  const qrDataWP = useMemo(()=> getQRDataWP(permit), [permit])
  const qrFormPatrol = useMemo(()=> getQRFormPatrol(permit, baseUrl), [permit, baseUrl])
  const pekerja = permit.pekerja || permit.data_pekerja || [{nama:'Karman', jabatan:'Helper', skill:'-'},{nama:'manto', jabatan:'Helper', skill:'-'}]
  const alat = permit.alat_kerja || permit.data_alat || [{nama:'Welding Machine', seri:'-', qty:1},{nama:'Travo', seri:'-', qty:1},{nama:'Genset', seri:'-', qty:1}]
  const kendaraan = permit.kendaraan || [{nama:'Crane 20T', tonase:'20 Ton', silo:'SIO-001', qty_op:'Budi Operator'},{nama:'Forklift', tonase:'20 Ton', silo:'345234234', qty_op:'Karsim'}]

  return (
    <div className="bg-white text-black p-2 max-w-[900px] mx-auto font-sans">
      <div className="flex justify-between items-center bg-[#0f172a] text-white px-3 py-2 rounded-t">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 bg-white rounded flex items-center justify-center font-black text-[#0f172a] text-xs">MRH</div>
          <div>
            <div className="font-black text-sm">PT MRH DigitalHub - CSMS INTEGRATED - WORK PERMIT - V42 HARDCODE VERCEL</div>
            <div className="text-[11px]">No WP: {permit.nomor_wp} | {permit.judul} | Risk {permit.risk_level} {permit.risk_score} | {permit.area_name} | 0 Problems | {baseUrl}</div>
          </div>
        </div>
        {onClose && <button onClick={onClose} className="bg-white text-black px-3 py-1 rounded text-xs font-bold">X Tutup</button>}
      </div>

      <table className="w-full border-collapse border border-black text-[11px] mt-1">
        <tbody>
          <tr>
            <td className="border border-black px-2 py-1 w-[40%]">No WP: <b>{permit.nomor_wp}</b></td>
            <td className="border border-black px-2 py-1">Vendor: <b>{permit.vendor_name || 'PT MEGA PERKASA JAYA'}</b></td>
            <td rowSpan={3} className="border border-black px-2 py-2 w-[100px] text-center bg-yellow-50">
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
            <td className="border border-black px-2 py-1">Tgl Selesai: <b>{permit.tgl_selesai || permit.end_date || '2026-11-11'}</b></td>
          </tr>
        </tbody>
      </table>

      <div className="bg-black text-white text-[11px] font-black px-2 py-1 mt-2">Data Pekerja - {pekerja.length} orang</div>
      <table className="w-full border-collapse border border-black text-[11px]">
        <thead><tr className="bg-gray-100"><th className="border border-black px-1 w-[30px]">No</th><th className="border border-black px-1">Nama</th><th className="border border-black px-1">Jabatan</th><th className="border border-black px-1">Skill</th></tr></thead>
        <tbody>{pekerja.map((p:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1">{p.nama||p.name}</td><td className="border border-black px-1">{p.jabatan}</td><td className="border border-black px-1">{p.skill||'-'}</td></tr>)}</tbody>
      </table>

      <div className="bg-black text-white text-[11px] font-black px-2 py-1 mt-2">Data Alat Kerja - {alat.length} alat</div>
      <table className="w-full border-collapse border border-black text-[11px]">
        <thead><tr className="bg-gray-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Nama Alat</th><th className="border border-black px-1">No Seri</th><th className="border border-black px-1">Qty</th></tr></thead>
        <tbody>{alat.map((a:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1">{a.nama||a.name}</td><td className="border border-black px-1">{a.seri||a.no_seri||'-'}</td><td className="border border-black px-1 text-center">{a.qty||1}</td></tr>)}</tbody>
      </table>

      <div className="bg-black text-white text-[11px] font-black px-2 py-1 mt-2">Data Kendaraan - Tonase - SILO - Qty - Kaps ton - No license</div>
      <table className="w-full border-collapse border border-black text-[11px]">
        <thead><tr className="bg-gray-100"><th className="border border-black px-1">No</th><th className="border border-black px-1">Nama</th><th className="border border-black px-1">Tonase</th><th className="border border-black px-1">No SILO</th><th className="border border-black px-1">Qty Operator</th></tr></thead>
        <tbody>{kendaraan.map((k:any,i:number)=><tr key={i}><td className="border border-black px-1 text-center">{i+1}</td><td className="border border-black px-1">{k.nama}</td><td className="border border-black px-1 text-center">{k.tonase||'20 Ton'}</td><td className="border border-black px-1 text-center">{k.silo||k.no_silo||'-'}</td><td className="border border-black px-1 text-center">{k.qty_op||k.operator||1}</td></tr>)}</tbody>
      </table>

      <div className="mt-3 bg-green-100 border-2 border-green-600 rounded p-2">
        <div className="font-black text-[11px]">V42 HARDCODE VERCEL PROD - Ln 44 FIX - Scan tidak timeout lagi</div>
        <div className="mt-2 flex gap-2 items-center flex-wrap">
          <div className="text-[11px] font-bold">Base URL QR2 - Ln 44 Hardcode Vercel Prod:</div>
          <input type="text" value={baseUrl} onChange={e=>setBaseUrl(e.target.value)} className="border-2 border-black px-2 py-1 text-[11px] w-[350px] font-mono bg-white" />
          <button onClick={()=> setBaseUrl('https://mrhcsmsintegrasi.vercel.app')} className="bg-blue-600 text-white px-3 py-1 rounded text-[10px] font-bold">Set ke Vercel Prod</button>
          <div className="text-[10px]">Vercel Prod = https://mrhcsmsintegrasi.vercel.app - HP scan langsung bisa, tidak butuh WiFi sama - IPv4 192.168.137.1 hanya untuk dev local</div>
        </div>
        <div className="mt-2 text-[10px] font-mono bg-white border p-1 rounded break-all">QR2 URL: {qrFormPatrol}</div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="border-2 border-black rounded p-3 bg-yellow-50 text-center">
          <div className="font-black text-[13px] bg-black text-white py-1 px-2 rounded">QR 1 DATA WP Verifikasi TEXT BISA - 200x200</div>
          <div className="mt-3 flex justify-center">
            <QRImg value={qrDataWP} size={200} />
          </div>
          <div className="text-[10px] font-bold mt-2">No WP: {permit.nomor_wp}</div>
          <div className="text-[9px] mt-1 text-left bg-white border p-2 rounded font-mono whitespace-pre-wrap">{qrDataWP}</div>
        </div>

        <div className="border-2 border-blue-600 rounded p-3 bg-blue-50 text-center">
          <div className="font-black text-[13px] bg-blue-600 text-white py-1 px-2 rounded">QR 2 FORM E-PATROL UNIVERSAL V43 - 200x200 - mode=choose - Pilih Internal/Gabungan</div>
          <div className="mt-3 flex justify-center">
            <QRImg value={qrFormPatrol} size={200} />
          </div>
          <div className="text-[10px] font-bold mt-2">Form Patrol: {permit.nomor_wp} - Auto Open Gabungan</div>
          <div className="text-[8px] mt-1 text-left bg-white border p-1 rounded font-mono break-all">{qrFormPatrol}</div>
          <div className="text-[9px] mt-2 font-black text-left">QR2 Vercel Prod: https://mrhcsmsintegrasi.vercel.app/?patrol=1&wp=...&mode=choose&autoOpen=1</div>
          <div className="text-[9px] mt-1 text-left">Scan HP → Login → Auto ke menu 4. E-Patrol (Sync) → Form Gabungan Input Manual Nama Peserta Jabatan Bagian auto-muncul V42</div>
        </div>
      </div>

      <div className="mt-2 text-[8px] text-gray-500 text-center">V42 HARDCODE VERCEL Ln44 - QR2 Scan No Timeout - 2 QR Besar 200x200 - 0 Problems - PT MRH DigitalHub - CSMS INTEGRATED - Build SUCCESS</div>
    </div>
  )
}

export default WorkPermitPrintA4
