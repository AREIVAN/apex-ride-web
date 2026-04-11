begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.vehicles (
  id uuid primary key default uuid_generate_v4(),
  rider_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  make text not null default '',
  model text not null default '',
  year_model integer,
  engine_cc integer,
  plate_code text not null default '',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vehicles_label_len check (char_length(trim(label)) between 1 and 80),
  constraint vehicles_model_len check (char_length(model) <= 80),
  constraint vehicles_engine_cc_range check (engine_cc is null or engine_cc between 50 and 2500),
  constraint vehicles_year_model_range check (year_model is null or year_model between 1980 and 2100)
);

drop trigger if exists vehicles_set_updated_at on public.vehicles;
create trigger vehicles_set_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();

create unique index if not exists idx_vehicles_primary_per_rider
  on public.vehicles (rider_id)
  where is_primary = true;

create index if not exists idx_vehicles_rider_created
  on public.vehicles (rider_id, created_at desc);

create index if not exists idx_vehicles_rider_label
  on public.vehicles (rider_id, label);

insert into public.vehicles (rider_id, label, make, model, year_model, engine_cc, plate_code, is_primary)
select
  m.rider_id,
  case when trim(m.model) = '' then 'Bike' else m.model end as label,
  '',
  m.model,
  m.year_model,
  m.engine_cc,
  m.plate_code,
  m.is_primary
from public.motorcycles m
where not exists (
  select 1
  from public.vehicles v
  where v.rider_id = m.rider_id
    and v.model = m.model
    and coalesce(v.year_model, -1) = coalesce(m.year_model, -1)
);

alter table public.profiles
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles
  drop constraint if exists profiles_username_len,
  add constraint profiles_username_len check (char_length(trim(username)) between 3 and 32),
  drop constraint if exists profiles_totals_non_negative,
  add constraint profiles_totals_non_negative check (total_distance_km >= 0 and total_elevation_m >= 0);

create index if not exists idx_profiles_username_lower on public.profiles ((lower(username)));

alter table public.rides
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists rides_set_updated_at on public.rides;
create trigger rides_set_updated_at
before update on public.rides
for each row execute function public.set_updated_at();

alter table public.rides
  drop constraint if exists rides_time_window_valid,
  add constraint rides_time_window_valid check (ended_at is null or ended_at >= started_at),
  drop constraint if exists rides_metrics_non_negative,
  add constraint rides_metrics_non_negative check (
    distance_km >= 0
    and elevation_gain_m >= 0
    and moving_time_sec >= 0
  );

create unique index if not exists idx_rides_id_rider on public.rides (id, rider_id);
create index if not exists idx_rides_status_started on public.rides (status, started_at desc);

alter table public.ride_points
  drop constraint if exists ride_points_speed_non_negative,
  add constraint ride_points_speed_non_negative check (speed_kmh is null or speed_kmh >= 0);

create index if not exists idx_ride_points_ride_time
  on public.ride_points (ride_id, captured_at);

alter table public.segments
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists segments_set_updated_at on public.segments;
create trigger segments_set_updated_at
before update on public.segments
for each row execute function public.set_updated_at();

alter table public.segments
  drop constraint if exists segments_distance_positive,
  add constraint segments_distance_positive check (distance_m > 0),
  drop constraint if exists segments_elevation_non_negative,
  add constraint segments_elevation_non_negative check (elevation_gain_m >= 0),
  drop constraint if exists segments_start_lat_range,
  add constraint segments_start_lat_range check (start_lat between -90 and 90),
  drop constraint if exists segments_end_lat_range,
  add constraint segments_end_lat_range check (end_lat between -90 and 90),
  drop constraint if exists segments_start_lng_range,
  add constraint segments_start_lng_range check (start_lng between -180 and 180),
  drop constraint if exists segments_end_lng_range,
  add constraint segments_end_lng_range check (end_lng between -180 and 180);

create index if not exists idx_segments_visibility_created
  on public.segments (visibility, created_at desc);

alter table public.segment_attempts
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists segment_attempts_set_updated_at on public.segment_attempts;
create trigger segment_attempts_set_updated_at
before update on public.segment_attempts
for each row execute function public.set_updated_at();

alter table public.segment_attempts
  drop constraint if exists segment_attempts_elapsed_positive,
  add constraint segment_attempts_elapsed_positive check (elapsed_time_sec > 0),
  drop constraint if exists segment_attempts_avg_power_range,
  add constraint segment_attempts_avg_power_range check (avg_power_w is null or avg_power_w between 0 and 3000),
  drop constraint if exists segment_attempts_avg_hr_range,
  add constraint segment_attempts_avg_hr_range check (avg_heart_rate is null or avg_heart_rate between 30 and 250),
  drop constraint if exists segment_attempts_ride_rider_fk,
  add constraint segment_attempts_ride_rider_fk foreign key (ride_id, rider_id)
    references public.rides(id, rider_id) on delete cascade;

create index if not exists idx_segment_attempts_rider_recorded
  on public.segment_attempts (rider_id, recorded_at desc);

create index if not exists idx_segment_attempts_segment_recorded
  on public.segment_attempts (segment_id, recorded_at desc);

alter table public.profiles enable row level security;
alter table public.vehicles enable row level security;
alter table public.rides enable row level security;
alter table public.ride_points enable row level security;
alter table public.segments enable row level security;
alter table public.segment_attempts enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;

create policy "profiles_select_authenticated" on public.profiles
for select to authenticated
using (auth.uid() is not null);

create policy "profiles_insert_self" on public.profiles
for insert to authenticated
with check (auth.uid() = id);

create policy "profiles_update_self" on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "vehicles_rider_read" on public.vehicles;
drop policy if exists "vehicles_rider_write" on public.vehicles;

create policy "vehicles_rider_read" on public.vehicles
for select to authenticated
using (auth.uid() = rider_id);

create policy "vehicles_rider_write" on public.vehicles
for all to authenticated
using (auth.uid() = rider_id)
with check (auth.uid() = rider_id);

drop policy if exists "rides_owner_all" on public.rides;

create policy "rides_owner_all" on public.rides
for all to authenticated
using (auth.uid() = rider_id)
with check (auth.uid() = rider_id);

drop policy if exists "ride_points_owner_all" on public.ride_points;

create policy "ride_points_owner_all" on public.ride_points
for all to authenticated
using (
  exists (
    select 1
    from public.rides r
    where r.id = ride_points.ride_id
      and r.rider_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.rides r
    where r.id = ride_points.ride_id
      and r.rider_id = auth.uid()
  )
);

drop policy if exists "segments_public_read" on public.segments;
drop policy if exists "segments_creator_write" on public.segments;

create policy "segments_public_read" on public.segments
for select to authenticated
using (visibility = 'public' or creator_id = auth.uid());

create policy "segments_creator_write" on public.segments
for all to authenticated
using (creator_id = auth.uid())
with check (creator_id = auth.uid());

drop policy if exists "segment_attempts_public_read" on public.segment_attempts;
drop policy if exists "segment_attempts_rider_insert" on public.segment_attempts;
drop policy if exists "segment_attempts_rider_update" on public.segment_attempts;
drop policy if exists "segment_attempts_rider_delete" on public.segment_attempts;

create policy "segment_attempts_public_read" on public.segment_attempts
for select to authenticated
using (
  rider_id = auth.uid()
  or exists (
    select 1
    from public.segments s
    where s.id = segment_attempts.segment_id
      and (s.visibility = 'public' or s.creator_id = auth.uid())
  )
);

create policy "segment_attempts_rider_insert" on public.segment_attempts
for insert to authenticated
with check (
  rider_id = auth.uid()
  and exists (
    select 1
    from public.rides r
    where r.id = segment_attempts.ride_id
      and r.rider_id = auth.uid()
  )
  and exists (
    select 1
    from public.segments s
    where s.id = segment_attempts.segment_id
      and (s.visibility = 'public' or s.creator_id = auth.uid())
  )
);

create policy "segment_attempts_rider_update" on public.segment_attempts
for update to authenticated
using (rider_id = auth.uid())
with check (rider_id = auth.uid());

create policy "segment_attempts_rider_delete" on public.segment_attempts
for delete to authenticated
using (rider_id = auth.uid());

create or replace view public.segment_leaderboard
with (security_invoker = true)
as
with best_per_rider as (
  select
    sa.segment_id,
    sa.rider_id,
    min(sa.elapsed_time_sec) as best_elapsed_time_sec,
    max(sa.recorded_at) as best_attempted_at
  from public.segment_attempts sa
  group by sa.segment_id, sa.rider_id
)
select
  b.segment_id,
  b.rider_id,
  p.full_name as rider_name,
  b.best_elapsed_time_sec,
  b.best_attempted_at,
  dense_rank() over (
    partition by b.segment_id
    order by b.best_elapsed_time_sec asc, b.best_attempted_at asc
  ) as rank
from best_per_rider b
join public.profiles p on p.id = b.rider_id;

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
  select
    sl.rank,
    sl.segment_id,
    sl.rider_id,
    sl.rider_name,
    sl.best_elapsed_time_sec,
    sl.best_attempted_at
  from public.segment_leaderboard sl
  where sl.segment_id = p_segment_id
  order by sl.rank asc, sl.best_attempted_at asc
  limit greatest(p_limit, 1);
$$;

grant select on public.segment_leaderboard to authenticated;
grant execute on function public.get_segment_leaderboard(uuid, integer) to authenticated;

commit;
