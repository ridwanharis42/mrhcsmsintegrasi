
# CSMS Construction Integrated - 100% FREE Stack

## Cara Jalan (Gratis Total)
1. Buat project gratis di https://supabase.com (Free tier)
2. Copy .env.example jadi .env, isi VITE_SUPABASE_URL & ANON_KEY
3. Buka Supabase SQL Editor, copy-paste supabase/schema.sql -> RUN
4. Deploy Edge Function overlap:
   ```
   npm install -g supabase
   supabase login
   supabase link --project-ref YOUR_REF
   supabase functions deploy check-overlap
   ```
5. Di laptop:
   ```
   npm install
   npm run dev
   ```
6. Deploy gratis ke Vercel: push ke GitHub, import di vercel.com

## Fitur 100% Free yang sudah ada
- Auth + RBAC 5 role
- Realtime Work Permit & Patrol
- Storage foto temuan
- Overlap Engine (Edge Function)
- PWA offline patrol
- Map Leaflet gratis

## File Excel Template yang kemarin bisa langsung import via:
POST /rest/v1/workers -> bulk via xlsx lib
Lihat src/features/workers/WorkerImport.tsx untuk contoh parser
