-- ==========================================
-- Cleanmaxxing — hair_assessments Stage 2 columns (density action)
-- ==========================================
-- Stage 2 is the medical decision: Treat / Monitor / Transition.
-- This is where Pattern A (the hair plan) hands off to Pattern D
-- (the hair-loss-start-plan goal) when the user picks "Treat" — the
-- two journeys then run in parallel, with fin/min on
-- user_profile.current_interventions becoming a modifier on the hair
-- plan from that point on.
--
-- stage_2_pattern_d_goal_id is the linkage pointer. NULL for monitor /
-- transition paths and for treat-path users who already had an active
-- hair-loss-start-plan goal (we link to the existing row rather than
-- create a duplicate).
--
-- on delete set null: if the user deletes their Pattern D goal, our
-- pointer goes null rather than cascading or blocking. The path itself
-- stays 'treat' on this row — the user picked treat, that historical
-- decision shouldn't unwind because they later removed the goal.
--
-- Run in Supabase SQL Editor.

alter table public.hair_assessments
  add column if not exists stage_2_path text check (stage_2_path in (
    'treat', 'monitor', 'transition'
  )),
  add column if not exists stage_2_locked_in_at timestamptz,
  add column if not exists stage_2_pattern_d_goal_id uuid
    references public.goals(id) on delete set null;
