
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Area, AREAS_FALLBACK } from '../types'

export function useAreas(){
  const [areas, setAreas] = useState<Area[]>(AREAS_FALLBACK)
  useEffect(()=>{ load() },[])
  async function load(){
    const { data } = await supabase.from('areas').select('*').order('id')
    if(data && data.length>0) setAreas(data)
  }
  return { areas }
}
