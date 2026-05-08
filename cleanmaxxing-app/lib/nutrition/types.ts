// Shared types + Zod schema for nutrition v2. Mirrors check
// constraints in supabase/migrations/0054_nutrition_assessments.sql
// + 0058_nutrition_v2.sql.

import { z } from 'zod';

export type GoalDirection =
  | 'lose_fat'
  | 'recomp'
  | 'gain_muscle'
  | 'maintain'
  | 'not_sure';

export type Urgency =
  | 'aggressive_short_term'
  | 'steady_6_to_12_months'
  | 'no_timeline';

export type EatingContext =
  | 'cook_most_meals'
  | 'mixed_cook_and_outside'
  | 'mostly_outside_delivery'
  | 'mostly_liquid_or_shakes'
  | 'inconsistent';

export type NutritionWhatTried =
  | 'nothing_systematic'
  | 'counted_macros'
  | 'restrictive_diet'
  | 'glp1_or_pharma'
  | 'multiple_things';

export type FastingProtocol =
  | 'none'
  | 'time_restricted_16_8'
  | 'time_restricted_18_6'
  | 'omad'
  | 'five_two'
  | 'extended_36_biweekly'
  | 'other';

// Migration 0087 — gut sensitivity. Binary for v0; can subdivide
// later (e.g. distinguish reflux from FODMAP) once we see how users
// describe their pattern.
export type GutSensitivity = 'none' | 'sensitive';

export type AlcoholUse = 'none' | 'occasional' | 'moderate' | 'heavy';

export type CannabisUse = 'none' | 'occasional' | 'regular';

// T2 capacity & willingness fields (migration 0066). Each drives a
// distinct prompt rule — see lib/nutrition/report-prompt.ts for the
// modifier handling.

export type CookingCapacity =
  | 'cook_often_real_meals'
  | 'cook_simple_quick'
  | 'cook_rarely'
  | 'dont_cook';

export type DietaryPattern =
  | 'omnivore'
  | 'pescatarian'
  | 'vegetarian'
  | 'vegan'
  | 'mixed_no_pattern';

export type MealServiceWillingness =
  | 'actively_using'
  | 'open_to_it'
  | 'prefer_not'
  | 'no_thanks';

export type SnackingStyle =
  | 'three_meals_no_snacks'
  | 'three_meals_plus_snacks'
  | 'grazer'
  | 'inconsistent';

export type NutritionAssessment = {
  user_id: string;
  goal_direction: GoalDirection;
  urgency: Urgency;
  eating_context: EatingContext;
  what_tried: NutritionWhatTried;
  // v2 lifestyle modifiers
  fasting_protocol: FastingProtocol;
  alcohol_use: AlcoholUse;
  cannabis_use: CannabisUse;
  // T2 capacity & willingness (migration 0066). Nullable until the
  // user submits the new form fields; existing assessments stay valid.
  cooking_capacity: CookingCapacity | null;
  dietary_pattern: DietaryPattern | null;
  meal_service_willingness: MealServiceWillingness | null;
  snacking_style: SnackingStyle | null;
  // Gut sensitivity (migration 0087). When 'sensitive', the recommender
  // hides foods tagged 'gut_unfriendly' (citrus, tomatoes, legumes,
  // cruciferous, dark chocolate, etc.) and the meal-plan generator
  // avoids them. Defaults to 'none' for legacy / unanswered rows.
  gut_sensitivity: GutSensitivity;
  // v2 food picker
  food_preferences: string[];
  food_exclusions: string[];
  food_filter_text: string | null;
  // v2 computed targets (snapshotted at gen time)
  tdee_estimate: number | null;
  calorie_target: number | null;
  protein_target_g: number | null;
  carb_target_g: number | null;
  fat_target_g: number | null;
  // Migration 0079 — weight-loss goal layer. Optional; only populated
  // when goal_direction is 'lose_fat'. The form enforces the
  // BMI-22 floor on goal_weight_lbs.
  goal_weight_lbs: number | null;
  goal_target_weeks: number | null;
  bf_pct_assessment: number | null;
  // Snapshot fields persisted at report-gen time so the report's
  // framing matches the assessment without recomputing modifiers.
  safe_max_weekly_pct: number | null;
  realistic_target_weeks: number | null;
  nutrition_goal_text: string | null;
  // Stage milestone (migration 0060) — 12-week re-evaluation gate.
  // Cut→maintenance transition is the most common failure mode here.
  last_evaluated_at: string | null;
  report_text: string | null;
  report_generated_at: string | null;
  report_model: string | null;
  report_input_modifiers: NutritionReportInputModifiers | null;
  created_at: string;
  updated_at: string;
};

// Modifier shape captures BOTH the profile context AND the live
// nutrition_logs signal. Persisted as report_input_modifiers jsonb so
// future changes are diffable.
export type NutritionReportInputModifiers = {
  // Profile
  bf_pct_self_estimate: string | null;
  current_weight_lbs: number | null;
  height_inches: number | null;
  activity_level: string | null;
  training_experience: string | null;
  daily_training_minutes: number | null;
  diet_restrictions: string | null;
  current_interventions: string[];
  age: number | null;
  // Live data — last 14 days protein logging
  protein_window_days: number;
  protein_hit_days: number;
  protein_logged_days: number;
  // v2 — lifestyle modifiers + computed targets
  fasting_protocol: FastingProtocol;
  alcohol_use: AlcoholUse;
  cannabis_use: CannabisUse;
  // T2 capacity fields — null when the user hasn't filled them in
  // since migration 0066 landed.
  cooking_capacity: CookingCapacity | null;
  dietary_pattern: DietaryPattern | null;
  meal_service_willingness: MealServiceWillingness | null;
  snacking_style: SnackingStyle | null;
  gut_sensitivity: GutSensitivity;
  tdee_estimate: number | null;
  calorie_target: number | null;
  protein_target_g: number | null;
  carb_target_g: number | null;
  fat_target_g: number | null;
  // Migration 0079 — weight-loss-plan modifiers. Snapshot of the
  // safe-rate framework state used at report-gen time. The prompt
  // branches on these to name the realistic timeline + the auto-
  // extension when it happened.
  goal_weight_lbs: number | null;
  goal_target_weeks: number | null;
  bf_pct_assessment: number | null;
  safe_max_weekly_pct: number | null;
  realistic_target_weeks: number | null;
  was_timeline_extended: boolean | null;
  // Stage milestone — 12-week re-evaluation timestamp. When set, the
  // prompt knows this is a re-evaluation (not the first plan); it can
  // name shifts in weight or bf% if material.
  last_evaluated_at: string | null;
};

export const GOAL_DIRECTION_LABEL: Record<GoalDirection, string> = {
  lose_fat: 'Lose fat — drop body fat, willing to lose some weight',
  recomp:
    'Recomp — same weight, less fat, more muscle. The slow, sustainable path',
  gain_muscle: 'Gain muscle — willing to put on weight to add size',
  maintain: 'Maintain — current state is good, hold here',
  not_sure: 'Not sure yet',
};

export const URGENCY_LABEL: Record<Urgency, string> = {
  aggressive_short_term:
    'Aggressive — under 3 months, specific event or deadline',
  steady_6_to_12_months: 'Steady — willing to take 6–12 months',
  no_timeline: 'No timeline — open-ended',
};

export const EATING_CONTEXT_LABEL: Record<EatingContext, string> = {
  cook_most_meals: 'I cook most of my meals',
  mixed_cook_and_outside: 'Mixed — some home cooking, some takeout / restaurants',
  mostly_outside_delivery:
    'Mostly delivery, takeout, or restaurants',
  mostly_liquid_or_shakes:
    'Mostly liquid — protein shakes, smoothies, meal-replacement drinks',
  inconsistent: 'Inconsistent — varies wildly day to day',
};

export const NUTRITION_WHAT_TRIED_LABEL: Record<NutritionWhatTried, string> = {
  nothing_systematic: 'Nothing systematic',
  counted_macros: 'Counted calories or macros',
  restrictive_diet: 'A restrictive specific diet (keto / paleo / IF / etc.)',
  glp1_or_pharma: 'GLP-1 or other prescription weight-related medication',
  multiple_things: 'Multiple things — none stuck',
};

export const FASTING_PROTOCOL_LABEL: Record<FastingProtocol, string> = {
  none: 'No fasting — eat throughout the day',
  time_restricted_16_8:
    '16:8 — eating window of 8 hours (e.g., 12pm–8pm)',
  time_restricted_18_6: '18:6 — eating window of 6 hours',
  omad: 'OMAD — one meal a day',
  five_two: '5:2 — 5 days normal, 2 days low calorie',
  extended_36_biweekly: 'One 36-hour fast every two weeks',
  other: 'Other fasting protocol',
};

export const ALCOHOL_USE_LABEL: Record<AlcoholUse, string> = {
  none: 'None — I don’t drink',
  occasional: 'Occasional — 1–2 drinks per week or less',
  moderate: 'Moderate — 3–7 drinks per week',
  heavy: 'Heavy — 8+ drinks per week',
};

export const CANNABIS_USE_LABEL: Record<CannabisUse, string> = {
  none: 'None — I don’t use cannabis',
  occasional: 'Occasional — once a week or less',
  regular: 'Regular — several times a week',
};

export const COOKING_CAPACITY_LABEL: Record<CookingCapacity, string> = {
  cook_often_real_meals:
    'I cook real meals 5+ times a week, 30+ minutes each',
  cook_simple_quick:
    'I cook 3–5 times a week, but only simple / quick meals (≤30 min)',
  cook_rarely: 'I cook 1–2 times a week, occasional only',
  dont_cook: 'I don’t cook — I assemble or order',
};

export const DIETARY_PATTERN_LABEL: Record<DietaryPattern, string> = {
  omnivore: 'Omnivore — I eat everything (meat, fish, dairy, eggs, plants, grains)',
  pescatarian: 'Pescatarian — fish but no other meat',
  vegetarian: 'Vegetarian — no meat or fish, dairy/eggs OK',
  vegan: 'Vegan — no animal products',
  mixed_no_pattern: 'Mixed / no clear pattern',
};

export const GUT_SENSITIVITY_LABEL: Record<GutSensitivity, string> = {
  none: 'No — my gut handles most foods fine',
  sensitive:
    'Yes — high-acid (citrus, tomatoes), high-fat, or FODMAP-heavy foods (legumes, cruciferous, onions) cause issues',
};

export const MEAL_SERVICE_WILLINGNESS_LABEL: Record<
  MealServiceWillingness,
  string
> = {
  actively_using: 'I already use one (Factor / Trifecta / Tovala / similar)',
  open_to_it: 'Open to it — would consider if recommended',
  prefer_not: 'Prefer not — I’d rather cook',
  no_thanks: 'No thanks — not interested',
};

export const SNACKING_STYLE_LABEL: Record<SnackingStyle, string> = {
  three_meals_no_snacks: 'Three meals, no snacks',
  three_meals_plus_snacks: 'Three meals plus a snack or two',
  grazer: 'Grazer — eat throughout the day, less defined meals',
  inconsistent: 'Inconsistent — varies day to day',
};

// =====================
// Food catalog (v2 picker)
// =====================
//
// Curated list grouped by macro role. Used by the food library
// picker UI and as a vocabulary for the meal plan generator. Slugs
// are stable; labels can change. Per-food kcal/macro snapshots are
// approximate per "typical serving" — this is not a tracker, it's
// a teaching tool to help users build an intuition.

export type FoodCategory =
  | 'protein'
  | 'complex_carb'
  | 'fruit'
  | 'veggie'
  | 'fat'
  | 'snack';

export const FOOD_CATEGORY_LABEL: Record<FoodCategory, string> = {
  protein: 'Proteins',
  complex_carb: 'Complex carbs',
  fruit: 'Fruits',
  veggie: 'Veggies',
  fat: 'Fats',
  snack: 'Snacks',
};

// Suggested pick counts per category — surfaced in the picker UI.
// Min/max guides the user toward a workable variety without
// enforcing it as a hard constraint.
export const FOOD_CATEGORY_PICK_RANGE: Record<
  FoodCategory,
  { min: number; max: number }
> = {
  protein: { min: 4, max: 6 },
  complex_carb: { min: 3, max: 4 },
  fruit: { min: 3, max: 4 },
  veggie: { min: 5, max: 7 },
  fat: { min: 3, max: 4 },
  snack: { min: 4, max: 6 },
};

export type Food = {
  slug: string;
  label: string;
  category: FoodCategory;
  // Allergen / restriction tags. The meal plan generator filters
  // these against diet_restrictions and food_exclusions.
  // 'gut_unfriendly' is a functional tag (not allergen): foods
  // commonly trigger reflux / FODMAP-driven bloat / acidity. Filtered
  // out for users who set gut_sensitivity='sensitive' on the
  // assessment.
  tags: ReadonlyArray<
    | 'gluten'
    | 'dairy'
    | 'nuts'
    | 'soy'
    | 'seafood'
    | 'egg'
    | 'pork'
    | 'red_meat'
    | 'shellfish'
    | 'vegan'
    | 'vegetarian'
    | 'gut_unfriendly'
  >;
  // Approximate macros per typical serving. Educational only — the
  // food picker uses these to teach the user the SHAPE of their meal
  // plan without making them weigh anything. Values are reasonable
  // round numbers from common reference databases (USDA, Cronometer
  // ranges); they're not "track your calories" precision.
  serving_label: string;
  kcal_per_serving: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
};

export const FOODS: ReadonlyArray<Food> = [
  // ============ Proteins
  { slug: 'chicken_breast', label: 'Chicken breast', category: 'protein', tags: [], serving_label: '4 oz cooked', kcal_per_serving: 165, protein_g: 31, carb_g: 0, fat_g: 4 },
  { slug: 'chicken_thigh', label: 'Chicken thigh', category: 'protein', tags: [], serving_label: '4 oz cooked', kcal_per_serving: 210, protein_g: 26, carb_g: 0, fat_g: 11 },
  { slug: 'turkey_breast', label: 'Turkey breast', category: 'protein', tags: [], serving_label: '4 oz cooked', kcal_per_serving: 135, protein_g: 30, carb_g: 0, fat_g: 1 },
  { slug: 'lean_ground_turkey', label: 'Lean ground turkey', category: 'protein', tags: [], serving_label: '4 oz cooked (93/7)', kcal_per_serving: 170, protein_g: 22, carb_g: 0, fat_g: 9 },
  { slug: 'sirloin_steak', label: 'Sirloin steak', category: 'protein', tags: ['red_meat'], serving_label: '4 oz cooked', kcal_per_serving: 200, protein_g: 30, carb_g: 0, fat_g: 8 },
  { slug: 'lean_ground_beef', label: 'Lean ground beef (90/10 or leaner)', category: 'protein', tags: ['red_meat'], serving_label: '4 oz cooked', kcal_per_serving: 200, protein_g: 23, carb_g: 0, fat_g: 11 },
  { slug: 'bison', label: 'Bison', category: 'protein', tags: ['red_meat'], serving_label: '4 oz cooked', kcal_per_serving: 165, protein_g: 24, carb_g: 0, fat_g: 7 },
  { slug: 'salmon', label: 'Salmon', category: 'protein', tags: ['seafood'], serving_label: '4 oz cooked', kcal_per_serving: 235, protein_g: 25, carb_g: 0, fat_g: 14 },
  { slug: 'tuna', label: 'Tuna (canned or fresh)', category: 'protein', tags: ['seafood'], serving_label: '5 oz can in water', kcal_per_serving: 110, protein_g: 25, carb_g: 0, fat_g: 1 },
  { slug: 'white_fish', label: 'White fish (cod, tilapia, halibut)', category: 'protein', tags: ['seafood'], serving_label: '4 oz cooked', kcal_per_serving: 110, protein_g: 23, carb_g: 0, fat_g: 1 },
  { slug: 'shrimp', label: 'Shrimp', category: 'protein', tags: ['seafood', 'shellfish'], serving_label: '4 oz cooked', kcal_per_serving: 120, protein_g: 24, carb_g: 0, fat_g: 2 },
  { slug: 'whole_eggs', label: 'Whole eggs', category: 'protein', tags: ['egg'], serving_label: '2 large', kcal_per_serving: 140, protein_g: 12, carb_g: 1, fat_g: 10 },
  { slug: 'egg_whites', label: 'Egg whites', category: 'protein', tags: ['egg'], serving_label: '4 whites', kcal_per_serving: 70, protein_g: 14, carb_g: 1, fat_g: 0 },
  { slug: 'greek_yogurt_nonfat', label: 'Greek yogurt (nonfat or 2%)', category: 'protein', tags: ['dairy'], serving_label: '1 cup (227 g)', kcal_per_serving: 130, protein_g: 22, carb_g: 9, fat_g: 0 },
  { slug: 'cottage_cheese', label: 'Cottage cheese', category: 'protein', tags: ['dairy'], serving_label: '1 cup low-fat', kcal_per_serving: 180, protein_g: 24, carb_g: 8, fat_g: 5 },
  { slug: 'whey_protein', label: 'Whey protein powder', category: 'protein', tags: ['dairy'], serving_label: '1 scoop (~30 g)', kcal_per_serving: 120, protein_g: 24, carb_g: 3, fat_g: 1 },
  { slug: 'tofu', label: 'Tofu', category: 'protein', tags: ['soy', 'vegan', 'vegetarian'], serving_label: '4 oz firm', kcal_per_serving: 90, protein_g: 9, carb_g: 2, fat_g: 5 },
  { slug: 'tempeh', label: 'Tempeh', category: 'protein', tags: ['soy', 'vegan', 'vegetarian'], serving_label: '4 oz', kcal_per_serving: 220, protein_g: 22, carb_g: 9, fat_g: 13 },
  { slug: 'edamame', label: 'Edamame', category: 'protein', tags: ['soy', 'vegan', 'vegetarian'], serving_label: '1 cup shelled', kcal_per_serving: 190, protein_g: 18, carb_g: 14, fat_g: 8 },
  { slug: 'lentils', label: 'Lentils', category: 'protein', tags: ['vegan', 'vegetarian', 'gut_unfriendly'], serving_label: '1 cup cooked', kcal_per_serving: 230, protein_g: 18, carb_g: 40, fat_g: 1 },
  { slug: 'black_beans', label: 'Black beans', category: 'protein', tags: ['vegan', 'vegetarian', 'gut_unfriendly'], serving_label: '1 cup cooked', kcal_per_serving: 225, protein_g: 15, carb_g: 41, fat_g: 1 },
  { slug: 'pea_protein', label: 'Pea protein powder', category: 'protein', tags: ['vegan', 'vegetarian'], serving_label: '1 scoop (~25 g)', kcal_per_serving: 100, protein_g: 22, carb_g: 1, fat_g: 1 },

  // ============ Complex carbs
  { slug: 'white_rice', label: 'White rice (jasmine / basmati)', category: 'complex_carb', tags: [], serving_label: '1 cup cooked', kcal_per_serving: 205, protein_g: 4, carb_g: 45, fat_g: 0 },
  { slug: 'brown_rice', label: 'Brown rice', category: 'complex_carb', tags: [], serving_label: '1 cup cooked', kcal_per_serving: 215, protein_g: 5, carb_g: 45, fat_g: 2 },
  { slug: 'rolled_oats', label: 'Rolled oats', category: 'complex_carb', tags: ['gluten'], serving_label: '1/2 cup dry', kcal_per_serving: 150, protein_g: 5, carb_g: 27, fat_g: 3 },
  { slug: 'sweet_potato', label: 'Sweet potato', category: 'complex_carb', tags: [], serving_label: '1 medium baked', kcal_per_serving: 115, protein_g: 2, carb_g: 27, fat_g: 0 },
  { slug: 'white_potato', label: 'White / russet potato', category: 'complex_carb', tags: [], serving_label: '1 medium baked', kcal_per_serving: 165, protein_g: 4, carb_g: 37, fat_g: 0 },
  { slug: 'quinoa', label: 'Quinoa', category: 'complex_carb', tags: [], serving_label: '1 cup cooked', kcal_per_serving: 220, protein_g: 8, carb_g: 39, fat_g: 4 },
  { slug: 'whole_grain_pasta', label: 'Whole grain pasta', category: 'complex_carb', tags: ['gluten'], serving_label: '2 oz dry', kcal_per_serving: 200, protein_g: 8, carb_g: 41, fat_g: 2 },
  { slug: 'sourdough_bread', label: 'Sourdough or whole grain bread', category: 'complex_carb', tags: ['gluten'], serving_label: '2 slices', kcal_per_serving: 190, protein_g: 7, carb_g: 36, fat_g: 2 },
  { slug: 'corn_tortillas', label: 'Corn tortillas', category: 'complex_carb', tags: [], serving_label: '2 small', kcal_per_serving: 120, protein_g: 3, carb_g: 24, fat_g: 2 },
  { slug: 'whole_wheat_tortillas', label: 'Whole wheat tortillas', category: 'complex_carb', tags: ['gluten'], serving_label: '1 large', kcal_per_serving: 130, protein_g: 4, carb_g: 22, fat_g: 4 },
  { slug: 'farro', label: 'Farro', category: 'complex_carb', tags: ['gluten'], serving_label: '1 cup cooked', kcal_per_serving: 220, protein_g: 8, carb_g: 47, fat_g: 1 },
  { slug: 'chickpeas', label: 'Chickpeas', category: 'complex_carb', tags: ['vegan', 'vegetarian', 'gut_unfriendly'], serving_label: '1 cup cooked', kcal_per_serving: 270, protein_g: 15, carb_g: 45, fat_g: 4 },

  // ============ Fruits
  { slug: 'banana', label: 'Banana', category: 'fruit', tags: [], serving_label: '1 medium', kcal_per_serving: 105, protein_g: 1, carb_g: 27, fat_g: 0 },
  { slug: 'apple', label: 'Apple', category: 'fruit', tags: [], serving_label: '1 medium', kcal_per_serving: 95, protein_g: 0, carb_g: 25, fat_g: 0 },
  { slug: 'berries', label: 'Berries (mixed)', category: 'fruit', tags: [], serving_label: '1 cup', kcal_per_serving: 70, protein_g: 1, carb_g: 17, fat_g: 0 },
  { slug: 'orange', label: 'Orange', category: 'fruit', tags: ['gut_unfriendly'], serving_label: '1 medium', kcal_per_serving: 62, protein_g: 1, carb_g: 15, fat_g: 0 },
  { slug: 'grapes', label: 'Grapes', category: 'fruit', tags: [], serving_label: '1 cup', kcal_per_serving: 104, protein_g: 1, carb_g: 27, fat_g: 0 },
  { slug: 'melon', label: 'Melon (cantaloupe / honeydew)', category: 'fruit', tags: [], serving_label: '1 cup cubed', kcal_per_serving: 55, protein_g: 1, carb_g: 13, fat_g: 0 },
  { slug: 'pineapple', label: 'Pineapple', category: 'fruit', tags: ['gut_unfriendly'], serving_label: '1 cup chunks', kcal_per_serving: 82, protein_g: 1, carb_g: 22, fat_g: 0 },
  { slug: 'mango', label: 'Mango', category: 'fruit', tags: [], serving_label: '1 cup chunks', kcal_per_serving: 100, protein_g: 1, carb_g: 25, fat_g: 1 },
  { slug: 'kiwi', label: 'Kiwi', category: 'fruit', tags: [], serving_label: '1 medium', kcal_per_serving: 42, protein_g: 1, carb_g: 10, fat_g: 0 },
  { slug: 'dates', label: 'Dates', category: 'fruit', tags: [], serving_label: '3 medjool', kcal_per_serving: 200, protein_g: 2, carb_g: 54, fat_g: 0 },

  // ============ Veggies
  { slug: 'broccoli', label: 'Broccoli', category: 'veggie', tags: ['gut_unfriendly'], serving_label: '1 cup chopped', kcal_per_serving: 30, protein_g: 3, carb_g: 6, fat_g: 0 },
  { slug: 'cauliflower', label: 'Cauliflower', category: 'veggie', tags: ['gut_unfriendly'], serving_label: '1 cup', kcal_per_serving: 25, protein_g: 2, carb_g: 5, fat_g: 0 },
  { slug: 'spinach', label: 'Spinach', category: 'veggie', tags: [], serving_label: '2 cups raw', kcal_per_serving: 14, protein_g: 2, carb_g: 2, fat_g: 0 },
  { slug: 'kale', label: 'Kale', category: 'veggie', tags: [], serving_label: '1 cup chopped', kcal_per_serving: 33, protein_g: 3, carb_g: 6, fat_g: 1 },
  { slug: 'mixed_greens', label: 'Mixed greens / arugula', category: 'veggie', tags: [], serving_label: '2 cups', kcal_per_serving: 15, protein_g: 2, carb_g: 3, fat_g: 0 },
  { slug: 'bell_peppers', label: 'Bell peppers', category: 'veggie', tags: [], serving_label: '1 cup chopped', kcal_per_serving: 30, protein_g: 1, carb_g: 7, fat_g: 0 },
  { slug: 'onions', label: 'Onions', category: 'veggie', tags: ['gut_unfriendly'], serving_label: '1 cup chopped', kcal_per_serving: 64, protein_g: 2, carb_g: 15, fat_g: 0 },
  { slug: 'zucchini', label: 'Zucchini', category: 'veggie', tags: [], serving_label: '1 cup sliced', kcal_per_serving: 20, protein_g: 2, carb_g: 4, fat_g: 0 },
  { slug: 'asparagus', label: 'Asparagus', category: 'veggie', tags: [], serving_label: '1 cup', kcal_per_serving: 27, protein_g: 3, carb_g: 5, fat_g: 0 },
  { slug: 'mushrooms', label: 'Mushrooms', category: 'veggie', tags: [], serving_label: '1 cup chopped', kcal_per_serving: 15, protein_g: 2, carb_g: 2, fat_g: 0 },
  { slug: 'cucumber', label: 'Cucumber', category: 'veggie', tags: [], serving_label: '1 cup sliced', kcal_per_serving: 16, protein_g: 1, carb_g: 4, fat_g: 0 },
  { slug: 'tomatoes', label: 'Tomatoes', category: 'veggie', tags: ['gut_unfriendly'], serving_label: '1 cup chopped', kcal_per_serving: 32, protein_g: 2, carb_g: 7, fat_g: 0 },
  { slug: 'green_beans', label: 'Green beans', category: 'veggie', tags: [], serving_label: '1 cup', kcal_per_serving: 31, protein_g: 2, carb_g: 7, fat_g: 0 },
  { slug: 'brussels_sprouts', label: 'Brussels sprouts', category: 'veggie', tags: ['gut_unfriendly'], serving_label: '1 cup', kcal_per_serving: 38, protein_g: 3, carb_g: 8, fat_g: 0 },
  { slug: 'carrots', label: 'Carrots', category: 'veggie', tags: [], serving_label: '1 cup chopped', kcal_per_serving: 50, protein_g: 1, carb_g: 12, fat_g: 0 },

  // ============ Fats
  { slug: 'olive_oil', label: 'Extra-virgin olive oil', category: 'fat', tags: [], serving_label: '1 tbsp', kcal_per_serving: 120, protein_g: 0, carb_g: 0, fat_g: 14 },
  { slug: 'avocado_oil', label: 'Avocado oil', category: 'fat', tags: [], serving_label: '1 tbsp', kcal_per_serving: 120, protein_g: 0, carb_g: 0, fat_g: 14 },
  { slug: 'avocado', label: 'Avocado', category: 'fat', tags: [], serving_label: '1/2 medium', kcal_per_serving: 120, protein_g: 2, carb_g: 6, fat_g: 11 },
  { slug: 'almonds', label: 'Almonds', category: 'fat', tags: ['nuts'], serving_label: '1 oz (~23 nuts)', kcal_per_serving: 165, protein_g: 6, carb_g: 6, fat_g: 14 },
  { slug: 'walnuts', label: 'Walnuts', category: 'fat', tags: ['nuts'], serving_label: '1 oz (~14 halves)', kcal_per_serving: 185, protein_g: 4, carb_g: 4, fat_g: 18 },
  { slug: 'peanut_butter', label: 'Peanut butter (natural)', category: 'fat', tags: ['nuts'], serving_label: '2 tbsp', kcal_per_serving: 190, protein_g: 7, carb_g: 7, fat_g: 16 },
  { slug: 'almond_butter', label: 'Almond butter', category: 'fat', tags: ['nuts'], serving_label: '2 tbsp', kcal_per_serving: 195, protein_g: 7, carb_g: 6, fat_g: 18 },
  { slug: 'cheese', label: 'Cheese (cheddar / mozzarella / feta)', category: 'fat', tags: ['dairy'], serving_label: '1 oz', kcal_per_serving: 115, protein_g: 7, carb_g: 1, fat_g: 9 },
  { slug: 'butter', label: 'Butter or ghee', category: 'fat', tags: ['dairy'], serving_label: '1 tbsp', kcal_per_serving: 100, protein_g: 0, carb_g: 0, fat_g: 11 },
  { slug: 'tahini', label: 'Tahini', category: 'fat', tags: [], serving_label: '2 tbsp', kcal_per_serving: 180, protein_g: 5, carb_g: 6, fat_g: 16 },
  { slug: 'dark_chocolate', label: 'Dark chocolate (85%+)', category: 'fat', tags: ['gut_unfriendly'], serving_label: '1 oz', kcal_per_serving: 170, protein_g: 3, carb_g: 12, fat_g: 13 },

  // ============ Snacks (some overlap with above categories)
  { slug: 'snack_greek_yogurt', label: 'Greek yogurt cup', category: 'snack', tags: ['dairy'], serving_label: '1 cup', kcal_per_serving: 130, protein_g: 22, carb_g: 9, fat_g: 0 },
  { slug: 'snack_jerky', label: 'Jerky (beef / turkey)', category: 'snack', tags: [], serving_label: '1 oz', kcal_per_serving: 80, protein_g: 13, carb_g: 3, fat_g: 1 },
  { slug: 'snack_hard_boiled_eggs', label: 'Hard-boiled eggs', category: 'snack', tags: ['egg'], serving_label: '2 eggs', kcal_per_serving: 140, protein_g: 12, carb_g: 1, fat_g: 10 },
  { slug: 'snack_cottage_cheese', label: 'Cottage cheese', category: 'snack', tags: ['dairy'], serving_label: '1 cup low-fat', kcal_per_serving: 180, protein_g: 24, carb_g: 8, fat_g: 5 },
  { slug: 'snack_mixed_nuts', label: 'Mixed nuts', category: 'snack', tags: ['nuts'], serving_label: '1 oz', kcal_per_serving: 170, protein_g: 5, carb_g: 7, fat_g: 15 },
  { slug: 'snack_trail_mix', label: 'Trail mix', category: 'snack', tags: ['nuts'], serving_label: '1/4 cup', kcal_per_serving: 175, protein_g: 5, carb_g: 17, fat_g: 11 },
  { slug: 'snack_fruit_nut_butter', label: 'Apple or banana with nut butter', category: 'snack', tags: ['nuts'], serving_label: '1 fruit + 1 tbsp PB', kcal_per_serving: 190, protein_g: 4, carb_g: 30, fat_g: 8 },
  { slug: 'snack_hummus_veggies', label: 'Hummus + veggies', category: 'snack', tags: [], serving_label: '2 tbsp + veggie sticks', kcal_per_serving: 100, protein_g: 3, carb_g: 12, fat_g: 5 },
  { slug: 'snack_protein_bar', label: 'Protein bar', category: 'snack', tags: [], serving_label: '1 bar', kcal_per_serving: 200, protein_g: 20, carb_g: 22, fat_g: 7 },
  { slug: 'snack_protein_shake', label: 'Protein shake', category: 'snack', tags: ['dairy'], serving_label: '1 scoop + water', kcal_per_serving: 120, protein_g: 24, carb_g: 3, fat_g: 1 },
  { slug: 'snack_smoothie', label: 'Smoothie (protein + fruit + greens)', category: 'snack', tags: [], serving_label: '~16 oz', kcal_per_serving: 250, protein_g: 20, carb_g: 30, fat_g: 5 },
  { slug: 'snack_edamame', label: 'Edamame', category: 'snack', tags: ['soy', 'vegan', 'vegetarian'], serving_label: '1 cup shelled', kcal_per_serving: 190, protein_g: 18, carb_g: 14, fat_g: 8 },
];

// =====================
// Zod schemas
// =====================

export const NutritionAssessmentInputSchema = z.object({
  goal_direction: z.enum([
    'lose_fat',
    'recomp',
    'gain_muscle',
    'maintain',
    'not_sure',
  ]),
  urgency: z.enum([
    'aggressive_short_term',
    'steady_6_to_12_months',
    'no_timeline',
  ]),
  eating_context: z.enum([
    'cook_most_meals',
    'mixed_cook_and_outside',
    'mostly_outside_delivery',
    'mostly_liquid_or_shakes',
    'inconsistent',
  ]),
  what_tried: z.enum([
    'nothing_systematic',
    'counted_macros',
    'restrictive_diet',
    'glp1_or_pharma',
    'multiple_things',
  ]),
  fasting_protocol: z.enum([
    'none',
    'time_restricted_16_8',
    'time_restricted_18_6',
    'omad',
    'five_two',
    'extended_36_biweekly',
    'other',
  ]),
  alcohol_use: z.enum(['none', 'occasional', 'moderate', 'heavy']),
  cannabis_use: z.enum(['none', 'occasional', 'regular']),
  // T2 capacity fields. Nullable to support the migration window
  // where existing assessments don't have these — the form requires
  // them on next submit.
  cooking_capacity: z
    .enum([
      'cook_often_real_meals',
      'cook_simple_quick',
      'cook_rarely',
      'dont_cook',
    ])
    .nullable(),
  dietary_pattern: z
    .enum([
      'omnivore',
      'pescatarian',
      'vegetarian',
      'vegan',
      'mixed_no_pattern',
    ])
    .nullable(),
  meal_service_willingness: z
    .enum(['actively_using', 'open_to_it', 'prefer_not', 'no_thanks'])
    .nullable(),
  snacking_style: z
    .enum([
      'three_meals_no_snacks',
      'three_meals_plus_snacks',
      'grazer',
      'inconsistent',
    ])
    .nullable(),
  // Migration 0087 — gut sensitivity. Defaults handled at the column
  // level ('none'); the form sends an explicit value once the user
  // answers.
  gut_sensitivity: z.enum(['none', 'sensitive']),
  // Migration 0079 — weight-loss goal layer. All optional in the
  // schema; the form enforces conditional rules (goal_weight_lbs +
  // goal_target_weeks only when goal_direction is 'lose_fat'; goal
  // weight ≥ BMI-22 floor for the user's height).
  goal_weight_lbs: z.number().int().min(80).max(500).nullable(),
  goal_target_weeks: z.number().int().min(2).max(104).nullable(),
  bf_pct_assessment: z.number().int().min(4).max(60).nullable(),
  nutrition_goal_text: z.string().max(280).nullable(),
});

export type NutritionAssessmentInput = z.infer<
  typeof NutritionAssessmentInputSchema
>;

export const NutritionFoodPreferencesInputSchema = z.object({
  food_preferences: z.array(z.string()).max(FOODS.length),
  food_exclusions: z.array(z.string()).max(FOODS.length),
  food_filter_text: z.string().max(500).nullable(),
});

export type NutritionFoodPreferencesInput = z.infer<
  typeof NutritionFoodPreferencesInputSchema
>;
