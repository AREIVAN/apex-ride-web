create table if not exists public.user_settings (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  unit_system text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  privacy_level text not null default 'public' check (privacy_level in ('public', 'club', 'private')),
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create index if not exists idx_user_settings_user_id on public.user_settings (user_id);

alter table public.user_settings enable row level security;

create policy "user_settings_select_self" on public.user_settings
for select using (auth.uid() = user_id);

create policy "user_settings_insert_self" on public.user_settings
for insert with check (auth.uid() = user_id);

create policy "user_settings_update_self" on public.user_settings
for update using (auth.uid() = user_id) with check (auth.uid() = user_id);