-- ==========================================
-- Cleanmaxxing — user_email_events (email dedupe log)
-- ==========================================
-- Per spec §9 Week 5 onboarding email sequence: the daily cron needs a
-- durable "already sent" marker so day_3/day_7/day_14 emails don't
-- double-send on retries. A simple append-only log keyed by (user_id,
-- event_key) is sufficient — no updates, just inserts.
--
-- Run in Supabase SQL Editor (the Migrations panel chokes on ad-hoc DDL).

create table if not exists public.user_email_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  event_key text not null,
  sent_at timestamptz default now(),
  unique (user_id, event_key)
);

create index if not exists user_email_events_user_idx
  on public.user_email_events(user_id);

alter table public.user_email_events enable row level security;

-- Users can read their own event log (for diagnostics / future settings
-- page). Writes are performed by the service-role client from the cron
-- route, which bypasses RLS.
create policy "user_email_events_own_read" on public.user_email_events
  for select using (auth.uid() = user_id);
