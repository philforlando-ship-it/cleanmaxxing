-- ==========================================
-- Cleanmaxxing — Goal phase-acknowledged tracking
-- ==========================================
-- Records which onramp phase the user has acknowledged for each
-- goal so the /today Current Focus card can hide content the
-- user has already read. Phase identifier is the onramp's
-- block.range string ("1-4", "5-8", etc.) for active phases or
-- the literal "graduated" for completed walkthroughs. Null means
-- "user hasn't dismissed any phase yet" — the first time they
-- visit /today after the migration, every active goal's current
-- phase is fresh and shows up.
--
-- Run in Supabase SQL Editor.

alter table public.goals
  add column if not exists last_phase_seen text;
