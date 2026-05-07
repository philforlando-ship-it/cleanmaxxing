-- ==========================================
-- Cleanmaxxing — skincare assessment depth (sensitivity + barrier)
-- ==========================================
-- Adds two signals that the v0 four-question assessment didn't
-- capture but that are load-bearing for retinoid timing and
-- irritation management:
--
--   sensitivity_history — has the user previously reacted to
--     actives (retinoids, AHAs, vitamin C, benzoyl peroxide)?
--     A 'yes' shifts the prompt toward sandwich technique +
--     slower ramp + drugstore-tier first. POV 07 names this
--     pattern as the most common reason users abandon retinoids.
--
--   barrier_state — is the barrier compromised RIGHT NOW
--     (visible peeling, persistent redness, burning sensation)?
--     A 'compromised' value forces the report to anchor entirely
--     on barrier repair (gentle cleanser + heavy ceramide
--     moisturizer + mineral SPF, no actives) for 4 weeks before
--     any active is even named.
--
-- Both nullable (existing rows are unaffected; older users who
-- already have a report keep their current state, the prompt
-- treats null as "not screened" and ignores the modifier).
--
-- Run in Supabase SQL Editor.

alter table public.skincare_assessments
  add column if not exists sensitivity_history text
    check (
      sensitivity_history is null
      or sensitivity_history in ('yes', 'no', 'unsure')
    );

alter table public.skincare_assessments
  add column if not exists barrier_state text
    check (
      barrier_state is null
      or barrier_state in ('compromised', 'normal', 'unsure')
    );
