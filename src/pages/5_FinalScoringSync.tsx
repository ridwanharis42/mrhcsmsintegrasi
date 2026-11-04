// @ts-nocheck
import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'

type Permit = {
  id: string
  nomor_wp: string
  judul_pekerjaan: string
  area_id: string
  area_name: string
  work_radius_m: number
  area_radius_m: number
  factory: string
  lat: number
  lng: number
  pj: string
  so: string
  vendor_name: string
  status: string
  area_type: string
  work_area_m2: number
  tgl_mulai: string
  tgl_selesai: string
  risk_level?: string
  risk_score?: number
  risk_likelihood?: number
  risk_severity?: number
  risk_color?: string
  utilities?: any[]
  utility_list?: any[]
  apd_required?: string
  apd_list?: any[]
  jsa_list?: any[]
  k3_list?: any[]
  workers_list?: any[]
  alat_list?: any[]
  kendaraan_list?: any[]
  jsa_content?: string
  apd_content?: string
}

type Area = {
  id: string
  name: string
  area_m2: number
  radius_m: number
  type: string
  is_open: boolean
  x: number
  y: number
  w: number
  h: number
}

export function FinalScoring({ permits: propPermits = [], areas: propAreas = [], vendors = [] }: any) {
  const [filterRisk, setFilterRisk] = useState('Semua Risk Level - Final Scoring')
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null)
  const [factorySettings, setFactorySettings] = useState({ total: 10000, open: 6000, closed: 4000 })
  const [realPermits, setRealPermits] = useState<Permit[]>([])
  const [areasFromSettings, setAreasFromSettings] = useState<Area[]>([])
  const [isSynced, setIsSynced] = useState(false)
  const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString())

  useEffect(() => {
    try {
      const local = localStorage.getItem('mrh_app_settings')
      if (local) {
        const parsed = JSON.parse(local)
        if (parsed.factory_total_m2) {
          setFactorySettings({
            total: parseFloat(parsed.factory_total_m2) || 10000,
            open: parseFloat(parsed.factory_open_m2) || 6000,
            closed: parseFloat(parsed.factory_closed_m2) || 4000,
          })
        }
        if (parsed.factory_areas) {
          const fa = JSON.parse(parsed.factory_areas)
          const withPos = fa.map((a: any, idx: number) => ({
            id: a.id,
            name: a.name,
            area_m2: a.m2,
            radius_m: a.radius,
            type: a.type,
            is_open: a.type === 'open_without_wall',
            x: (idx % 3) * 33 + 2,
            y: Math.floor(idx / 3) * 30 + 5,
            w: 28,
            h: 25,
          }))
          setAreasFromSettings(withPos)
        }
      }
      supabase.from('app_settings').select('*').in('key', ['factory_areas', 'factory_total_m2', 'factory_open_m2', 'factory_closed_m2']).then(({ data }) => {
        if (data) {
          const map: any = {}
          data.forEach((row: any) => { map[row.key] = row.value })
          if (map.factory_total_m2) {
            setFactorySettings({
              total: parseFloat(map.factory_total_m2) || 10000,
              open: parseFloat(map.factory_open_m2) || 6000,
              closed: parseFloat(map.factory_closed_m2) || 4000,
            })
          }
          if (map.factory_areas) {
            try {
              const fa = JSON.parse(map.factory_areas)
              const withPos = fa.map((a: any, idx: number) => ({
                id: a.id,
                name: a.name,
                area_m2: a.m2,
                radius_m: a.radius,
                type: a.type,
                is_open: a.type === 'open_without_wall',
                x: (idx % 3) * 33 + 2,
                y: Math.floor(idx / 3) * 30 + 5,
                w: 28,
                h: 25,
              }))
              setAreasFromSettings(withPos)
            } catch {}
          }
        }
      })

      const fetchWorkPermits = async () => {
        const { data, error } = await supabase.from('work_permits').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(50)
        if (!error) {
          if (data && data.length > 0) {
            const mapped = data.map((p: any) => ({
              id: p.id,
              nomor_wp: p.nomor_wp || 'MRH-CSMSWP-2026-001',
              judul_pekerjaan: p.judul || p.judul_pekerjaan || 'TEST STRICT AREA-E',
              area_id: p.area_id || 'AREA-E',
              area_name: p.area_name || p.area_id || 'AREA-E',
              work_radius_m: p.work_radius_m || 25,
              area_radius_m: p.area_radius_m || 15.95,
              factory: p.factory || 'Factory 10000 M2',
              lat: p.lat || -6.201,
              lng: p.lng || 106.801,
              pj: p.pj || 'jaka',
              so: p.so || 'joko',
              vendor_name: p.vendor_name || 'PT. JAYA OBAYASHI',
              status: p.status || 'closed',
              area_type: p.area_type || 'closed',
              work_area_m2: p.work_area_m2 || 1963,
              tgl_mulai: p.tgl_mulai || p.start_date || '2026-11-01',
              tgl_selesai: p.tgl_selesai || p.end_date || '2026-11-08',
              risk_level: p.risk_level || 'medium',
              risk_score: p.risk_score || (p.risk_likelihood||3)*(p.risk_severity||3) || 9,
              risk_likelihood: p.risk_likelihood || 3,
              risk_severity: p.risk_severity || 3,
              risk_color: p.risk_color || 'yellow',
              utilities: p.utilities || p.utility_list || [],
              utility_list: p.utility_list || p.utilities || [],
              apd_required: p.apd_required || '',
              apd_list: p.apd_list || [],
              jsa_list: p.jsa_list || [],
              k3_list: p.k3_list || [],
              workers_list: p.workers_list || [],
              alat_list: p.alat_list || [],
              kendaraan_list: p.kendaraan_list || [],
              jsa_content: p.jsa_content || '',
              apd_content: p.apd_content || '',
            }))
            setRealPermits(mapped)
            setIsSynced(true)
            setLastSync(new Date().toLocaleTimeString())
          } else {
            setRealPermits([])
            setIsSynced(true)
            setLastSync(new Date().toLocaleTimeString())
          }
        } else {
          setRealPermits([])
          setIsSynced(true)
        }
      }

      fetchWorkPermits()

      const channel = supabase
        .channel('final-scoring-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'work_permits' }, () => {
          fetchWorkPermits()
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } catch {}
  }, [])

  const permits = useMemo(() => {
    if (isSynced) {
      if (propPermits && propPermits.length === 0 && realPermits.length === 0) return []
      if (propPermits && propPermits.length > 0) return propPermits
      if (realPermits.length > 0) return realPermits
      return []
    }
    if (propPermits && propPermits.length > 0) return propPermits
    if (realPermits.length > 0) return realPermits
    return []
  }, [propPermits, realPermits, isSynced])

  const UTILITY_ICONS: any = { 'Electric': '⚡', 'Water': '💧', 'Gas': '🔥', 'Steam': '♨', 'Angin': '💨' }

  const getRiskColor = (level: string) => {
    if (level === 'high') return { bg: 'bg-red-600', border: 'border-red-800', dot: '🔴', text: 'text-red-700', light: 'bg-red-50 border-red-300' }
    if (level === 'medium') return { bg: 'bg-yellow-400', border: 'border-yellow-600', dot: '🟡', text: 'text-yellow-700', light: 'bg-yellow-50 border-yellow-300' }
    return { bg: 'bg-green-500', border: 'border-green-700', dot: '🟢', text: 'text-green-700', light: 'bg-green-50 border-green-300' }
  }

  const calculateFinalScore = (p: any) => {
    let score = 100
    const riskLevel = p.risk_level || 'medium'
    const riskScore = p.risk_score || (p.risk_likelihood||3)*(p.risk_severity||3) || 9
    const apdCount = (p.apd_required?.split?.(',')?.filter(Boolean)?.length) || p.apd_list?.length || 3
    const jsaCount = p.jsa_list?.length || (p.jsa_content ? 1 : 0) || 1
    const k3Count = p.k3_list?.length || 1
    const utilityCount = p.utilities?.length || p.utility_list?.length || 0
    const workersCount = p.workers_list?.length || 0
    const alatCount = p.alat_list?.length || 0

    if (riskLevel === 'high') score -= 30
    else if (riskLevel === 'medium') score -= 15
    else score -= 5
    score -= Math.min(riskScore, 20)
    score += Math.min(jsaCount * 2, 10)
    score += Math.min(k3Count * 2, 10)
    score += Math.min(apdCount * 1, 10)
    score -= utilityCount * 1
    score = Math.max(0, Math.min(100, score))

    let grade = 'C'
    let gradeColor = 'bg-orange-500'
    let gradeDesc = 'Fair'
    if (score >= 85) { grade = 'A'; gradeColor = 'bg-green-600'; gradeDesc = 'Excellent' }
    else if (score >= 70) { grade = 'B'; gradeColor = 'bg-yellow-500'; gradeDesc = 'Good' }
    else if (score >= 50) { grade = 'C'; gradeColor = 'bg-orange-500'; gradeDesc = 'Fair' }
    else { grade = 'D'; gradeColor = 'bg-red-600'; gradeDesc = 'Poor - Need Improvement' }

    return { score, grade, gradeColor, gradeDesc, riskLevel, riskScore, apdCount, jsaCount, k3Count, utilityCount, workersCount, alatCount }
  }

  const lowRiskCount = permits.filter((p: any) => (p.risk_level || 'medium') === 'low').length
  const medRiskCount = permits.filter((p: any) => (p.risk_level || 'medium') === 'medium').length
  const highRiskCount = permits.filter((p: any) => (p.risk_level || 'medium') === 'high').length
  const avgScore = permits.length>0 ? Math.round(permits.reduce((acc:any,p:any)=> acc + calculateFinalScore(p).score,0)/permits.length) : 0
  const gradeACount = permits.filter((p:any)=> calculateFinalScore(p).grade==='A').length
  const gradeBCount = permits.filter((p:any)=> calculateFinalScore(p).grade==='B').length
  const gradeCCount = permits.filter((p:any)=> calculateFinalScore(p).grade==='C').length
  const gradeDCount = permits.filter((p:any)=> calculateFinalScore(p).grade==='D').length

  const filtered = useMemo(() => {
    if (filterRisk === 'Semua Risk Level - Final Scoring') return permits
    if (['low','medium','high'].includes(filterRisk)) return permits.filter((p:any)=> (p.risk_level||'medium')===filterRisk)
    if (['A','B','C','D'].includes(filterRisk)) return permits.filter((p:any)=> calculateFinalScore(p).grade===filterRisk)
    return permits
  }, [permits, filterRisk])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-8 gap-2">
        <div className="bg-pink-100 border-2 border-pink-300 rounded-lg p-3 text-center shadow-sm"><p className="text-[10px] text-pink-600 font-bold">Total WP Final Scoring</p><p className="font-black text-sm text-pink-700">{permits.length}</p><p className="text-[9px] text-pink-600">Sync: {lastSync}</p></div>
        <div className="bg-slate-900 text-white border-2 border-slate-700 rounded-lg p-3 text-center shadow-sm"><p className="text-[10px]">Avg CSMS Score</p><p className="font-black text-sm">{avgScore}</p><p className="text-[8px]">Base 100 - Risk + JSA + K3 + APD - Utility</p></div>
        <div className="bg-green-600 text-white border-2 border-green-700 rounded-lg p-3 text-center shadow-sm"><p className="text-[10px]">Grade A 85-100</p><p className="font-black text-sm">{gradeACount}</p><p className="text-[9px]">🟩 Excellent</p></div>
        <div className="bg-yellow-500 text-white border-2 border-yellow-600 rounded-lg p-3 text-center shadow-sm"><p className="text-[10px]">Grade B 70-84</p><p className="font-black text-sm">{gradeBCount}</p><p className="text-[9px]">🟨 Good</p></div>
        <div className="bg-orange-500 text-white border-2 border-orange-600 rounded-lg p-3 text-center shadow-sm"><p className="text-[10px]">Grade C 50-69</p><p className="font-black text-sm">{gradeCCount}</p><p className="text-[9px]">🟧 Fair</p></div>
        <div className="bg-red-600 text-white border-2 border-red-700 rounded-lg p-3 text-center shadow-sm"><p className="text-[10px]">Grade D 0-49</p><p className="font-black text-sm">{gradeDCount}</p><p className="text-[9px]">🟥 Poor</p></div>
        <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-3 text-center shadow-sm"><p className="text-[10px] text-gray-600 font-bold">Risk Filter</p><p className="font-black text-sm">🟢{lowRiskCount} 🟡{medRiskCount} 🔴{highRiskCount}</p><p className="text-[8px] text-gray-500">Pion warna Risk Level</p></div>
        <div className="bg-sky-100 border-2 border-sky-300 rounded-lg p-3 text-center shadow-sm"><p className="text-[10px] text-sky-700 font-bold">Utility Total</p><p className="font-black text-sm text-sky-700">{permits.reduce((a:any,p:any)=> a + (p.utilities?.length||0),0)}</p><p className="text-[8px] text-sky-600">⚡💧🔥♨💨</p></div>
      </div>

      <div className="bg-white border rounded-xl p-4 flex gap-3">
        <select value={filterRisk} onChange={e=>setFilterRisk(e.target.value)} className="border p-2 rounded text-xs flex-1 font-bold">
          <option>Semua Risk Level - Final Scoring</option>
          <option value="low">🟢 LOW 1-4 - Pion Hijau - CSMS Bonus</option>
          <option value="medium">🟡 MEDIUM 5-12 - Pion Kuning - APD+JSA+SO</option>
          <option value="high">🔴 HIGH 13-25 - Pion Merah - Full K3 Penalty</option>
          <option value="A">Grade A 85-100 - Excellent 🟩</option>
          <option value="B">Grade B 70-84 - Good 🟨</option>
          <option value="C">Grade C 50-69 - Fair 🟧</option>
          <option value="D">Grade D 0-49 - Poor 🟥</option>
        </select>
        <div className="flex-1 text-[10px] bg-slate-50 border rounded p-2">
          <b>RUMUS CSMS FINAL SCORE:</b> Base 100 - Risk Level Penalty (HIGH -30, MED -15, LOW -5) - Risk Score (LxS) + Bonus JSA*2 (max10) + Bonus K3*2 (max10) + Bonus APD*1 (max10) - Utility Count*1 = Final 0-100 | Grade A 85-100 🟩 B 70-84 🟨 C 50-69 🟧 D 0-49 🟥 | Filter: {filterRisk} = {filtered.length}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {filtered.length===0 ? (
          <div className="border-2 border-dashed border-green-300 bg-green-50 rounded-xl p-10 text-center">
            <p className="font-black text-lg">✅ 0 Work Permit - Final Scoring</p>
            <p className="text-[12px] mt-2">Semua WP sudah di-delete - TOTAL WORK PERMIT = 0 - Sync: {lastSync}</p>
            <p className="text-[11px] mt-1">Setelah buat WP baru mrh-csmswp-2026-001 dengan Risk Matrix 5x5 + Utility + APD + JSA, CSMS Score akan auto hitung: Base 100 - Risk Penalty + Bonus JSA/K3/APD - Utility = Grade A/B/C/D</p>
            <p className="text-[10px] mt-2">Filter: {filterRisk} - Risk counts: 🟢{lowRiskCount} 🟡{medRiskCount} 🔴{highRiskCount} - Avg Score: {avgScore} - Grades: A:{gradeACount} B:{gradeBCount} C:{gradeCCount} D:{gradeDCount}</p>
          </div>
        ) : (
          filtered.map((p:any, i:number)=>{
            const calc = calculateFinalScore(p)
            const color = getRiskColor(calc.riskLevel)
            const utils = p.utilities || p.utility_list || []
            return (
              <div key={p.id||i} className={`bg-white rounded-xl border-2 ${color.border} p-4 flex gap-4 hover:shadow-lg transition`}>
                <div className={`w-24 h-24 rounded-full ${calc.gradeColor} text-white flex flex-col items-center justify-center font-black shadow-lg relative`}>
                  <div className="text-3xl">{calc.score}</div>
                  <div className="text-[11px]">Grade {calc.grade}</div>
                  <div className="text-[8px]">{calc.gradeDesc}</div>
                  <div className={`absolute -top-1 -right-1 w-7 h-7 rounded-full ${color.bg} border-2 border-white flex items-center justify-center text-[10px]`}>{color.dot}</div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div><span className="font-black">{p.nomor_wp}</span> - {p.judul_pekerjaan} | {p.vendor_name} | {p.area_id} | {p.area_name}</div>
                    <div className="flex gap-1">
                      <span className={`${color.bg} text-white px-2 py-1 rounded text-[10px] font-bold`}>{color.dot} {calc.riskLevel.toUpperCase()} Score {calc.riskScore} ({p.risk_likelihood||3}x{p.risk_severity||3})</span>
                      <span className={`${calc.gradeColor} text-white px-2 py-1 rounded text-[10px] font-bold`}>CSMS {calc.score} Grade {calc.grade}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-6 gap-2 text-[10px] mt-2">
                    <div className="bg-slate-50 p-2 rounded border">Risk Level: <b className={color.text}>{calc.riskLevel.toUpperCase()}</b> Penalty <b>-{calc.riskLevel==='high'?30:calc.riskLevel==='medium'?15:5}</b></div>
                    <div className="bg-slate-50 p-2 rounded border">Risk Score LxS: <b>{calc.riskScore}</b> Penalty <b>-{calc.riskScore}</b></div>
                    <div className="bg-green-50 p-2 rounded border">JSA: <b>{calc.jsaCount}</b> Bonus <b className="text-green-700">+{Math.min(calc.jsaCount*2,10)}</b> | K3: <b>{calc.k3Count}</b> Bonus <b className="text-green-700">+{Math.min(calc.k3Count*2,10)}</b></div>
                    <div className="bg-blue-50 p-2 rounded border">APD: <b>{calc.apdCount}</b> Bonus <b className="text-blue-700">+{Math.min(calc.apdCount*1,10)}</b> | Workers <b>{calc.workersCount}</b></div>
                    <div className="bg-yellow-50 p-2 rounded border">Utility: <b>{calc.utilityCount}</b> Penalty <b className="text-red-700">-{calc.utilityCount}</b> | Alat <b>{calc.alatCount}</b></div>
                    <div className="bg-purple-50 p-2 rounded border">Formula: <b>100 -{calc.riskLevel==='high'?30:calc.riskLevel==='medium'?15:5} -{calc.riskScore} +{Math.min(calc.jsaCount*2,10)}+{Math.min(calc.k3Count*2,10)}+{Math.min(calc.apdCount,10)} -{calc.utilityCount} = {calc.score}</b></div>
                  </div>
                  <div className="text-[10px] mt-2 flex gap-2">Utility: {utils.length>0 ? utils.map((u:any)=>`${UTILITY_ICONS[u.jenis]||''} ${u.jenis} ${u.pemakaian}${u.satuan} ${u.durasi||u.durasi_jam||0}j`).join(', ') : '-'} | PJ: {p.pj} SO: {p.so} | Tgl: {p.tgl_mulai} s/d {p.tgl_selesai}</div>
                  <div className="mt-2 h-3 bg-gray-200 rounded-full overflow-hidden flex">
                    <div className={`h-full ${calc.gradeColor}`} style={{width:`${calc.score}%`}}></div>
                    <div className="flex-1 bg-gray-100"></div>
                  </div>
                  <div className="flex justify-between text-[8px] text-slate-400 mt-0.5"><span>0 Poor</span><span>50 Fair</span><span>70 Good</span><span>85 Excellent</span><span>100</span></div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default FinalScoring
