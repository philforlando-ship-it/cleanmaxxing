// Meal plan generator. Single Sonnet call. Reads computed targets +
// food picker preferences + lifestyle modifiers from the assessment.
// Persists to nutrition_meal_plans (one row per user-week, upsert
// on regenerate).

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getUserProfile } from '@/lib/profile/service';
import {
  ALCOHOL_USE_LABEL,
  CANNABIS_USE_LABEL,
  FASTING_PROTOCOL_LABEL,
  FOODS,
  GOAL_DIRECTION_LABEL,
  type NutritionAssessment,
} from './types';
import { buildMealPlanSystemPrompt } from './meal-plan-prompt';

const REPORT_MODEL = 'claude-sonnet-4-6';

export type NutritionMealPlan = {
  id: string;
  user_id: string;
  week_start_app_day: string;
  week_end_app_day: string;
  plan_text: string;
  generated_at: string;
  model: string;
  inputs_snapshot: MealPlanInputsSnapshot | null;
  created_at: string;
  updated_at: string;
};

export type MealPlanInputsSnapshot = {
  calorie_target: number | null;
  protein_target_g: number | null;
  carb_target_g: number | null;
  fat_target_g: number | null;
  fasting_protocol: string;
  alcohol_use: string;
  cannabis_use: string;
  food_preferences: string[];
  food_exclusions: string[];
  food_filter_text: string | null;
  diet_restrictions: string | null;
  current_interventions: string[];
  goal_direction: string;
};

// 7-day window — same convention as sleep weekly review. Inclusive
// on both ends.
function computeWeekWindow(todayAppDay: string): {
  startAppDay: string;
  endAppDay: string;
} {
  const today = new Date(todayAppDay + 'T00:00:00Z');
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 6);
  return {
    startAppDay: start.toISOString().slice(0, 10),
    endAppDay: todayAppDay,
  };
}

export async function generateAndSaveMealPlan(
  supabase: SupabaseClient,
  userId: string,
  assessment: NutritionAssessment,
  todayAppDay: string,
): Promise<NutritionMealPlan> {
  const profile = await getUserProfile(supabase, userId);
  const window = computeWeekWindow(todayAppDay);

  const inputsSnapshot: MealPlanInputsSnapshot = {
    calorie_target: assessment.calorie_target,
    protein_target_g: assessment.protein_target_g,
    carb_target_g: assessment.carb_target_g,
    fat_target_g: assessment.fat_target_g,
    fasting_protocol: assessment.fasting_protocol,
    alcohol_use: assessment.alcohol_use,
    cannabis_use: assessment.cannabis_use,
    food_preferences: assessment.food_preferences,
    food_exclusions: assessment.food_exclusions,
    food_filter_text: assessment.food_filter_text,
    diet_restrictions: profile.diet_restrictions,
    current_interventions: profile.current_interventions,
    goal_direction: assessment.goal_direction,
  };

  const labelFor = (slug: string) =>
    FOODS.find((f) => f.slug === slug)?.label ?? slug;
  const prefLabels = assessment.food_preferences.map(labelFor);
  const exclLabels = assessment.food_exclusions.map(labelFor);

  const userPrompt = `Generate the 7-day meal plan for this user.

--- TARGETS ---
calorie_target: ${assessment.calorie_target ?? 'not computed (profile incomplete) — estimate qualitatively'}
protein_target_g: ${assessment.protein_target_g ?? 'not computed'}
carb_target_g: ${assessment.carb_target_g ?? 'not computed'}
fat_target_g: ${assessment.fat_target_g ?? 'not computed'}

--- LIFESTYLE ---
goal_direction: ${GOAL_DIRECTION_LABEL[assessment.goal_direction]}
fasting_protocol: ${FASTING_PROTOCOL_LABEL[assessment.fasting_protocol]}
alcohol_use: ${ALCOHOL_USE_LABEL[assessment.alcohol_use]}
cannabis_use: ${CANNABIS_USE_LABEL[assessment.cannabis_use]}

--- DIETARY CONSTRAINTS ---
diet_restrictions (profile): ${
    profile.diet_restrictions
      ? `"${profile.diet_restrictions}"`
      : 'none stated'
  }
food_exclusions (HARD constraint — do not include any of these): ${
    exclLabels.length === 0 ? 'none' : exclLabels.join(', ')
  }
food_filter_text (free-form): ${
    assessment.food_filter_text ? `"${assessment.food_filter_text}"` : 'none'
  }
current_interventions (esp. 'glp1' affects portion sizes): ${
    profile.current_interventions.length === 0
      ? 'none'
      : profile.current_interventions.join(', ')
  }

--- FOOD PREFERENCES (build the plan around these when non-empty) ---
${
  prefLabels.length === 0
    ? '(no preferences set — pick freely from common high-quality foods that fit the targets and constraints)'
    : prefLabels.join(', ')
}

Generate the plan now per the format in the system prompt. Honor the targets, fasting protocol, exclusions, and any GLP-1 portion adjustments. Aim for 7 days × 3 meals + snacks. Stay within ~700-1000 words.`;

  const { text } = await generateText({
    model: anthropic(REPORT_MODEL),
    system: buildMealPlanSystemPrompt(),
    prompt: userPrompt,
    temperature: 0.6,
  });

  const planText = text.trim();

  const row = {
    user_id: userId,
    week_start_app_day: window.startAppDay,
    week_end_app_day: window.endAppDay,
    plan_text: planText,
    generated_at: new Date().toISOString(),
    model: REPORT_MODEL,
    inputs_snapshot: inputsSnapshot,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('nutrition_meal_plans')
    .upsert(row, { onConflict: 'user_id,week_start_app_day' })
    .select('*')
    .single();
  if (error) throw error;
  return data as NutritionMealPlan;
}

export async function getMostRecentMealPlan(
  supabase: SupabaseClient,
  userId: string,
): Promise<NutritionMealPlan | null> {
  const { data, error } = await supabase
    .from('nutrition_meal_plans')
    .select('*')
    .eq('user_id', userId)
    .order('week_start_app_day', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return data as NutritionMealPlan;
}
