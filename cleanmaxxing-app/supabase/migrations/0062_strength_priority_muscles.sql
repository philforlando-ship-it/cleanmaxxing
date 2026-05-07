-- ==========================================
-- Cleanmaxxing — strength_assessments priority muscles (fifth question)
-- ==========================================
-- Adds two columns to capture the user's looksmaxxing-priority
-- muscles and any free-text "what feels lagging" note. Drives a
-- volume + frequency bias in the report:
--   - Priority muscles run at the high end of MAV (12-15 sets/wk
--     vs default 8-12)
--   - Priority muscles trained 2x/week minimum even if rest of
--     split is 1x
--   - Report MUST name the per-muscle frequency in the
--     prescription so the user can see the bias actually happened
--
-- Constrained set drawn from POV 19's "highest ROI exercises by
-- muscle group" + the looksmaxxing visual-leverage thesis: side
-- delts, upper chest, lats / back width, arms, glutes, hamstrings.
-- A check on cardinality (max 3) is enforced at the application
-- layer, not in SQL — keeps the column flexible.
--
-- Run in Supabase SQL Editor.

alter table public.strength_assessments
  add column if not exists priority_muscles text[]
    not null default '{}',
  add column if not exists lagging_muscles_text text
    check (char_length(lagging_muscles_text) <= 280);

-- Per-element check on the priority_muscles array. Keeps the
-- vocabulary in sync with lib/strength/types.ts. Adding a value to
-- the visual-leverage stack means a follow-up migration to expand
-- this constraint.
alter table public.strength_assessments
  drop constraint if exists strength_assessments_priority_muscles_valid;

alter table public.strength_assessments
  add constraint strength_assessments_priority_muscles_valid
  check (priority_muscles <@ array[
    'side_delts',
    'upper_chest',
    'lats_back_width',
    'arms',
    'glutes',
    'hamstrings'
  ]::text[]);
