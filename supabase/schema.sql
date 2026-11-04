
-- CSMS CONSTRUCTION INTEGRATED - SUPABASE SCHEMA 100% FREE
-- Jalankan di Supabase SQL Editor

-- Enable UUID
create extension if not exists "uuid-ossp";

-- 1. AREAS (Master Area A-F)
create table areas (
  id text primary key, -- AREA-A, AREA-B, etc
  name text not null,
  description text,
  polygon_json jsonb, -- untuk Leaflet polygon
  created_at timestamptz default now()
);
insert into areas (id, name) values 
('AREA-A','Area A - Office & Warehouse'),
('AREA-B','Area B - Pipe Rack & Welding'),
('AREA-C','Area C - Scaffolding & Structure'),
('AREA-D','Area D - Tank Farm'),
('AREA-E','Area E - Electrical Substation'),
('AREA-F','Area F - Excavation & Civil'),
('AREA-UTILITY','Utility Corridor'),
('AREA-OFFICE','Main Office');

-- 2. VENDORS
create table vendors (
  id uuid primary key default uuid_generate_v4(),
  name text not null, -- PT Wijaya Karya
  npwp text,
  classification text, -- Kecil/Sedang/Besar
  sbu text,
  iso_45001 boolean default false,
  status text default 'REGISTERED', -- REGISTERED, LOLOS, BERSYARAT, GUGUR
  final_score numeric default 0,
  created_at timestamptz default now()
);

-- 3. PREQUAL ASSESSMENTS (8 Elemen)
create table prequal_assessments (
  id uuid primary key default uuid_generate_v4(),
  vendor_id uuid references vendors(id) on delete cascade,
  total_score numeric default 0,
  status text default 'DRAFT', -- DRAFT, LOLOS, BERSYARAT, GUGUR
  assessed_by uuid,
  created_at timestamptz default now()
);
create table prequal_answers (
  id uuid primary key default uuid_generate_v4(),
  assessment_id uuid references prequal_assessments(id) on delete cascade,
  element_no int, -- 1-8
  element_name text,
  question text,
  score numeric, -- 0-100
  evidence_url text,
  created_at timestamptz default now()
);

-- 4. WORKERS
create table workers (
  id uuid primary key default uuid_generate_v4(),
  vendor_id uuid references vendors(id),
  full_name text not null,
  nik text unique not null,
  position text,
  cert_type text, -- TKBT2, WAH, etc
  cert_no text,
  cert_issue_date date,
  cert_expired_date date,
  status text generated always as (
    case when cert_expired_date < current_date then 'TIDAK_LAIK' 
    when cert_expired_date < current_date + interval '30 days' then 'H-30'
    else 'LAIK' end
  ) stored,
  qr_code text,
  created_at timestamptz default now()
);

-- 5. EQUIPMENTS
create table equipments (
  id uuid primary key default uuid_generate_v4(),
  vendor_id uuid references vendors(id),
  type text not null, -- Crane, Forklift, Gas Detector
  brand_model text,
  serial_no text,
  sia_no text,
  sia_expired_date date,
  last_calibration_date date,
  next_calibration_date date,
  calibration_interval int, -- hari
  status text generated always as (
    case when sia_expired_date < current_date then 'TIDAK_LAIK'
    when next_calibration_date < current_date then 'OVERDUE'
    when next_calibration_date < current_date + interval '14 days' then 'H-14'
    else 'LAIK' end
  ) stored,
  created_at timestamptz default now()
);

create table equipment_calibrations (
  id uuid primary key default uuid_generate_v4(),
  equipment_id uuid references equipments(id) on delete cascade,
  cal_date date not null,
  result text, -- PASS/FAIL
  certificate_no text,
  new_expired_date date,
  photo_url text,
  created_at timestamptz default now()
);

-- 6. WORK PERMITS (CORE)
create table work_permits (
  id uuid primary key default uuid_generate_v4(),
  permit_no text unique, -- WP-2026-001 auto
  vendor_id uuid references vendors(id),
  area_id text references areas(id),
  type text not null, -- HOT_WORK, WAH, CONFINED, LIFTING, EXCAVATION, LOTO, SCAFFOLDING, GENERAL
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  risk_level text, -- Low, Medium, High
  lat double precision,
  lng double precision,
  jsa_url text,
  status text default 'DRAFT', -- DRAFT, HOLD_OVERLAP, SUBMITTED, APPROVED_AREA, APPROVED_UTILITY, APPROVED_HSE, ACTIVE, CLOSED, REJECTED
  created_at timestamptz default now()
);

-- Junction worker & equipment
create table permit_personnel (
  permit_id uuid references work_permits(id) on delete cascade,
  worker_id uuid references workers(id),
  primary key (permit_id, worker_id)
);
create table permit_equipments (
  permit_id uuid references work_permits(id) on delete cascade,
  equipment_id uuid references equipments(id),
  primary key (permit_id, equipment_id)
);

create table permit_approvals (
  id uuid primary key default uuid_generate_v4(),
  permit_id uuid references work_permits(id) on delete cascade,
  role text, -- AREA_OWNER, UTILITY, HSE_MANAGER, OWNER
  approver_name text,
  decision text, -- APPROVED, REJECTED
  notes text,
  created_at timestamptz default now()
);

-- 7. PATROLS
create table patrols (
  id uuid primary key default uuid_generate_v4(),
  area_id text references areas(id),
  patrol_type text, -- INTERNAL, HSE_OWNER, JOINT, MANAGEMENT_WALKTHROUGH
  inspector_name text,
  inspector_role text,
  created_at timestamptz default now()
);

create table patrol_findings (
  id uuid primary key default uuid_generate_v4(),
  patrol_id uuid references patrols(id) on delete cascade,
  vendor_id uuid references vendors(id),
  category text,
  description text,
  risk_level text,
  photo_before_url text,
  lat double precision,
  lng double precision,
  pic_name text,
  due_date date,
  status text default 'OPEN', -- OPEN, IN_PROGRESS, READY_FOR_VERIFY, CLOSED, REJECTED
  created_at timestamptz default now()
);

create table patrol_followups (
  id uuid primary key default uuid_generate_v4(),
  finding_id uuid references patrol_findings(id) on delete cascade,
  action_taken text,
  photo_after_url text,
  created_at timestamptz default now()
);

create table patrol_verifications (
  id uuid primary key default uuid_generate_v4(),
  finding_id uuid references patrol_findings(id) on delete cascade,
  verifier_name text,
  verifier_role text,
  verdict text, -- CLOSED, REJECTED
  notes text,
  created_at timestamptz default now()
);

-- Enable Realtime
alter publication supabase_realtime add table work_permits, patrol_findings;

-- RLS (simple - allow all for free tier demo, nanti tambah policy RBAC)
alter table vendors enable row level security;
create policy "allow all" on vendors for all using (true) with check (true);
alter table work_permits enable row level security;
create policy "allow all" on work_permits for all using (true) with check (true);
alter table workers enable row level security;
create policy "allow all" on workers for all using (true) with check (true);
alter table equipments enable row level security;
create policy "allow all" on equipments for all using (true) with check (true);
alter table patrol_findings enable row level security;
create policy "allow all" on patrol_findings for all using (true) with check (true);
