-- ==========================================
-- Cleanmaxxing — weekly_reflections.activity_change
-- ==========================================
-- Cross-journey energy + fatigue architecture, slice 5 (2026-05-08).
-- See memory: project_cross_journey_energy_fatigue_architecture.md.
--
-- Optional weekly capture: "did your activity level meaningfully
-- change this week?" When increased or decreased, the form surfaces
-- a nudge to revisit /plan/nutrition (the caloric target was tuned
-- against the prior activity baseline).
--
-- We don't auto-recalculate the nutrition plan — surface the
-- dependency, let the user decide. Same posture as slice 2's
-- deficit-deepening warning.
--
-- Three values:
--   'no_change' — explicit confirmation that the week was steady.
--                 Useful — tells the system the nutrition plan is
--                 still tuned correctly.
--   'increased' — added cardio/strength/walking/etc. The deficit
--                 deepens or the surplus shrinks; revisit nutrition.
--   'decreased' — dropped a journey, injured, paused, low week.
--                 The opposite — recalibrate downward if needed.
--
-- Nullable: rows pre-migration stay valid; not all reflections need
-- to answer (the question is optional in the form).
--
-- Run in Supabase SQL Editor.

alter table public.weekly_reflections
  add column if not exists activity_change text
    check (activity_change is null or activity_change in (
      'no_change',
      'increased',
      'decreased'
    ));
