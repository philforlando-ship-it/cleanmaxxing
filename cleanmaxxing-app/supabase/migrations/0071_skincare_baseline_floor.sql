-- ==========================================
-- Cleanmaxxing — skincare baseline-floor stage milestone
-- ==========================================
-- Adds baseline_established_at to skincare_assessments. Gates the
-- existing retinoid card (and its prompt-side modifier) behind a
-- positive signal that the user has cleanser + moisturizer + SPF
-- in place — currently the retinoid card surfaces purely on a
-- 3-week elapsed timer regardless of whether the floor exists,
-- which means a user with current_routine = 'none' could be told
-- to introduce a retinoid before they own a moisturizer.
--
-- Source-of-truth ordering:
--   1. baseline established (cleanser + moisturizer + SPF in place)
--   2. retinoid_started_at (floor + 4 weeks elapsed)
--   3. last_step_up_at (12 weeks on retinoid)
--
-- Users whose current_routine at assessment is already in the
-- 'cleanser_moisturizer' / 'full_routine' set are treated as
-- baseline-established at report time without needing the gate
-- card — the floor-card UI only surfaces when current_routine is
-- 'none' or 'cleanser_only'.
--
-- Additive, nullable. Existing rows are unaffected.
--
-- Run in Supabase SQL Editor.

alter table public.skincare_assessments
  add column if not exists baseline_established_at timestamptz;
