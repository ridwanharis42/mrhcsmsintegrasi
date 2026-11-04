
// Supabase Edge Function - 100% FREE - Overlap Detection Engine
// Deploy: supabase functions deploy check-overlap

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const { area_id, start_time, end_time, risk_level, type, lat, lng } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Ambil permit ACTIVE di area & tanggal sama
    const { data: activePermits, error } = await supabase
      .from('work_permits')
      .select('id, permit_no, type, risk_level, start_time, end_time, lat, lng, vendor_id, vendors(name)')
      .eq('area_id', area_id)
      .eq('status', 'ACTIVE')

    if (error) throw error

    let isOverlap = false
    let level = 'NONE'
    let conflicts: any[] = []
    let message = 'Tidak ada overlap'

    const newStart = new Date(start_time).getTime()
    const newEnd = new Date(end_time).getTime()

    for (const p of activePermits || []) {
      const pStart = new Date(p.start_time).getTime()
      const pEnd = new Date(p.end_time).getTime()

      // Cek time overlap
      const timeOverlap = newStart < pEnd && newEnd > pStart
      if (!timeOverlap) continue

      // Cek jarak jika ada lat/lng ( <50m = overlap)
      let distance = 0
      if (lat && lng && p.lat && p.lng) {
        const R = 6371e3
        const φ1 = lat * Math.PI/180, φ2 = p.lat * Math.PI/180
        const Δφ = (p.lat-lat) * Math.PI/180
        const Δλ = (p.lng-lng) * Math.PI/180
        const a = Math.sin(Δφ/2)*Math.sin(Δφ/2) + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)*Math.sin(Δλ/2)
        distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      }

      const isCriticalCombo = 
        (risk_level === 'High' || p.risk_level === 'High') ||
        (type === 'HOT_WORK' && p.type === 'CONFINED') ||
        (type === 'CONFINED' && p.type === 'HOT_WORK') ||
        (type === 'LIFTING' && p.type === 'WORKING_AT_HEIGHT')

      if (timeOverlap && (distance < 50 || !lat)) {
        if (isCriticalCombo) {
          isOverlap = true
          level = 'CRITICAL'
          conflicts.push(p)
        } else if (!isOverlap) {
          isOverlap = true
          level = 'MEDIUM'
          conflicts.push(p)
        }
      }
    }

    if (isOverlap) {
      if (level === 'CRITICAL') {
        message = `OVERLAP KRITIS terdeteksi dengan ${conflicts.length} permit aktif: ` + conflicts.map(c=>`${c.permit_no} (${c.type})`).join(', ') + '. Wajib Joint JSA Meeting.'
      } else {
        message = `Overlap MEDIUM dengan ${conflicts[0]?.permit_no} (${conflicts[0]?.type}) jam ${new Date(conflicts[0]?.start_time).toLocaleTimeString()}`
      }
    }

    return new Response(JSON.stringify({
      is_overlap: isOverlap,
      level,
      message,
      conflicting_permits: conflicts
    }), { headers: { "Content-Type": "application/json" } })

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400 })
  }
})
