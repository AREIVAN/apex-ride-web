create extension if not exists postgis;
create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  full_name text not null default '',
  bio text not null default '',
  avatar_url text,
  city text not null default '',
  country text not null default '',
  total_distance_km numeric(10,2) not null default 0,
  total_elevation_m integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rides (
  id uuid primary key default uuid_generate_v4(),
  rider_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'recording', 'completed')),
  started_at timestamptz not null,
  ended_at timestamptz,
  distance_km numeric(10,2) not null default 0,
  elevation_gain_m integer not null default 0,
  moving_time_sec integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ride_points (
  id bigint generated always as identity primary key,
  ride_id uuid not null references public.rides(id) on delete cascade,
  location geography(point, 4326) not null,
  altitude_m numeric(8,2),
  speed_kmh numeric(6,2),
  captured_at timestamptz not null
);

create table if not exists public.segments (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  description text not null default '',
  distance_m numeric(10,2) not null,
  elevation_gain_m integer not null,
  avg_gradient_pct numeric(5,2) not null default 0,
  visibility text not null default 'public' check (visibility in ('public', 'club', 'private')),
  start_lat numeric(9,6) not null,
  start_lng numeric(9,6) not null,
  end_lat numeric(9,6) not null,
  end_lng numeric(9,6) not null,
  geom geography(linestring, 4326),
  created_at timestamptz not null default now()
);

create table if not exists public.segment_attempts (
  id uuid primary key default uuid_generate_v4(),
  segment_id uuid not null references public.segments(id) on delete cascade,
  ride_id uuid not null references public.rides(id) on delete cascade,
  rider_id uuid not null references public.profiles(id) on delete cascade,
  elapsed_time_sec integer not null,
  avg_power_w integer,
  avg_heart_rate integer,
  recorded_at timestamptz not null default now()
);

create view public.segment_leaderboard
with (security_invoker = true)
as
select
  sa.segment_id,
  sa.rider_id,
  p.full_name as rider_name,
  min(sa.elapsed_time_sec) as best_elapsed_time_sec,
  max(sa.recorded_at) as best_attempted_at
from public.segment_attempts sa
join public.profiles p on p.id = sa.rider_id
group by sa.segment_id, sa.rider_id, p.full_name;

create index if not exists idx_rides_rider_started on public.rides (rider_id, started_at desc);
create index if not exists idx_segment_attempts_segment_time on public.segment_attempts (segment_id, elapsed_time_sec asc);
create index if not exists idx_ride_points_location on public.ride_points using gist (location);
create index if not exists idx_segments_geom on public.segments using gist (geom);

alter table public.profiles enable row level security;
alter table public.rides enable row level security;
alter table public.ride_points enable row level security;
alter table public.segments enable row level security;
alter table public.segment_attempts enable row level security;

create policy "profiles_select_self" on public.profiles
for select using (auth.uid() = id);

create policy "profiles_update_self" on public.profiles
for update using (auth.uid() = id);

create policy "rides_owner_all" on public.rides
for all using (auth.uid() = rider_id) with check (auth.uid() = rider_id);

create policy "ride_points_owner_all" on public.ride_points
for all
using (
  exists (
    select 1 from public.rides r where r.id = ride_id and r.rider_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.rides r where r.id = ride_id and r.rider_id = auth.uid()
  )
);

create policy "segments_public_read" on public.segments
for select using (visibility = 'public' or creator_id = auth.uid());

create policy "segments_creator_write" on public.segments
for all using (creator_id = auth.uid()) with check (creator_id = auth.uid());

create policy "segment_attempts_rider_read" on public.segment_attempts
for select using (rider_id = auth.uid());

create policy "segment_attempts_rider_insert" on public.segment_attempts
for insert with check (rider_id = auth.uid());

-- TODO: agregar politicas por clubes/equipos y moderacion de segmentos comunitarios.
