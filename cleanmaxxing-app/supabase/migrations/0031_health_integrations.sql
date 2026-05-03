-- ==========================================
-- Cleanmaxxing — Health integrations (Vital aggregator)
-- ==========================================
-- Wires the app to Apple Health (and later Google Fit / Health
-- Connect) via the Vital aggregator. Vital handles the per-vendor
-- OAuth, normalization, and webhook firehose; Cleanmaxxing only
-- sees normalized data.
--
-- v1 syncs two passive variables: nightly sleep (replaces the
-- manual /today sleep entry once active) and daily steps (a new
-- variable, surfaced as a quiet line on /today).
--
-- Conflict policy: Vital data wins on conflict. The user can still
-- write a manual entry — last write wins on (user_id, night_of)
-- for sleep and (user_id, date) for activity. The `source` column
-- records where the current row came from.
--
-- Run in Supabase SQL Editor.

-- ==========================================
-- health_integrations: per-user provider connection state
-- ==========================================
create table if not exists public.health_integrations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  -- Provider here is the upstream Vital adapter name. Vital will
  -- expand its support over time; the check constraint covers what
  -- we expose to users today.
  provider text not null check (provider in ('apple_health','google_fit','health_connect')),
  -- Vital's stable identifier for this user. Used as the foreign
  -- key on every webhook / API call back to Vital.
  vital_user_id text not null,
  connected_at timestamptz not null default now(),
  -- Updated on every successful webhook ingestion or manual sync.
  -- Drives the "stale sync — fall back to manual prompt" logic
  -- on /today.
  last_synced_at timestamptz,
  -- The OAuth scopes the user granted on the provider side. Stored
  -- so we can show a per-feature breakdown in the connect UI and
  -- detect missing-scope cases when a webhook arrives without the
  -- expected payload.
  scopes text[],
  unique (user_id, provider)
);

create index if not exists health_integrations_user_idx
  on public.health_integrations(user_id);

alter table public.health_integrations enable row level security;

create policy "health_integrations_select_own"
  on public.health_integrations for select
  using (auth.uid() = user_id);

create policy "health_integrations_delete_own"
  on public.health_integrations for delete
  using (auth.uid() = user_id);

-- Inserts and updates flow through service-role clients in the
-- connect/webhook routes. No user-facing insert/update policy
-- needed.

-- ==========================================
-- daily_activity: passive daily metrics (steps for v1)
-- ==========================================
create table if not exists public.daily_activity (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  -- date is the user's local-day for which the metrics are
  -- attributed. Vital normalizes to a local-day boundary so we
  -- store as plain date with no tz.
  date date not null,
  steps int check (steps >= 0),
  source text not null check (source in ('manual','vital_apple_health','vital_google_fit','vital_health_connect')) default 'manual',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, date)
);

create index if not exists daily_activity_user_date_idx
  on public.daily_activity(user_id, date desc);

alter table public.daily_activity enable row level security;

create policy "daily_activity_select_own"
  on public.daily_activity for select
  using (auth.uid() = user_id);

create policy "daily_activity_insert_own"
  on public.daily_activity for insert
  with check (auth.uid() = user_id);

create policy "daily_activity_update_own"
  on public.daily_activity for update
  using (auth.uid() = user_id);

create policy "daily_activity_delete_own"
  on public.daily_activity for delete
  using (auth.uid() = user_id);

-- ==========================================
-- sleep_logs: add source column
-- ==========================================
-- Existing manual entries backfill to source='manual'. Vital
-- webhooks upsert with source='vital_apple_health' (or other
-- provider variant) and last write wins on (user_id, night_of)
-- per the conflict policy above.
alter table public.sleep_logs
  add column if not exists source text not null default 'manual'
    check (source in ('manual','vital_apple_health','vital_google_fit','vital_health_connect'));
