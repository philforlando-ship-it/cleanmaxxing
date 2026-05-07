-- ==========================================
-- Cleanmaxxing — nutrition weight-loss goal + safe-rate snapshot
-- ==========================================
-- Adds the optional weight-target layer to nutrition_assessments. The
-- v0/v2 nutrition assessment captures direction (lose_fat / recomp /
-- etc.) and qualitative urgency, but never asked "what weight do you
-- want to land at + how fast." This layer is opt-in (nullable
-- everywhere) and gated to lose_fat users in the form.
--
-- Safe-rate framework (per the locked-rule discussion):
--   Lean (BMI <22 or BF% ≤15)     → 0.5%/week max
--   Normal (BMI 22-27 or 15-25)   → 1.0%/week max
--   Overweight (BMI 27-32 or 25-30) → 1.5%/week max
--   Obese (BMI 32+ or BF% 30+)    → 2.0%/week max
--   Strength training override    → cap at 1.0%/week regardless
--   GLP-1                         → no cap pushback (medication paces it)
--
-- Goal weight is hard-floored at BMI 22 for the user's height. The
-- form rejects sub-floor values inline; the only auto-extension we
-- do silently is timeline (when the requested rate exceeds the
-- safe-rate cap, weeks get padded out).
--
-- Snapshot fields (safe_max_weekly_pct, realistic_target_weeks) are
-- persisted at report-gen time so the report's framing matches the
-- assessment without recomputing modifiers from scratch.
--
-- All additive, all nullable. Existing rows are unaffected.
--
-- Run in Supabase SQL Editor.

alter table public.nutrition_assessments
  add column if not exists goal_weight_lbs smallint
    check (
      goal_weight_lbs is null
      or (goal_weight_lbs between 80 and 500)
    );

alter table public.nutrition_assessments
  add column if not exists goal_target_weeks smallint
    check (
      goal_target_weeks is null
      or (goal_target_weeks between 2 and 104)
    );

alter table public.nutrition_assessments
  add column if not exists bf_pct_assessment smallint
    check (
      bf_pct_assessment is null
      or (bf_pct_assessment between 4 and 60)
    );

alter table public.nutrition_assessments
  add column if not exists safe_max_weekly_pct numeric(4, 3)
    check (
      safe_max_weekly_pct is null
      or (safe_max_weekly_pct between 0.000 and 0.030)
    );

alter table public.nutrition_assessments
  add column if not exists realistic_target_weeks smallint
    check (
      realistic_target_weeks is null
      or (realistic_target_weeks between 2 and 104)
    );
