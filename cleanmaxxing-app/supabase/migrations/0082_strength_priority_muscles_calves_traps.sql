-- ==========================================
-- Cleanmaxxing — extend priority_muscles with calves + traps
-- ==========================================
-- L1 audit follow-up. The catalog expansion (40 → 97 exercises)
-- added 3 calves variants (was 1) and a dedicated traps exercise
-- (barbell_shrug — was 0). Both qualify as "looksmaxxing
-- visual-leverage muscles" per the existing framing — calves
-- complete the leg silhouette, traps drive upper-back density.
-- Without these in the priority set, users can't bias volume +
-- frequency toward them, only signal via lagging_muscles_text
-- free text.
--
-- Drop and re-add the per-element check constraint to expand the
-- allowed set. Existing rows are unaffected (only new values get
-- added; existing values stay valid).
--
-- Run in Supabase SQL Editor.

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
    'hamstrings',
    'calves',
    'traps'
  ]::text[]);
