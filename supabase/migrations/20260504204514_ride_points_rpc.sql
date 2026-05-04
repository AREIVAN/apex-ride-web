create or replace function public.insert_ride_points(p_ride_id uuid, p_points jsonb)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  inserted_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required to insert ride points';
  end if;

  if not exists (
    select 1
    from public.rides r
    where r.id = p_ride_id
      and r.rider_id = auth.uid()
  ) then
    raise exception 'Ride not found or not owned by current user';
  end if;

  if p_points is null or jsonb_typeof(p_points) <> 'array' then
    raise exception 'p_points must be a JSON array';
  end if;

  with raw as (
    select point
    from jsonb_array_elements(p_points) as point
    where jsonb_typeof(point) = 'object'
      and point ? 'lat'
      and point ? 'lng'
  ), parsed as (
    select
      case when point->>'lat' ~ '^-?\d+(\.\d+)?$' then (point->>'lat')::double precision end as lat,
      case when point->>'lng' ~ '^-?\d+(\.\d+)?$' then (point->>'lng')::double precision end as lng,
      case when point->>'speedKmh' ~ '^-?\d+(\.\d+)?$' then (point->>'speedKmh')::numeric end as speed_kmh,
      case when point->>'altitudeM' ~ '^-?\d+(\.\d+)?$' then (point->>'altitudeM')::numeric end as altitude_m,
      case
        when point->>'capturedAt' ~ '^\d{4}-\d{2}-\d{2}T' then (point->>'capturedAt')::timestamptz
        else now()
      end as captured_at
    from raw
  ), valid as (
    select *
    from parsed
    where lat between -90 and 90
      and lng between -180 and 180
      and lat is not null
      and lng is not null
  ), inserted as (
    insert into public.ride_points (ride_id, location, altitude_m, speed_kmh, captured_at)
    select
      p_ride_id,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      altitude_m,
      speed_kmh,
      captured_at
    from valid
    returning 1
  )
  select count(*) into inserted_count from inserted;

  return inserted_count;
end;
$$;

create or replace function public.get_ride_points(p_ride_id uuid)
returns table (
  id bigint,
  ride_id uuid,
  lat double precision,
  lng double precision,
  speed_kmh numeric,
  altitude_m numeric,
  captured_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    rp.id,
    rp.ride_id,
    ST_Y(rp.location::geometry) as lat,
    ST_X(rp.location::geometry) as lng,
    rp.speed_kmh,
    rp.altitude_m,
    rp.captured_at
  from public.ride_points rp
  join public.rides r on r.id = rp.ride_id
  where rp.ride_id = p_ride_id
    and r.rider_id = auth.uid()
  order by rp.captured_at asc, rp.id asc;
$$;

grant execute on function public.insert_ride_points(uuid, jsonb) to authenticated;
grant execute on function public.get_ride_points(uuid) to authenticated;
