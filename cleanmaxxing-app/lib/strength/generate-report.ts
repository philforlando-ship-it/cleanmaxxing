// Strength training report generator. Single Sonnet call. Pulls
// the nutrition assessment's goal_direction (when present) as a
// cross-modifier so the strength prescription stays aligned with
// the nutrition prescription. Live signal: last 7 days strength
// session count.

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { SupabaseClient } from '@supabase/supabase-js';
import { kindForAnthropicModel, logCostEvent } from '@/lib/cost-events/log';
import { povFor } from '@/lib/content/pov';
import { getUserProfile } from '@/lib/profile/service';
import { getCardioAssessment } from '@/lib/cardio/service';
import { getNutritionAssessment } from '@/lib/nutrition/service';
import { getSleepState } from '@/lib/sleep/service';
import {
  CURRENT_SPLIT_LABEL,
  DAYS_PER_WEEK_LABEL,
  EQUIPMENT_ACCESS_LABEL,
  PRIMARY_GOAL_LABEL,
  PRIORITY_MUSCLE_LABEL,
  STRENGTH_EXERCISES,
  type StrengthAssessment,
  type StrengthExercise,
  type StrengthReportInputModifiers,
} from './types';
import { buildStrengthReportSystemPrompt } from './report-prompt';
import {
  getRecentStrengthSessionCount,
  saveStrengthReport,
} from './service';
import { getStrengthFeedbackSummary } from './feedback';
import { getRecommendedExercises } from './recommended-exercises';

const REPORT_MODEL = 'claude-sonnet-4-6';
const POV_SLUG = '19-strength-training';

export async function generateAndSaveStrengthReport(
  supabase: SupabaseClient,
  userId: string,
  assessment: StrengthAssessment,
): Promise<{ report_text: string }> {
  const profile = await getUserProfile(supabase, userId);

  const [
    { data: userRow },
    sessionCount,
    nutritionAssessment,
    cardioAssessment,
    sleepState,
    feedbackSummary,
  ] = await Promise.all([
    supabase.from('users').select('age').eq('id', userId).maybeSingle(),
    getRecentStrengthSessionCount(supabase, userId, 7),
    getNutritionAssessment(supabase, userId),
    getCardioAssessment(supabase, userId),
    getSleepState(supabase, userId),
    getStrengthFeedbackSummary(supabase, userId, 7),
  ]);

  const modifiers: StrengthReportInputModifiers = {
    training_experience: profile.training_experience,
    daily_training_minutes: profile.daily_training_minutes,
    activity_level: profile.activity_level,
    bf_pct_self_estimate: profile.bf_pct_self_estimate,
    current_interventions: profile.current_interventions,
    diet_restrictions: profile.diet_restrictions,
    age: (userRow as { age: number | null } | null)?.age ?? null,
    strength_sessions_last_7: sessionCount,
    nutrition_goal_direction: nutritionAssessment?.goal_direction ?? null,
    nutrition_alcohol_use: nutritionAssessment?.alcohol_use ?? null,
    cardio_days_per_week: cardioAssessment?.days_per_week ?? null,
    cardio_zone_2_layer_active:
      cardioAssessment?.zone_2_layer_started_at != null,
    cardio_hiit_layer_active:
      cardioAssessment?.hiit_layer_started_at != null,
    cardio_programming_priority:
      cardioAssessment?.programming_priority ?? null,
    sleep_rolling_avg_hours: sleepState.rollingAvgHours,
    sleep_rolling_count: sleepState.rollingCount,
    selected_exercise_slugs: assessment.selected_exercise_slugs,
    excluded_exercise_slugs: assessment.excluded_exercise_slugs,
    exercise_filter_text: assessment.exercise_filter_text,
    priority_muscles: assessment.priority_muscles,
    lagging_muscles_text: assessment.lagging_muscles_text,
    secondary_objective: assessment.secondary_objective,
    injury_constraints: assessment.injury_constraints,
    bodyweight_preference: assessment.bodyweight_preference,
    beginner_ramp_completed_at: assessment.beginner_ramp_completed_at,
    last_plateau_intervention_at: assessment.last_plateau_intervention_at,
    feedback_rows_last_7: feedbackSummary.rows_last_7_days,
    feedback_consecutive_high_soreness:
      feedbackSummary.consecutive_high_soreness,
    feedback_consecutive_low_soreness:
      feedbackSummary.consecutive_low_soreness,
    feedback_joint_pain_count: feedbackSummary.joint_pain_count,
    feedback_most_recent_energy: feedbackSummary.most_recent_energy,
  };

  const pov = await povFor(POV_SLUG);
  if (!pov) {
    throw new Error(
      `Strength report requires POV "${POV_SLUG}" but it was not found.`,
    );
  }
  const povContext = `# ${pov.title}\n\n${pov.body}`;
  const system = buildStrengthReportSystemPrompt(povContext);

  const userPrompt = formatAssessmentForPrompt(assessment, modifiers);

  const { text, usage } = await generateText({
    model: anthropic(REPORT_MODEL),
    system,
    prompt: userPrompt,
    temperature: 0.5,
  });

  logCostEvent({
    user_id: userId,
    kind: kindForAnthropicModel(REPORT_MODEL),
    tokens_input: usage?.inputTokens,
    tokens_output: usage?.outputTokens,
    feature: 'strength_report',
  });

  const reportText = text.trim();

  await saveStrengthReport(supabase, userId, {
    report_text: reportText,
    report_model: REPORT_MODEL,
    report_input_modifiers: modifiers,
  });

  return { report_text: reportText };
}

function formatAssessmentForPrompt(
  assessment: StrengthAssessment,
  modifiers: StrengthReportInputModifiers,
): string {
  // Compact catalog summary for the prompt — slug + label + primary
  // muscles. Filtered to the user's feasible exercises so the LLM
  // can't recommend a bodyweight_row to a user without a pull-up bar
  // (the catalog flag equipment='bodyweight' isn't sufficient — gear
  // feasibility is enforced by getRecommendedExercises).
  //
  // Vocabulary = recommended ∪ filteredOut. hiddenByEquipment is left
  // out — the user can't physically do those.
  const recResult = getRecommendedExercises({
    equipment_access: assessment.equipment_access,
    injury_constraints: assessment.injury_constraints,
    priority_muscles: assessment.priority_muscles,
    secondary_objective: assessment.secondary_objective,
    bodyweight_preference: assessment.bodyweight_preference,
    equipment_owned: assessment.equipment_owned,
  });
  const feasibleExercises: StrengthExercise[] = [
    ...recResult.recommended,
    ...recResult.filteredOut,
  ];
  const catalogLines = feasibleExercises
    .map(
      (e) =>
        `  - ${e.label} (${e.equipment}, ${e.movement_pattern}): ${e.primary_muscles.join(', ')}`,
    )
    .join('\n');

  const modifierLines: string[] = [];
  modifierLines.push(`- age (users): ${modifiers.age ?? 'not set'}`);
  modifierLines.push(
    `- training_experience (profile): ${modifiers.training_experience ?? 'not set'}`,
  );
  modifierLines.push(
    `- daily_training_minutes (profile): ${modifiers.daily_training_minutes ?? 'not set'}`,
  );
  modifierLines.push(
    `- activity_level (profile): ${modifiers.activity_level ?? 'not set'}`,
  );
  modifierLines.push(
    `- bf_pct_self_estimate (profile): ${modifiers.bf_pct_self_estimate ?? 'not set'}`,
  );
  modifierLines.push(
    `- current_interventions (profile): ${
      modifiers.current_interventions.length === 0
        ? 'none'
        : modifiers.current_interventions.join(', ')
    }`,
  );
  modifierLines.push(
    `- diet_restrictions (profile): ${
      modifiers.diet_restrictions
        ? `"${modifiers.diet_restrictions}"`
        : 'none'
    }`,
  );
  modifierLines.push(
    `- strength_sessions_last_7 (workout_logs, type='strength'): ${modifiers.strength_sessions_last_7}`,
  );
  modifierLines.push(
    `- nutrition_goal_direction (nutrition_assessments, when present): ${
      modifiers.nutrition_goal_direction ?? 'no nutrition assessment yet'
    }`,
  );
  modifierLines.push(
    `- nutrition_alcohol_use (nutrition_assessments, when present): ${
      modifiers.nutrition_alcohol_use ?? 'no nutrition assessment yet'
    }`,
  );
  modifierLines.push(
    `- cardio_days_per_week (cardio_assessments, when present): ${
      modifiers.cardio_days_per_week ?? 'no cardio assessment yet'
    }`,
  );
  modifierLines.push(
    `- cardio_zone_2_layer_active (cardio stage milestone): ${
      modifiers.cardio_zone_2_layer_active ? 'yes' : 'no'
    }`,
  );
  modifierLines.push(
    `- cardio_hiit_layer_active (cardio stage milestone): ${
      modifiers.cardio_hiit_layer_active ? 'yes' : 'no'
    }`,
  );
  modifierLines.push(
    `- cardio_programming_priority (cardio Q5 — strength-cardio trade-off arbiter, when set): ${
      modifiers.cardio_programming_priority ?? 'not set'
    }`,
  );
  modifierLines.push(
    `- sleep_rolling_avg_hours (sleep_logs, last 7 nights, ${modifiers.sleep_rolling_count} logged): ${
      modifiers.sleep_rolling_avg_hours ?? 'no sleep data logged'
    }`,
  );

  // Exercise picker signals — translate slugs to labels in the prompt
  // so the model recognizes them by the same name it uses in the
  // catalog vocabulary block.
  const labelFor = (slug: string) =>
    STRENGTH_EXERCISES.find((e) => e.slug === slug)?.label ?? slug;
  const selectedLabels = modifiers.selected_exercise_slugs.map(labelFor);
  const excludedLabels = modifiers.excluded_exercise_slugs.map(labelFor);
  modifierLines.push(
    `- user_selected_exercises (picker — exercises the user PREFERS, lean on these): ${
      selectedLabels.length === 0 ? 'no preferences set' : selectedLabels.join(', ')
    }`,
  );
  modifierLines.push(
    `- user_excluded_exercises (picker — DO NOT recommend these): ${
      excludedLabels.length === 0 ? 'none excluded' : excludedLabels.join(', ')
    }`,
  );
  modifierLines.push(
    `- user_filter_text (picker — free-form constraints to honor): ${
      modifiers.exercise_filter_text
        ? `"${modifiers.exercise_filter_text}"`
        : 'none'
    }`,
  );
  modifierLines.push(
    `- priority_muscles (Q5 — looksmaxxing visual-leverage muscles to bias volume + frequency toward, ${modifiers.priority_muscles.length} picked): ${
      modifiers.priority_muscles.length === 0
        ? 'none — default volume distribution applies'
        : modifiers.priority_muscles
            .map((m) => PRIORITY_MUSCLE_LABEL[m])
            .join(', ')
    }`,
  );
  modifierLines.push(
    `- lagging_muscles_text (Q5 free-text — muscles the user feels are under-developed): ${
      modifiers.lagging_muscles_text
        ? `"${modifiers.lagging_muscles_text}"`
        : 'none volunteered'
    }`,
  );
  modifierLines.push(
    `- secondary_objective (Q7 — strength + something else, single value): ${
      modifiers.secondary_objective ?? 'not set — treat as none'
    }`,
  );
  modifierLines.push(
    `- injury_constraints (Q8 — chronic conditions producing exercise EXCLUSIONS, multi-select): ${
      modifiers.injury_constraints.length === 0
        ? 'none'
        : modifiers.injury_constraints.join(', ')
    }`,
  );
  modifierLines.push(
    `- bodyweight_preference (Q9 — push BW exercises as primary, mix, or only as fallback): ${
      modifiers.bodyweight_preference ?? 'not set — treat as mixed'
    }`,
  );
  modifierLines.push(
    `- beginner_ramp_completed_at (stage milestone): ${
      modifiers.beginner_ramp_completed_at ?? 'not yet — user is in the ramp window if training_experience says so'
    }`,
  );
  modifierLines.push(
    `- last_plateau_intervention_at (stage milestone): ${
      modifiers.last_plateau_intervention_at ??
      'never — user has not run the SFR re-test gate'
    }`,
  );
  modifierLines.push(
    `- recovery_check_rows_last_7 (strength_session_feedback morning-after entries): ${modifiers.feedback_rows_last_7}`,
  );
  modifierLines.push(
    `- consecutive_high_soreness_muscles (soreness=3 on two recent rows — DROP a set on these next session): ${
      modifiers.feedback_consecutive_high_soreness.length === 0
        ? 'none'
        : modifiers.feedback_consecutive_high_soreness.join(', ')
    }`,
  );
  modifierLines.push(
    `- consecutive_low_soreness_muscles (soreness<=2 on two recent rows — eligible to ADD a set): ${
      modifiers.feedback_consecutive_low_soreness.length === 0
        ? 'none'
        : modifiers.feedback_consecutive_low_soreness.join(', ')
    }`,
  );
  modifierLines.push(
    `- joint_pain_reports_in_window: ${modifiers.feedback_joint_pain_count}`,
  );
  modifierLines.push(
    `- most_recent_morning_energy_1_5: ${
      modifiers.feedback_most_recent_energy ?? 'no recent reading'
    }`,
  );

  return `Here is the user's strength training assessment.

--- ASSESSMENT ---
- Primary goal: ${PRIMARY_GOAL_LABEL[assessment.primary_goal]}
- Days per week: ${DAYS_PER_WEEK_LABEL[assessment.days_per_week]}
- Equipment access: ${EQUIPMENT_ACCESS_LABEL[assessment.equipment_access]}
- Current split: ${CURRENT_SPLIT_LABEL[assessment.current_split]}

What the user said they want:
${assessment.strength_goal_text ? `"${assessment.strength_goal_text}"` : '(nothing volunteered)'}
--- END ASSESSMENT ---

--- MODIFIERS ---
${modifierLines.join('\n')}
--- END MODIFIERS ---

--- EXERCISE CATALOG (the vocabulary you may recommend by name) ---
${catalogLines}
--- END CATALOG ---

Write the four-section strength training plan now. 280 words maximum. Use the exact H2 headings specified in the system prompt. When you recommend exercises, use names from the catalog above verbatim — they map to a UI reference panel the user can click through. Apply the age-tier prescription, the cross-modifier with nutrition's goal_direction (when present), and the glutes-after-35 rule when applicable. Do not narrate the modifiers back to the user — let them shape what you emphasize.`;
}
