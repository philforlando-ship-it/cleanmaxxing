-- ==========================================
-- Cleanmaxxing — Age segment: extend constraint to age cap 55
-- ==========================================
-- The age cap was extended to 45 in spec 0.4 and then to 55, and
-- lib/onboarding/questions.ts ageToSegment() now returns '41-45' and
-- '46-55' for those buckets. The check constraint on
-- public.users.age_segment was never updated past the original three
-- buckets, so onboarding submit fails for any user aged 41+ with
-- users_age_segment_check. Same bug class as 0011 (motivation_segment).
--
-- Run in Supabase SQL Editor.

alter table public.users drop constraint users_age_segment_check;

alter table public.users add constraint users_age_segment_check
  check (age_segment in (
    '18-24',
    '25-32',
    '33-40',
    '41-45',
    '46-55'
  ));
