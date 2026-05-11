-- ==========================================
-- Cleanmaxxing — Drop the goals system
-- ==========================================
-- Tier 3 of the goals retirement (Sub-ship A 2026-05-10 deleted the
-- UI; Sub-ship B refactored the orphan code paths; this drops the
-- tables + the columns that referenced them).
--
-- Schema deletions:
--   - mister_p_queries.goal_id column (mig 0013) — chat threads are
--     journey-scoped now (mig 0104). Drops the index too.
--   - hair_assessments.stage_2_pattern_d_goal_id column (mig 0037) —
--     Pattern D marker mechanism retired; stage_2_path is now the
--     single source of truth for the user's chosen path.
--   - goal_check_ins table (mig 0001) — orphan after /api/check-in
--     route deletion + getStalestGoal removal + getWeeklyCheckInSummary
--     refactor. FK chains through check_ins.
--   - check_ins table (mig 0001) — same as above.
--   - goals table (mig 0001) — orphan after all of Sub-ship A/B/Tier-3
--     refactoring.
--
-- The chat_execution_mode + chat_execution_prompt_acked columns on
-- goals (migs 0026 + 0027) drop implicitly with the table.
--
-- The pre-wipe legacy users were already cleared, so no data
-- preservation step is needed. The tables are confirmed empty per
-- the user's pre-Tier-3 wipe.
--
-- Run in Supabase SQL Editor.

-- 1. Drop the goal_id column on mister_p_queries.
--    The FK to goals(id) drops with the column (no explicit drop
--    constraint needed). The composite index on (user_id, goal_id,
--    created_at) drops with the column too.
alter table public.mister_p_queries
  drop column if exists goal_id;

-- 2. Drop stage_2_pattern_d_goal_id on hair_assessments. FK to
--    goals(id) drops with the column.
alter table public.hair_assessments
  drop column if exists stage_2_pattern_d_goal_id;

-- 3. Drop goal_check_ins (depends on check_ins + goals via FK).
drop table if exists public.goal_check_ins cascade;

-- 4. Drop check_ins (depends on users via FK).
drop table if exists public.check_ins cascade;

-- 5. Drop goals (depends on users via FK).
drop table if exists public.goals cascade;
