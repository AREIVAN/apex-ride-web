-- Tabla de configuracion por usuario
create table if not exists public.user_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade unique,
  unit_system text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  activity_visibility text not null default 'public' check (activity_visibility in ('public', 'authenticated', 'private')),
  notifications_segments boolean not null default true,
  notifications_social boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.user_settings enable row level security;

create policy "user_settings_owner_all" on public.user_settings
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Index para lookup rapido por user_id
create index if not exists idx_user_settings_user on public.user_settings (user_id);