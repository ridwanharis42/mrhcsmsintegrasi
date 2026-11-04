// @ts-nocheck
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { APP_CONFIG } from '../types'

export function DashboardFlow({ areas: propAreas, vendors: propVendors, permits: propPermits, patrols: propPatrols, supabaseUrl, appSettings }: any) {
  const [realCounts, setRealCounts] = useState({ vendors: 0, permits: 0, areas: 0, patrols: 0, active: 0, pendingOwner: 0, pendingUtility: 0, pendingHse: 0, pendingGm: 0 })
  const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString())
  const [allPermits, setAllPermits] = useState<any[]>([])
  const [filterRisk, setFilterRisk] = useState<string>('all')

  useEffect(() => {
    const fetchRealCounts = async () => {
      try {
        const [{ data: vendorsData, count: vendorsCount }, { data: permitsData, count: permitsCount }, { data: areasData, count: areasCount }, { data: patrolsData, count: patrolsCount }] = await Promise.all([
          supabase.from('vendors').select('id', { count: 'exact' }),
          supabase.from('work_permits').select('id', { count: 'exact' }),
          supabase.from('areas').select('id', { count: 'exact' }),
          supabase.from('e_patrol').select('id', { count: 'exact' }),
        ])

        let areasCountFromSettings = propAreas?.length || 0
        try {
          const local = localStorage.getItem('mrh_app_settings')
          if (local) {
            const parsed = JSON.parse(local)
            if (parsed.factory_areas) {
              const fa = JSON.parse(parsed.factory_areas)
              areasCountFromSettings = fa.length
            }
          }
          const { data: factoryAreasSetting } = await supabase.from('app_settings').select('value').eq('key', 'factory_areas').single()
          if (factoryAreasSetting?.value) {
            try {
              const fa = JSON.parse(factoryAreasSetting.value)
              areasCountFromSettings = fa.length
            } catch {}
          }
        } catch {}

        const permitsList = permitsData || propPermits || []
        setAllPermits(permitsList)

        const active = permitsList.filter((p: any) => p.status === 'active').length
        const pendingOwner = permitsList.filter((p: any) => p.status === 'pending_owner' || p.status === 'pending').length
        const pendingUtility = permitsList.filter((p: any) => p.status === 'pending_utility').length
        const pendingHse = permitsList.filter((p: any) => p.status === 'pending_hse').length
        const pendingGm = permitsList.filter((p: any) => p.status === 'pending_gm').length

        setRealCounts({
          vendors: vendorsCount ?? propVendors?.length ?? 0,
          permits: permitsCount ?? permitsList.length,
          areas: areasCountFromSettings || areasCount || propAreas?.length || 8,
          patrols: patrolsCount ?? propPatrols?.length ?? 0,
          active,
          pendingOwner,
          pendingUtility,
          pendingHse,
          pendingGm,
        })
        setLastSync(new Date().toLocaleTimeString())
      } catch (e) {
        const permitsList = propPermits || []
        setAllPermits(permitsList)
        setRealCounts({
          vendors: propVendors?.length || 0,
          permits: permitsList.length,
          areas: propAreas?.length || 8,
          patrols: propPatrols?.length || 0,
          active: permitsList.filter((p: any) => p.status === 'active').length,
          pendingOwner: permitsList.filter((p: any) => p.status === 'pending_owner').length,
          pendingUtility: permitsList.filter((p: any) => p.status === 'pending_utility').length,
          pendingHse: permitsList.filter((p: any) => p.status === 'pending_hse').length,
          pendingGm: permitsList.filter((p: any) => p.status === 'pending_gm').length,
        })
      }
    }
    fetchRealCounts()
    const channel = supabase
      .channel('dashboard-sync-after-delete')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_permits' }, () => { fetchRealCounts() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendors' }, () => { fetchRealCounts() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [propPermits, propVendors, propAreas, propPatrols])

  const totalVendors = realCounts.vendors || propVendors?.length || 0
  const totalPermits = realCounts.permits ?? allPermits.length ?? 0
  const totalAreas = realCounts.areas || propAreas?.length || 8
  const totalPatrols = realCounts.patrols || propPatrols?.length || 0
  const activePermits = realCounts.active
  const pendingOwner = realCounts.pendingOwner
  const pendingUtility = realCounts.pendingUtility
  const pendingHse = realCounts.pendingHse
  const pendingGm = realCounts.pendingGm

  const lowCount = useMemo(() => allPermits.filter((p: any) => (p.risk_level || 'medium') === 'low').length, [allPermits])
  const medCount = useMemo(() => allPermits.filter((p: any) => (p.risk_level || 'medium') === 'medium').length, [allPermits])
  const highCount = useMemo(() => allPermits.filter((p: any) => (p.risk_level || 'medium') === 'high').length, [allPermits])

  const filteredPermits = useMemo(() => {
    if (filterRisk === 'all') return allPermits
    return allPermits.filter((p: any) => (p.risk_level || 'medium') === filterRisk)
  }, [allPermits, filterRisk])

  const getRiskBadge = (level: string, score: number, l: number, s: number) => {
    const ls = `(${l||3}x${s||3})`
    if (level === 'high') return <span className="bg-red-600 text-white px-2 py-1 rounded font-black text-[10px]">HIGH {score} {ls}</span>
    if (level === 'medium') return <span className="bg-yellow-400 text-black px-2 py-1 rounded font-black text-[10px]">MEDIUM {score} {ls}</span>
    return <span className="bg-green-500 text-white px-2 py-1 rounded font-black text-[10px]">LOW {score} {ls}</span>
  }

  const calculateFinalScore = (p: any) => {
    let score = 100
    const riskLevel = p.risk_level || 'medium'
    const riskScore = p.risk_score || (p.risk_likelihood || 3) * (p.risk_severity || 3)
    const apdCount = (p.apd_required?.split?.(',')?.filter(Boolean)?.length) || p.apd_list?.length || 3
    const jsaCount = p.jsa_list?.length || 1
    const k3Count = p.k3_list?.length || 1
    const utilityCount = p.utilities?.length || p.utility_list?.length || 0
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
    let color = 'bg-orange-500'
    if (score >= 85) { grade = 'A'; color = 'bg-green-600' }
    else if (score >= 70) { grade = 'B'; color = 'bg-yellow-500' }
    else if (score >= 50) { grade = 'C'; color = 'bg-orange-500' }
    else { grade = 'D'; color = 'bg-red-600' }
    return { score, grade, color }
  }

  const UTILITY_ICONS: any = { 'Electric': '⚡', 'Water': '💧', 'Gas': '🔥', 'Steam': '♨', 'Angin': '💨', 'Listrik': '⚡' }
  const PION_ICONS: any = { 'high': '🔴', 'medium': '🟡', 'low': '🟢' }
  const PION_COLORS: any = { 'high': 'bg-red-600', 'medium': 'bg-yellow-400', 'low': 'bg-green-500' }

  return (
    <>
      <style>{`html { overflow-x: hidden; } body { overflow-x: hidden; margin: 0; padding: 0; } ::-webkit-scrollbar:horizontal { display: none; height: 0; } .no-scrollbar-x { -ms-overflow-style: none; scrollbar-width: none; } .no-scrollbar-x::-webkit-scrollbar:horizontal { display: none; }`}</style>
    <div className="space-y-6 w-full overflow-x-hidden no-scrollbar-x pr-6 box-border" style={{ maxWidth: "100%", paddingRight: "1.5rem", marginRight: "0.5rem" }}>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full pr-2">
        <div className="bg-white border rounded-xl p-4"><p className="text-[11px] text-slate-500 font-bold">TOTAL VENDOR</p><p className="text-2xl font-black mt-1">{totalVendors}</p><p className="text-[10px] text-slate-400">8 Elemen Scoring</p></div>
        <div className="bg-white border-2 border-blue-300 rounded-xl p-4 shadow-sm"><p className="text-[11px] text-slate-600 font-bold">TOTAL WORK PERMIT + Risk Filter</p><p className="text-2xl font-black mt-1">{totalPermits}</p><p className="text-[10px] text-slate-500">{activePermits} Active - LOW {lowCount} MED {medCount} HIGH {highCount} - Sync: {lastSync}</p>
          <div className="flex gap-1 mt-2 flex-wrap">
            <button onClick={() => setFilterRisk('all')} className={`px-2.5 py-1 rounded text-[10px] font-black border-2 transition ${filterRisk==='all'?'bg-slate-900 text-white border-slate-900 shadow':'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>ALL {allPermits.length}</button>
            <button onClick={() => setFilterRisk('low')} className={`px-2.5 py-1 rounded text-[10px] font-black border-2 transition ${filterRisk==='low'?'bg-green-600 text-white border-green-600 shadow':'bg-white text-green-700 border-green-200 hover:bg-green-50'}`}>LOW {lowCount}</button>
            <button onClick={() => setFilterRisk('medium')} className={`px-2.5 py-1 rounded text-[10px] font-black border-2 transition ${filterRisk==='medium'?'bg-yellow-400 text-black border-yellow-400 shadow':'bg-white text-yellow-700 border-yellow-200 hover:bg-yellow-50'}`}>MED {medCount}</button>
            <button onClick={() => setFilterRisk('high')} className={`px-2.5 py-1 rounded text-[10px] font-black border-2 transition ${filterRisk==='high'?'bg-red-600 text-white border-red-600 shadow':'bg-white text-red-700 border-red-200 hover:bg-red-50'}`}>HIGH {highCount}</button>
          </div>
        </div>
        <div className="bg-white border rounded-xl p-4"><p className="text-[11px] text-slate-500 font-bold">TOTAL AREA / FACTORY</p><p className="text-2xl font-black mt-1">{totalAreas}</p><p className="text-[10px] text-slate-400">M2 + Radius - Dari Settings factory_areas</p></div>
        <div className="bg-white border rounded-xl p-4"><p className="text-[11px] text-slate-500 font-bold">TOTAL E-PATROL</p><p className="text-2xl font-black mt-1">{totalPatrols}</p><p className="text-[10px] text-slate-400">Sync WP Active</p></div>
      </div>

      <div className="bg-white border-2 border-blue-200 rounded-xl p-4 w-full overflow-hidden shadow-sm">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h3 className="font-black text-sm flex items-center gap-2"><span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>TOTAL WORK PERMIT ( Risk Level Filter + Pion Warna + Utility + Final Scoring ) - Real Data: {filteredPermits.length}/{allPermits.length} - Filter: {filterRisk.toUpperCase()} - Sync: {lastSync}</h3>
          </div>
          <div className="text-[10px] text-slate-500 bg-slate-50 border px-2 py-1 rounded">Supabase: work_permits - {allPermits.length} real - LOW:{lowCount} MED:{medCount} HIGH:{highCount}</div>
        </div>
        <div className="overflow-auto mt-3 border-2 border-slate-200 rounded-lg max-h-[420px]">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 z-10"><tr className="bg-blue-600 text-white"><th className="p-2.5 text-left">No WP + Pion</th><th className="p-2.5 text-left">Judul + Vendor</th><th className="p-2.5 text-left">Area + M2</th><th className="p-2.5 text-left">Risk Level + Score + Final CSMS</th><th className="p-2.5 text-center">Data Utility</th></tr></thead>
            <tbody>
              {filteredPermits.map((p: any, i: number) => {
                const level = p.risk_level || 'medium'
                const l = p.risk_likelihood || 3
                const s = p.risk_severity || 3
                const score = p.risk_score || l * s
                const utils = p.utilities || p.utility_list || []
                const calc = calculateFinalScore(p)
                const areaM2 = p.work_area_m2 || p.area_m2 || 1963
                return (
                  <tr key={p.id || i} className="border-b hover:bg-blue-50 transition">
                    <td className="p-2.5 font-mono"><div className="flex items-center gap-2"><span className="text-lg">{PION_ICONS[level] || '🟡'}</span><span className={`w-3 h-3 rounded-full inline-block ${PION_COLORS[level] || 'bg-yellow-400'}`}></span><div><div className="font-black text-[11px]">{p.nomor_wp || p.id}</div><div className="text-[8px] text-slate-400">{i+1}</div></div></div></td>
                    <td className="p-2.5"><div className="font-bold text-[11px] line-clamp-2">{p.judul || p.title || p.judul_pekerjaan || '-'}</div><div className="text-[10px] text-slate-500">{p.vendor_name || '-'}</div><div className="text-[8px] text-slate-400">PJ:{p.pj||'-'} SO:{p.so||'-'} | {p.tgl_mulai||p.start_date||''} s/d {p.tgl_selesai||p.end_date||''}</div></td>
                    <td className="p-2.5"><div className="font-bold">{p.area_id || p.area_name || '-'} </div><div className="text-[10px]">Radius:{p.work_radius_m || 25}m = {(Math.PI*(p.work_radius_m||25)*(p.work_radius_m||25)).toFixed(0)} M2</div><div className="text-[8px] text-slate-500">{p.area_type||'closed'} | M2:{areaM2}</div></td>
                    <td className="p-2.5"><div className="flex gap-1 flex-wrap">{getRiskBadge(level, score, l, s)}<span className={`${calc.color} text-white px-2 py-0.5 rounded text-[9px] font-black`}>CSMS {calc.score} Grade {calc.grade}</span></div><div className="text-[8px] text-slate-500 mt-1">100 -{level==='high'?30:level==='medium'?15:5} -{score} +JSA/K3/APD -{utils.length} = {calc.score}</div></td>
                    <td className="p-2.5 text-center"><div className="flex flex-wrap gap-1 justify-center">{utils.length>0 ? utils.map((u: any, idx: number) => { const icon = UTILITY_ICONS[u.jenis] || UTILITY_ICONS[u.jenis?.trim()] || '⚡'; return <span key={idx} className="inline-flex items-center gap-0.5 bg-slate-100 border rounded px-1 py-0.5 text-[10px]"><span>{icon}</span><span>{u.jenis}</span><span className="font-bold">{u.pemakaian}{u.satuan}</span><span>{u.durasi||u.durasi_jam||0}j</span></span> }) : <span className="text-slate-400 text-[10px]">- No Utility</span>}</div></td>
                  </tr>
                )
              })}
              {filteredPermits.length===0 && <tr><td colSpan={5} className="p-6 text-center"><div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"><p className="font-bold text-slate-600">Belum ada WP - Filter {filterRisk.toUpperCase()} = 0</p><p className="text-[11px] text-slate-500 mt-1">Total Real: {allPermits.length} - LOW:{lowCount} MED:{medCount} HIGH:{highCount} - Klik ALL untuk lihat semua atau buat WP baru mrh-csmswp-2026-001</p><div className="mt-2 flex gap-1 justify-center"><button onClick={()=>setFilterRisk('all')} className="bg-blue-600 text-white px-3 py-1 rounded text-[10px] font-bold">Klik ALL ({allPermits.length})</button></div></div></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-[9px] text-slate-400 flex justify-between"><span>Real Data dari Supabase work_permits - {allPermits.length} WP - Filter {filterRisk} = {filteredPermits.length} - Sync {lastSync} - Setelah delete semua, harus 0/0 + 0 pion</span><span>Scroll untuk lihat semua - Max 420px height - Sticky header</span></div>
      </div>

      <div className="bg-white border rounded-xl p-5 w-full overflow-hidden">
        <div className="flex justify-between items-center">
          <div className="flex-1">
            <h3 className="font-black text-sm flex items-center gap-2">
              <span className="w-4 h-4 bg-blue-500 rounded-full"></span>
              Flow Process CSMS Integrated
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mt-5 w-full items-stretch">
          <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 text-center flex flex-col h-full"><div className="w-8 h-8 bg-pink-500 text-white rounded-full flex items-center justify-center mx-auto font-black text-sm shrink-0">1</div><p className="font-black text-xs mt-2">Vendor Daftar</p><p className="text-[10px] text-slate-500 mt-1 flex-1 min-h-[32px] flex items-center justify-center">Daftar + Score 8 Elemen</p><div className="bg-pink-500 text-white border border-pink-300 rounded-lg py-2 text-xs font-bold mt-auto">{totalVendors} Vendor</div></div>
          <div className="bg-gray-100 border border-gray-300 rounded-xl p-4 text-center flex flex-col h-full"><div className="w-8 h-8 bg-gray-500 text-white rounded-full flex items-center justify-center mx-auto font-black text-sm shrink-0">2</div><p className="font-black text-xs mt-2">Draft WP</p><p className="text-[10px] text-slate-500 mt-1 flex-1 min-h-[32px] flex items-center justify-center">Isi form dasar + radius + M2 + Utility + Risk 5x5</p><div className="bg-gray-500 text-white border border-gray-400 rounded-lg py-2 text-xs font-bold mt-auto">Draft</div></div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center flex flex-col h-full"><div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mx-auto font-black text-sm shrink-0">3</div><p className="font-black text-xs mt-2">Owner Area (L1)</p><p className="text-[10px] text-slate-500 mt-1 flex-1 min-h-[32px] flex items-center justify-center">Tingkat 1 - Owner Area cek lapangan + bisa reject</p><div className="bg-blue-600 text-white border rounded-lg py-2 text-xs font-bold mt-auto">{pendingOwner} Pending</div></div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center flex flex-col h-full"><div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center mx-auto font-black text-sm shrink-0">4</div><p className="font-black text-xs mt-2">Utility (L2)</p><p className="text-[10px] text-slate-500 mt-1 flex-1 min-h-[32px] flex items-center justify-center">Tingkat 2 - Utility cek Water/Gas/Steam/Electric + bisa reject</p><div className="bg-yellow-500 text-white border rounded-lg py-2 text-xs font-bold mt-auto">{pendingUtility} Pending</div></div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center flex flex-col h-full"><div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto font-black text-sm shrink-0">5</div><p className="font-black text-xs mt-2">HSE/SHE (L3)</p><p className="text-[10px] text-slate-500 mt-1 flex-1 min-h-[32px] flex items-center justify-center">Tingkat 3 - HSE cek JSA/APD/K3/Lingkungan + bisa reject</p><div className="bg-orange-500 text-white border rounded-lg py-2 text-xs font-bold mt-auto">{pendingHse} Pending</div></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 w-full items-stretch">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center flex flex-col h-full"><div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center mx-auto font-black text-sm shrink-0">6</div><p className="font-black text-xs mt-2">Manager HSE/GM (L4)</p><p className="text-[10px] text-slate-500 mt-1 flex-1 min-h-[32px] flex items-center justify-center">Tingkat 4 - Manager HSE/GM final approval + bisa reject</p><div className="bg-purple-600 text-white border rounded-lg py-2 text-xs font-bold mt-auto">{pendingGm} Pending</div></div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center flex flex-col h-full"><div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto font-black text-sm shrink-0">7</div><p className="font-black text-xs mt-2">Active - Risk Pion</p><p className="text-[10px] text-slate-500 mt-1 flex-1 min-h-[32px] flex items-center justify-center">Siap kerja + Mapping Radius Overlap + Pion + Utility</p><div className="bg-green-600 text-white border rounded-lg py-1.5 px-1 text-[10px] font-bold mt-auto leading-tight"><div>Active: {activePermits} - LOW: {lowCount}</div><div className="text-[10px] font-bold opacity-90 mt-0.5">MED: {medCount} - HIGH: {highCount}</div></div></div>
          <div className="bg-blue-50 border border-blue-300 rounded-xl p-4 text-center flex flex-col h-full"><div className="w-8 h-8 bg-blue-900 text-white rounded-full flex items-center justify-center mx-auto font-black text-sm shrink-0">8</div><p className="font-black text-xs mt-2">Patrol + Final Scoring</p><p className="text-[10px] text-slate-500 mt-1 flex-1 min-h-[32px] flex items-center justify-center">E-Patrol Sync WP Active + CSMS Score Risk+APD+JSA = Grade A/B/C/D</p><div className="bg-blue-900 text-white border border-blue-800 rounded-lg py-2 text-xs font-bold mt-auto">{totalPatrols} Patrol - CSMS Auto</div></div>
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 text-center flex flex-col h-full"><div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center mx-auto font-black text-sm shrink-0">9</div><p className="font-black text-xs mt-2">Closed + A4 Print</p><p className="text-[10px] text-slate-500 mt-1 flex-1 min-h-[32px] flex items-center justify-center">Selesai + Final Report + A4 Utility + Risk Matrix 5x5 stempel</p><div className="bg-amber-500 text-white border border-amber-400 rounded-lg py-2 text-xs font-bold mt-auto">Closed - QR A4</div></div>
        </div>
      </div>
    </div>
    </>
  )
}

export default DashboardFlow
