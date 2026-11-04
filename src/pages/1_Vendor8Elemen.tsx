import { useState } from 'react'
import { APP_CONFIG, ELEMEN_TEMPLATE } from '../types'
import { downloadCSV } from '../lib/distance'
import { supabase } from '../lib/supabase'

export function Vendor8Elemen({ areas, useVendorsHook }:any){
  const { vendors, scoringDetail, calcElementScores, handleScoreChange, handleFileChange, addVendor, updateVendor, setVendors } = useVendorsHook
  const [vForm, setVForm] = useState({ 
    name:'', area_id:'', 
    alamat:'', pj_name:'', pj_jabatan:'', pj_phone:'',
    area_custom_mode:false,
    editing_id:null as string|null
  } as any)
  
  const [newAreaName, setNewAreaName] = useState('')
  const [newAreaLat, setNewAreaLat] = useState(-6.201)
  const [newAreaLng, setNewAreaLng] = useState(106.801)
  
  const totalScore = Object.values(calcElementScores(scoringDetail)).reduce((a:any,b:any)=>a+b,0) as number
  const maxScore = APP_CONFIG.SCORE_THRESHOLD.MAX_SCORE || 200
  const percent = maxScore>0 ? Math.round((totalScore/maxScore)*100) : 0

  function getStatusLabel(score:number){
    if(score>= (APP_CONFIG.SCORE_THRESHOLD.LOLOS||160)) return {label:'LOLOS', color:'bg-emerald-100 text-emerald-800 border-emerald-200'}
    if(score>= (APP_CONFIG.SCORE_THRESHOLD.BERSYARAT||140)) return {label:'BERSYARAT', color:'bg-amber-100 text-amber-800 border-amber-200'}
    return {label:'TIDAK LOLOS', color:'bg-rose-100 text-rose-800 border-rose-200'}
  }
  const currentStatus = getStatusLabel(totalScore)

  async function handleAddCustomArea(){
    if(!newAreaName.trim()){ alert('Nama area wajib'); return }
    const slug = newAreaName.trim().toUpperCase().replace(/[^A-Z0-9]/g,'-').substring(0,20)
    const newId = `AREA-${slug}`
    const { error } = await supabase.from('areas').insert({ id: newId, name: newAreaName.trim(), lat: newAreaLat, lng: newAreaLng }).select()
    if(error){ alert(error.message); return }
    alert(`Area baru: ${newAreaName}`)
    setVForm({...vForm, area_id: newId, area_custom_mode:false})
    setNewAreaName('')
    window.location.reload()
  }

  async function handleDeleteVendor(id:string, name:string){
    if(!confirm(`Hapus vendor ${name}?`)) return
    const { error } = await supabase.from('vendors').delete().eq('id', id)
    if(error){ alert(error.message); return }
    setVendors(vendors.filter((v:any)=>v.id!==id))
  }

  function handleEditVendor(v:any){
    setVForm({
      name: v.name,
      area_id: v.area_id,
      alamat: v.alamat||'',
      pj_name: v.pj_name||'',
      pj_jabatan: v.pj_jabatan||'',
      pj_phone: v.pj_phone||'',
      area_custom_mode:false,
      editing_id: v.id
    })
    if(v.scoring_detail){
      useVendorsHook.setScoringDetail(v.scoring_detail)
    }
    window.scrollTo({top:0, behavior:'smooth'})
  }

  function handleCancelEdit(){
    setVForm({ name:'', area_id:'', alamat:'', pj_name:'', pj_jabatan:'', pj_phone:'', area_custom_mode:false, editing_id:null } as any)
    useVendorsHook.setScoringDetail({})
  }

  const elemenColors: Record<number, {header: string, bg: string, border: string}> = {
    1: { header: 'bg-sky-100 text-sky-800 border-sky-200', bg: 'bg-white border-sky-100', border: 'border-sky-200' },
    2: { header: 'bg-emerald-100 text-emerald-800 border-emerald-200', bg: 'bg-white border-emerald-100', border: 'border-emerald-200' },
    3: { header: 'bg-amber-100 text-amber-800 border-amber-200', bg: 'bg-white border-amber-100', border: 'border-amber-200' },
    4: { header: 'bg-violet-100 text-violet-800 border-violet-200', bg: 'bg-white border-violet-100', border: 'border-violet-200' },
    5: { header: 'bg-rose-100 text-rose-800 border-rose-200', bg: 'bg-white border-rose-100', border: 'border-rose-200' },
    6: { header: 'bg-cyan-100 text-cyan-800 border-cyan-200', bg: 'bg-white border-cyan-100', border: 'border-cyan-200' },
    7: { header: 'bg-orange-100 text-orange-800 border-orange-200', bg: 'bg-white border-orange-100', border: 'border-orange-200' },
    8: { header: 'bg-indigo-100 text-indigo-800 border-indigo-200', bg: 'bg-white border-indigo-100', border: 'border-indigo-200' },
  }
  const pairs = [[1,2],[3,4],[5,6],[7,8]]

  return (
    <div className="space-y-4 w-full overflow-x-hidden">
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl shadow-sm p-5 border border-blue-100">
        <h3 className="font-bold text-slate-800">1. VENDORS 8 ELEMEN - V6.4 FIX EDIT UPDATE BUKAN DUPLIKAT + JUDUL HURUF KAPITAL + IKON</h3>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="font-bold text-emerald-800">✅ LOLOS ≥{APP_CONFIG.SCORE_THRESHOLD.LOLOS} (80%)</div>
            <div className="text-emerald-700 mt-1">Dokumen lengkap & efektif. Langsung bisa buat WP.</div>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="font-bold text-amber-800">⚠ BERSYARAT {APP_CONFIG.SCORE_THRESHOLD.BERSYARAT}-{APP_CONFIG.SCORE_THRESHOLD.LOLOS-1} (70-79%)</div>
            <div className="text-amber-700 mt-1">Perlu perbaikan minor, bisa buat WP dengan catatan.</div>
          </div>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
            <div className="font-bold text-rose-800">❌ TIDAK LOLOS &lt;{APP_CONFIG.SCORE_THRESHOLD.BERSYARAT} (&lt;70%)</div>
            <div className="text-rose-700 mt-1">Tidak bisa buat WP, harus perbaiki dulu.</div>
          </div>
        </div>
        <div className="mt-3 p-2 bg-white rounded border text-xs">
          <b>Hitungan:</b> 20 Soal x 3/7/10 = Min 60 Max 200 | Total: {totalScore}/{maxScore} ({percent}%) - <span className={`px-2 py-0.5 rounded border ${currentStatus.color}`}>{currentStatus.label}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
        <h4 className="font-bold text-sm bg-gradient-to-r from-blue-100 to-sky-100 p-3 rounded-lg mb-4 border border-blue-200 flex items-center gap-2">
          <span>🏢</span> DATA VENDOR
        </h4>
        {vForm.editing_id && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg flex justify-between items-center">
            <div className="text-sm"><b>✏ MODE EDIT:</b> {vForm.name} - Hasil simpan akan REPLACE data lama, bukan menambah baris baru (BUG FIX)</div>
            <button onClick={handleCancelEdit} className="bg-white border px-3 py-1 rounded-lg text-xs">Batal Edit</button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-xs font-bold">Nama Vendor *</label>
            <input className="border p-2.5 rounded-lg w-full bg-slate-50" value={vForm.name} onChange={e=>setVForm({...vForm, name:e.target.value})} />
          </div>
          <div>
            <label className="text-xs font-bold">Area (Nama saja) *</label>
            <select className="border p-2.5 rounded-lg w-full bg-slate-50" value={vForm.area_id} onChange={e=>{
              const val=e.target.value
              if(val==='OTHERS_CUSTOM') setVForm({...vForm, area_custom_mode:true, area_id:''})
              else setVForm({...vForm, area_id:val, area_custom_mode:false})
            }}>
              <option value="">-- Pilih Area --</option>
              {areas.map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}
              <option value="OTHERS_CUSTOM">+ OTHERS Manual</option>
            </select>
            {vForm.area_custom_mode && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <input className="border p-2 rounded-lg w-full mb-2 text-sm" placeholder="Nama Area Baru" value={newAreaName} onChange={e=>setNewAreaName(e.target.value)} />
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input type="number" step="0.0001" className="border p-1.5 rounded-lg text-xs" value={newAreaLat} onChange={e=>setNewAreaLat(parseFloat(e.target.value)||0)} />
                  <input type="number" step="0.0001" className="border p-1.5 rounded-lg text-xs" value={newAreaLng} onChange={e=>setNewAreaLng(parseFloat(e.target.value)||0)} />
                </div>
                <button onClick={handleAddCustomArea} className="bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs">Simpan Area</button>
                <button onClick={()=>setVForm({...vForm, area_custom_mode:false})} className="ml-2 bg-white border px-3 py-1.5 rounded-lg text-xs">Batal</button>
              </div>
            )}
          </div>
          <div><label className="text-xs font-bold">Alamat</label><input className="border p-2.5 rounded-lg w-full bg-slate-50" value={vForm.alamat} onChange={e=>setVForm({...vForm, alamat:e.target.value})} /></div>
          <div><label className="text-xs font-bold">Nama PJ</label><input className="border p-2.5 rounded-lg w-full bg-slate-50" value={vForm.pj_name} onChange={e=>setVForm({...vForm, pj_name:e.target.value})} /></div>
          <div><label className="text-xs font-bold">Jabatan</label><select className="border p-2.5 rounded-lg w-full bg-slate-50" value={vForm.pj_jabatan} onChange={e=>setVForm({...vForm, pj_jabatan:e.target.value})}><option value="">Pilih Jabatan</option><option>Direktur</option><option>Project Manager</option><option>Safety Manager</option><option>Site Manager</option><option>HSE Officer</option><option>Supervisor</option><option>Koordinator Lapangan</option></select></div>
          <div><label className="text-xs font-bold">No.HP</label><input className="border p-2.5 rounded-lg w-full bg-slate-50" value={vForm.pj_phone} onChange={e=>setVForm({...vForm, pj_phone:e.target.value})} /></div>
        </div>

        <h4 className="font-bold text-sm bg-gradient-to-r from-indigo-100 to-violet-100 p-3 rounded-lg mb-4 border border-indigo-200 flex items-center gap-2">
          <span>📋</span> PENILAIAN 8 ELEMEN
        </h4>
        <div className="space-y-5">
          {pairs.map((pair, idx)=>(
            <div key={idx} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {pair.map(elemNum=>{
                const elem = ELEMEN_TEMPLATE[elemNum]
                const elemScore = calcElementScores(scoringDetail)[elemNum] || 0
                const colors = elemenColors[elemNum]
                return (
                  <div key={elemNum} className={`rounded-xl p-4 shadow-sm border-2 ${colors.bg} ${colors.border} overflow-hidden w-full box-border`}>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className={`font-bold text-sm px-3 py-1.5 rounded-full border ${colors.header} truncate max-w-[70%]`}>Elemen {elemNum}: {elem.name}</h4>
                      <span className="text-xs font-bold bg-white border px-2.5 py-1 rounded-full shadow-sm flex-shrink-0">Score: {elemScore}</span>
                    </div>
                    <div className="space-y-3">
                      {elem.questions.map(q=>{
                        const detail = scoringDetail[q.no] || {score:0}
                        return (
                          <div key={q.no} className="bg-white/80 p-3 rounded-lg border border-slate-100 shadow-sm overflow-hidden w-full box-border">
                            <div className="font-semibold text-xs mb-2">{q.no} - {q.text}</div>
                            {/* FIX: Choose File tidak melebihi border utama - pakai flex-col di mobile, flex-row di sm, min-w-0, overflow-hidden, max-w-full */}
                            <div className="flex flex-col sm:flex-row gap-2 w-full max-w-full overflow-hidden">
                              <select className="border p-2 rounded-lg text-xs w-full sm:w-[160px] flex-shrink-0 bg-slate-50" value={detail.score} onChange={e=>handleScoreChange(q.no, parseInt(e.target.value))}>
                                <option value={0}>-- Pilih Score --</option>
                                <option value={3}>0-3 Dokumen tidak ada (Score 3)</option>
                                <option value={7}>4-7 Ada tapi tidak efektif (Score 7)</option>
                                <option value={10}>8-10 Ada dan efektif (Score 10)</option>
                              </select>
                              {/* FIX UTAMA: Wrapper file input pakai min-w-0 + max-w-full + overflow-hidden + truncate - tidak melebihi border utama Elemen */}
                              <div className="flex-1 min-w-0 max-w-full overflow-hidden flex items-center gap-2 border rounded-lg px-2 py-1.5 bg-slate-50">
                                <label className="flex-shrink-0 bg-white border border-slate-300 rounded-md px-2.5 py-1 text-[11px] font-medium cursor-pointer hover:bg-slate-100 whitespace-nowrap">
                                  Choose File
                                  <input type="file" className="hidden" onChange={e=>{if(e.target.files && e.target.files[0]) handleFileChange(q.no, e.target.files[0])}} />
                                </label>
                                <span className="flex-1 min-w-0 text-[11px] text-slate-500 truncate">
                                  {detail.fileName || 'No file chosen'}
                                </span>
                              </div>
                            </div>
                            {detail.fileName && <div className="text-[10px] text-emerald-600 mt-1.5 truncate">✅ {detail.fileName}</div>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <button onClick={async()=>{
          if(!vForm.name || !vForm.area_id){ alert('Nama & Area wajib'); return }
          const payload = {
            name: vForm.name,
            area_id: vForm.area_id,
            alamat: vForm.alamat,
            pj_name: vForm.pj_name,
            pj_jabatan: vForm.pj_jabatan,
            pj_phone: vForm.pj_phone
          } as any
          let result
          if(vForm.editing_id){
            result = await updateVendor(vForm.editing_id, payload)
            if(result){
              alert(`✅ UPDATE BERHASIL: ${vForm.name} ter-replace, tidak duplikat lagi!`)
            }
          } else {
            result = await addVendor(payload)
            if(result){
              alert(`✅ SIMPAN BARU: ${vForm.name}`)
            }
          }
          if(result){
            setVForm({ name:'', area_id:'', alamat:'', pj_name:'', pj_jabatan:'', pj_phone:'', area_custom_mode:false, editing_id:null } as any)
          }
        }} className={`mt-6 px-8 py-3 rounded-xl font-bold w-full md:w-auto shadow-lg transition ${vForm.editing_id ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white' : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white'}`}>
          {vForm.editing_id ? `✏ UPDATE Vendor V6.4` : `💾 Simpan Vendor `}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100 overflow-auto">
        <div className="flex justify-between mb-3">
          <h3 className="font-bold flex items-center gap-2"><span>📊</span> DAFTAR VENDOR</h3>
          <button onClick={()=>downloadCSV('vendors_v6_4.csv', vendors)} className="text-xs bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">Download CSV</button>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
              <th className="p-3 text-left rounded-l-lg">Nama</th>
              <th className="p-3 text-left">Area (Dinamis)</th>
              <th className="p-3 text-left">Alamat</th>
              <th className="p-3 text-left">PJ / Jabatan / HP</th>
              <th className="p-3 text-center">Score</th>
              <th className="p-3 text-center">%</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">E1-E8</th>
              <th className="p-3 text-center rounded-r-lg">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v:any,i:number)=>{
              const total=v.total_score||0
              const max = APP_CONFIG.SCORE_THRESHOLD.MAX_SCORE||200
              const pct = Math.round((total/max)*100)
              const areaName = areas.find((a:any)=>a.id===v.area_id)?.name || v.area_id
              const st = total>= (APP_CONFIG.SCORE_THRESHOLD.LOLOS||160) ? {label:'LOLOS', cls:'bg-emerald-100 text-emerald-700'} : total>= (APP_CONFIG.SCORE_THRESHOLD.BERSYARAT||140) ? {label:'BERSYARAT', cls:'bg-amber-100 text-amber-700'} : {label:'TIDAK LOLOS', cls:'bg-rose-100 text-rose-700'}
              return <tr key={i} className="border-b hover:bg-slate-50">
                <td className="p-2.5 font-bold">{v.name}</td>
                <td className="p-2.5">{areaName}</td>
                <td className="p-2.5">{v.alamat || '-'}</td>
                <td className="p-2.5">{v.pj_name || '-'}<br/>{v.pj_jabatan || ''}<br/>{v.pj_phone || ''}</td>
                <td className="p-2.5 font-bold text-center">{total}</td>
                <td className="p-2.5 text-center">{pct}%</td>
                <td className="p-2.5 text-center"><span className={`px-2 py-1 rounded-full text-[11px] ${st.cls}`}>{st.label}</span></td>
                <td className="p-2.5 text-center">{[v.element_1,v.element_2,v.element_3,v.element_4,v.element_5,v.element_6,v.element_7,v.element_8].join(' | ')}</td>
                <td className="p-2.5 text-center">
                  <div className="flex gap-1 justify-center">
                    <button onClick={()=>handleEditVendor(v)} className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 px-2 py-1 rounded-lg text-xs" title="Edit">✏</button>
                    <button onClick={()=>handleDeleteVendor(v.id, v.name)} className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 px-2 py-1 rounded-lg text-xs" title="Delete">🗑</button>
                  </div>
                </td>
              </tr>
            })}
          </tbody>
        </table>
      </div>

      <style>{`
        /* FIX GLOBAL: Choose File tidak melebihi border utama Elemen 1-8 */
        input[type="file"] {
          max-width: 100% !important;
          overflow: hidden !important;
        }
        .truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        /* Pastikan card Elemen tidak overflow */
        .overflow-hidden {
          overflow: hidden;
        }
        .box-border {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  )
}

export default Vendor8Elemen
