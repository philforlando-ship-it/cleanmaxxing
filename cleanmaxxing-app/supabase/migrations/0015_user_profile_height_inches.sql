-- ==========================================
-- Cleanmaxxing — Height on user_profile
-- ==========================================
-- Onboarding captures height_inches once via survey_responses, but
-- adults' height is essentially fixed; we still want a mutable column
-- so a user who skipped the onboarding question can fill it in later
-- on the /profile page. Mister P's body-size grounding (BMI math,
-- sport-specific advice) reads from this column when present, falling
-- back to the onboarding answer at read time when it's null. Same
-- valid range as the onboarding question (48-96 inches).
--
-- Run in Supabase SQL Editor.

alter table public.user_profile
  add column if not exists height_inches int
    check (height_inches between 48 and 96);
