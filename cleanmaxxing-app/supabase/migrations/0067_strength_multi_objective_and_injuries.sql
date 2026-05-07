-- ==========================================
-- Cleanmaxxing — strength_assessments multi-objective + injury fields
-- ==========================================
-- T1 + partial A4 from the May 2026 ideas brain dump.
--
-- A1 — Multi-objective intent: the existing single primary_goal
-- doesn't capture that 35+ users frequently want strength PLUS
-- something else (cutting, mobility, core, cardio health). v1 caps
-- at primary + ONE secondary; the schema supports relaxing this
-- later (change the column type to text[] or drop the singular
-- constraint).
--
-- A4 — Injury constraints (high-impact subset only): the most
-- common 35+ chronic conditions that meaningfully change a strength
-- prescription. Multi-select because users often have more than one
-- (knee + lower back is a common pair).
--
--   lower_back_pain     → no conventional deadlifts / good mornings,
--                         no heavy hip-hinge under load
--   knee_pain           → no deep barbell squats, no plyo
--   shoulder_or_neck_pain → no overhead pressing, no upright rows,
--                           no behind-the-neck pressing
--   elbow_pain          → no heavy direct biceps with EZ-bar /
--                         barbell, no heavy skull crushers
--
-- Both fields are nullable / empty-default so existing
-- strength_assessments rows aren't invalidated.
--
-- secondary_objective is enforced via a column-level check
-- constraint. injury_constraints values are validated at the
-- service / API layer (Postgres array element check constraints
-- are awkward; see lib/strength/types.ts and the assessment route
-- for the enforced enum).
--
-- Run in Supabase SQL Editor.

alter table public.strength_assessments
  add column if not exists secondary_objective text check (secondary_objective in (
    'weight_loss',
    'core_strength',
    'mobility_flexibility',
    'cardiovascular_health',
    'general_function',
    'none'
  ));

alter table public.strength_assessments
  add column if not exists injury_constraints text[] not null default '{}'::text[];
