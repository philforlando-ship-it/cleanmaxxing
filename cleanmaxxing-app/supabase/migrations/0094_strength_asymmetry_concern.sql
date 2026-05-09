-- ==========================================
-- Cleanmaxxing — strength_assessments.asymmetry_concern
-- ==========================================
-- POV 19's new asymmetric-development section (added 2026-05-09)
-- gives the framework for left/right size or strength imbalances.
-- This migration adds the assessment field that lets the prompt
-- branch on whether the user has a meaningful asymmetry to design
-- programming around.
--
-- Values:
--   'none'        — no notable left/right asymmetry
--   'mild'        — slight asymmetry (~5-10%, normal range, not
--                   visible; unilateral work in the program will
--                   handle it without special programming)
--   'noticeable'  — visible asymmetry (>~15%, worth a unilateral
--                   bias and 1-2 extra weekly sets on the weaker
--                   side; per POV 19's asymmetry block)
--
-- Nullable to support pre-migration assessments. The form requires
-- it on next submit.
--
-- Run in Supabase SQL Editor.

alter table public.strength_assessments
  add column if not exists asymmetry_concern text
    check (asymmetry_concern is null or asymmetry_concern in (
      'none',
      'mild',
      'noticeable'
    ));
