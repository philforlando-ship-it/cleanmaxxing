-- ==========================================
-- Cleanmaxxing — cardio_assessments programming_priority
-- ==========================================
-- Cross-journey energy + fatigue architecture, slice 1 (2026-05-08).
-- See memory: project_cross_journey_energy_fatigue_architecture.md.
--
-- programming_priority — the trade-off arbiter when cardio and
-- strength training conflict on recovery. Distinct from primary_role:
--
--   primary_role         = what role does cardio play for you?
--                          (cardio's specific job)
--   programming_priority = when cardio and strength conflict, which
--                          one wins? (overall fitness priority)
--
-- Drives the new "three options" framing in the cardio prompt when
-- both journeys are active and recovery cost compounds:
--   (1) keep strength volume, drop cardio intensity
--   (2) keep cardio intensity, drop strength volume
--   (3) separate by 6-8h on training days
--
-- Nullable to support cardio_assessments rows pre-migration. The
-- form requires it on next submit; the prompt handles null gracefully
-- by falling back to the existing strength_days_per_week-based rules.
--
-- Run in Supabase SQL Editor.

alter table public.cardio_assessments
  add column if not exists programming_priority text check (programming_priority in (
    'strength',
    'muscle_gain',
    'fat_loss',
    'general_fitness',
    'athletic_conditioning'
  ));
