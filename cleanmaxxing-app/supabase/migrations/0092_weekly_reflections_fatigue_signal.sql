-- ==========================================
-- Cleanmaxxing — weekly_reflections.fatigue_level + fatigue_source
-- ==========================================
-- Cross-journey energy + fatigue architecture, slice 6 (2026-05-09).
-- See memory: project_cross_journey_energy_fatigue_architecture.md.
--
-- Bidirectional fatigue signal — captured weekly as part of the
-- existing reflection form. The cardio + strength + nutrition plan
-- prompts read the most recent fatigue_level within the last 14 days
-- as a cross-modifier:
--
--   level     'good' | 'okay' | 'struggling'  — 3-point self-report
--   source    'cardio' | 'strength' | 'sleep' | 'stress' | 'unknown'
--             — what the user attributes the fatigue to. Only
--             load-bearing when level = 'struggling'; otherwise the
--             source field is informational.
--
-- Both nullable: rows pre-migration stay valid; the question is
-- optional in the form. The source field is also optional within an
-- answered fatigue prompt — a user can answer level without
-- attributing source.
--
-- Run in Supabase SQL Editor.

alter table public.weekly_reflections
  add column if not exists fatigue_level text
    check (fatigue_level is null or fatigue_level in (
      'good',
      'okay',
      'struggling'
    )),
  add column if not exists fatigue_source text
    check (fatigue_source is null or fatigue_source in (
      'cardio',
      'strength',
      'sleep',
      'stress',
      'unknown'
    ));
