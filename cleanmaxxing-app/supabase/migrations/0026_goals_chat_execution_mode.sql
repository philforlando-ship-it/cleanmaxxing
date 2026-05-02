-- ==========================================
-- Cleanmaxxing — Per-goal Mister P execution mode
-- ==========================================
-- Boolean flag on goals so the user can opt a specific goal's chat
-- thread out of foundation-first redirects. The default is false: by
-- default, Mister P is willing to push back on a goal that the user's
-- current state doesn't support (a peptide goal at 22% body fat with
-- sub-7h sleep, for example) — which is brand-aligned but can frustrate
-- a user who has explicitly committed to the goal.
--
-- When set true, the per-goal chat advisory in lib/mister-p/prompt.ts
-- instructs Mister P to skip the foundation-first redirect and engage
-- with the goal directly. Hard refusals (sourcing, prescriptive non-
-- medical protocols) still apply — execution mode does not override
-- safety. The toggle lives at /api/mister-p/execution-mode and the UI
-- surfaces it in the goal-scoped chat card after the user has heard
-- Mister P's first response.
--
-- Run in Supabase SQL Editor.

alter table public.goals
  add column if not exists chat_execution_mode boolean not null default false;

-- Belt-and-suspenders backfill in case the column was ever loosened
-- in a future migration. The default already covers existing rows.
update public.goals set chat_execution_mode = false where chat_execution_mode is null;
