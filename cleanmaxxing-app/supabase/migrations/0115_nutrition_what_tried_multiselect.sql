-- ==========================================
-- Cleanmaxxing — nutrition_assessments.what_tried → text[]
-- ==========================================
-- Q4 was single-select in v0 (mig 0054). UX feedback: users who've
-- counted macros AND tried a restrictive diet AND been on a GLP-1
-- couldn't represent that without falling back to 'multiple_things',
-- which loses the specifics the report-prompt rules actually branch on
-- (e.g., what_tried includes 'counted_macros' → "you don't need the
-- basics"; what_tried includes 'restrictive_diet' → eating-problem
-- guardrail).
--
-- Multi-select with two exclusive options:
--   - 'nothing_systematic' — exclusive (you tried nothing OR something,
--     not both)
--   - 'multiple_things' — exclusive but DEPRECATED in the picker. The
--     value stays in the enum so existing rows lift cleanly, but the
--     form no longer offers it (multi-select replaces the workaround it
--     was). Existing rows render as-is; re-evaluation switches to the
--     new picker.
-- The other three (counted_macros / restrictive_diet / glp1_or_pharma)
-- are freely combinable. Form enforces exclusivity client-side; this
-- column just stores whatever array arrives, validated against the
-- enum.
--
-- Existing rows (text scalar) lift into single-element arrays. The
-- replacement check constraint validates each element is one of the
-- enumerated values and the array is non-empty.
--
-- Run in Supabase SQL Editor.

alter table public.nutrition_assessments
  drop constraint if exists nutrition_assessments_what_tried_check;

alter table public.nutrition_assessments
  alter column what_tried set data type text[]
  using array[what_tried];

alter table public.nutrition_assessments
  add constraint nutrition_assessments_what_tried_check
  check (
    array_length(what_tried, 1) >= 1
    and what_tried <@ array[
      'nothing_systematic',
      'counted_macros',
      'restrictive_diet',
      'glp1_or_pharma',
      'multiple_things'
    ]::text[]
  );
