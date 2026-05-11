-- ==========================================
-- Cleanmaxxing — journey_states
-- ==========================================
-- Per-journey phase signal. One row per (user, journey_slug),
-- recording where the user sits on the implementation -> maintenance
-- -> drift arc for a given journey. This is the foundational signal
-- for the maintenance reflection work scoped 2026-05-11 (see POVs
-- 13 / 16 / 20 / 12 / 50 maintenance sections): /plan/[topic] swap
-- to maintenance view, /today picker bucket gating, drift detection,
-- cadence prompts — all gated on this single field.
--
-- phase: implementing | maintaining | drifting
--   - implementing — user is still building the floor for this
--     journey. The current /plan view + implementation milestones
--     are the right surface.
--   - maintaining — user has hit the graduation criteria for this
--     journey (defined per-journey in lib/journey-state/compute.ts).
--     The /plan view will eventually swap to a defended-floor view;
--     drift detectors run.
--   - drifting — drift detector for this journey has fired. The
--     defended floor has been breached and a climb-back surface is
--     warranted. Only style currently has an automatic drift
--     detector (BF-drift staleness, mig 0093); other journeys will
--     stay in maintaining until Slice 3 ships their detectors.
--
-- entered_at carries the timestamp the CURRENT phase started — this
-- is what powers "how long have you been maintaining hair" without
-- re-deriving from underlying signals on every read. previous_phase
-- is kept for transition tracking (used by the phase-transition
-- milestone in lib/journey-state/persist.ts).
--
-- source records which detector wrote the row (e.g. 'hair_stage_4'
-- vs 'pattern_d_on_protocol_stable') — useful for debugging when a
-- user's phase moves unexpectedly.
--
-- Absence of a row for (user, journey_slug) means the user has not
-- engaged with that journey at all. Distinguished from 'implementing'
-- which means engaged but not yet graduated. Surfaces that read this
-- table should treat missing rows as "this journey isn't active for
-- this user" — they get no maintenance surface, no graduation
-- milestone, nothing.
--
-- Run in Supabase SQL Editor.

create table if not exists public.journey_states (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  journey_slug text not null check (journey_slug in (
    'hair',
    'style',
    'body_composition',
    'strength',
    'cardio',
    'sleep',
    'skincare',
    'facial_hair'
  )),
  phase text not null check (phase in (
    'implementing',
    'maintaining',
    'drifting'
  )),
  entered_at timestamptz not null default now(),
  previous_phase text check (previous_phase is null or previous_phase in (
    'implementing',
    'maintaining',
    'drifting'
  )),
  source text,
  updated_at timestamptz not null default now(),
  unique (user_id, journey_slug)
);

create index if not exists journey_states_user_idx
  on public.journey_states(user_id);

alter table public.journey_states enable row level security;

create policy "journey_states_select_own"
  on public.journey_states for select
  using (auth.uid() = user_id);

-- Writes happen via service-role client (sync runs on /today render).
-- No user-visible insert / update / delete policy — the sync is the
-- only writer and the user has no business mutating the state
-- directly. delete on cascade from users keeps the table clean on
-- account deletion.
