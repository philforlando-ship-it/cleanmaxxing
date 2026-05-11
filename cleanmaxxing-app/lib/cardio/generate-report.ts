// Cardio report generator. Single Sonnet call. Reads cross-modifiers
// from BOTH the nutrition assessment AND the strength assessment so
// the cardio prescription stays aligned with the rest of the fitness
// trio. Live signal: last 7 days cardio session count.

import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { StreamTextResult, ToolSet } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { kindForAnthropicModel, logCostEvent } from '@/lib/cost-events/log';
import { povFor } from '@/lib/content/pov';
import { getUserProfile } from '@/lib/profile/service';
import { getNutritionAssessment } from '@/lib/nutrition/service';
import { getStrengthAssessment } from '@/lib/strength/service';
import { getCurrentFatigueState } from '@/lib/weekly-reflection/service';
import {
  getHrvTrend,
  getRhrSignals,
  getVo2MaxSignal,
} from '@/lib/vital/wearable-signals';
import { isPremium as resolveIsPremium } from '@/lib/billing/is-premium';
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
  getWearableActiveDaysLast7,
  saveCardioReport,
} from './service';

const REPORT_MODEL = 'claude-sonnet-4-6';
const POV_SLUG = '23-cardio';

// Streaming entrypoint — see lib/nutrition/generate-report.ts for the
// pattern + rationale.
export async function streamCardioReport(
  supabase: SupabaseClient,
  userId: string,
  assessment: CardioAssessment,
): Promise<StreamTextResult<ToolSet, never>> {
  const profile = await getUserProfile(supabase, userId);

  // Pull cross-modifier reads + age + timezone + live signal in parallel.
  const [
    { data: userRow },
    sessionCount,
    nutritionAssessment,
    strengthAssessment,
    fatigueState,
    wearableActiveDays,
    userIsPremium,
  ] = await Promise.all([
    supabase
      .from('users')
      .select('age, timezone')
      .eq('id', userId)
      .maybeSingle(),
    getRecentCardioSessionCount(supabase, userId, 7),
    getNutritionAssessment(supabase, userId),
    getStrengthAssessment(supabase, userId),
    getCurrentFatigueState(supabase, userId),
    getWearableActiveDaysLast7(supabase, userId),
    resolveIsPremium(userId),
  ]);

  // Wearable signals are Pro-gated. Free users get the same prompt
  // shape with null wearable inputs (prompt already handles "no signal
  // — insufficient data or no wearable" branch), so the report content
  // shifts without the prompt template having to branch on tier.
  const [hrvSignal, vo2MaxSignal, rhrSignals] = userIsPremium
    ? await Promise.all([
        getHrvTrend(supabase, userId),
        getVo2MaxSignal(supabase, userId),
        getRhrSignals(supabase, userId),
      ])
    : [
        { trend: null, recent_avg_ms: null, baseline_avg_ms: null },
        { latest_value: null, latest_date: null, trend: null },
        { rolling_avg_rhr_14d: null, baseline_rhr: null },
      ];

  // Seasonal awareness — pass the current month + user's timezone so
  // the prompt can reason about hemisphere + outdoor-cardio
  // availability instead of treating 'seasonal' outdoor_access as
  // always off-season.
  const userTimezone =
    (userRow as { timezone: string | null } | null)?.timezone ?? null;
  const currentMonthName = new Date().toLocaleString('en-US', {
    month: 'long',
    timeZone: userTimezone ?? 'UTC',
  });

  const modifiers: CardioReportInputModifiers = {
    bf_pct_self_estimate: profile.bf_pct_self_estimate,
    daily_training_minutes: profile.daily_training_minutes,
    activity_level: profile.activity_level,
    training_experience: profile.training_experience,
    current_interventions: profile.current_interventions,
    age: (userRow as { age: number | null } | null)?.age ?? null,
    cardio_sessions_last_7: sessionCount,
    nutrition_goal_direction: nutritionAssessment?.goal_direction ?? null,
    nutrition_alcohol_use: nutritionAssessment?.alcohol_use ?? null,
    strength_days_per_week: strengthAssessment?.days_per_week ?? null,
    zone_2_layer_started_at: assessment.zone_2_layer_started_at,
    hiit_layer_started_at: assessment.hiit_layer_started_at,
    injury_constraints: assessment.injury_constraints,
    equipment_access: assessment.equipment_access,
    outdoor_access: assessment.outdoor_access,
    time_per_session: assessment.time_per_session,
    occupation_activity: assessment.occupation_activity,
    programming_priority: assessment.programming_priority,
    current_month_name: currentMonthName,
    user_timezone: userTimezone,
    fatigue_level: fatigueState?.level ?? null,
    fatigue_source: fatigueState?.source ?? null,
    wearable_active_days_last_7: wearableActiveDays,
    hrv_trend: hrvSignal.trend,
    vo2_max_latest: vo2MaxSignal.latest_value,
    vo2_max_trend: vo2MaxSignal.trend,
    rhr_rolling_avg_14d: rhrSignals.rolling_avg_rhr_14d,
    rhr_baseline: rhrSignals.baseline_rhr,
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

  return streamText({
    model: anthropic(REPORT_MODEL),
    system,
    prompt: userPrompt,
    temperature: 0.5,
    onFinish: async ({ text, usage }) => {
      logCostEvent({
        user_id: userId,
        kind: kindForAnthropicModel(REPORT_MODEL),
        tokens_input: usage?.inputTokens,
        tokens_output: usage?.outputTokens,
        feature: 'cardio_report',
      });
      await saveCardioReport(supabase, userId, {
        report_text: text.trim(),
        report_model: REPORT_MODEL,
        report_input_modifiers: modifiers,
      });
    },
  });
}

export async function generateAndSaveCardioReport(
  supabase: SupabaseClient,
  userId: string,
  assessment: CardioAssessment,
): Promise<{ report_text: string }> {
  const result = await streamCardioReport(supabase, userId, assessment);
  const text = await result.text;
  return { report_text: text.trim() };
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
    `- nutrition_alcohol_use (nutrition_assessments, when present): ${
      modifiers.nutrition_alcohol_use ?? 'no nutrition assessment yet'
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
  modifierLines.push(
    `- injury_constraints (Q10 — exercise modality EXCLUSIONS): ${
      modifiers.injury_constraints.length === 0
        ? 'none'
        : modifiers.injury_constraints.join(', ')
    }`,
  );
  modifierLines.push(
    `- equipment_access (Q6 — multi-select, what the user can actually use; recommend across their full equipment context): ${
      modifiers.equipment_access.length === 0
        ? 'not set'
        : modifiers.equipment_access.join(', ')
    }`,
  );
  modifierLines.push(
    `- outdoor_access (Q7 — climate / location reality): ${
      modifiers.outdoor_access ?? 'not set'
    }`,
  );
  modifierLines.push(
    `- time_per_session (Q8 — realistic time budget): ${
      modifiers.time_per_session ?? 'not set'
    }`,
  );
  modifierLines.push(
    `- occupation_activity (Q9 — day-job activity baseline; drives C2 cardio downweighting): ${
      modifiers.occupation_activity ?? 'not set'
    }`,
  );
  modifierLines.push(
    `- programming_priority (Q5 — strength-cardio trade-off arbiter; drives 3-options framing when both journeys conflict): ${
      modifiers.programming_priority ?? 'not set'
    }`,
  );
  modifierLines.push(
    `- current_month_name (server clock, user-localized): ${modifiers.current_month_name}`,
  );
  modifierLines.push(
    `- user_timezone (users.timezone — use to infer hemisphere for season-aware outdoor recs): ${
      modifiers.user_timezone ?? 'not set (assume northern hemisphere US default)'
    }`,
  );
  modifierLines.push(
    `- fatigue_level (weekly_reflections, last 14 days): ${
      modifiers.fatigue_level ?? 'no recent signal'
    }`,
  );
  modifierLines.push(
    `- fatigue_source (only load-bearing when fatigue_level = 'struggling'): ${
      modifiers.fatigue_source ?? 'not attributed'
    }`,
  );
  modifierLines.push(
    `- wearable_active_days_last_7 (Junction-connected wearable; days in last 7 with >=20 min medium+high intensity; NULL = no wearable connected): ${
      modifiers.wearable_active_days_last_7 == null
        ? 'no wearable connected — ignore this signal'
        : String(modifiers.wearable_active_days_last_7)
    }`,
  );
  modifierLines.push(
    `- hrv_trend (sleep_logs.hrv_rmssd 7-day vs 28-day baseline; directional only, NEVER cite the number): ${
      modifiers.hrv_trend ?? 'no signal — insufficient data or no wearable'
    }`,
  );
  modifierLines.push(
    `- vo2_max_latest (mL/kg/min, last reading within 60 days; appropriate to cite for age 45+): ${
      modifiers.vo2_max_latest == null
        ? 'no recent reading'
        : String(modifiers.vo2_max_latest)
    }`,
  );
  modifierLines.push(
    `- vo2_max_trend (vs ~90 days prior; null when no comparison value): ${
      modifiers.vo2_max_trend ?? 'no trend signal'
    }`,
  );
  modifierLines.push(
    `- rhr_rolling_avg_14d (sleep_logs.resting_heart_rate rolling 14d avg in bpm; Pro-gated and may be null for free users): ${
      modifiers.rhr_rolling_avg_14d == null
        ? 'no signal — insufficient data, no wearable, or free tier'
        : String(modifiers.rhr_rolling_avg_14d)
    }`,
  );
  modifierLines.push(
    `- rhr_baseline (earliest 14-day RHR window — the user's starting point): ${
      modifiers.rhr_baseline == null
        ? 'no baseline'
        : String(modifiers.rhr_baseline)
    }`,
  );

  const primaryRolesLabel =
    assessment.primary_role.length === 0
      ? '(not specified)'
      : assessment.primary_role.map((r) => PRIMARY_ROLE_LABEL[r]).join('; ');
  const modalityPreferenceLabel =
    assessment.modality_preference.length === 0
      ? '(not specified)'
      : assessment.modality_preference
          .map((m) => MODALITY_PREFERENCE_LABEL[m])
          .join('; ');

  return `Here is the user's cardio assessment.

--- ASSESSMENT ---
- Primary roles (multi-select — recommend across them): ${primaryRolesLabel}
- Current movement: ${CURRENT_MOVEMENT_LABEL[assessment.current_movement]}
- Modality preferences (multi-select — the user will actually run more than one; alternate or stack across them): ${modalityPreferenceLabel}
- Days per week available for structured cardio: ${CARDIO_DAYS_PER_WEEK_LABEL[assessment.days_per_week]}

What the user said they want:
${assessment.cardio_goal_text ? `"${assessment.cardio_goal_text}"` : '(nothing volunteered)'}
--- END ASSESSMENT ---

--- MODIFIERS ---
${modifierLines.join('\n')}
--- END MODIFIERS ---

Write the four-section cardio plan now. 280 words maximum. Use the exact H2 headings specified in the system prompt. Apply the age tier prescription, the cross-modifier rules with nutrition's goal_direction and strength's days_per_week (when present), and the modality-agnostic principle (the program the user will actually run beats the optimal one). Do not narrate the modifiers back to the user — let them shape what you emphasize.`;
}
