-- ==========================================
-- Cleanmaxxing — strength_assessments.secondary_objective multi-select
-- ==========================================
-- User feedback 2026-05-12: 35+ users frequently want strength PLUS
-- multiple secondaries (weight loss + mobility + core, etc.). Single-
-- select forced them to pick one, which was artificially narrow given
-- the audience. Schema flips to text[] with the same allowed values
-- minus 'none' — empty array is now the canonical "no secondary."
--
-- Migration plan:
--   1. Drop the single-value CHECK constraint.
--   2. Convert the column to text[] using a CASE: null → '{}', 'none'
--      → '{}', any other value → array[value]. Existing 'none' rows
--      collapse to empty array — same semantics, cleaner shape.
--   3. Default '{}'::text[] for future inserts.
--   4. Add new array-element CHECK using the <@ ("contained by")
--      operator, dropping 'none' from the allowed set.
--
-- Mirrors the pattern in 0090_cardio_assessments_multi_select.sql.
--
-- Run in Supabase SQL Editor.

alter table public.strength_assessments
  drop constraint if exists strength_assessments_secondary_objective_check;

alter table public.strength_assessments
  alter column secondary_objective type text[]
    using case
      when secondary_objective is null then '{}'::text[]
      when secondary_objective = 'none' then '{}'::text[]
      else array[secondary_objective]::text[]
    end;

alter table public.strength_assessments
  alter column secondary_objective set default '{}'::text[];

alter table public.strength_assessments
  alter column secondary_objective set not null;

alter table public.strength_assessments
  add constraint strength_assessments_secondary_objective_check
    check (secondary_objective <@ array[
      'weight_loss',
      'core_strength',
      'mobility_flexibility',
      'cardiovascular_health',
      'general_function'
    ]::text[]);
