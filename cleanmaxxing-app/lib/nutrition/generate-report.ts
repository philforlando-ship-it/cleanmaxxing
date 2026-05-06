// Nutrition / body-comp report generator v2. Computes deterministic
// TDEE + macro targets from profile, persists them to the assessment
// row (so the page can render them without recomputing), and injects
// the full v2 modifier block into the prompt.

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { SupabaseClient } from '@supabase/supabase-js';
import { povFor } from '@/lib/content/pov';
import { getUserProfile } from '@/lib/profile/service';
import {
  ALCOHOL_USE_LABEL,
  CANNABIS_USE_LABEL,
  EATING_CONTEXT_LABEL,
  FASTING_PROTOCOL_LABEL,
  FOODS,
  GOAL_DIRECTION_LABEL,
  NUTRITION_WHAT_TRIED_LABEL,
  URGENCY_LABEL,
  type NutritionAssessment,
  type NutritionReportInputModifiers,
} from './types';
import { buildNutritionReportSystemPrompt } from './report-prompt';
import {
  getRecentProteinSignal,
  saveNutritionReport,
  saveNutritionTargets,
} from './service';
import { computeNutritionTargets } from './tdee';

const REPORT_MODEL = 'claude-sonnet-4-6';
const POV_SLUG = '13-body-physical-foundation';

export async function generateAndSaveNutritionReport(
  supabase: SupabaseClient,
  userId: string,
  assessment: NutritionAssessment,
): Promise<{ report_text: string }> {
  const profile = await getUserProfile(supabase, userId);

  const [{ data: userRow }, proteinSignal] = await Promise.all([
    supabase.from('users').select('age').eq('id', userId).maybeSingle(),
    getRecentProteinSignal(supabase, userId),
  ]);

  const age = (userRow as { age: number | null } | null)?.age ?? null;

  // Compute the deterministic targets (TDEE / calorie target / macro
  // grams) from profile data + goal direction. These are nullable when
  // the profile is incomplete; the prompt has a fallback rule.
  const targets = computeNutritionTargets({
    weight_lbs: profile.current_weight_lbs,
    height_inches: profile.height_inches,
    age,
    activity_level: profile.activity_level,
    goal_direction: assessment.goal_direction,
    current_interventions: profile.current_interventions,
  });

  // Snapshot targets onto the assessment row BEFORE the LLM call so
  // they're available even if the LLM call fails.
  await saveNutritionTargets(supabase, userId, targets);

  const modifiers: NutritionReportInputModifiers = {
    bf_pct_self_estimate: profile.bf_pct_self_estimate,
    current_weight_lbs: profile.current_weight_lbs,
    height_inches: profile.height_inches,
    activity_level: profile.activity_level,
    training_experience: profile.training_experience,
    daily_training_minutes: profile.daily_training_minutes,
    diet_restrictions: profile.diet_restrictions,
    current_interventions: profile.current_interventions,
    age,
    protein_window_days: proteinSignal.window_days,
    protein_hit_days: proteinSignal.hit_days,
    protein_logged_days: proteinSignal.logged_days,
    fasting_protocol: assessment.fasting_protocol,
    alcohol_use: assessment.alcohol_use,
    cannabis_use: assessment.cannabis_use,
    tdee_estimate: targets.tdee_estimate,
    calorie_target: targets.calorie_target,
    protein_target_g: targets.protein_target_g,
    carb_target_g: targets.carb_target_g,
    fat_target_g: targets.fat_target_g,
    last_evaluated_at: assessment.last_evaluated_at,
  };

  const pov = await povFor(POV_SLUG);
  if (!pov) {
    throw new Error(
      `Nutrition report requires POV "${POV_SLUG}" but it was not found.`,
    );
  }
  const povContext = `# ${pov.title}\n\n${pov.body}`;
  const system = buildNutritionReportSystemPrompt(povContext);

  const userPrompt = formatAssessmentForPrompt(assessment, modifiers);

  const { text } = await generateText({
    model: anthropic(REPORT_MODEL),
    system,
    prompt: userPrompt,
    temperature: 0.5,
  });

  const reportText = text.trim();

  await saveNutritionReport(supabase, userId, {
    report_text: reportText,
    report_model: REPORT_MODEL,
    report_input_modifiers: modifiers,
  });

  return { report_text: reportText };
}

function formatAssessmentForPrompt(
  assessment: NutritionAssessment,
  modifiers: NutritionReportInputModifiers,
): string {
  const modifierLines: string[] = [];
  modifierLines.push(
    `- bf_pct_self_estimate (profile): ${modifiers.bf_pct_self_estimate ?? 'not set'}`,
  );
  modifierLines.push(
    `- current_weight_lbs (profile): ${modifiers.current_weight_lbs ?? 'not set'}`,
  );
  modifierLines.push(
    `- height_inches (profile): ${modifiers.height_inches ?? 'not set'}`,
  );
  modifierLines.push(
    `- activity_level (profile): ${modifiers.activity_level ?? 'not set'}`,
  );
  modifierLines.push(
    `- training_experience (profile): ${modifiers.training_experience ?? 'not set'}`,
  );
  modifierLines.push(
    `- daily_training_minutes (profile): ${modifiers.daily_training_minutes ?? 'not set'}`,
  );
  modifierLines.push(
    `- diet_restrictions (profile): ${
      modifiers.diet_restrictions ? `"${modifiers.diet_restrictions}"` : 'none'
    }`,
  );
  modifierLines.push(
    `- current_interventions (profile): ${
      modifiers.current_interventions.length === 0
        ? 'none'
        : modifiers.current_interventions.join(', ')
    }`,
  );
  modifierLines.push(`- age (users): ${modifiers.age ?? 'not set'}`);
  modifierLines.push(
    `- protein_signal (last ${modifiers.protein_window_days} days, hit_days/logged_days): ${modifiers.protein_hit_days}/${modifiers.protein_logged_days}`,
  );

  // v2 lifestyle modifiers
  modifierLines.push(
    `- fasting_protocol: ${modifiers.fasting_protocol}`,
  );
  modifierLines.push(`- alcohol_use: ${modifiers.alcohol_use}`);
  modifierLines.push(`- cannabis_use: ${modifiers.cannabis_use}`);

  // v2 computed targets (numbers — load-bearing for the prompt)
  modifierLines.push(
    `- tdee_estimate (kcal/day, Mifflin-St Jeor × activity multiplier): ${
      modifiers.tdee_estimate ?? 'unavailable — profile incomplete'
    }`,
  );
  modifierLines.push(
    `- calorie_target (kcal/day, TDEE adjusted for goal): ${
      modifiers.calorie_target ?? 'unavailable — profile incomplete'
    }`,
  );
  modifierLines.push(
    `- protein_target_g: ${modifiers.protein_target_g ?? 'unavailable'}`,
  );
  modifierLines.push(
    `- carb_target_g: ${modifiers.carb_target_g ?? 'unavailable'}`,
  );
  modifierLines.push(
    `- fat_target_g: ${modifiers.fat_target_g ?? 'unavailable'}`,
  );
  modifierLines.push(
    `- last_evaluated_at (stage milestone — present means this is a re-evaluation, not the first plan): ${
      modifiers.last_evaluated_at ?? 'not yet — first plan'
    }`,
  );

  // v2 food picker — translate slugs to labels
  const labelFor = (slug: string) =>
    FOODS.find((f) => f.slug === slug)?.label ?? slug;
  const prefLabels = assessment.food_preferences.map(labelFor);
  const exclLabels = assessment.food_exclusions.map(labelFor);
  modifierLines.push(
    `- food_preferences (foods user PREFERS): ${
      prefLabels.length === 0 ? 'none set' : prefLabels.join(', ')
    }`,
  );
  modifierLines.push(
    `- food_exclusions (foods user EXCLUDES — hard constraint): ${
      exclLabels.length === 0 ? 'none' : exclLabels.join(', ')
    }`,
  );
  modifierLines.push(
    `- food_filter_text (free-form constraints): ${
      assessment.food_filter_text
        ? `"${assessment.food_filter_text}"`
        : 'none'
    }`,
  );

  return `Here is the user's nutrition / body-composition assessment.

--- ASSESSMENT ---
- Goal direction: ${GOAL_DIRECTION_LABEL[assessment.goal_direction]}
- Urgency: ${URGENCY_LABEL[assessment.urgency]}
- Eating context: ${EATING_CONTEXT_LABEL[assessment.eating_context]}
- What they have tried: ${NUTRITION_WHAT_TRIED_LABEL[assessment.what_tried]}
- Fasting protocol: ${FASTING_PROTOCOL_LABEL[assessment.fasting_protocol]}
- Alcohol use: ${ALCOHOL_USE_LABEL[assessment.alcohol_use]}
- Cannabis use: ${CANNABIS_USE_LABEL[assessment.cannabis_use]}

What the user said they want:
${assessment.nutrition_goal_text ? `"${assessment.nutrition_goal_text}"` : '(nothing volunteered)'}
--- END ASSESSMENT ---

--- MODIFIERS ---
${modifierLines.join('\n')}
--- END MODIFIERS ---

Write the four-section nutrition / body-comp plan now. 280 words maximum. Use the exact H2 headings specified in the system prompt. Lead "The next move" with the calorie target + macro grams when they're available — these numbers are the load-bearing piece. Apply the eating-disorder-adjacency safeguard if triggered. Apply the alcohol_use, cannabis_use, fasting_protocol, and food picker rules when they apply. Do not narrate the modifiers back to the user — let them shape what you emphasize.`;
}
