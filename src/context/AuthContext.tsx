import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

type Role = 'general_contractor' | 'admin_contractor' | 'owner_project' | 'owner_area' | 'manager' | 'utility' | 'hse_officer' | 'hse' | 'general_manager' | 'gm' | 'contractor' | 'admin'

type Profile = {
  id: string
  email: string
  role: Role
  vendor_id: string | null
  vendor_name: string | null
  area_id: string | null
}

type AuthState = {
  userId: string | null
  profile: Profile | null
  role: Role | null
  isGeneralContractor: boolean
  loading: boolean
  canCreatePermit: boolean
  canApprove: (level: string) => boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  userId: null,
  profile: null,
  role: null,
  isGeneralContractor: false,
  loading: true,
  canCreatePermit: false,
  canApprove: () => false,
  logout: async () => {}
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('mrh_profile')
    const storedUserId = localStorage.getItem('mrh_user_id')
    if (stored) {
      try {
        const p = JSON.parse(stored) as Profile
        setProfile(p)
        setUserId(storedUserId)
      } catch {}
    }
    setLoading(false)

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.session.user.id).single()
        if (prof) {
          setProfile(prof as Profile)
          setUserId(data.session.user.id)
          localStorage.setItem('mrh_profile', JSON.stringify(prof))
        }
      }
    })
  }, [])

  const isGeneralContractor = profile?.role === 'general_contractor' || (profile?.role === 'contractor' && profile?.vendor_id === null) || profile?.role === 'admin_contractor' || profile?.role === 'admin'

  const canCreatePermit = ['contractor','general_contractor','admin_contractor','admin'].includes(profile?.role || '')

  const canApprove = (requiredLevel: string) => {
    if (!profile) return false
    const r = profile.role
    if (r === 'admin' || r === 'admin_contractor') return true
    // Mapping: owner_project / owner_area = pending_owner, manager/utility = pending_utility, hse_officer/hse = pending_hse, general_manager/gm = pending_gm
    if (requiredLevel === 'pending_owner' && (r === 'owner_project' || r === 'owner_area')) return true
    if (requiredLevel === 'pending_utility' && (r === 'manager' || r === 'utility')) return true
    if (requiredLevel === 'pending_hse' && (r === 'hse_officer' || r === 'hse')) return true
    if (requiredLevel === 'pending_gm' && (r === 'general_manager' || r === 'gm')) return true
    return false
  }

  const logout = async () => {
    await supabase.auth.signOut()
    localStorage.clear()
    setProfile(null)
    setUserId(null)
    window.location.href = '/'
  }

  return (
    <AuthContext.Provider value={{ userId, profile, role: profile?.role || null, isGeneralContractor, loading, canCreatePermit, canApprove, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
