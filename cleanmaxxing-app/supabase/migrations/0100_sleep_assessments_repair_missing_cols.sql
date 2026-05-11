-- ==========================================
-- Cleanmaxxing — sleep_assessments: repair missing 0049 columns
-- ==========================================
-- Diagnostic probe (scripts/probe-sleep-schema.ts) revealed that the
-- live DB was missing two of migration 0049's NOT NULL columns:
--   - primary_concerns text[]
--   - biggest_blockers text[]
-- while the rest of 0049's columns (schedule_consistency, what_tried,
-- sleep_goal_text, report_text, created_at) were present. Most likely
-- cause: 0049 was applied early in the project's life with a slightly
-- different shape that didn't include these two arrays, then those
-- two were added inline to the migration source later but never
-- re-applied to this DB.
--
-- The plan/sleep save was failing with PGRST204 ("column not found")
-- because the service tried to write biggest_blockers to a column
-- that didn't exist.
--
-- Idempotent — `add column if not exists` is a no-op on environments
-- where 0049 landed cleanly.
--
-- Run in Supabase SQL Editor.

alter table public.sleep_assessments
  add column if not exists primary_concerns text[] not null default '{not_enough_total}'
    check (
      array_length(primary_concerns, 1) >= 1
      and array_length(primary_concerns, 1) <= 3
      and primary_concerns <@ ARRAY[
        'not_enough_total',
        'cant_fall_asleep',
        'wake_during_night',
        'wake_up_tired',
        'inconsistent_schedule',
        'generally_fine'
      ]::text[]
    ),
  add column if not exists biggest_blockers text[] not null default '{nothing_obvious}'
    check (
      array_length(biggest_blockers, 1) >= 1
      and array_length(biggest_blockers, 1) <= 3
      and biggest_blockers <@ ARRAY[
        'screens_late',
        'caffeine_late',
        'evening_alcohol',
        'late_exercise',
        'racing_thoughts',
        'environment',
        'partner_or_kids',
        'nothing_obvious'
      ]::text[]
    );

-- The defaults satisfy the array_length >= 1 check so any existing
-- rows backfill cleanly. New inserts always provide explicit values
-- via the form, so the defaults are only safety nets, never the
-- live shape.

-- Drop the legacy singular forms left behind by the partial 0049
-- migration. The original 0049 source must have used singular
-- column names (primary_concern / biggest_blocker, both NOT NULL)
-- before being updated to the current plural array shape. On a DB
-- where the singular form actually landed, the NOT NULL check on
-- those columns blocked every insert because the service writes to
-- the plural column instead. Probe (scripts/probe-sleep-schema.ts)
-- confirmed 0 rows in the table, so no data is lost dropping them.
alter table public.sleep_assessments
  drop column if exists primary_concern,
  drop column if exists biggest_blocker;

-- Same drift on what_tried — the live column is a scalar text with
-- a `what_tried = ANY (...)` check, but the migration source (and
-- the service) treats it as a text[] array with a subset check. The
-- column existed but with the wrong type, so an array insert was
-- being rejected with a 23514 check constraint violation. Drop +
-- re-add with the correct shape (table has 0 rows; safe).
alter table public.sleep_assessments
  drop column if exists what_tried;

alter table public.sleep_assessments
  add column if not exists what_tried text[] not null default '{nothing_systematic}'
    check (
      array_length(what_tried, 1) >= 1
      and what_tried <@ ARRAY[
        'nothing_systematic',
        'caffeine_cutoffs',
        'screen_cutoffs',
        'supplements',
        'mindfulness_breathing',
        'multiple_things'
      ]::text[]
    );

-- Force PostgREST to refresh its schema cache so the next save sees
-- the new column shape immediately.
notify pgrst, 'reload schema';
