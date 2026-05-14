-- =============================================================
-- SMART CARE SENSE — Full Platform Schema (Fresh Project)
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. TABLES
-- ─────────────────────────────────────────────────────────────

-- Core Profiles
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  date_of_birth date,
  sex text,
  blood_type text,
  height_cm numeric,
  weight_kg numeric,
  medical_conditions text[] default '{}',
  medications text[] default '{}',
  allergies text[] default '{}',
  updated_at timestamptz default now()
);

-- User Roles
create type public.user_role as enum ('patient', 'doctor', 'admin');
create table if not exists public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  role       public.user_role not null default 'patient',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Vitals readings (Foundation)
create table if not exists public.vitals_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  metric_type text not null,
  value numeric not null,
  unit text not null,
  recorded_at timestamptz default now()
);

-- System Alerts (Anomalies)
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  severity text not null check (severity in ('info', 'warning', 'critical')),
  title text not null,
  message text not null,
  metric_type text,
  metric_value numeric,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- Professional Doctor Profiles
create table if not exists public.doctor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  specialty text not null,
  license_number text not null unique,
  years_experience integer default 0,
  bio text,
  hospital_affiliation text,
  is_verified boolean default false,
  is_accepting_patients boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Doctor-Patient Assignments
create table if not exists public.doctor_patient_assignments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id),
  assigned_at timestamptz not null default now(),
  is_primary boolean default true,
  unique(doctor_id, patient_id)
);

-- Appointments
create type public.appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  doctor_id uuid not null references auth.users(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes integer default 30,
  status public.appointment_status not null default 'pending',
  type text not null default 'general_checkup',
  location_type text not null default 'in_person', -- 'in_person', 'video', 'phone'
  patient_notes text,
  doctor_notes text,
  cancelled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prescriptions
create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  doctor_id uuid not null references auth.users(id) on delete cascade,
  medication text not null,
  dosage text not null,
  frequency text not null,
  instructions text,
  start_date date not null default current_date,
  end_date date,
  is_active boolean default true,
  refills integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Direct Messages (Real-time Chat)
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id text not null, -- formatted as 'uid1_uid2' (sorted)
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  client_id text, -- for offline dedup
  is_read boolean default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_dm_conversation on public.direct_messages(conversation_id);

-- Emergency Escalation Alerts
create table if not exists public.emergency_alerts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  doctor_id uuid not null references auth.users(id) on delete cascade,
  triggered_by_alert_id uuid references public.alerts(id),
  status text not null default 'triggered', -- 'triggered', 'acknowledged', 'resolved'
  metric_type text,
  metric_value numeric,
  message text not null,
  doctor_notes text,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

-- Weekly Reports
create table if not exists public.weekly_vital_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  doctor_id uuid not null references auth.users(id) on delete cascade,
  report_week_start date not null,
  report_data jsonb not null,
  summary_text text,
  sent_to_doctor boolean default false,
  sent_at timestamptz,
  generated_at timestamptz not null default now(),
  unique(patient_id, report_week_start)
);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  action_url text,
  is_read boolean default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Doctor Availability Slots
create table if not exists public.doctor_availability (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references auth.users(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_minutes integer default 30,
  is_available boolean default true,
  unique(doctor_id, day_of_week)
);

-- ─────────────────────────────────────────────────────────────
-- 2. FUNCTIONS & TRIGGERS
-- ─────────────────────────────────────────────────────────────

-- Helper: updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Function: Auto-create profile and role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');

  insert into public.user_roles (user_id, role)
  values (new.id, 'patient');

  return new;
end;
$$;

-- Trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger for all updated_at columns
do $$
declare
  t text;
begin
  for t in select table_name from information_schema.columns where column_name = 'updated_at' and table_schema = 'public'
  loop
    execute format('drop trigger if exists handle_updated_at on public.%I', t);
    execute format('create trigger handle_updated_at before update on public.%I for each row execute procedure public.touch_updated_at()', t);
  end loop;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. POLICIES (RLS)
-- ─────────────────────────────────────────────────────────────

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.vitals_readings enable row level security;
alter table public.alerts enable row level security;
alter table public.doctor_profiles enable row level security;
alter table public.doctor_patient_assignments enable row level security;
alter table public.appointments enable row level security;
alter table public.prescriptions enable row level security;
alter table public.direct_messages enable row level security;
alter table public.emergency_alerts enable row level security;
alter table public.weekly_vital_reports enable row level security;
alter table public.notifications enable row level security;
alter table public.doctor_availability enable row level security;

-- Profile Policies
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Role Policies
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles where user_id = auth.uid() and role = 'admin'
  );
$$;

create policy "User can read own role" on public.user_roles for select using (auth.uid() = user_id);
create policy "Admin can read/update all roles" on public.user_roles using (public.is_admin());

-- Vitals & Alerts
create policy "User can view own vitals/alerts" on public.vitals_readings for select using (auth.uid() = user_id);
create policy "User can view own alerts" on public.alerts for select using (auth.uid() = user_id);
create policy "User can insert own vitals" on public.vitals_readings for insert with check (auth.uid() = user_id);
create policy "Doctors can view assigned patient vitals/alerts" on public.vitals_readings for select using (exists (select 1 from public.doctor_patient_assignments where doctor_id = auth.uid() and patient_id = user_id));
create policy "Doctors can view assigned patient alerts" on public.alerts for select using (exists (select 1 from public.doctor_patient_assignments where doctor_id = auth.uid() and patient_id = user_id));

-- Doctor Profile Policies
create policy "Anyone can view doctor profiles" on public.doctor_profiles for select using (true);
create policy "Doctors can update own profile" on public.doctor_profiles for update using (auth.uid() = user_id);

-- Assignment Policies
create policy "Doctors/Patients can view their assignments" on public.doctor_patient_assignments for select using (auth.uid() = doctor_id or auth.uid() = patient_id);
create policy "Admin can manage assignments" on public.doctor_patient_assignments using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- Appointment Policies
create policy "Users can view their own appointments" on public.appointments for select using (auth.uid() = patient_id or auth.uid() = doctor_id);
create policy "Patients can insert appointments" on public.appointments for insert with check (auth.uid() = patient_id);
create policy "Doctors can update appointments" on public.appointments for update using (auth.uid() = doctor_id);

-- Prescription Policies
create policy "Users can view their own prescriptions" on public.prescriptions for select using (auth.uid() = patient_id or auth.uid() = doctor_id);
create policy "Doctors can manage prescriptions" on public.prescriptions using (auth.uid() = doctor_id);

-- Messaging Policies
create policy "Users can view their own messages" on public.direct_messages for select using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "Users can insert messages" on public.direct_messages for insert with check (auth.uid() = sender_id);

-- Emergency Alerts Policies
create policy "Users can view their own emergency alerts" on public.emergency_alerts for select using (auth.uid() = patient_id or auth.uid() = doctor_id);
create policy "Doctors can manage emergency alerts" on public.emergency_alerts using (auth.uid() = doctor_id);

-- Weekly Reports Policies
create policy "Users can view their own reports" on public.weekly_vital_reports for select using (auth.uid() = patient_id or auth.uid() = doctor_id);

-- Notification Policies
create policy "Users can manage their own notifications" on public.notifications using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 4. REALTIME SETUP
-- ─────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.user_roles;
alter publication supabase_realtime add table public.direct_messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.emergency_alerts;
alter publication supabase_realtime add table public.appointments;
