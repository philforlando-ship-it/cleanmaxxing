-- ==========================================
-- Migration 0003 — Relax goals.priority_tier check
-- ==========================================
-- The original schema used a placeholder S/A/B/C enum before the POV
-- hierarchy from doc 15 was finalized. This migration replaces that
-- constraint with the real tier values from pov_docs.priority_tier, so
-- that system-suggested goals (which copy tier from the source POV doc)
-- can be inserted.
--
-- Meta-ish tiers (avoid, meta, monitor) are intentionally NOT valid goal
-- tiers — users should not have an "avoid alcohol" system-suggested goal
-- or a "meta" goal. Those docs are filtered out at the suggestion layer.

alter table public.goals
  drop constraint if exists goals_priority_tier_check;

alter table public.goals
  add constraint goals_priority_tier_check
  check (priority_tier in (
    'tier-1',
    'tier-2',
    'tier-3',
    'tier-4',
    'tier-5',
    'conditional-tier-1',
    'advanced'
  ));
