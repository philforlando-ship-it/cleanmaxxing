-- ==========================================
-- Cleanmaxxing — Current weight on user_profile
-- ==========================================
-- Onboarding captures weight_lbs once via survey_responses, but a
-- user's weight changes over time and Mister P's calibration (calorie
-- math, body-size grounding for body-comp answers) is meaningfully
-- better when the latest reported weight is available. This adds a
-- mutable current_weight_lbs to user_profile, surfaced via the
-- /progress page's "Current stats" section. Initial value is
-- back-filled at read time from the onboarding survey answer when
-- the column is null — no migration-time data move, no background
-- job. Same valid range as the onboarding question (80-500 lbs).
--
-- Run in Supabase SQL Editor.

alter table public.user_profile
  add column if not exists current_weight_lbs numeric(5,1)
    check (current_weight_lbs between 80 and 500);
