-- ==========================================
-- Cleanmaxxing — Goal target date
-- ==========================================
-- Optional finishline for goals. When set, the WeeklyFocusCard
-- on /today renders "Week N of M" instead of the open-ended
-- "Week N", giving the user a sense of progress through their
-- self-defined window. M is computed from
-- (target_date - created_at) at render time, so duration-style
-- inputs in the UI ("for 8 weeks") still resolve to a date here.
-- Null preserves the existing open-ended behavior — no
-- backfill needed.
--
-- Run in Supabase SQL Editor.

alter table public.goals
  add column if not exists target_date date;
