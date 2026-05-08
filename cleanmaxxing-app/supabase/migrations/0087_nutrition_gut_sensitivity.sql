-- ==========================================
-- Cleanmaxxing — nutrition_assessments.gut_sensitivity
-- ==========================================
-- Adds a binary gut-sensitivity signal to the nutrition assessment.
-- 'sensitive' filters foods commonly tagged as gut-unfriendly
-- (high-acid: citrus, tomatoes; high-FODMAP: onions, legumes,
-- cruciferous; reflux-trigger: dark chocolate) out of the picker AND
-- the meal plan, the same way dietary_pattern filters meat for
-- vegetarians.
--
-- Default 'none' so existing rows are unaffected. Users who don't
-- answer the question (e.g. legacy rows pre-this migration) still
-- get the full catalog.
--
-- Run in Supabase SQL Editor.

alter table public.nutrition_assessments
  add column if not exists gut_sensitivity text not null default 'none'
    check (gut_sensitivity in ('none', 'sensitive'));
