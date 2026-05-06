-- ==========================================
-- Cleanmaxxing — strength exercise preferences (additive to 0055)
-- ==========================================
-- Adds three fields to strength_assessments so the user can curate
-- which exercises Mister P recommends from. The fields are read by
-- the report generator on each (re-)generation; saving preferences
-- alone does NOT trigger regeneration — that's a separate endpoint
-- the user invokes when they want the new picks reflected.
--
-- Fields:
--   selected_exercise_slugs — exercises the user actively prefers.
--     When present, the generator instructs Mister P to lean on these.
--     Empty array = no preference signal, fall back to defaults.
--   excluded_exercise_slugs — exercises to avoid. Hard signal — the
--     generator instructs Mister P NOT to recommend these.
--   exercise_filter_text — free-form constraints the user types in
--     ("bad shoulder, no overhead pressing", "no overhead at all
--     after a tendon flare", etc). Capped at 500 chars to keep the
--     prompt budget reasonable.
--
-- Run in Supabase SQL Editor.

alter table public.strength_assessments
  add column if not exists selected_exercise_slugs text[]
    not null default '{}'::text[];

alter table public.strength_assessments
  add column if not exists excluded_exercise_slugs text[]
    not null default '{}'::text[];

alter table public.strength_assessments
  add column if not exists exercise_filter_text text
    check (exercise_filter_text is null or char_length(exercise_filter_text) <= 500);
