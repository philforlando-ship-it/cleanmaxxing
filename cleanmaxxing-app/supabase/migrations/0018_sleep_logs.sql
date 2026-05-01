-- ==========================================
-- Cleanmaxxing — Sleep logs (v2 tracker, first one)
-- ==========================================
-- Daily nightly sleep log. The first of the v2 trackers per spec
-- §17 — sleep was the obvious first pick: daily granularity,
-- universally relevant across every goal in the corpus, and won't
-- feed the body-weight obsession that more frequent weight logging
-- can. Mister P reads recent rows for body-comp / training /
-- recovery answers; the existing user_profile.avg_sleep_hours
-- self-report stays as a fallback when the user hasn't started
-- logging.
--
-- night_of is the date the user went to bed in their local
-- timezone. The card on /today computes "last night" client-side
-- (today minus 1 day in browser-local time) so the server doesn't
-- need to know the user's timezone for log routing. Unique on
-- (user_id, night_of) so editing yesterday's entry upserts rather
-- than appends.
--
-- Run in Supabase SQL Editor.

create table if not exists public.sleep_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  night_of date not null,
  hours numeric(3,1) not null check (hours between 0 and 14),
  quality_1_5 smallint check (quality_1_5 between 1 and 5),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, night_of)
);

create index if not exists sleep_logs_user_night_idx
  on public.sleep_logs(user_id, night_of desc);

alter table public.sleep_logs enable row level security;

create policy "sleep_logs_select_own"
  on public.sleep_logs for select
  using (auth.uid() = user_id);

create policy "sleep_logs_insert_own"
  on public.sleep_logs for insert
  with check (auth.uid() = user_id);

create policy "sleep_logs_update_own"
  on public.sleep_logs for update
  using (auth.uid() = user_id);

create policy "sleep_logs_delete_own"
  on public.sleep_logs for delete
  using (auth.uid() = user_id);
