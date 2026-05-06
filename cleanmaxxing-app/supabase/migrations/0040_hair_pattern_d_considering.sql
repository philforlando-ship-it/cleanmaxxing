-- ==========================================
-- Cleanmaxxing — hair Pattern D (Considering phase)
-- ==========================================
-- Pattern D Considering is the first piece of the framework's full
-- Pattern D treatment journey to ship. Lives inside /plan/hair as a
-- card that appears when stage_2_path === 'treat'. The full Pattern D
-- (Considering / On protocol / Off-ramp) is multi-week work; this is
-- the first useful slice.
--
-- The new column is a soft signal: "user clicked 'I've started
-- treatment' on the Considering surface." Distinct from
-- user_profile.current_interventions (which captures the actual
-- intervention list). EITHER signal flips the user out of Considering
-- and into "on protocol" framing in the UI:
-- - current_interventions includes finasteride/minoxidil → on protocol
-- - pattern_d_treatment_started_at is set → on protocol
-- Both can be true; that's fine.
--
-- We don't pre-set this column when the user picks Stage 2 Treat,
-- even if they're already on fin/min, because being already on fin/min
-- is captured separately. The render-time check handles both signals.
--
-- Run in Supabase SQL Editor.

alter table public.hair_assessments
  add column if not exists pattern_d_treatment_started_at timestamptz;
