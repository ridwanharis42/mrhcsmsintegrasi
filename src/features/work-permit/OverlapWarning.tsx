
import { useState } from 'react'
import { AlertTriangle, XCircle, CheckCircle } from 'lucide-react'

type OverlapResult = {
  is_overlap: boolean
  level: 'CRITICAL' | 'MEDIUM' | 'NONE'
  message: string
  conflicting_permits: any[]
}

export function OverlapWarning({ result }: { result: OverlapResult | null }) {
  if (!result) return null

  if (!result.is_overlap) {
    return (
      <div className="flex gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <CheckCircle className="w-5 h-5 text-emerald-600" />
        <span className="text-sm text-emerald-800">Tidak ada overlap - Aman untuk submit</span>
      </div>
    )
  }

  if (result.level === 'CRITICAL') {
    return (
      <div className="p-4 bg-red-50 border-2 border-red-500 rounded-lg space-y-2">
        <div className="flex gap-2 items-center">
          <XCircle className="w-6 h-6 text-red-600" />
          <h4 className="font-bold text-red-800">OVERLAP KRITIS - AUTO HOLD</h4>
        </div>
        <p className="text-sm text-red-700">{result.message}</p>
        <div className="mt-2">
          <p className="text-xs font-semibold text-red-800">Conflicting Permits:</p>
          <ul className="list-disc ml-5 text-xs text-red-700">
            {result.conflicting_permits.map((p:any)=>(
              <li key={p.id}>{p.permit_no} - {p.type} - {p.vendors?.name} - Risk {p.risk_level}</li>
            ))}
          </ul>
        </div>
        <div className="p-2 bg-red-100 rounded text-xs text-red-800">
          Action Wajib: 1) Joint JSA Meeting dengan semua kontraktor di area sama, 2) Atur ulang jam kerja, 3) Upload Berita Acara Joint Meeting
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2 p-3 bg-amber-50 border border-amber-400 rounded-lg">
      <AlertTriangle className="w-5 h-5 text-amber-600" />
      <div>
        <p className="text-sm font-semibold text-amber-800">Overlap MEDIUM</p>
        <p className="text-xs text-amber-700">{result.message}</p>
      </div>
    </div>
  )
}

// Hook untuk panggil Edge Function
export function useCheckOverlap(){
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OverlapResult | null>(null)

  const check = async (payload: {area_id:string, start_time:string, end_time:string, risk_level:string, type:string, lat?:number, lng?:number}) => {
    setLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-overlap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      setResult(data)
      return data
    } finally {
      setLoading(false)
    }
  }
  return { check, result, loading }
}
