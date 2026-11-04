
import { createClient } from '@supabase/supabase-js'
const url = (import.meta as any).env?.VITE_SUPABASE_URL
const key = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY
if(!url || !key) console.warn('Supabase env missing - check root .env')
export const supabase = createClient(url, key)
