
// @ts-nocheck
// V43 Mobile Entry - QR Patrol Universal Choose Mode - PT MRH DigitalHub
// No 1-5 Flow: 1 QR Universal, 2 Landing Pilih Internal/Gabungan, 3 Input Peserta, 4 Temuan 4 Elemen, 5 Simpan & Kirim -> Supabase
import { useState, useEffect } from 'react'

export default function PatrolEntryMobile({ initialParams, permits, onChoose, profile }){
  const wp = initialParams?.wp || localStorage.getItem('patrol_wp_filter') || 'mrh-csmswp-2026-003'
  const area = initialParams?.area || 'Area E'
  const vendor = initialParams?.vendor || 'PT MEGA PERKASA JAYA'
  const judul = initialParams?.judul || 'TEST STRIC AREA E'
  const today = new Date().toISOString().slice(0,10)

  const [nama, setNama] = useState('') // V43 FIX - Nama peserta patrol TEXT kosong, bukan email - biar bisa beda2 nama di lapangan
  const [jabatan, setJabatan] = useState('Helper')
  const [bagian, setBagian] = useState('Area E')
  const [tglPatrol, setTglPatrol] = useState(today)
  const [sessionId, setSessionId] = useState('')
  const [pesertaList, setPesertaList] = useState<any[]>([])

  useEffect(()=>{
    const sid = `${wp}_${today}`
    setSessionId(sid)
    const saved = localStorage.getItem(`patrol_session_${sid}`)
    if(saved){
      try{ setPesertaList(JSON.parse(saved)) }catch{}
    }
  },[wp])

  const handleJoin = (mode:'internal'|'gabungan') => {
    if(!nama || nama.trim().length<2){
      alert('Nama Peserta Patrol wajib diisi text (bukan email)')
      return
    }
    if(nama.includes('@')){
      alert('Jangan isi email - Isi Nama Peserta Patrol text contoh: Budi Owner Area')
      return
    }
    const peserta = { nama: nama.trim(), jabatan, bagian, tglPatrol, wp, joinedAt: new Date().toISOString() }
    const list = [...pesertaList]
    if(!list.find(p=>p.nama.toLowerCase()===nama.trim().toLowerCase())){
      list.push(peserta)
    }
    setPesertaList(list)
    localStorage.setItem(`patrol_session_${sessionId}`, JSON.stringify(list))
    localStorage.setItem('patrol_wp_filter', wp)
    localStorage.setItem('patrol_mode', mode)
    localStorage.setItem('patrol_last_peserta', JSON.stringify(peserta))
    localStorage.setItem('patrol_session_id', sessionId)
    localStorage.setItem('patrol_tgl', tglPatrol)
    // pending untuk EPatrolSync
    localStorage.setItem('pendingPatrol', JSON.stringify({wp, mode, autoOpen: '1', sessionId, timestamp: Date.now()}))
    onChoose(mode, sessionId, peserta)
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-0 flex flex-col">
      {/* Header Mobile */}
      <div className="bg-[#0f172a] text-white p-4 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white rounded flex items-center justify-center font-black text-[#0f172a]">MRH</div>
          <div>
            <div className="font-black text-[14px]">CSMS INTEGRATED - E-Patrol</div>
            <div className="text-[11px] opacity-80">PT MRH DigitalHub - Scan QR Gabungan</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-[480px] mx-auto w-full">
        {/* WP Card */}
        <div className="bg-white rounded-xl border-2 border-black p-3">
          <div className="font-black text-[13px]">No WP: {wp}</div>
          <div className="text-[11px] mt-1"><b>Judul:</b> {judul}</div>
          <div className="text-[11px]"><b>Area:</b> {area} | <b>Vendor:</b> {vendor}</div>
          <div className="text-[10px] mt-2 bg-yellow-100 border p-1 rounded">Session ID: {sessionId} - Peserta sudah gabung: {pesertaList.length} orang</div>
        </div>

        {/* Form Peserta Patrol */}
        <div className="bg-white rounded-xl border p-4">
          <div className="font-black text-[13px] mb-3">📋 Input Data Peserta Patrol - Wajib</div>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold">Nama Peserta Patrol</label>
              <input value={nama} onChange={e=>setNama(e.target.value)} placeholder="Contoh: Budi Owner Area E - WAJIB isi nama text, bukan email" className="w-full border-2 border-black rounded-lg px-3 py-2 text-[14px] mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold">Jabatan</label>
                <select value={jabatan} onChange={e=>setJabatan(e.target.value)} className="w-full border-2 border-black rounded-lg px-2 py-2 text-[13px] mt-1">
                  <option>Helper</option>
                  <option>Operator</option>
                  <option>Technician</option>
                  <option>Safety Officer</option>
                  <option>HSE Officer</option>
                  <option>Owner Area E</option>
                  <option>Vendor Safety</option>
                  <option>Supervisor</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold">Bagian</label>
                <select value={bagian} onChange={e=>setBagian(e.target.value)} className="w-full border-2 border-black rounded-lg px-2 py-2 text-[13px] mt-1">
                  <option>Area E</option>
                  <option>CSMS</option>
                  <option>HSE</option>
                  <option>Vendor</option>
                  <option>Owner</option>
                  <option>Contractor</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold">Tanggal Patrol</label>
              <input type="date" value={tglPatrol} onChange={e=>setTglPatrol(e.target.value)} className="w-full border-2 border-black rounded-lg px-3 py-2 text-[14px] mt-1" />
            </div>
          </div>

          {/* List Peserta Session */}
          {pesertaList.length>0 && (
            <div className="mt-4 border-t pt-3">
              <div className="text-[11px] font-black">Peserta sudah scan QR hari ini ({pesertaList.length}):</div>
              <div className="mt-2 space-y-1 max-h-[120px] overflow-auto">
                {pesertaList.map((p,i)=><div key={i} className="text-[11px] bg-gray-50 border px-2 py-1 rounded flex justify-between"><span>{i+1}. {p.nama} - {p.jabatan} - {p.bagian}</span><span className="text-[9px]">{p.tglPatrol}</span></div>)}
              </div>
            </div>
          )}
        </div>

        {/* Pilih Mode Patrol - Sesuai ide user */}
        <div className="space-y-3">
          <div className="text-[11px] font-black text-center">QR Code Sama - Pilih Jenis Patrol:</div>
          <button onClick={()=>handleJoin('internal')} disabled={!nama} className="w-full bg-[#0f172a] text-white rounded-xl py-4 px-4 flex items-center justify-between border-2 border-black disabled:opacity-50">
            <div className="text-left">
              <div className="font-black text-[15px]">🔧 PATROL INTERNAL</div>
              <div className="text-[11px] opacity-80">Tim Internal CSMS - 8 Elemen</div>
            </div>
            <div className="text-[20px]">▶</div>
          </button>
          <button onClick={()=>handleJoin('gabungan')} disabled={!nama} className="w-full bg-blue-600 text-white rounded-xl py-4 px-4 flex items-center justify-between border-2 border-black disabled:opacity-50 shadow-lg">
            <div className="text-left">
              <div className="font-black text-[15px]">👥 PATROL GABUNGAN</div>
              <div className="text-[11px] opacity-90">Owner Area E + HSE + Vendor Safety - 4 Kelompok 1 CSMS 2 Fisik 3 Perilaku 4 Risk</div>
            </div>
            <div className="text-[20px]">▶</div>
          </button>
          <div className="text-[10px] text-center text-gray-500">Setelah pilih, langsung masuk ke halaman 4 Elemen Input Temuan + Upload Foto + Simpan & Kirim → Sync ke Admin Contractor</div>
        </div>

        <div className="text-[9px] text-center text-gray-400 pb-6">V43 Mobile Entry - QR Universal - Session {sessionId} - PT MRH DigitalHub - 0 Problems</div>
      </div>
    </div>
  )
}
