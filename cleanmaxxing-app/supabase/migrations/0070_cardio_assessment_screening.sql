-- ==========================================
-- Cleanmaxxing — cardio_assessments screening expansion
-- ==========================================
-- C1 + C2 from the May 2026 ideas brain dump (cardio personalization
-- and activity downweighting). Adds five fields:
--
--   injury_constraints   — knee / back (lower or mid) / hip /
--                          respiratory; multi-select. Element
--                          validation at API/service layer (Postgres
--                          array element checks are awkward).
--
--   equipment_access     — what cardio equipment the user has access
--                          to. Drives modality recommendations.
--
--   outdoor_access       — whether outdoor cardio is realistic
--                          year-round, seasonally, rarely, or not at
--                          all. Drives indoor vs. outdoor modality
--                          recommendations.
--
--   time_per_session     — bucketed time budget. Affects which
--                          modality fits the schedule.
--
--   occupation_activity  — sedentary / mostly_standing / mostly_active
--                          / very_active. Drives cardio downweighting
--                          for high-activity day jobs (C2 — the
--                          construction-worker case).
--
-- All five are nullable so existing cardio_assessments rows stay
-- valid through the migration. The form requires them on next
-- submit; the prompt handles null gracefully ("not specified — work
-- from felt sense").
--
-- Run in Supabase SQL Editor.

alter table public.cardio_assessments
  add column if not exists injury_constraints text[] not null default '{}'::text[],

  add column if not exists equipment_access text check (equipment_access in (
    'full_gym',
    'home_treadmill',
    'home_bike',
    'outdoor_only',
    'classes_studio',
    'none_minimal'
  )),

  add column if not exists outdoor_access text check (outdoor_access in (
    'year_round',
    'seasonal',
    'rare',
    'never'
  )),

  add column if not exists time_per_session text check (time_per_session in (
    'under_20min',
    '20_to_40min',
    '40plus_min'
  )),

  add column if not exists occupation_activity text check (occupation_activity in (
    'sedentary',
    'mostly_standing',
    'mostly_active',
    'very_active'
  ));
