
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Patrol } from '../types'

export function usePatrols(){
  const [patrols, setPatrols] = useState<Patrol[]>([])

  useEffect(()=>{ load() },[])

  async function load(){
    const { data } = await supabase.from('patrols').select('*').order('created_at',{ascending:false})
    if(data) setPatrols(data)
  }

  async function addPatrol(patrolForm: Patrol, permits:any[]){
    if(!patrolForm.work_permit_id){ alert('Pilih WP Active'); return null }
    const wp = permits.find(p=>p.id===patrolForm.work_permit_id)
    if(wp){ patrolForm.area_id = wp.area_id; patrolForm.vendor_name = wp.vendor_name }
    const { data, error } = await supabase.from('patrols').insert({...patrolForm, status:'open'}).select()
    if(error){ alert(error.message); return null }
    if(data){ setPatrols([data[0], ...patrols]); return data[0] }
    return null
  }

  return { patrols, setPatrols, addPatrol, load }
}
