begin;

alter table public.segment_attempts
  add column if not exists sync_key text,
  add column if not exists status text,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists progress_final numeric(5,2),
  add column if not exists reason text,
  add column if not exists distance_in_segment_m numeric(10,2),
  add column if not exists metadata jsonb;

update public.segment_attempts
set
  status = coalesce(status, 'completed'),
  started_at = coalesce(started_at, recorded_at),
  completed_at = case
    when coalesce(status, 'completed') = 'completed' then coalesce(completed_at, recorded_at)
    else completed_at
  end,
  progress_final = coalesce(progress_final, 100),
  metadata = coalesce(metadata, '{}'::jsonb),
  sync_key = coalesce(sync_key, concat_ws(':', rider_id::text, ride_id::text, segment_id::text, coalesce(started_at, recorded_at)::text));

create or replace function public.segment_attempts_fill_sync_key()
returns trigger
language plpgsql
as $$
begin
  new.sync_key := coalesce(new.sync_key, concat_ws(':', new.rider_id::text, new.ride_id::text, new.segment_id::text, new.started_at::text));
  return new;
end;
$$;

drop trigger if exists segment_attempts_fill_sync_key on public.segment_attempts;
create trigger segment_attempts_fill_sync_key
before insert or update on public.segment_attempts
for each row execute function public.segment_attempts_fill_sync_key();

alter table public.segment_attempts
  alter column status set default 'completed',
  alter column status set not null,
  alter column started_at set default now(),
  alter column started_at set not null,
  alter column progress_final set default 100,
  alter column progress_final set not null,
  alter column metadata set default '{}'::jsonb,
  alter column metadata set not null,
  alter column elapsed_time_sec drop not null,
  alter column sync_key set not null;

alter table public.segment_attempts
  drop constraint if exists segment_attempts_status_check,
  add constraint segment_attempts_status_check check (status in ('completed', 'abandoned', 'invalid')),
  drop constraint if exists segment_attempts_elapsed_positive,
  add constraint segment_attempts_elapsed_positive check (
    (status = 'completed' and elapsed_time_sec is not null and elapsed_time_sec > 0)
    or (status in ('abandoned', 'invalid') and elapsed_time_sec is null)
  ),
  drop constraint if exists segment_attempts_completed_at_required,
  add constraint segment_attempts_completed_at_required check (
    (status = 'completed' and completed_at is not null)
    or (status in ('abandoned', 'invalid'))
  ),
  drop constraint if exists segment_attempts_progress_range,
  add constraint segment_attempts_progress_range check (progress_final >= 0 and progress_final <= 100),
  drop constraint if exists segment_attempts_distance_non_negative,
  add constraint segment_attempts_distance_non_negative check (
    distance_in_segment_m is null or distance_in_segment_m >= 0
  );

create unique index if not exists idx_segment_attempts_dedupe
  on public.segment_attempts (rider_id, ride_id, segment_id, started_at);

create index if not exists idx_segment_attempts_segment_status_elapsed
  on public.segment_attempts (segment_id, status, elapsed_time_sec asc);

create index if not exists idx_segment_attempts_rider_status_recorded
  on public.segment_attempts (rider_id, status, recorded_at desc);

create index if not exists idx_segment_attempts_ride_status
  on public.segment_attempts (ride_id, status);

create index if not exists idx_segment_attempts_status_recorded
  on public.segment_attempts (status, recorded_at desc);

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
  where sa.status = 'completed'
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

create or replace function public.sync_segment_attempts(p_attempts jsonb)
returns table (
  sync_key text,
  id uuid,
  status text,
  was_inserted boolean
)
language sql
security invoker
set search_path = public
as $$
  with payload as (
    select
      p.sync_key,
      p.segment_id,
      p.ride_id,
      p.rider_id,
      coalesce(nullif(trim(p.status), ''), 'completed') as status,
      coalesce(p.started_at, p.recorded_at, now()) as started_at,
      p.completed_at,
      p.elapsed_time_sec,
      coalesce(p.progress_final, 100) as progress_final,
      p.reason,
      p.distance_in_segment_m,
      coalesce(p.metadata, '{}'::jsonb) as metadata,
      coalesce(p.recorded_at, now()) as recorded_at
    from jsonb_to_recordset(coalesce(p_attempts, '[]'::jsonb)) as p(
      sync_key text,
      segment_id uuid,
      ride_id uuid,
      rider_id uuid,
      status text,
      started_at timestamptz,
      completed_at timestamptz,
      elapsed_time_sec integer,
      progress_final numeric,
      reason text,
      distance_in_segment_m numeric,
      metadata jsonb,
      recorded_at timestamptz
    )
  ), normalized as (
    select
      coalesce(payload.sync_key, concat_ws(':', payload.rider_id::text, payload.ride_id::text, payload.segment_id::text, payload.started_at::text)) as sync_key,
      payload.segment_id,
      payload.ride_id,
      payload.rider_id,
      payload.status,
      payload.started_at,
      case
        when payload.status = 'completed' then coalesce(payload.completed_at, payload.recorded_at, payload.started_at)
        else payload.completed_at
      end as completed_at,
      case
        when payload.status = 'completed' then greatest(coalesce(payload.elapsed_time_sec, 0), 1)
        else null
      end as elapsed_time_sec,
      least(greatest(payload.progress_final, 0), 100) as progress_final,
      payload.reason,
      case
        when payload.distance_in_segment_m is null then null
        else greatest(payload.distance_in_segment_m, 0)
      end as distance_in_segment_m,
      payload.metadata,
      payload.recorded_at
    from payload
  ), upserted as (
    insert into public.segment_attempts as sa (
      sync_key,
      segment_id,
      ride_id,
      rider_id,
      status,
      started_at,
      completed_at,
      elapsed_time_sec,
      progress_final,
      reason,
      distance_in_segment_m,
      metadata,
      recorded_at
    )
    select
      n.sync_key,
      n.segment_id,
      n.ride_id,
      n.rider_id,
      n.status,
      n.started_at,
      n.completed_at,
      n.elapsed_time_sec,
      n.progress_final,
      n.reason,
      n.distance_in_segment_m,
      n.metadata,
      n.recorded_at
    from normalized n
    on conflict (rider_id, ride_id, segment_id, started_at)
    do update set
      sync_key = excluded.sync_key,
      status = case
        when sa.status = 'completed' or excluded.status = 'completed' then 'completed'
        when sa.status = 'abandoned' or excluded.status = 'abandoned' then 'abandoned'
        else 'invalid'
      end,
      completed_at = case
        when sa.status = 'completed' and excluded.status <> 'completed' then sa.completed_at
        when excluded.status = 'completed' then coalesce(excluded.completed_at, sa.completed_at, excluded.recorded_at)
        else coalesce(sa.completed_at, excluded.completed_at)
      end,
      elapsed_time_sec = case
        when sa.status = 'completed' and excluded.status <> 'completed' then sa.elapsed_time_sec
        when excluded.status = 'completed' then coalesce(least(sa.elapsed_time_sec, excluded.elapsed_time_sec), excluded.elapsed_time_sec, sa.elapsed_time_sec)
        else coalesce(sa.elapsed_time_sec, excluded.elapsed_time_sec)
      end,
      progress_final = greatest(sa.progress_final, excluded.progress_final),
      reason = case
        when sa.status = 'completed' and excluded.status <> 'completed' then sa.reason
        else coalesce(excluded.reason, sa.reason)
      end,
      distance_in_segment_m = coalesce(excluded.distance_in_segment_m, sa.distance_in_segment_m),
      metadata = coalesce(sa.metadata, '{}'::jsonb) || coalesce(excluded.metadata, '{}'::jsonb),
      recorded_at = greatest(sa.recorded_at, excluded.recorded_at),
      updated_at = now()
    returning
      sa.sync_key,
      sa.id,
      sa.status,
      (xmax = 0) as was_inserted
  )
  select
    upserted.sync_key,
    upserted.id,
    upserted.status,
    upserted.was_inserted
  from upserted;
$$;

grant execute on function public.sync_segment_attempts(jsonb) to authenticated;

commit;
