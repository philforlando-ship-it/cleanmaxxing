-- ==========================================
-- Cleanmaxxing — second-gate stage milestones
-- ==========================================
-- Adds the second decision gate per journey for the four POV-aligned
-- candidates (strength plateau, cardio HIIT, skincare step-up, sleep
-- apnea screening). Skips the two that were not POV-grounded
-- (nutrition GLP-1 Pattern D, facial hair 3-month eval).
--
-- Per journey:
--
--   strength: last_plateau_intervention_at — surfaces 12-18 weeks
--     after the report (3 deload cycles) when the user can re-run
--     the Israetel SFR test on every exercise to swap weak
--     performers. POV 19 names this directly.
--
--   cardio: hiit_layer_started_at — surfaces 8+ weeks after
--     zone_2_layer_started_at (or report_generated_at if user
--     started with Zone 2 already) when the user is ready to add
--     the Norwegian 4x4 HIIT layer. POV 23 names this directly.
--
--   skincare: last_step_up_at — surfaces 12+ weeks after
--     retinoid_started_at when the user is ready to step up
--     (higher concentration, prescription tretinoin if on adapalene,
--     vitamin C addition, professional treatments). POV 07 + 32
--     name this cadence directly.
--
--   sleep: apnea_screening_surfaced_at — surfaces 4+ weeks after
--     otc_supplements_considered_at when the rolling avg is still
--     < 7h. Specifically narrowed to apnea-screening framing rather
--     than generic Rx escalation — POV 42 supports the apnea
--     framing but is skeptical of generic Rx for insomnia.
--
-- All additive, all nullable. Existing rows are unaffected.
--
-- Run in Supabase SQL Editor.

alter table public.strength_assessments
  add column if not exists last_plateau_intervention_at timestamptz;

alter table public.cardio_assessments
  add column if not exists hiit_layer_started_at timestamptz;

alter table public.skincare_assessments
  add column if not exists last_step_up_at timestamptz;

alter table public.sleep_assessments
  add column if not exists apnea_screening_surfaced_at timestamptz;
