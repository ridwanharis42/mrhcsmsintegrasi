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

export function MappingOverlap({ permits: propPermits = [], areas: propAreas = [], vendors = [] }: any) {
  const [filterArea, setFilterArea] = useState('Semua Area + Factory 10000 M2')
  const [filterType, setFilterType] = useState('Semua Type')
  const [filterRisk, setFilterRisk] = useState('Semua Risk Level - Pion Warna')
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null)
  const [factorySettings, setFactorySettings] = useState({ total: 10000, open: 6000, closed: 4000 })
  const [realPermits, setRealPermits] = useState<Permit[]>([])
  const [areasFromSettings, setAreasFromSettings] = useState<Area[]>([])
  const [isSynced, setIsSynced] = useState(false)
  const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString())

  // Load Factory Setting Awal dari Step 1 + Areas dari Settings + Real Permits dari Supabase - SYNC AFTER DELETE + V32 Risk Filter
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

      // Load real work_permits dari Supabase - SYNC 0 AFTER DELETE - JANGAN PAKAI MOCK KALAU SUDAH DI-DELETE! + V32 Risk + Utility
      const fetchWorkPermits = async () => {
        const { data, error, count } = await supabase.from('work_permits').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(20)
        if (!error) {
          if (data && data.length > 0) {
            const mapped = data.map((p: any) => ({
              id: p.id,
              nomor_wp: p.nomor_wp || p.nomor_wp_auto || 'MRH-CSMSWP-2026-001',
              judul_pekerjaan: p.judul || p.judul_pekerjaan || 'TEST STRICT AREA-E',
              area_id: p.area_id || 'AREA-E',
              area_name: p.area_name || p.area_id || 'AREA-E',
              work_radius_m: p.work_radius_m || p.radius_kerja || 25,
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
              risk_color: p.risk_color || (p.risk_level==='high'?'red':p.risk_level==='medium'?'yellow':'green'),
              utilities: p.utilities || p.utility_list || [],
              utility_list: p.utility_list || p.utilities || [],
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
        .channel('mapping-overlap-sync-after-delete')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'work_permits' }, () => {
          fetchWorkPermits()
        })
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    } catch {}
  }, [])

  // Permits - SYNC 0 AFTER DELETE - Jangan pakai mock kalau sudah di-delete! + V32 Risk
  const permits = useMemo(() => {
    if (isSynced) {
      if (propPermits && propPermits.length === 0 && realPermits.length === 0) {
        return []
      }
      if (propPermits && propPermits.length > 0) return propPermits
      if (realPermits.length > 0) return realPermits
      return []
    }
    if (propPermits && propPermits.length > 0) return propPermits
    if (realPermits.length > 0) return realPermits
    return []
  }, [propPermits, realPermits, isSynced])

  const areas = useMemo(() => {
    if (areasFromSettings.length > 0) return areasFromSettings
    if (propAreas && propAreas.length > 0) return propAreas.map((a: any, idx: number) => ({ ...a, x: (idx % 3) * 33 + 2, y: Math.floor(idx / 3) * 30 + 5, w: 28, h: 25 }))
    return [
      { id: 'AREA-A', name: 'Area A - Office & Warehouse', area_m2: 2000, radius_m: 25, type: 'closed', is_open: false, x: 2, y: 5, w: 28, h: 25 },
      { id: 'AREA-B', name: 'Area B - Pipe Rack & Welding', area_m2: 1500, radius_m: 22, type: 'open_without_wall', is_open: true, x: 35, y: 5, w: 28, h: 25 },
      { id: 'AREA-C', name: 'Area C - Scaffolding & Structure', area_m2: 3000, radius_m: 30.9, type: 'open_without_wall', is_open: true, x: 68, y: 5, w: 28, h: 25 },
      { id: 'AREA-D', name: 'Area D - Tank Farm', area_m2: 1000, radius_m: 17.84, type: 'closed', is_open: false, x: 2, y: 35, w: 28, h: 25 },
      { id: 'AREA-E', name: 'Area E - Electrical Substation', area_m2: 800, radius_m: 15.95, type: 'closed', is_open: false, x: 35, y: 35, w: 28, h: 25 },
      { id: 'AREA-F', name: 'Area F - Workshop General', area_m2: 2500, radius_m: 28.2, type: 'open_without_wall', is_open: true, x: 68, y: 35, w: 28, h: 25 },
      { id: 'MAIN-OFFICE', name: 'Main Office', area_m2: 1200, radius_m: 19.54, type: 'closed', is_open: false, x: 2, y: 65, w: 28, h: 25 },
      { id: 'UTILITY-CORRIDOR', name: 'Utility Corridor', area_m2: 1800, radius_m: 23.93, type: 'open_without_wall', is_open: true, x: 35, y: 65, w: 28, h: 25 },
    ] as Area[]
  }, [areasFromSettings, propAreas])

  // V32 - Pion warna sesuai Risk Level hijau/kuning/merah + Utility icon + Final Scoring sync
  const UTILITY_ICONS: any = { 'Electric': '⚡', 'Water': '💧', 'Gas': '🔥', 'Steam': '♨️', 'Angin': '💨' }

  const getRiskColor = (level: string) => {
    if (level === 'high') return { bg: 'bg-red-600', border: 'border-red-800', dot: '🔴', text: 'text-red-700', light: 'bg-red-50 border-red-300' }
    if (level === 'medium') return { bg: 'bg-yellow-400', border: 'border-yellow-600', dot: '🟡', text: 'text-yellow-700', light: 'bg-yellow-50 border-yellow-300' }
    return { bg: 'bg-green-500', border: 'border-green-700', dot: '🟢', text: 'text-green-700', light: 'bg-green-50 border-green-300' }
  }

  const getStatusColor = (permit: any) => {
    const level = permit.risk_level || 'medium'
    if (level === 'high') return 'bg-red-600'
    if (level === 'medium') return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const checkOverlap = (p1: any, p2: any) => {
    const distance = Math.sqrt(Math.pow((p1.lat - p2.lat) * 111000, 2) + Math.pow((p1.lng - p2.lng) * 111000, 2))
    const totalRadius = p1.work_radius_m + p2.work_radius_m
    return distance < totalRadius
  }

  const openAreasCount = areas.filter((a: any) => a.is_open).length
  const closedAreasCount = areas.filter((a: any) => !a.is_open).length
  const overlapCount = permits.filter((p: any) => permits.some((o: any) => o.id !== p.id && checkOverlap(p, o))).length

  // V32 Risk counts for header
  const lowRiskCount = permits.filter((p: any) => (p.risk_level || 'medium') === 'low').length
  const medRiskCount = permits.filter((p: any) => (p.risk_level || 'medium') === 'medium').length
  const highRiskCount = permits.filter((p: any) => (p.risk_level || 'medium') === 'high').length

  const filtered = useMemo(() => {
    return permits.filter((p: any) => {
      if (filterArea !== 'Semua Area + Factory 10000 M2' && p.area_id !== filterArea && !(p.area_name || '').includes(filterArea)) return false
      if (filterType !== 'Semua Type' && !(p.area_type || '').includes(filterType.toLowerCase().replace(' ', '_'))) return false
      if (filterRisk !== 'Semua Risk Level - Pion Warna' && (p.risk_level || 'medium') !== filterRisk) return false
      return true
    })
  }, [permits, filterArea, filterType, filterRisk])

  const factoryRadius = useMemo(() => Math.sqrt(factorySettings.total / Math.PI), [factorySettings.total])
  const openRadius = useMemo(() => Math.sqrt(factorySettings.open / Math.PI), [factorySettings.open])
  const closedRadius = useMemo(() => Math.sqrt(factorySettings.closed / Math.PI), [factorySettings.closed])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-2">
        <div className="bg-white border rounded-lg p-3 text-center"><p className="text-[10px] text-slate-500">Factory General</p><p className="font-black text-sm">{factorySettings.total} M2</p><p className="text-[9px]">r:{factoryRadius.toFixed(1)}m</p></div>
        <div className="bg-white border rounded-lg p-3 text-center"><p className="text-[10px] text-slate-500">Total Active WP</p><p className="font-black text-sm">{filtered.length}/5</p><p className="text-[8px]">Sync: {lastSync} {isSynced ? '✅' : '⏳'}</p><p className="text-[8px]">🟢{lowRiskCount} 🟡{medRiskCount} 🔴{highRiskCount}</p></div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center"><p className="text-[10px] text-red-600">🔴 HIGH RISK 13-25</p><p className="font-black text-sm text-red-600">{highRiskCount}</p><p className="text-[9px]">Pion Merah - Full K3</p></div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center"><p className="text-[10px]">🟡 MEDIUM 5-12</p><p className="font-black text-sm">{medRiskCount}</p><p className="text-[9px]">Pion Kuning</p></div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center"><p className="text-[10px]">🟢 LOW 1-4</p><p className="font-black text-sm text-green-600">{lowRiskCount}</p><p className="text-[9px]">Pion Hijau</p></div>
        <div className="bg-white border rounded-lg p-3 text-center"><p className="text-[10px]">Open tanpa tembok</p><p className="font-black text-sm">{openAreasCount}</p><p className="text-[9px]">Bisa overlap beda area</p></div>
        <div className="bg-white border rounded-lg p-3 text-center"><p className="text-[10px]">Closed dengan tembok</p><p className="font-black text-sm">{closedAreasCount}</p><p className="text-[9px]">Hanya area sama</p></div>
      </div>

      <div className="bg-white border rounded-xl p-4 flex gap-3">
        <select value={filterArea} onChange={e=>setFilterArea(e.target.value)} className="border p-2 rounded text-xs flex-1">
          <option>Semua Area + Factory {factorySettings.total} M2</option>
          {areas.map((a: any) => <option key={a.id} value={a.id}>{a.name} - {a.area_m2} M2 - r:{a.radius_m}m - {a.type} {a.is_open ? '[OPEN]' : ''}</option>)}
        </select>
        <select value={filterType} onChange={e=>setFilterType(e.target.value)} className="border p-2 rounded text-xs flex-1">
          <option>Semua Type</option>
          <option>open_without_wall - Open tanpa tembok (boleh overlap beda area)</option>
          <option>closed - Closed dengan tembok (hanya area sama)</option>
        </select>
        <select value={filterRisk} onChange={e=>setFilterRisk(e.target.value)} className="border p-2 rounded text-xs flex-1 font-bold">
          <option>Semua Risk Level - Pion Warna</option>
          <option value="low">🟢 LOW 1-4 - Pion Hijau - APD Basic</option>
          <option value="medium">🟡 MEDIUM 5-12 - Pion Kuning - APD+JSA+SO</option>
          <option value="high">🔴 HIGH 13-25 - Pion Merah - Full K3</option>
        </select>
      </div>


      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <div className="bg-white border-2 border-slate-800 rounded-xl p-4">
            <h3 className="font-black text-sm mb-1">🏭 FACTORY LAYOUT - {factorySettings.total} M2 - Scale 1:{Math.round(factoryRadius)} - Visual Worker + Nomor WP + Radius + Pion Warna Risk + Utility - Real Data - Sync {lastSync}</h3>
            <p className="text-[10px] text-slate-500 mb-3">Berdasarkan Step 1 Factory Setting Awal: Total {factorySettings.total} M2 (r:{factoryRadius.toFixed(1)}m) | Open {factorySettings.open} M2 (r:{openRadius.toFixed(1)}m) | Closed {factorySettings.closed} M2 (r:{closedRadius.toFixed(1)}m) | Layout pakai skala gunakan data real di Supabase - Pion warna Risk Level 🟢🟡🔴 + Utility ⚡💧🔥♨️💨 - Setelah delete semua WP, harus 0 pion!</p>
            
            <div className="relative w-full h-[600px] bg-slate-100 border-2 border-slate-800 rounded-lg overflow-hidden" style={{ backgroundImage: 'linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
              <div className="absolute inset-1 border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-400 bg-white px-2">FACTORY {factorySettings.total} M2 - r:{factoryRadius.toFixed(1)}m - Scale - {filtered.length} WP - Risk 🟢{lowRiskCount} 🟡{medRiskCount} 🔴{highRiskCount} - {isSynced ? 'Synced ✅' : 'Loading ⏳'}</span>
              </div>

              {areas.map((area: any) => (
                <div key={area.id} className={`absolute border-2 rounded-lg flex flex-col items-center justify-center p-1 ${area.is_open ? 'bg-yellow-50 border-yellow-400 border-dashed' : 'bg-blue-50 border-blue-400'}`} style={{ left: area.x + '%', top: area.y + '%', width: area.w + '%', height: area.h + '%' }}>
                  <p className="font-black text-[9px] text-center leading-tight">{area.name.split(' - ')[0]}</p>
                  <p className="text-[7px] text-center leading-tight">{area.area_m2} M2</p>
                  <p className="text-[7px] text-center">r:{area.radius_m}m</p>
                  <p className="text-[6px] px-1 rounded bg-white border mt-0.5">{area.type} {area.is_open ? '[OPEN]' : '[CLOSED]'}</p>
                </div>
              ))}

              {filtered.map((permit: any, idx: number) => {
                const areaDef = areas.find((a: any) => a.id === permit.area_id)
                if (!areaDef) return null
                const sameAreaIdx = filtered.filter((p: any, i: number) => p.area_id === permit.area_id && i <= idx).length - 1
                const cols = 2
                const offsetX = (sameAreaIdx % cols) * 32 - 16
                const offsetY = Math.floor(sameAreaIdx / cols) * 36
                const level = permit.risk_level || 'medium'
                const color = getRiskColor(level)
                const utils = permit.utilities || permit.utility_list || []
                const score = permit.risk_score || 9
                return (
                  <div key={permit.id} className="absolute flex flex-col items-center cursor-pointer hover:scale-110 transition-transform z-10" style={{ left: `calc(${areaDef.x}% + ${areaDef.w}%/2 + ${offsetX}px)`, top: `calc(${areaDef.y}% + ${areaDef.h}%/2 + ${offsetY}px)`, transform: 'translate(-50%, -50%)' }} onClick={()=>setSelectedPermit(permit)}>
                    <div className={`w-12 h-12 rounded-full ${color.bg} border-4 ${color.border} shadow-lg flex flex-col items-center justify-center text-white font-black text-[10px] relative`}>
                      <div>{color.dot}</div>
                      <div className="text-[7px]">{permit.nomor_wp?.slice(-3) || idx+1}</div>
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black text-white border-2 border-white flex items-center justify-center text-[8px] font-black">{score}</div>
                    </div>
                    <div className={`mt-1 text-white text-[8px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap max-w-[110px] truncate ${color.bg}`}>{permit.nomor_wp} {color.dot} {level.toUpperCase()} {score}</div>
                    <div className="bg-white border text-[7px] px-1 rounded mt-0.5 shadow max-w-[110px] truncate">{permit.vendor_name} {utils[0] ? UTILITY_ICONS[utils[0].jenis] || '' : ''}</div>
                    <div className="bg-blue-600 text-white text-[6px] px-1 rounded mt-0.5">{(permit.area_name || permit.area_id || 'AREA').split(' - ')[0]} - r:{permit.work_radius_m}m - {utils.map((u:any)=>UTILITY_ICONS[u.jenis]||'').join('')}</div>
                  </div>
                )
              })}

              {filtered.length === 0 && (
                <div className="absolute bottom-2 right-2 bg-white/80 border rounded px-2 py-1 text-[8px] text-slate-500">
                  0 WP - Filter {filterRisk} - Sync: {lastSync} - Siap buat {factorySettings.total} M2 dari mrh-csmswp-2026-001
                </div>
              )}
            </div>

            <div className="mt-3 bg-white border border-slate-300 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
                <div className="flex items-center gap-2 bg-green-50 border border-green-300 px-3 py-1.5 rounded-full"><div className="w-3 h-3 bg-green-500 rounded-full"></div><span className="text-green-700">🟢 LOW 1-4 SAFE</span></div>
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 px-3 py-1.5 rounded-full"><div className="w-3 h-3 bg-yellow-500 rounded-full"></div><span className="text-yellow-700">🟡 MEDIUM 5-12 WARNING</span></div>
                <div className="flex items-center gap-2 bg-red-50 border border-red-300 px-3 py-1.5 rounded-full"><div className="w-3 h-3 bg-red-600 rounded-full"></div><span className="text-red-700">🔴 HIGH 13-25 OVERLAP</span></div>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 px-4 py-1.5 rounded-full text-[11px] font-bold">
                <span>Pion Risk + Utility</span><span>⚡💧🔥♨️💨</span><span className="bg-blue-600 text-white px-2 py-0.5 rounded-full">{filtered.length} WP - {filtered.length === 0 ? '0 pion' : `${filtered.length} pion`}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-4">
            <h3 className="font-black text-xs mb-2">REAL DATA - Active Work Permits ({filtered.length}) - Risk Pion Warna + Utility - Sync {lastSync}</h3>
            {filtered.length === 0 ? (
              <div className="border-2 border-dashed border-green-300 bg-green-50 rounded-lg p-6 text-center">
                <p className="font-black text-sm">✅ 0 Work Permit - Filter {filterRisk}</p>
                <p className="text-[11px] mt-2">Semua WP sudah di-delete manual di 2. E-Work Permit (Flow) - V9 per WP atau SQL DELETE FROM work_permits</p>
                <p className="text-[10px] mt-1">Dashboard otomatis sync: TOTAL WORK PERMIT = 0, Active = 0, Pending = 0, Risk 🟢0 🟡0 🔴0</p>
                <p className="text-[9px] mt-2">Nomor WP auto: mrh-csmswp-2026-001 sudah muncul di 2. E-Work Permit setelah delete - Siap buat WP baru dari 001 sampai A4 QR - Sync: {lastSync}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-auto">
                {filtered.map((p: any, i: number) => {
                  const level = p.risk_level || 'medium'
                  const color = getRiskColor(level)
                  const utils = p.utilities || p.utility_list || []
                  return (
                    <div key={p.id} className={`border-2 rounded-lg p-2 cursor-pointer ${selectedPermit?.id === p.id ? 'bg-blue-50 border-blue-400' : color.light}`} onClick={()=>setSelectedPermit(p)}>
                      <p className="font-bold text-[11px]">{i+1}. {p.judul_pekerjaan} - {p.area_name} {color.dot} <span className={`px-1 py-0.5 rounded text-[9px] ${color.bg} text-white`}>{level.toUpperCase()} {p.risk_score||9} ({p.risk_likelihood||3}x{p.risk_severity||3})</span></p>
                      <p className="text-[9px] text-slate-600 mt-1">No WP: {p.nomor_wp} | Vendor: {p.vendor_name} | Radius: {p.work_radius_m}m = {(Math.PI * p.work_radius_m * p.work_radius_m).toFixed(0)} M2 | Area: {p.area_radius_m}m | PJ: {p.pj} | SO: {p.so}</p>
                      <p className="text-[8px] mt-1">Utility: {utils.length>0 ? utils.map((u:any)=>`${UTILITY_ICONS[u.jenis]||''} ${u.jenis} ${u.pemakaian}${u.satuan} ${u.durasi||u.durasi_jam||0}j`).join(', ') : '-'} | Tgl: {p.tgl_mulai} s/d {p.tgl_selesai}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {selectedPermit ? (
            <div className="bg-white border-2 border-blue-300 rounded-xl p-4">
              <h3 className="font-black text-xs mb-2">Detail: {selectedPermit.judul_pekerjaan} - {selectedPermit.vendor_name} {getRiskColor(selectedPermit.risk_level||'medium').dot} {selectedPermit.risk_level?.toUpperCase()} {selectedPermit.risk_score}</h3>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div><p className="font-bold">Area:</p><p className="text-[10px]">{selectedPermit.area_name}</p><p className="text-[10px]">M2: {areas.find((a:any)=>a.id===selectedPermit.area_id)?.area_m2 || selectedPermit.work_area_m2} M2</p><p className="text-[10px]">Type: {selectedPermit.area_type}</p><p className="text-[10px]">Risk: {(selectedPermit as any).risk_level} Score {(selectedPermit as any).risk_score} ({(selectedPermit as any).risk_likelihood}x{(selectedPermit as any).risk_severity})</p></div>
                <div><p><span className="font-bold">Work Radius:</span> {selectedPermit.work_radius_m}m</p><p><span className="font-bold">Area Radius:</span> {selectedPermit.area_radius_m}m</p><p><span className="font-bold">Factory:</span> {selectedPermit.factory}</p><p><span className="font-bold">Utility:</span> {(selectedPermit.utilities||selectedPermit.utility_list||[]).map((u:any)=>`${UTILITY_ICONS[u.jenis]||''}${u.jenis}`).join(', ') || '-'}</p></div>
              </div>
            </div>
          ) : (
            <div className="bg-white border rounded-xl p-8 text-center text-slate-400 text-xs">
              {filtered.length === 0 ? '✅ 0 WP' : ''}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MappingOverlap
