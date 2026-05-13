-- ==========================================
-- Cleanmaxxing — strength_assessments.equipment_access add 'dumbbells_and_bench'
-- ==========================================
-- User feedback 2026-05-12: the no-gym funnel was too coarse. The
-- 'home_rack_bench' option assumes the user has a rack + barbell +
-- bench all together; 'minimal_dumbbells' offers no way to flag a
-- bench separately. Users with dumbbells + a bench (a very common
-- starter home setup) had nowhere to land — they were either lying
-- on 'home_rack_bench' (and seeing barbell-only exercises they
-- couldn't perform) or undercounting on 'minimal_dumbbells' (and
-- losing access to incline DB press, DB rows on bench, etc.).
--
-- Adds 'dumbbells_and_bench' between 'minimal_dumbbells' and
-- 'home_rack_bench' in the form ordering. The exercise-visibility
-- filter (lib/strength/recommended-exercises.ts) gives this tier the
-- same equipment categories as 'minimal_dumbbells' — no barbell;
-- the bench unlocks per-exercise gear requirements (incline DB
-- press, DB rows, Bulgarian split squats, etc.) via the gear-owned
-- defaults seed in lib/strength/gear.ts.
--
-- Drop-and-recreate the CHECK constraint to widen the allowed enum.
--
-- Run in Supabase SQL Editor.

alter table public.strength_assessments
  drop constraint if exists strength_assessments_equipment_access_check;

alter table public.strength_assessments
  add constraint strength_assessments_equipment_access_check
    check (equipment_access in (
      'full_commercial_gym',
      'home_rack_bench',
      'dumbbells_and_bench',
      'minimal_dumbbells',
      'bodyweight_only'
    ));
