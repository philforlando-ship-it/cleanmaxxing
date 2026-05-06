-- ==========================================
-- Cleanmaxxing — hair Stages 5 + 6 (monitoring + maintenance)
-- ==========================================
-- Stage 5 is the photo-cadence commitment. We do NOT store the photos
-- in v1 — most users would rather keep their hair-loss photos in their
-- own phone library than upload them to an app. What we store is the
-- cadence + the timestamp of the last session. The user runs the
-- comparison themselves; Mister P provides the protocol and reminders.
-- (When Mister P photo access lands, we can layer real upload onto
-- this without changing the schema — just add an optional photo_id
-- column to a new hair_photo_sessions table.)
--
-- Stage 5 is PERPETUAL — there's no completion timestamp. The journey
-- enters maintenance mode and Stage 6 unlocks once Stage 5 is started
-- (not when it "completes").
--
-- Stage 6 is the terminal stage. Cut cadence weeks is mostly an
-- informational reminder; we don't currently log "I got a cut" outside
-- Stage 1. The framework memo says Stage 6 is "thin — mostly settings."
--
-- Modifier-aware cadence (computed at start time, stored on the row):
--   Stage 5 cadence_days:
--     - 30  for 'shaved_or_buzzed' or stage_2_path = 'transition' (monthly scalp check)
--     - 90  for treat / monitor with active loss signal (quarterly)
--     - 180 for full / mature_hairline with no treatment (semi-annual)
--   Stage 6 cut_cadence_weeks:
--     - 2  for buzz_cut / bald_track (rounded; really 3-10 days)
--     - 5  for textured_crop / crew_cut / ivy_league / slick_back / textured_quiff
--     - 7  for mid_length_textured / curtains
--
-- Run in Supabase SQL Editor.

alter table public.hair_assessments
  -- Stage 5 — monitoring habit
  add column if not exists stage_5_started_at timestamptz,
  add column if not exists stage_5_cadence_days int
    check (stage_5_cadence_days between 7 and 365),
  add column if not exists stage_5_last_session_at timestamptz,
  add column if not exists stage_5_session_count int not null default 0,
  -- Stage 6 — maintenance + revisit triggers (terminal)
  add column if not exists stage_6_started_at timestamptz,
  add column if not exists stage_6_cut_cadence_weeks int
    check (stage_6_cut_cadence_weeks between 1 and 26);
