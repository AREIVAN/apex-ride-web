alter table public.profiles
  add column if not exists preferred_vehicle_type text not null default 'motorcycle' check (preferred_vehicle_type in ('motorcycle', 'scooter', 'mixed')),
  add column if not exists vehicle_model text not null default '',
  add column if not exists vehicle_year integer,
  add column if not exists vehicle_engine_cc integer;

create table if not exists public.motorcycles (
  id uuid primary key default uuid_generate_v4(),
  rider_id uuid not null references public.profiles(id) on delete cascade,
  model text not null,
  plate_code text not null default '',
  engine_cc integer not null check (engine_cc between 50 and 2500),
  year_model integer check (year_model between 1980 and 2100),
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_motorcycles_primary_per_rider
  on public.motorcycles (rider_id)
  where is_primary = true;

create index if not exists idx_motorcycles_rider_created on public.motorcycles (rider_id, created_at desc);

drop policy if exists "profiles_select_self" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;

create policy "profiles_select_authenticated" on public.profiles
for select using (auth.uid() is not null);

create policy "profiles_insert_self" on public.profiles
for insert with check (auth.uid() = id);

create policy "profiles_update_self" on public.profiles
for update using (auth.uid() = id) with check (auth.uid() = id);

alter table public.motorcycles enable row level security;

create policy "motorcycles_rider_read" on public.motorcycles
for select using (auth.uid() = rider_id);

create policy "motorcycles_rider_write" on public.motorcycles
for all using (auth.uid() = rider_id) with check (auth.uid() = rider_id);

drop policy if exists "segment_attempts_rider_read" on public.segment_attempts;

create policy "segment_attempts_public_read" on public.segment_attempts
for select
using (
  rider_id = auth.uid()
  or exists (
    select 1
    from public.segments s
    where s.id = segment_id
      and (s.visibility = 'public' or s.creator_id = auth.uid())
  )
);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_username text;
begin
  generated_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9._-]', '', 'g'),
    'rider_' || substring(new.id::text from 1 for 8)
  );

  insert into public.profiles (
    id,
    username,
    full_name,
    preferred_vehicle_type,
    vehicle_model,
    city,
    country
  )
  values (
    new.id,
    generated_username,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'preferred_vehicle_type', 'motorcycle'),
    coalesce(new.raw_user_meta_data ->> 'vehicle_model', ''),
    '',
    ''
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create or replace function public.get_segment_leaderboard(p_segment_id uuid, p_limit integer default 25)
returns table (
  rank bigint,
  segment_id uuid,
  rider_id uuid,
  rider_name text,
  best_elapsed_time_sec integer,
  best_attempted_at timestamptz
)
language sql
security invoker
set search_path = public
as $$
  with ranked as (
    select
      row_number() over (order by min(sa.elapsed_time_sec), max(sa.recorded_at) desc) as rank,
      sa.segment_id,
      sa.rider_id,
      p.full_name as rider_name,
      min(sa.elapsed_time_sec) as best_elapsed_time_sec,
      max(sa.recorded_at) as best_attempted_at
    from public.segment_attempts sa
    join public.profiles p on p.id = sa.rider_id
    where sa.segment_id = p_segment_id
    group by sa.segment_id, sa.rider_id, p.full_name
  )
  select *
  from ranked
  where rank <= greatest(p_limit, 1)
  order by rank asc;
$$;
