-- ==========================================
-- Cleanmaxxing — mister_p_queries.journey_slug
-- ==========================================
-- Journey-scoped chat threads, replacing the goal-scoped picker on
-- /today (mig 0013 introduced goal_id; the onboarding journey-picker
-- ship on 2026-05-07 made journeys the primary organizing primitive,
-- so the picker UI now follows). Existing goal_id column stays for
-- legacy reads on /goals/[id] — it isn't being dropped, just no
-- longer being written by the /today chat surface.
--
-- Slug values are validated app-side against the JOURNEYS catalog
-- (lib/today/journeys.ts) — keeping it text + nullable here avoids
-- a DB-side enum we'd need to evolve every time a journey is added
-- or split. Pre-migration rows have null journey_slug and continue
-- to belong to whichever scope they were originally written under
-- (General or per-goal).
--
-- Run in Supabase SQL Editor.

alter table public.mister_p_queries
  add column if not exists journey_slug text;

-- Composite index supports the per-thread loader's scan path:
-- WHERE user_id = $1 AND journey_slug [= $2 | IS NULL] ORDER BY created_at DESC.
create index if not exists mister_p_queries_user_journey_idx
  on public.mister_p_queries(user_id, journey_slug, created_at desc);
