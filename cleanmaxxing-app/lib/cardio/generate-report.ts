// Cardio report generator. Single Sonnet call. Reads cross-modifiers
// from BOTH the nutrition assessment AND the strength assessment so
// the cardio prescription stays aligned with the rest of the fitness
// trio. Live signal: last 7 days cardio session count.

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { SupabaseClient } from '@supabase/supabase-js';
import { povFor } from '@/lib/content/pov';
import { getUserProfile } from '@/lib/profile/service';
import { getNutritionAssessment } from '@/lib/nutrition/service';
import { getStrengthAssessment } from '@/lib/strength/service';
import {
  CARDIO_DAYS_PER_WEEK_LABEL,
  CURRENT_MOVEMENT_LABEL,
  MODALITY_PREFERENCE_LABEL,
  PRIMARY_ROLE_LABEL,
  type CardioAssessment,
  type CardioReportInputModifiers,
} from './types';
import { buildCardioReportSystemPrompt } from './report-prompt';
import {
  getRecentCardioSessionCount,
  saveCardioReport,
} from './service';

const REPORT_MODEL = 'claude-sonnet-4-6';
const POV_SLUG = '23-cardio';

export async function generateAndSaveCardioReport(
  supabase: SupabaseClient,
  userId: string,
  assessment: CardioAssessment,
): Promise<{ report_text: string }> {
  const profile = await getUserProfile(supabase, userId);

  // Pull cross-modifier reads + age + live signal in parallel.
  const [
    { data: userRow },
    sessionCount,
    nutritionAssessment,
    strengthAssessment,
  ] = await Promise.all([
    supabase.from('users').select('age').eq('id', userId).maybeSingle(),
    getRecentCardioSessionCount(supabase, userId, 7),
    getNutritionAssessment(supabase, userId),
    getStrengthAssessment(supabase, userId),
  ]);

  const modifiers: CardioReportInputModifiers = {
    bf_pct_self_estimate: profile.bf_pct_self_estimate,
    daily_training_minutes: profile.daily_training_minutes,
    activity_level: profile.activity_level,
    training_experience: profile.training_experience,
    current_interventions: profile.current_interventions,
    age: (userRow as { age: number | null } | null)?.age ?? null,
    cardio_sessions_last_7: sessionCount,
    nutrition_goal_direction: nutritionAssessment?.goal_direction ?? null,
    strength_days_per_week: strengthAssessment?.days_per_week ?? null,
    zone_2_layer_started_at: assessment.zone_2_layer_started_at,
    hiit_layer_started_at: assessment.hiit_layer_started_at,
  };

  const pov = await povFor(POV_SLUG);
  if (!pov) {
    throw new Error(
      `Cardio report requires POV "${POV_SLUG}" but it was not found.`,
    );
  }
  const povContext = `# ${pov.title}\n\n${pov.body}`;
  const system = buildCardioReportSystemPrompt(povContext);

  const userPrompt = formatAssessmentForPrompt(assessment, modifiers);

  const { text } = await generateText({
    model: anthropic(REPORT_MODEL),
    system,
    prompt: userPrompt,
    temperature: 0.5,
  });

  const reportText = text.trim();

  await saveCardioReport(supabase, userId, {
    report_text: reportText,
    report_model: REPORT_MODEL,
    report_input_modifiers: modifiers,
  });

  return { report_text: reportText };
}

function formatAssessmentForPrompt(
  assessment: CardioAssessment,
  modifiers: CardioReportInputModifiers,
): string {
  const modifierLines: string[] = [];
  modifierLines.push(`- age (users): ${modifiers.age ?? 'not set'}`);
  modifierLines.push(
    `- bf_pct_self_estimate (profile): ${modifiers.bf_pct_self_estimate ?? 'not set'}`,
  );
  modifierLines.push(
    `- daily_training_minutes (profile): ${modifiers.daily_training_minutes ?? 'not set'}`,
  );
  modifierLines.push(
    `- activity_level (profile): ${modifiers.activity_level ?? 'not set'}`,
  );
  modifierLines.push(
    `- training_experience (profile): ${modifiers.training_experience ?? 'not set'}`,
  );
  modifierLines.push(
    `- current_interventions (profile): ${
      modifiers.current_interventions.length === 0
        ? 'none'
        : modifiers.current_interventions.join(', ')
    }`,
  );
  modifierLines.push(
    `- cardio_sessions_last_7 (workout_logs, type='cardio'): ${modifiers.cardio_sessions_last_7}`,
  );
  modifierLines.push(
    `- nutrition_goal_direction (nutrition_assessments, when present): ${
      modifiers.nutrition_goal_direction ?? 'no nutrition assessment yet'
    }`,
  );
  modifierLines.push(
    `- strength_days_per_week (strength_assessments, when present): ${
      modifiers.strength_days_per_week ?? 'no strength assessment yet'
    }`,
  );
  modifierLines.push(
    `- zone_2_layer_started_at (stage milestone): ${
      modifiers.zone_2_layer_started_at ??
      'not yet — user is still on step-count baseline if days_per_week is 0_days'
    }`,
  );
  modifierLines.push(
    `- hiit_layer_started_at (stage milestone): ${
      modifiers.hiit_layer_started_at ??
      'not yet — user has not added HIIT layer to Zone 2 base'
    }`,
  );

  return `Here is the user's cardio assessment.

--- ASSESSMENT ---
- Primary role: ${PRIMARY_ROLE_LABEL[assessment.primary_role]}
- Current movement: ${CURRENT_MOVEMENT_LABEL[assessment.current_movement]}
- Modality preference: ${MODALITY_PREFERENCE_LABEL[assessment.modality_preference]}
- Days per week available for structured cardio: ${CARDIO_DAYS_PER_WEEK_LABEL[assessment.days_per_week]}

What the user said they want:
${assessment.cardio_goal_text ? `"${assessment.cardio_goal_text}"` : '(nothing volunteered)'}
--- END ASSESSMENT ---

--- MODIFIERS ---
${modifierLines.join('\n')}
--- END MODIFIERS ---

Write the four-section cardio plan now. 280 words maximum. Use the exact H2 headings specified in the system prompt. Apply the age tier prescription, the cross-modifier rules with nutrition's goal_direction and strength's days_per_week (when present), and the modality-agnostic principle (the program the user will actually run beats the optimal one). Do not narrate the modifiers back to the user — let them shape what you emphasize.`;
}
