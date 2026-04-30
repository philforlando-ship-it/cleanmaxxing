-- ==========================================
-- Cleanmaxxing — Goal-anchored Mister P chat threads
-- ==========================================
-- Adds an optional goal_id to mister_p_queries so chats opened from a
-- goal context can be filtered as a per-goal thread. Pre-existing
-- rows have null goal_id and continue to belong to the global thread
-- (chat from /today). On goal delete, set null rather than cascade —
-- preserves the user's chat record even after a goal is retired or
-- abandoned, in case future UI surfaces an "orphaned chats" view.
--
-- Run in Supabase SQL Editor.

alter table public.mister_p_queries
  add column if not exists goal_id uuid
    references public.goals(id) on delete set null;

-- Composite index supports the per-thread loader's scan path:
-- WHERE user_id = $1 AND goal_id [= $2 | IS NULL] ORDER BY created_at DESC.
create index if not exists mister_p_queries_user_goal_idx
  on public.mister_p_queries(user_id, goal_id, created_at desc);
