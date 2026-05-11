-- ==========================================
-- Cleanmaxxing — nutrition_assessments.cheat_day_pattern
-- ==========================================
-- Adds a new modifier capturing how the user runs off-plan days /
-- indulgence meals. The existing prompt framing ("the calorie target
-- is a 7-day average; cheat meal once a week sits inside the math")
-- is one-size-fits-all — a user with a structured Sunday meal needs
-- different advice than a user whose off-plan happens unpredictably.
--
-- Four values:
--   none_or_rare         — sticks to the plan most weeks; indulgences
--                          are small and rare
--   planned_weekly_meal  — one planned indulgence meal per week
--                          (Friday/Saturday/Sunday dinner — the most
--                          common structured pattern)
--   planned_weekly_day   — one planned full day off-plan per week
--                          (more aggressive — larger reservoir, but
--                          tighter math)
--   unplanned            — off-plan eating happens whenever (stress,
--                          social, fatigue); no calibration around it
--
-- Nullable so existing rows stay valid without re-filling the form.
-- The form requires a pick on next submit (handled client-side).
--
-- Run in Supabase SQL Editor.

alter table public.nutrition_assessments
  add column if not exists cheat_day_pattern text
  check (
    cheat_day_pattern is null
    or cheat_day_pattern in (
      'none_or_rare',
      'planned_weekly_meal',
      'planned_weekly_day',
      'unplanned'
    )
  );
