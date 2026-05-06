-- ==========================================
-- Cleanmaxxing — sleep_commitments + sleep_commitment_logs
-- ==========================================
-- Adherence-tracking layer for the sleep plan. The report names a
-- "next move" but doesn't, on its own, check whether the user did it.
-- These tables turn the assessment answers into 1-3 deterministic
-- daily commitments and let the user tick them off each day.
--
-- Derivation is rule-based, not LLM-generated:
--   - rules in lib/sleep/commitments.ts map (biggest_blockers,
--     what_tried) tuples to commitment text + a stable source_key
--   - re-derivation on assessment save is idempotent — same inputs
--     produce the same source_keys, so prior logs stay valid
--
-- Why a logs table instead of a JSON column on commitments:
--   - per-day completion is what the /today tile reads ("did the
--     user check this off TODAY")
--   - weekly review (B) reads completion rates over a window — easier
--     against a row-per-day shape than a json blob
--   - a single user has a small number of commitments, so the row
--     volume stays bounded (3 commitments * 365 days = ~1k rows/yr)
--
-- Run in Supabase SQL Editor.

create table if not exists public.sleep_commitments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,

  -- The commitment shown to the user. Plain text, no markdown.
  text text not null check (char_length(text) <= 200),

  -- Stable identifier for the rule that produced this commitment.
  -- Lets re-derivation overwrite an existing row without losing its
  -- log history (logs FK to commitment id, not source_key — but the
  -- service layer matches on source_key when re-deriving).
  -- Examples: 'screens_late', 'caffeine_late', 'wind_down', 'log_sleep'.
  source_key text not null check (char_length(source_key) <= 64),

  -- Display order on the /today tile. Lower = earlier.
  display_order int not null default 0,

  -- 'true' when this commitment is currently active for the user.
  -- Re-derivation flips inactive commitments back to active when their
  -- triggering condition reappears, instead of creating duplicates.
  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One commitment per (user, source_key). Idempotent re-derivation.
  unique (user_id, source_key)
);

create index if not exists sleep_commitments_user_active_idx
  on public.sleep_commitments(user_id, active, display_order);

alter table public.sleep_commitments enable row level security;

create policy "sleep_commitments_select_own"
  on public.sleep_commitments for select
  using (auth.uid() = user_id);

create policy "sleep_commitments_insert_own"
  on public.sleep_commitments for insert
  with check (auth.uid() = user_id);

create policy "sleep_commitments_update_own"
  on public.sleep_commitments for update
  using (auth.uid() = user_id);

create policy "sleep_commitments_delete_own"
  on public.sleep_commitments for delete
  using (auth.uid() = user_id);


-- =========================================================
-- sleep_commitment_logs — per-day completion records
-- =========================================================
-- One row per (commitment, app_day). Toggle endpoint upserts; absence
-- of a row for a given day means "not completed yet today" rather than
-- "explicitly skipped" — same convention as hair stage-4 daily logs.

create table if not exists public.sleep_commitment_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  commitment_id uuid not null references public.sleep_commitments(id) on delete cascade,

  -- The user's local app-day this log belongs to (YYYY-MM-DD), not
  -- the server's UTC date. Computed from user's timezone in the route.
  app_day date not null,

  -- True when the user marked the commitment done. Stored explicitly
  -- (rather than inferred from row presence) so the user can toggle
  -- back to "not done" without deleting + re-creating the row.
  completed boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (commitment_id, app_day)
);

create index if not exists sleep_commitment_logs_user_day_idx
  on public.sleep_commitment_logs(user_id, app_day desc);
create index if not exists sleep_commitment_logs_commitment_day_idx
  on public.sleep_commitment_logs(commitment_id, app_day desc);

alter table public.sleep_commitment_logs enable row level security;

create policy "sleep_commitment_logs_select_own"
  on public.sleep_commitment_logs for select
  using (auth.uid() = user_id);

create policy "sleep_commitment_logs_insert_own"
  on public.sleep_commitment_logs for insert
  with check (auth.uid() = user_id);

create policy "sleep_commitment_logs_update_own"
  on public.sleep_commitment_logs for update
  using (auth.uid() = user_id);

create policy "sleep_commitment_logs_delete_own"
  on public.sleep_commitment_logs for delete
  using (auth.uid() = user_id);
