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
  | 'other';

export type AlcoholUse = 'none' | 'occasional' | 'moderate' | 'heavy';

export type CannabisUse = 'none' | 'occasional' | 'regular';

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
  tdee_estimate: number | null;
  calorie_target: number | null;
  protein_target_g: number | null;
  carb_target_g: number | null;
  fat_target_g: number | null;
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
  >;
};

export const FOODS: ReadonlyArray<Food> = [
  // ============ Proteins
  { slug: 'chicken_breast', label: 'Chicken breast', category: 'protein', tags: [] },
  { slug: 'chicken_thigh', label: 'Chicken thigh', category: 'protein', tags: [] },
  { slug: 'turkey_breast', label: 'Turkey breast', category: 'protein', tags: [] },
  { slug: 'lean_ground_turkey', label: 'Lean ground turkey', category: 'protein', tags: [] },
  { slug: 'sirloin_steak', label: 'Sirloin steak', category: 'protein', tags: ['red_meat'] },
  { slug: 'lean_ground_beef', label: 'Lean ground beef (90/10 or leaner)', category: 'protein', tags: ['red_meat'] },
  { slug: 'bison', label: 'Bison', category: 'protein', tags: ['red_meat'] },
  { slug: 'salmon', label: 'Salmon', category: 'protein', tags: ['seafood'] },
  { slug: 'tuna', label: 'Tuna (canned or fresh)', category: 'protein', tags: ['seafood'] },
  { slug: 'white_fish', label: 'White fish (cod, tilapia, halibut)', category: 'protein', tags: ['seafood'] },
  { slug: 'shrimp', label: 'Shrimp', category: 'protein', tags: ['seafood', 'shellfish'] },
  { slug: 'whole_eggs', label: 'Whole eggs', category: 'protein', tags: ['egg'] },
  { slug: 'egg_whites', label: 'Egg whites', category: 'protein', tags: ['egg'] },
  { slug: 'greek_yogurt_nonfat', label: 'Greek yogurt (nonfat or 2%)', category: 'protein', tags: ['dairy'] },
  { slug: 'cottage_cheese', label: 'Cottage cheese', category: 'protein', tags: ['dairy'] },
  { slug: 'whey_protein', label: 'Whey protein powder', category: 'protein', tags: ['dairy'] },
  { slug: 'tofu', label: 'Tofu', category: 'protein', tags: ['soy', 'vegan', 'vegetarian'] },
  { slug: 'tempeh', label: 'Tempeh', category: 'protein', tags: ['soy', 'vegan', 'vegetarian'] },
  { slug: 'edamame', label: 'Edamame', category: 'protein', tags: ['soy', 'vegan', 'vegetarian'] },
  { slug: 'lentils', label: 'Lentils', category: 'protein', tags: ['vegan', 'vegetarian'] },
  { slug: 'black_beans', label: 'Black beans', category: 'protein', tags: ['vegan', 'vegetarian'] },
  { slug: 'pea_protein', label: 'Pea protein powder', category: 'protein', tags: ['vegan', 'vegetarian'] },

  // ============ Complex carbs
  { slug: 'white_rice', label: 'White rice (jasmine / basmati)', category: 'complex_carb', tags: [] },
  { slug: 'brown_rice', label: 'Brown rice', category: 'complex_carb', tags: [] },
  { slug: 'rolled_oats', label: 'Rolled oats', category: 'complex_carb', tags: ['gluten'] },
  { slug: 'sweet_potato', label: 'Sweet potato', category: 'complex_carb', tags: [] },
  { slug: 'white_potato', label: 'White / russet potato', category: 'complex_carb', tags: [] },
  { slug: 'quinoa', label: 'Quinoa', category: 'complex_carb', tags: [] },
  { slug: 'whole_grain_pasta', label: 'Whole grain pasta', category: 'complex_carb', tags: ['gluten'] },
  { slug: 'sourdough_bread', label: 'Sourdough or whole grain bread', category: 'complex_carb', tags: ['gluten'] },
  { slug: 'corn_tortillas', label: 'Corn tortillas', category: 'complex_carb', tags: [] },
  { slug: 'whole_wheat_tortillas', label: 'Whole wheat tortillas', category: 'complex_carb', tags: ['gluten'] },
  { slug: 'farro', label: 'Farro', category: 'complex_carb', tags: ['gluten'] },
  { slug: 'chickpeas', label: 'Chickpeas', category: 'complex_carb', tags: ['vegan', 'vegetarian'] },

  // ============ Fruits
  { slug: 'banana', label: 'Banana', category: 'fruit', tags: [] },
  { slug: 'apple', label: 'Apple', category: 'fruit', tags: [] },
  { slug: 'berries', label: 'Berries (mixed)', category: 'fruit', tags: [] },
  { slug: 'orange', label: 'Orange', category: 'fruit', tags: [] },
  { slug: 'grapes', label: 'Grapes', category: 'fruit', tags: [] },
  { slug: 'melon', label: 'Melon (cantaloupe / honeydew)', category: 'fruit', tags: [] },
  { slug: 'pineapple', label: 'Pineapple', category: 'fruit', tags: [] },
  { slug: 'mango', label: 'Mango', category: 'fruit', tags: [] },
  { slug: 'kiwi', label: 'Kiwi', category: 'fruit', tags: [] },
  { slug: 'dates', label: 'Dates', category: 'fruit', tags: [] },

  // ============ Veggies
  { slug: 'broccoli', label: 'Broccoli', category: 'veggie', tags: [] },
  { slug: 'cauliflower', label: 'Cauliflower', category: 'veggie', tags: [] },
  { slug: 'spinach', label: 'Spinach', category: 'veggie', tags: [] },
  { slug: 'kale', label: 'Kale', category: 'veggie', tags: [] },
  { slug: 'mixed_greens', label: 'Mixed greens / arugula', category: 'veggie', tags: [] },
  { slug: 'bell_peppers', label: 'Bell peppers', category: 'veggie', tags: [] },
  { slug: 'onions', label: 'Onions', category: 'veggie', tags: [] },
  { slug: 'zucchini', label: 'Zucchini', category: 'veggie', tags: [] },
  { slug: 'asparagus', label: 'Asparagus', category: 'veggie', tags: [] },
  { slug: 'mushrooms', label: 'Mushrooms', category: 'veggie', tags: [] },
  { slug: 'cucumber', label: 'Cucumber', category: 'veggie', tags: [] },
  { slug: 'tomatoes', label: 'Tomatoes', category: 'veggie', tags: [] },
  { slug: 'green_beans', label: 'Green beans', category: 'veggie', tags: [] },
  { slug: 'brussels_sprouts', label: 'Brussels sprouts', category: 'veggie', tags: [] },
  { slug: 'carrots', label: 'Carrots', category: 'veggie', tags: [] },

  // ============ Fats
  { slug: 'olive_oil', label: 'Extra-virgin olive oil', category: 'fat', tags: [] },
  { slug: 'avocado_oil', label: 'Avocado oil', category: 'fat', tags: [] },
  { slug: 'avocado', label: 'Avocado', category: 'fat', tags: [] },
  { slug: 'almonds', label: 'Almonds', category: 'fat', tags: ['nuts'] },
  { slug: 'walnuts', label: 'Walnuts', category: 'fat', tags: ['nuts'] },
  { slug: 'peanut_butter', label: 'Peanut butter (natural)', category: 'fat', tags: ['nuts'] },
  { slug: 'almond_butter', label: 'Almond butter', category: 'fat', tags: ['nuts'] },
  { slug: 'cheese', label: 'Cheese (cheddar / mozzarella / feta)', category: 'fat', tags: ['dairy'] },
  { slug: 'butter', label: 'Butter or ghee', category: 'fat', tags: ['dairy'] },
  { slug: 'tahini', label: 'Tahini', category: 'fat', tags: [] },
  { slug: 'dark_chocolate', label: 'Dark chocolate (85%+)', category: 'fat', tags: [] },

  // ============ Snacks (some overlap with above categories)
  { slug: 'snack_greek_yogurt', label: 'Greek yogurt cup', category: 'snack', tags: ['dairy'] },
  { slug: 'snack_jerky', label: 'Jerky (beef / turkey)', category: 'snack', tags: [] },
  { slug: 'snack_hard_boiled_eggs', label: 'Hard-boiled eggs', category: 'snack', tags: ['egg'] },
  { slug: 'snack_cottage_cheese', label: 'Cottage cheese', category: 'snack', tags: ['dairy'] },
  { slug: 'snack_mixed_nuts', label: 'Mixed nuts', category: 'snack', tags: ['nuts'] },
  { slug: 'snack_trail_mix', label: 'Trail mix', category: 'snack', tags: ['nuts'] },
  { slug: 'snack_fruit_nut_butter', label: 'Apple or banana with nut butter', category: 'snack', tags: ['nuts'] },
  { slug: 'snack_hummus_veggies', label: 'Hummus + veggies', category: 'snack', tags: [] },
  { slug: 'snack_protein_bar', label: 'Protein bar', category: 'snack', tags: [] },
  { slug: 'snack_protein_shake', label: 'Protein shake', category: 'snack', tags: ['dairy'] },
  { slug: 'snack_smoothie', label: 'Smoothie (protein + fruit + greens)', category: 'snack', tags: [] },
  { slug: 'snack_edamame', label: 'Edamame', category: 'snack', tags: ['soy', 'vegan', 'vegetarian'] },
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
    'other',
  ]),
  alcohol_use: z.enum(['none', 'occasional', 'moderate', 'heavy']),
  cannabis_use: z.enum(['none', 'occasional', 'regular']),
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
