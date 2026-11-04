import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Vendor, ELEMEN_TEMPLATE, APP_CONFIG } from '../types'

export function useVendors(){
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [scoringDetail, setScoringDetail] = useState<Record<string, {score:number, fileName?:string}>>({})

  useEffect(()=>{ load() },[])

  async function load(){
    const { data } = await supabase.from('vendors').select('*').order('created_at',{ascending:false})
    if(data) setVendors(data)
  }

  function calcElementScores(detail: Record<string, {score:number}>){
    const elemScores: Record<number, number> = {}
    for(let elem=1; elem<=8; elem++){
      const qs = ELEMEN_TEMPLATE[elem].questions
      let sum=0
      qs.forEach(q=>{ sum += detail[q.no]?.score || 0 })
      elemScores[elem]=sum
    }
    return elemScores
  }

  function handleScoreChange(no:string, score:number){
    const newDetail = {...scoringDetail, [no]: {...(scoringDetail[no]||{}), score}}
    setScoringDetail(newDetail)
  }

  function handleFileChange(no:string, file: File){
    const newDetail = {...scoringDetail, [no]: {...(scoringDetail[no]||{score:0}), fileName: file.name}}
    setScoringDetail(newDetail)
  }

  async function addVendor(vForm: Vendor){
    const elemScores = calcElementScores(scoringDetail)
    const total = Object.values(elemScores).reduce((a,b)=>a+b,0)
    const status = total>=APP_CONFIG.SCORE_THRESHOLD.LOLOS ? 'lolos' : total>=APP_CONFIG.SCORE_THRESHOLD.BERSYARAT ? 'bersyarat' : 'tidak_lolos'
    const payload = {
      ...vForm,
      element_1: elemScores[1], element_2: elemScores[2], element_3: elemScores[3], element_4: elemScores[4],
      element_5: elemScores[5], element_6: elemScores[6], element_7: elemScores[7], element_8: elemScores[8],
      total_score: total, status, permit_count:0, scoring_detail: scoringDetail
    }
    const { data, error } = await supabase.from('vendors').insert(payload).select()
    if(error){ alert(error.message); return null }
    if(data){ setVendors([data[0], ...vendors]); setScoringDetail({}); return data[0] }
    return null
  }

  async function updateVendor(id:string, vForm: Vendor){
    const elemScores = calcElementScores(scoringDetail)
    const total = Object.values(elemScores).reduce((a,b)=>a+b,0)
    const status = total>=APP_CONFIG.SCORE_THRESHOLD.LOLOS ? 'lolos' : total>=APP_CONFIG.SCORE_THRESHOLD.BERSYARAT ? 'bersyarat' : 'tidak_lolos'
    const payload = {
      ...vForm,
      element_1: elemScores[1], element_2: elemScores[2], element_3: elemScores[3], element_4: elemScores[4],
      element_5: elemScores[5], element_6: elemScores[6], element_7: elemScores[7], element_8: elemScores[8],
      total_score: total, status, scoring_detail: scoringDetail
    }
    // Remove id from payload if present to avoid conflict
    const { data, error } = await supabase.from('vendors').update(payload).eq('id', id).select()
    if(error){ alert('Gagal update: ' + error.message); return null }
    if(data){
      // Replace in local state, not add new row
      setVendors(vendors.map(v=> v.id===id ? data[0] : v))
      setScoringDetail({})
      return data[0]
    }
    return null
  }

  return { vendors, setVendors, scoringDetail, setScoringDetail, calcElementScores, handleScoreChange, handleFileChange, addVendor, updateVendor, load }
}
