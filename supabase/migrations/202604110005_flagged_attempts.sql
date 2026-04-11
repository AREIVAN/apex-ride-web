-- Tabla de moderacion de intentos de segmento
create table if not exists public.flagged_attempts (
  id uuid primary key default uuid_generate_v4(),
  attempt_id uuid not null references public.segment_attempts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (reason in ('cheating', 'wrong_segment', 'wrong_data', 'other')),
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'dismissed', 'valid')),
  notes text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.flagged_attempts enable row level security;

-- Cualquier usuario puede reportar
create policy "flagged_attempts_insert" on public.flagged_attempts
for insert with check (auth.uid() = reporter_id);

-- Solo el reportador o un reviewer puede ver
create policy "flagged_attempts_select" on public.flagged_attempts
for select using (
  reporter_id = auth.uid() 
  or reviewed_by = auth.uid() 
  or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.bio = 'admin'
  )
);

-- Solo el reporter puede actualizar su reporte
create policy "flagged_attempts_update_owner" on public.flagged_attempts
for update using (reporter_id = auth.uid());

-- Indices para optimizacion de queries de moderacion
create index if not exists idx_flagged_attempts_attempt on public.flagged_attempts (attempt_id);
create index if not exists idx_flagged_attempts_status on public.flagged_attempts (status);
create index if not exists idx_flagged_attempts_reporter on public.flagged_attempts (reporter_id);