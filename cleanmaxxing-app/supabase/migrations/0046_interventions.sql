-- ==========================================
-- Cleanmaxxing — interventions (Pattern D primitive)
-- ==========================================
-- Per the journey-redesign framework: a real `interventions` table
-- replaces the flat `current_interventions[]` on user_profile. The flat
-- array can't carry status, dose, frequency, titration, or check-in
-- cadence — all of which Pattern D's On Protocol + Off-ramp surfaces
-- need to do real work.
--
-- v1 coexistence strategy: this table becomes the source of truth for
-- "the user is on this protocol." The legacy `user_profile.current_interventions[]`
-- column stays for backwards compat — Mister P's user-state, the hair
-- plan modifier checks, etc. all still read it. The service layer
-- (lib/interventions/service.ts) syncs the legacy array from this
-- table on every status change, so old code keeps working without
-- modification. When all reads are migrated to the new table, the
-- legacy column can be dropped in a future migration.
--
-- Type enum is intentionally a strict superset of (currently equal to)
-- the legacy enum on user_profile.current_interventions. Adding new
-- types (peptide, fat_burner, sarm, other) in a later migration will
-- be additive — no breaking change.
--
-- One row per (user, type, lifecycle period) — a user who's been on
-- finasteride twice with a break between gets two rows. No unique
-- constraint on (user_id, type) — that would prevent the history.
-- The service layer is responsible for not double-creating an active
-- protocol of the same type.
--
-- Run in Supabase SQL Editor.

create table if not exists public.interventions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,

  -- The substance or protocol type. Matches the legacy
  -- user_profile.current_interventions[] enum 1:1 in this migration.
  -- New types added in future migrations should also be added to the
  -- legacy enum check (or the legacy column eventually retired).
  type text not null check (type in (
    'trt',
    'glp1',
    'finasteride',
    'minoxidil',
    'retinoid',
    'accutane',
    'creatine',
    'ssri',
    'adhd_stimulant'
  )),

  -- Lifecycle status. The interplay with surfaces:
  --   considering — user picked Pattern D Considering on a journey but
  --                 hasn't started anything. Sits as a marker so the
  --                 surface knows where they are.
  --   on_protocol — actively taking. Drives the synced legacy array.
  --   paused      — temporarily off (cycling, side effects, supply
  --                 issues). NOT in the synced legacy array.
  --   off         — stopped with no plan to restart. NOT in the synced
  --                 legacy array. Kept as history for the Off-ramp
  --                 surface and for "you tried this before" context.
  status text not null default 'considering' check (status in (
    'considering', 'on_protocol', 'paused', 'off'
  )),

  -- Prescriber relationship. Matters for the app's medical/legal
  -- posture — the hard line is "between you and your prescriber."
  -- 'over_the_counter' for things like minoxidil + creatine where no
  -- prescription is needed. 'unknown' when the user hasn't told us.
  prescriber_status text check (prescriber_status in (
    'no_prescription', 'prescribed', 'over_the_counter', 'unknown'
  )),

  -- Free-form fields the user fills in. We don't validate or
  -- interpret — these are their own notes for their own reference (and
  -- for Mister P to ground answers without inventing details).
  -- Length caps prevent runaway prompt budget.
  dose text check (char_length(dose) <= 200),
  frequency text check (char_length(frequency) <= 200),
  titration_schedule text check (char_length(titration_schedule) <= 500),
  notes text check (char_length(notes) <= 2000),

  -- Timeline.
  started_at timestamptz,
  ended_at timestamptz,
  -- When the next prompt fires on the surface. The Pattern D On
  -- Protocol surface uses this to drive "check in on side effects"
  -- and "lab work due" nudges. Optional — surface degrades to
  -- "no scheduled check-in" when null.
  next_check_in_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists interventions_user_status_idx
  on public.interventions(user_id, status);
create index if not exists interventions_next_check_in_idx
  on public.interventions(next_check_in_at)
  where next_check_in_at is not null;

alter table public.interventions enable row level security;

create policy "interventions_select_own"
  on public.interventions for select
  using (auth.uid() = user_id);

create policy "interventions_insert_own"
  on public.interventions for insert
  with check (auth.uid() = user_id);

create policy "interventions_update_own"
  on public.interventions for update
  using (auth.uid() = user_id);

create policy "interventions_delete_own"
  on public.interventions for delete
  using (auth.uid() = user_id);
