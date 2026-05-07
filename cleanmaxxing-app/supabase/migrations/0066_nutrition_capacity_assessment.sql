-- ==========================================
-- Cleanmaxxing — nutrition_assessments capacity & willingness fields
-- ==========================================
-- T2 from the May 2026 ideas brain dump (B1 + B3 + B6). Captures
-- four signals that drive distinct prompt rules:
--
--   cooking_capacity — what the user can sustainably do (NOT
--     where calories currently come from — that's eating_context).
--     Drives recommendation register: real-cooking strategies vs.
--     simple-meal patterns vs. assembly/service.
--
--   dietary_pattern — explicit dietary identity. Captured fuzzily
--     today via food_exclusions[]; explicit pattern is a much
--     better signal for the LLM. Vegan/vegetarian floors stay the
--     same per-lb but the report names plant-source pathways.
--
--   meal_service_willingness — only fires the meal-service
--     guidance (Factor / Trifecta / Tovala — branded for context,
--     never as endorsement) when the user signals openness AND
--     capacity is low. No willingness, no recommendation.
--
--   snacking_style — toggles the snack-tier guidance (B6). For
--     three-meals-no-snacks users, no snack guidance shows. For
--     grazers, the "This week" section names which snacks pull
--     weight (protein bars vs. fruit+nut tradeoff).
--
-- All four are nullable so existing nutrition_assessments rows
-- aren't invalidated. The form requires them on next submit; the
-- prompt handles null gracefully ("not specified — work from felt
-- sense").
--
-- Run in Supabase SQL Editor.

alter table public.nutrition_assessments
  add column if not exists cooking_capacity text check (cooking_capacity in (
    'cook_often_real_meals',
    'cook_simple_quick',
    'cook_rarely',
    'dont_cook'
  ));

alter table public.nutrition_assessments
  add column if not exists dietary_pattern text check (dietary_pattern in (
    'omnivore',
    'pescatarian',
    'vegetarian',
    'vegan',
    'mixed_no_pattern'
  ));

alter table public.nutrition_assessments
  add column if not exists meal_service_willingness text check (meal_service_willingness in (
    'actively_using',
    'open_to_it',
    'prefer_not',
    'no_thanks'
  ));

alter table public.nutrition_assessments
  add column if not exists snacking_style text check (snacking_style in (
    'three_meals_no_snacks',
    'three_meals_plus_snacks',
    'grazer',
    'inconsistent'
  ));
