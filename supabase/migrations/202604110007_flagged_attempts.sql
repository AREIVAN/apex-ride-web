create table if not exists public.flagged_attempts (
  id uuid primary key default uuid_generate_v4(),
  attempt_id uuid not null references public.segment_attempts(id) on delete cascade,
  reason text not null,
  reporter_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists idx_flagged_attempts_attempt_id on public.flagged_attempts (attempt_id);
create index if not exists idx_flagged_attempts_status on public.flagged_attempts (status);

alter table public.flagged_attempts enable row level security;

create policy "flagged_attempts_authenticated_insert" on public.flagged_attempts
for insert with check (auth.uid() = reporter_id or auth.uid() is not null);

create policy "flagged_attempts_public_read" on public.flagged_attempts
for select using (status = 'resolved' or reporter_id = auth.uid() or auth.uid() is not null);