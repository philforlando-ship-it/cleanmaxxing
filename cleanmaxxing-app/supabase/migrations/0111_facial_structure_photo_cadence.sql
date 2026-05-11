-- ==========================================
-- Cleanmaxxing — facial_structure: monthly photo cadence column
-- ==========================================
-- Adds last_facial_photo_logged_at to facial_structure_assessments.
-- Powers the /today monthly photo tile per the POV 16 maintenance
-- cadence ("same-conditions photo monthly, comparison to prior
-- month is the only honest read").
--
-- Decoupled from progress_photos rows on purpose — the user may
-- capture the actual photo in their phone library, the in-app
-- /photos surface, or anywhere else; the cadence tracker just
-- records "you said you took this month's photo." Matches the hair
-- Stage 5 pattern (stage_5_last_session_at).
--
-- Run in Supabase SQL Editor.

alter table public.facial_structure_assessments
  add column if not exists last_facial_photo_logged_at timestamptz;
