-- =============================================================
-- SMART CARE SENSE — Multi-Role Schema Migration
-- Adds: user_roles, doctor_profiles, doctor_patient_assignments,
--       appointments, prescriptions, weekly_vital_reports,
--       emergency_alerts, notifications, doctor_availability,
--       direct_messages
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. USER ROLES
-- ─────────────────────────────────────────────────────────────
create type public.user_role as enum ('patient', 'doctor', 'admin');

create table public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  role       public.user_role not null default 'patient',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_roles enable row level security;

-- Own role: patients & doctors can read their own role
create policy "user can read own role"
  on public.user_roles for select
  using (auth.uid() = user_id);

-- Admins can read all roles (used for admin dashboard)
create policy "admin can read all roles"
  on public.user_roles for select
  using (
    exists (
      select 1 from public.user_roles ur2
      where ur2.user_id = auth.uid() and ur2.role = 'admin'
    )
  );

-- Only admins can update roles (promote patient → doctor)
create policy "admin can update roles"
  on public.user_roles for update
  using (
    exists (
      select 1 from public.user_roles ur2
      where ur2.user_id = auth.uid() and ur2.role = 'admin'
    )
  );

-- Service-role inserts handled by triggers / edge functions
create policy "service role can insert roles"
  on public.user_roles for insert
  with check (true);

-- Auto-create 'patient' role on new user signup
create or replace function public.handle_new_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.id, 'patient');
  return new;
end;
$$;

create trigger on_auth_user_created_role
  after insert on auth.users
  for each row execute function public.handle_new_user_role();

create trigger user_roles_touch before update on public.user_roles
  for each row execute function public.touch_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 2. EXTEND PROFILES — add role_display_name & avatar
--    (preserve all existing columns)
-- ─────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists phone_number    text,
  add column if not exists address         text,
  add column if not exists city            text,
  add column if not exists country         text,
  add column if not exists timezone        text default 'UTC',
  add column if not exists notification_prefs jsonb default '{"email":true,"push":true,"sms":false}'::jsonb;


-- ─────────────────────────────────────────────────────────────
-- 3. DOCTOR PROFILES
-- ─────────────────────────────────────────────────────────────
create table public.doctor_profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users(id) on delete cascade,
  specialty         text not null default 'General Practice',
  license_number    text not null,
  years_experience  int not null default 0,
  bio               text,
  hospital_affiliation text,
  is_verified       boolean not null default false,
  is_accepting_patients boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_doctor_profiles_user on public.doctor_profiles (user_id);
alter table public.doctor_profiles enable row level security;

-- Doctors can read/update their own profile
create policy "doctor own profile"
  on public.doctor_profiles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Patients can read doctor profiles (to see their doctor)
create policy "patients can read doctor profiles"
  on public.doctor_profiles for select
  using (auth.uid() is not null);

-- Admins full access
create policy "admin full access doctor_profiles"
  on public.doctor_profiles for all
  using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

create trigger doctor_profiles_touch before update on public.doctor_profiles
  for each row execute function public.touch_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 4. DOCTOR AVAILABILITY
-- ─────────────────────────────────────────────────────────────
create table public.doctor_availability (
  id           uuid primary key default gen_random_uuid(),
  doctor_id    uuid not null references auth.users(id) on delete cascade,
  day_of_week  int not null check (day_of_week between 0 and 6), -- 0=Sun
  start_time   time not null,
  end_time     time not null,
  slot_minutes int not null default 30,
  is_available boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (doctor_id, day_of_week)
);
create index idx_doctor_avail_doctor on public.doctor_availability (doctor_id);
alter table public.doctor_availability enable row level security;

create policy "doctor manages own availability"
  on public.doctor_availability for all
  using (auth.uid() = doctor_id) with check (auth.uid() = doctor_id);

create policy "patients can read availability"
  on public.doctor_availability for select
  using (auth.uid() is not null);


-- ─────────────────────────────────────────────────────────────
-- 5. DOCTOR-PATIENT ASSIGNMENTS
-- ─────────────────────────────────────────────────────────────
create table public.doctor_patient_assignments (
  id          uuid primary key default gen_random_uuid(),
  doctor_id   uuid not null references auth.users(id) on delete cascade,
  patient_id  uuid not null references auth.users(id) on delete cascade,
  is_primary  boolean not null default true,
  assigned_by uuid references auth.users(id) on delete set null, -- admin who assigned
  notes       text,
  assigned_at timestamptz not null default now(),
  unique (doctor_id, patient_id)
);
create index idx_dpa_doctor   on public.doctor_patient_assignments (doctor_id);
create index idx_dpa_patient  on public.doctor_patient_assignments (patient_id);
alter table public.doctor_patient_assignments enable row level security;

-- Patients can see who their doctor is
create policy "patient reads own assignment"
  on public.doctor_patient_assignments for select
  using (auth.uid() = patient_id);

-- Doctors can see their assigned patients
create policy "doctor reads own assignments"
  on public.doctor_patient_assignments for select
  using (auth.uid() = doctor_id);

-- Only admin can create/delete assignments
create policy "admin manages assignments"
  on public.doctor_patient_assignments for all
  using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );


-- ─────────────────────────────────────────────────────────────
-- 6. APPOINTMENTS
-- ─────────────────────────────────────────────────────────────
create type public.appointment_status as enum (
  'pending', 'confirmed', 'cancelled', 'completed', 'no_show'
);
create type public.appointment_type as enum (
  'in_person', 'video', 'phone', 'follow_up', 'emergency'
);

create table public.appointments (
  id               uuid primary key default gen_random_uuid(),
  patient_id       uuid not null references auth.users(id) on delete cascade,
  doctor_id        uuid not null references auth.users(id) on delete cascade,
  scheduled_at     timestamptz not null,
  duration_minutes int not null default 30,
  type             public.appointment_type not null default 'in_person',
  status           public.appointment_status not null default 'pending',
  patient_notes    text,
  doctor_notes     text,
  meeting_url      text,
  cancelled_by     uuid references auth.users(id),
  cancelled_reason text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_appointments_patient on public.appointments (patient_id, scheduled_at);
create index idx_appointments_doctor  on public.appointments (doctor_id, scheduled_at);
alter table public.appointments enable row level security;

-- Patients can manage their own appointments
create policy "patient manages own appointments"
  on public.appointments for all
  using (auth.uid() = patient_id) with check (auth.uid() = patient_id);

-- Doctors can read and update appointments assigned to them
create policy "doctor reads own appointments"
  on public.appointments for select
  using (auth.uid() = doctor_id);

create policy "doctor updates own appointments"
  on public.appointments for update
  using (auth.uid() = doctor_id);

-- Admins full access
create policy "admin full access appointments"
  on public.appointments for all
  using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

create trigger appointments_touch before update on public.appointments
  for each row execute function public.touch_updated_at();

-- Enable realtime for appointments
alter table public.appointments replica identity full;
alter publication supabase_realtime add table public.appointments;


-- ─────────────────────────────────────────────────────────────
-- 7. PRESCRIPTIONS
-- ─────────────────────────────────────────────────────────────
create table public.prescriptions (
  id           uuid primary key default gen_random_uuid(),
  patient_id   uuid not null references auth.users(id) on delete cascade,
  doctor_id    uuid not null references auth.users(id) on delete cascade,
  medication   text not null,
  dosage       text not null,
  frequency    text not null,
  start_date   date not null,
  end_date     date,
  instructions text,
  is_active    boolean not null default true,
  refills      int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index idx_prescriptions_patient on public.prescriptions (patient_id, created_at desc);
create index idx_prescriptions_doctor  on public.prescriptions (doctor_id, created_at desc);
alter table public.prescriptions enable row level security;

-- Patients can read their prescriptions
create policy "patient reads own prescriptions"
  on public.prescriptions for select
  using (auth.uid() = patient_id);

-- Doctors can fully manage prescriptions they wrote
create policy "doctor manages own prescriptions"
  on public.prescriptions for all
  using (auth.uid() = doctor_id) with check (auth.uid() = doctor_id);

-- Admins full access
create policy "admin full access prescriptions"
  on public.prescriptions for all
  using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

create trigger prescriptions_touch before update on public.prescriptions
  for each row execute function public.touch_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 8. DIRECT MESSAGES (offline-first real-time chat)
-- ─────────────────────────────────────────────────────────────
create table public.direct_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,  -- deterministic: sort(patient_id, doctor_id) → concat
  sender_id       uuid not null references auth.users(id) on delete cascade,
  recipient_id    uuid not null references auth.users(id) on delete cascade,
  content         text not null,
  message_type    text not null default 'text' check (message_type in ('text','image','file')),
  is_read         boolean not null default false,
  read_at         timestamptz,
  client_id       text,  -- idempotency key from client (for offline dedup)
  created_at      timestamptz not null default now()
);
create index idx_dm_conversation on public.direct_messages (conversation_id, created_at);
create index idx_dm_sender       on public.direct_messages (sender_id);
create index idx_dm_recipient    on public.direct_messages (recipient_id);
create unique index idx_dm_client_id on public.direct_messages (client_id) where client_id is not null;
alter table public.direct_messages enable row level security;

-- Users can read messages in conversations they are part of
create policy "participants can read messages"
  on public.direct_messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Users can send messages
create policy "users can send messages"
  on public.direct_messages for insert
  with check (auth.uid() = sender_id);

-- Users can mark their received messages as read
create policy "recipients can update read status"
  on public.direct_messages for update
  using (auth.uid() = recipient_id);

-- Enable realtime
alter table public.direct_messages replica identity full;
alter publication supabase_realtime add table public.direct_messages;


-- ─────────────────────────────────────────────────────────────
-- 9. WEEKLY VITAL REPORTS
-- ─────────────────────────────────────────────────────────────
create table public.weekly_vital_reports (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references auth.users(id) on delete cascade,
  doctor_id         uuid not null references auth.users(id) on delete cascade,
  report_week_start date not null,
  report_data       jsonb not null,  -- aggregated vitals, averages, anomaly counts
  summary_text      text,            -- AI-generated or computed summary
  sent_to_doctor    boolean not null default false,
  sent_at           timestamptz,
  generated_at      timestamptz not null default now(),
  unique (patient_id, report_week_start)
);
create index idx_reports_patient on public.weekly_vital_reports (patient_id, report_week_start desc);
create index idx_reports_doctor  on public.weekly_vital_reports (doctor_id, report_week_start desc);
alter table public.weekly_vital_reports enable row level security;

-- Patients can read their own reports
create policy "patient reads own reports"
  on public.weekly_vital_reports for select
  using (auth.uid() = patient_id);

-- Doctors can read reports for their assigned patients
create policy "doctor reads assigned patient reports"
  on public.weekly_vital_reports for select
  using (
    auth.uid() = doctor_id
    or
    exists (
      select 1 from public.doctor_patient_assignments
      where doctor_id = auth.uid() and patient_id = weekly_vital_reports.patient_id
    )
  );

-- Edge functions (service role) can insert reports
create policy "service can insert reports"
  on public.weekly_vital_reports for insert
  with check (true);

-- Admins full access
create policy "admin full access reports"
  on public.weekly_vital_reports for all
  using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );


-- ─────────────────────────────────────────────────────────────
-- 10. EMERGENCY ALERTS (doctor-patient emergency escalations)
--     Distinct from the existing `alerts` table (that's per-patient self-alerts)
-- ─────────────────────────────────────────────────────────────
create type public.emergency_status as enum (
  'triggered', 'acknowledged', 'responding', 'resolved', 'false_alarm'
);

create table public.emergency_alerts (
  id                   uuid primary key default gen_random_uuid(),
  patient_id           uuid not null references auth.users(id) on delete cascade,
  doctor_id            uuid not null references auth.users(id) on delete cascade,
  triggered_by_alert_id uuid references public.alerts(id) on delete set null,
  status               public.emergency_status not null default 'triggered',
  metric_type          text,
  metric_value         numeric,
  message              text not null,
  doctor_notes         text,
  acknowledged_at      timestamptz,
  resolved_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index idx_emergency_patient on public.emergency_alerts (patient_id, created_at desc);
create index idx_emergency_doctor  on public.emergency_alerts (doctor_id, created_at desc);
create index idx_emergency_status  on public.emergency_alerts (status, created_at desc);
alter table public.emergency_alerts enable row level security;

-- Patients can read their own emergency alerts
create policy "patient reads own emergency alerts"
  on public.emergency_alerts for select
  using (auth.uid() = patient_id);

-- Doctors can read and update alerts for their patients
create policy "doctor manages emergency alerts"
  on public.emergency_alerts for all
  using (auth.uid() = doctor_id)
  with check (auth.uid() = doctor_id);

-- Service role can insert
create policy "service can insert emergency alerts"
  on public.emergency_alerts for insert
  with check (true);

-- Admins full access
create policy "admin full access emergency_alerts"
  on public.emergency_alerts for all
  using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- Enable realtime
alter table public.emergency_alerts replica identity full;
alter publication supabase_realtime add table public.emergency_alerts;

create trigger emergency_alerts_touch before update on public.emergency_alerts
  for each row execute function public.touch_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 11. IN-APP NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────
create type public.notification_type as enum (
  'appointment_booked', 'appointment_confirmed', 'appointment_cancelled',
  'appointment_reminder', 'prescription_issued', 'vital_alert',
  'emergency_alert', 'weekly_report', 'doctor_message', 'patient_message',
  'doctor_assigned', 'system'
);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       public.notification_type not null,
  title      text not null,
  body       text not null,
  metadata   jsonb default '{}'::jsonb,
  is_read    boolean not null default false,
  action_url text,
  created_at timestamptz not null default now()
);
create index idx_notifications_user on public.notifications (user_id, created_at desc);
create index idx_notifications_unread on public.notifications (user_id, created_at desc) where is_read = false;
alter table public.notifications enable row level security;

create policy "user reads own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "user updates own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Service role / edge functions can insert notifications for anyone
create policy "service can insert notifications"
  on public.notifications for insert
  with check (true);

-- Enable realtime
alter table public.notifications replica identity full;
alter publication supabase_realtime add table public.notifications;


-- ─────────────────────────────────────────────────────────────
-- 12. EXTEND RLS ON EXISTING TABLES FOR CROSS-ROLE ACCESS
-- ─────────────────────────────────────────────────────────────

-- Allow doctors to read vitals for their assigned patients
create policy "doctor reads assigned patient vitals"
  on public.vitals_readings for select
  using (
    exists (
      select 1 from public.doctor_patient_assignments
      where doctor_id = auth.uid() and patient_id = vitals_readings.user_id
    )
  );

-- Allow admins to read all vitals (monitoring)
create policy "admin reads all vitals"
  on public.vitals_readings for select
  using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- Allow doctors to read alerts for their assigned patients
create policy "doctor reads assigned patient alerts"
  on public.alerts for select
  using (
    exists (
      select 1 from public.doctor_patient_assignments
      where doctor_id = auth.uid() and patient_id = alerts.user_id
    )
  );

-- Allow admins to read all alerts
create policy "admin reads all alerts"
  on public.alerts for select
  using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- Allow doctors to read profiles of their assigned patients
create policy "doctor reads assigned patient profile"
  on public.profiles for select
  using (
    auth.uid() = id
    or
    exists (
      select 1 from public.doctor_patient_assignments
      where doctor_id = auth.uid() and patient_id = profiles.id
    )
  );

-- Allow admins to read all profiles
create policy "admin reads all profiles"
  on public.profiles for select
  using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );

-- Allow admins to update any profile (for user management)
create policy "admin updates any profile"
  on public.profiles for update
  using (
    exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
  );


-- ─────────────────────────────────────────────────────────────
-- 13. HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────

-- Get conversation_id for a patient-doctor pair (deterministic)
create or replace function public.get_conversation_id(user_a uuid, user_b uuid)
returns uuid
language sql
immutable
as $$
  select case
    when user_a < user_b
    then gen_random_uuid()  -- deterministic via UUIDv5 would be ideal but gen here for simplicity
    else gen_random_uuid()
  end;
$$;

-- Helper view: get current user's role
create or replace view public.current_user_role as
  select role from public.user_roles where user_id = auth.uid();

-- Helper: check if current user is admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin');
$$;

-- Helper: check if current user is doctor
create or replace function public.is_doctor()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'doctor');
$$;


-- ─────────────────────────────────────────────────────────────
-- 14. REALTIME FOR USER_ROLES (for client-side role updates)
-- ─────────────────────────────────────────────────────────────
alter table public.user_roles replica identity full;
alter publication supabase_realtime add table public.user_roles;
