-- ==========================================
-- Cleanmaxxing — nutrition_assessments v2 expansion
-- ==========================================
-- Major expansion of the nutrition plan from "felt-sense protein
-- floor" to "TDEE-driven targets + meal plans + food picker."
--
-- Design tension noted: the original 0025_nutrition_logs migration
-- explicitly framed "we don't want a macro tracker product." That
-- still applies to the DAILY LOGGER (sleep_logs analog). This v2
-- expansion adds the structured macro / meal-plan layer to the PLAN
-- side specifically — they're two surfaces with two purposes.
--
-- Added fields:
--
-- Lifestyle modifiers (assessment captures these so the report can
-- factor them into the prescription):
--   fasting_protocol — none / 16:8 / 18:6 / OMAD / 5:2 / other
--   alcohol_use — none / occasional / moderate / heavy
--   cannabis_use — none / occasional / regular
--
-- Food picker preferences (analog to strength's exercise picker):
--   food_preferences text[] — foods the user actively prefers
--   food_exclusions text[] — foods to avoid (allergens, dislikes)
--   food_filter_text text — free-form constraints
--
-- Computed targets (snapshotted at report generation time so the
-- numbers stay reproducible across re-renders):
--   tdee_estimate — Total Daily Energy Expenditure (kcal)
--   calorie_target — TDEE adjusted for goal (deficit / surplus / maint)
--   protein_target_g — grams per day
--   carb_target_g — grams per day
--   fat_target_g — grams per day
--
-- Run in Supabase SQL Editor.

alter table public.nutrition_assessments
  add column if not exists fasting_protocol text not null default 'none' check (fasting_protocol in (
    'none',
    'time_restricted_16_8',
    'time_restricted_18_6',
    'omad',
    'five_two',
    'other'
  ));

alter table public.nutrition_assessments
  add column if not exists alcohol_use text not null default 'none' check (alcohol_use in (
    'none',
    'occasional',
    'moderate',
    'heavy'
  ));

alter table public.nutrition_assessments
  add column if not exists cannabis_use text not null default 'none' check (cannabis_use in (
    'none',
    'occasional',
    'regular'
  ));

alter table public.nutrition_assessments
  add column if not exists food_preferences text[] not null default '{}'::text[];

alter table public.nutrition_assessments
  add column if not exists food_exclusions text[] not null default '{}'::text[];

alter table public.nutrition_assessments
  add column if not exists food_filter_text text
    check (food_filter_text is null or char_length(food_filter_text) <= 500);

alter table public.nutrition_assessments
  add column if not exists tdee_estimate int
    check (tdee_estimate is null or (tdee_estimate between 800 and 6000));

alter table public.nutrition_assessments
  add column if not exists calorie_target int
    check (calorie_target is null or (calorie_target between 800 and 6000));

alter table public.nutrition_assessments
  add column if not exists protein_target_g int
    check (protein_target_g is null or (protein_target_g between 0 and 500));

alter table public.nutrition_assessments
  add column if not exists carb_target_g int
    check (carb_target_g is null or (carb_target_g between 0 and 800));

alter table public.nutrition_assessments
  add column if not exists fat_target_g int
    check (fat_target_g is null or (fat_target_g between 0 and 300));
