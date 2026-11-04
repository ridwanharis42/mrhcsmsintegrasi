// src/hooks/useWorkPermits.ts - V6.8.2 FIX Ln24-25
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { checkOverlapWithRadius, checkOverlap } from '../lib/distance'

export function useWorkPermits(){
  const [permits, setPermits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function fetchPermits(){
    setLoading(true)
    const { data } = await supabase.from('work_permits').select('*').order('created_at', { ascending: false })
    setPermits(data||[])
    setLoading(false)
  }

  useEffect(()=>{ fetchPermits() }, [])

  // FIX V6.8: Fungsi cek overlap yang benar, bukan array.includes
  function checkAllOverlap(lat: number, lng: number, radiusM: number, areaId: string, areaType: string){
    let warning = ''
    for(const other of permits){
      if(other.status !== 'active' && !other.status?.startsWith('pending_')) continue
      const sameArea = other.area_id === areaId
      if(areaType === 'closed' && !sameArea) continue // closed hanya cek area sama
      const res = checkOverlapWithRadius(lat, lng, radiusM, other.lat, other.lng, other.work_radius_m||0)
      if(res.isOverlap){
        warning = `OVERLAP dengan ${other.title} - Jarak ${res.distanceM.toFixed(1)}m < ${res.totalRadiusM.toFixed(1)}m`
        break
      }
    }
    return warning
  }

  async function addPermit(payload:any, vendors:any[]){
    const { data, error } = await supabase.from('work_permits').insert({
      ...payload,
      approval_level: 1,
      current_approver_role: 'Owner Area',
      status: 'pending_owner',
      approval_history: [{ level:1, role:'Owner Area', action:'submitted', timestamp: new Date().toISOString() }],
      created_at: new Date().toISOString()
    }).select()
    if(error){ alert(error.message); return null }
    await fetchPermits()
    return data
  }

  async function updateStatus(id:string, newStatus:string, level:number, approverRole:string, rejectionReason?:string){
    const current = permits.find(p=>p.id===id)
    const history = [...(current?.approval_history||[]), { level, role: approverRole, action: newStatus, timestamp: new Date().toISOString(), reason: rejectionReason }]
    const updateData:any = { status: newStatus, approval_level: level, current_approver_role: approverRole, approval_history: history }
    if(rejectionReason) updateData.rejection_reason = rejectionReason
    else updateData.rejection_reason = null
    const { error } = await supabase.from('work_permits').update(updateData).eq('id', id)
    if(error){ alert(error.message); return }
    await fetchPermits()
  }

  return { permits, loading, fetchPermits, addPermit, updateStatus, checkAllOverlap, useWorkPermitsHook: { permits, addPermit, updateStatus } }
}
