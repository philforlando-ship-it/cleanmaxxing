-- ==========================================
-- Cleanmaxxing — Motivation segment: add 'maintenance-aging'
-- ==========================================
-- The question option list in lib/onboarding/questions.ts gained a
-- 'maintenance-aging' value after migration 0005 was written, but the
-- check constraint on public.users.motivation_segment was never updated
-- to match. Submitting onboarding with that selection failed with
-- users_motivation_segment_check. This brings the constraint back in
-- sync with the application's MOTIVATION_VALUES set.
--
-- Run in Supabase SQL Editor (the Migrations panel chokes on ad-hoc DDL).

alter table public.users drop constraint users_motivation_segment_check;

alter table public.users add constraint users_motivation_segment_check
  check (motivation_segment in (
    'feel-better-in-own-skin',
    'social-professional-confidence',
    'specific-event',
    'structured-plan',
    'something-specific-bothering-me',
    'maintenance-aging',
    'not-sure-yet'
  ));
