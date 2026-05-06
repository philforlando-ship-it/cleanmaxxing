-- ==========================================
-- Cleanmaxxing — journey stage milestones (additive)
-- ==========================================
-- Adds one or two timestamp columns per Pattern A assessment table to
-- represent the highest-leverage decision gate per journey, per the
-- "good taste" criterion: a stage is a real new user decision, not
-- just "track this routine" content.
--
-- Per journey (excluding hair, which already has stages, and style,
-- which is too thin to add stages to yet):
--
--   nutrition: last_evaluated_at (12-week re-evaluation gate — the
--     cut→maintenance transition is the most common failure mode)
--
--   strength: beginner_ramp_completed_at (8-12 week graduation from
--     full-body ramp to a split — real decision for beginners)
--
--   cardio: zone_2_layer_started_at (NEAT-only → add structured
--     Zone 2 — gate fires once step count baseline is established)
--
--   sleep: otc_supplements_considered_at (behavioral baseline → OTC
--     supplements consideration after 4+ weeks at consistent
--     adherence with persistent sleep complaints)
--
--   skincare: retinoid_started_at (the single highest-leverage
--     skincare decision — introducing a retinoid)
--
--   facial_hair: growout_test_started_at + growout_test_completed_at
--     (4-week grow-out test for 'not_sure' or 'try_new_style' users —
--     two timestamps because there's a clear before/after)
--
-- All additive, all nullable. Existing rows are unaffected.
--
-- Run in Supabase SQL Editor.

alter table public.nutrition_assessments
  add column if not exists last_evaluated_at timestamptz;

alter table public.strength_assessments
  add column if not exists beginner_ramp_completed_at timestamptz;

alter table public.cardio_assessments
  add column if not exists zone_2_layer_started_at timestamptz;

alter table public.sleep_assessments
  add column if not exists otc_supplements_considered_at timestamptz;

alter table public.skincare_assessments
  add column if not exists retinoid_started_at timestamptz;

alter table public.facial_hair_assessments
  add column if not exists growout_test_started_at timestamptz;

alter table public.facial_hair_assessments
  add column if not exists growout_test_completed_at timestamptz;
