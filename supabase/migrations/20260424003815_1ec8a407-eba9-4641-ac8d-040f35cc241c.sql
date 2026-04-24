
-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  date_of_birth date,
  sex text check (sex in ('male','female','other','prefer_not_to_say')),
  height_cm numeric,
  weight_kg numeric,
  blood_type text,
  medical_conditions text[],
  medications text[],
  allergies text[],
  emergency_contact_name text,
  emergency_contact_phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);
create policy "own profile delete" on public.profiles for delete using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- DEVICES
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  device_type text not null default 'smartwatch',
  connection_type text not null check (connection_type in ('bluetooth','wifi','manual')),
  mac_address text,
  api_key_hash text,
  last_seen_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.devices enable row level security;
create policy "own devices all" on public.devices for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- VITALS READINGS
create table public.vitals_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  metric_type text not null,
  value numeric not null,
  value_secondary numeric,
  unit text not null,
  recorded_at timestamptz not null default now(),
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index vitals_user_time_idx on public.vitals_readings (user_id, recorded_at desc);
create index vitals_user_metric_time_idx on public.vitals_readings (user_id, metric_type, recorded_at desc);
alter table public.vitals_readings enable row level security;
create policy "own vitals all" on public.vitals_readings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ALERTS
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  severity text not null check (severity in ('info','warning','critical')),
  title text not null,
  message text not null,
  metric_type text,
  is_read boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index alerts_user_time_idx on public.alerts (user_id, created_at desc);
alter table public.alerts enable row level security;
create policy "own alerts all" on public.alerts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CHAT MESSAGES
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null,
  role text not null check (role in ('user','assistant','system','tool')),
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index chat_user_conv_time_idx on public.chat_messages (user_id, conversation_id, created_at);
alter table public.chat_messages enable row level security;
create policy "own chat all" on public.chat_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- SYMPTOMS LOG
create table public.symptoms_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  symptom text not null,
  severity int check (severity between 1 and 10),
  notes text,
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index symptoms_user_time_idx on public.symptoms_log (user_id, logged_at desc);
alter table public.symptoms_log enable row level security;
create policy "own symptoms all" on public.symptoms_log for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- HEALTH KNOWLEDGE (shared RAG corpus)
create table public.health_knowledge (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  content text not null,
  tags text[],
  created_at timestamptz not null default now()
);
create index health_knowledge_category_idx on public.health_knowledge (category);
alter table public.health_knowledge enable row level security;
create policy "knowledge readable by authenticated" on public.health_knowledge
  for select to authenticated using (true);
