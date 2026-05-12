// Nutrition / body-comp report generator v2. Computes deterministic
// TDEE + macro targets from profile, persists them to the assessment
// row (so the page can render them without recomputing), and injects
// the full v2 modifier block into the prompt.

import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { StreamTextResult, ToolSet } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { kindForAnthropicModel, logCostEvent } from '@/lib/cost-events/log';
import { povFor } from '@/lib/content/pov';
import {
  getUserProfile,
  syncBodyStatsFromSurveyIfMissing,
} from '@/lib/profile/service';
import {
  ALCOHOL_USE_LABEL,
  CANNABIS_USE_LABEL,
  CHEAT_DAY_PATTERN_LABEL,
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
  saveWeightLossPlanSnapshot,
} from './service';
import {
  computeNutritionTargets,
  computeWeightLossPlan,
  effectiveActivityLevel,
  type WeightLossPlan,
} from './tdee';
import { getCardioAssessment } from '@/lib/cardio/service';
import { getStrengthAssessment } from '@/lib/strength/service';
import { getCurrentFatigueState } from '@/lib/weekly-reflection/service';
import { getHrvTrend } from '@/lib/vital/wearable-signals';
import { isPremium as resolveIsPremium } from '@/lib/billing/is-premium';

const REPORT_MODEL = 'claude-sonnet-4-6';
const POV_SLUG = '13-body-physical-foundation';

// Streaming entrypoint. Returns the StreamTextResult so the caller
// can either (a) return .toTextStreamResponse() from a route handler
// for progressive client rendering, or (b) await .text for non-
// streaming consumers (re-evaluate background job). Either way the
// onFinish callback fires once at the end of the stream and handles
// the DB save + cost logging — so the streaming and non-streaming
// paths share the same persistence behavior.
//
// onFinish runs in the server's request context after the route has
// already returned the stream response. Vercel keeps the function
// alive until the stream is fully drained, so the save completes
// reliably.
export async function streamNutritionReport(
  supabase: SupabaseClient,
  userId: string,
  assessment: NutritionAssessment,
): Promise<StreamTextResult<ToolSet, never>> {
  const { system, userPrompt, modifiers } = await prepareNutritionReport(
    supabase,
    userId,
    assessment,
  );

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
        feature: 'nutrition_report',
      });
      await saveNutritionReport(supabase, userId, {
        report_text: text.trim(),
        report_model: REPORT_MODEL,
        report_input_modifiers: modifiers,
      });
    },
  });
}

// Non-streaming consumer (re-evaluate route). Drains the stream
// internally and returns the full text. onFinish still fires inside
// streamNutritionReport, so save + cost logging happen the same way.
export async function generateAndSaveNutritionReport(
  supabase: SupabaseClient,
  userId: string,
  assessment: NutritionAssessment,
): Promise<{ report_text: string }> {
  const result = await streamNutritionReport(supabase, userId, assessment);
  const text = await result.text;
  return { report_text: text.trim() };
}

// Prep — runs all the deterministic setup (profile sync, target
// computation, weight-loss plan snapshot, modifier roll-up, POV
// load, system + user prompt assembly). Pure-ish: writes the
// snapshot rows (which is correct — they're idempotent and should
// land regardless of LLM outcome). Shared by streaming and non-
// streaming consumers above.
async function prepareNutritionReport(
  supabase: SupabaseClient,
  userId: string,
  assessment: NutritionAssessment,
): Promise<{
  system: string;
  userPrompt: string;
  modifiers: NutritionReportInputModifiers;
}> {
  const initialProfile = await getUserProfile(supabase, userId);
  // Backfill weight/height from survey_responses if profile columns
  // are still null. Same reason as /plan/nutrition page.
  const profile = await syncBodyStatsFromSurveyIfMissing(
    supabase,
    userId,
    initialProfile,
  );

  const [
    { data: userRow },
    proteinSignal,
    strengthAssessment,
    cardioAssessment,
    fatigueState,
    userIsPremium,
  ] = await Promise.all([
    supabase.from('users').select('age').eq('id', userId).maybeSingle(),
    getRecentProteinSignal(supabase, userId),
    getStrengthAssessment(supabase, userId),
    getCardioAssessment(supabase, userId),
    getCurrentFatigueState(supabase, userId),
    resolveIsPremium(userId),
  ]);

  // HRV is Pro-gated. Free users get the same prompt shape with a
  // null trend; the prompt template already handles "no signal —
  // insufficient data or no wearable" without branching on tier.
  const hrvSignal = userIsPremium
    ? await getHrvTrend(supabase, userId)
    : { trend: null, recent_avg_ms: null, baseline_avg_ms: null };

  const age = (userRow as { age: number | null } | null)?.age ?? null;
  const isStrengthTraining = strengthAssessment?.report_text != null;
  const isOnGlp1 = profile.current_interventions.includes('glp1');

  // Compute the deterministic targets (TDEE / calorie target / macro
  // grams) from profile data + goal direction. activity_level is
  // resolved via effectiveActivityLevel — uses explicit profile value
  // when set, infers from daily_training_minutes when not. Targets are
  // still nullable when weight/height/age are missing; the prompt has
  // a fallback rule.
  const activity = effectiveActivityLevel({
    explicit: profile.activity_level,
    daily_training_minutes: profile.daily_training_minutes,
  });
  const targets = computeNutritionTargets({
    weight_lbs: profile.current_weight_lbs,
    height_inches: profile.height_inches,
    age,
    activity_level: activity.value,
    goal_direction: assessment.goal_direction,
    current_interventions: profile.current_interventions,
    training_experience: profile.training_experience,
  });

  // Weight-loss plan layer — only when the user set a goal weight +
  // timeline AND we have the demographic data to compute it. Auto-
  // extends the timeline silently when the requested rate exceeds
  // the safe-rate cap (per locked rule).
  let weightLossPlan: WeightLossPlan | null = null;
  if (
    assessment.goal_direction === 'lose_fat' &&
    assessment.goal_weight_lbs != null &&
    assessment.goal_target_weeks != null &&
    profile.current_weight_lbs != null &&
    profile.height_inches != null &&
    age != null
  ) {
    weightLossPlan = computeWeightLossPlan({
      current_weight_lbs: profile.current_weight_lbs,
      goal_weight_lbs: assessment.goal_weight_lbs,
      weeks_requested: assessment.goal_target_weeks,
      height_inches: profile.height_inches,
      age,
      activity_level: activity.value,
      bf_pct: assessment.bf_pct_assessment,
      is_strength_training: isStrengthTraining,
      is_on_glp1: isOnGlp1,
      current_interventions: profile.current_interventions,
    });
    await saveWeightLossPlanSnapshot(supabase, userId, {
      safe_max_weekly_pct: weightLossPlan.safe_max_weekly_pct,
      realistic_target_weeks: weightLossPlan.realistic_weeks,
    });
  }

  // Snapshot targets onto the assessment row BEFORE the LLM call so
  // they're available even if the LLM call fails. When the weight-loss
  // plan was computed, prefer ITS numbers — those are goal-aware and
  // safe-rate-capped; the flat -500 fallback would only show in the
  // BMR panel and confuse users vs. the prompt.
  const rowTargets = weightLossPlan
    ? {
        tdee_estimate: weightLossPlan.tdee,
        calorie_target: weightLossPlan.daily_calorie_target,
        protein_target_g: weightLossPlan.protein_g,
        carb_target_g: weightLossPlan.carb_g,
        fat_target_g: weightLossPlan.fat_g,
      }
    : targets;
  await saveNutritionTargets(supabase, userId, rowTargets);

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
    cheat_day_pattern: assessment.cheat_day_pattern,
    cooking_capacity: assessment.cooking_capacity,
    dietary_pattern: assessment.dietary_pattern,
    meal_service_willingness: assessment.meal_service_willingness,
    snacking_style: assessment.snacking_style,
    gut_sensitivity: assessment.gut_sensitivity,
    cardio_days_per_week: cardioAssessment?.days_per_week ?? null,
    cardio_zone_2_layer_active:
      cardioAssessment?.zone_2_layer_started_at != null,
    cardio_hiit_layer_active:
      cardioAssessment?.hiit_layer_started_at != null,
    strength_days_per_week: strengthAssessment?.days_per_week ?? null,
    fatigue_level: fatigueState?.level ?? null,
    fatigue_source: fatigueState?.source ?? null,
    hrv_trend: hrvSignal.trend,
    tdee_estimate: weightLossPlan?.tdee ?? targets.tdee_estimate,
    calorie_target:
      weightLossPlan?.daily_calorie_target ?? targets.calorie_target,
    protein_target_g:
      weightLossPlan?.protein_g ?? targets.protein_target_g,
    carb_target_g: weightLossPlan?.carb_g ?? targets.carb_target_g,
    fat_target_g: weightLossPlan?.fat_g ?? targets.fat_target_g,
    goal_weight_lbs: assessment.goal_weight_lbs,
    goal_target_weeks: assessment.goal_target_weeks,
    bf_pct_assessment: assessment.bf_pct_assessment,
    safe_max_weekly_pct: weightLossPlan?.safe_max_weekly_pct ?? null,
    realistic_target_weeks: weightLossPlan?.realistic_weeks ?? null,
    was_timeline_extended:
      weightLossPlan?.was_timeline_extended ?? null,
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

  const userPrompt = formatAssessmentForPrompt(
    assessment,
    modifiers,
    weightLossPlan,
  );

  return { system, userPrompt, modifiers };
}

function formatAssessmentForPrompt(
  assessment: NutritionAssessment,
  modifiers: NutritionReportInputModifiers,
  weightLossPlan: WeightLossPlan | null,
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
  modifierLines.push(
    `- cheat_day_pattern: ${modifiers.cheat_day_pattern ?? 'not set — fall through to default adherence-reality framing'}`,
  );

  // T2 capacity & willingness modifiers
  modifierLines.push(
    `- cooking_capacity: ${modifiers.cooking_capacity ?? 'not set — work from felt sense'}`,
  );
  modifierLines.push(
    `- dietary_pattern: ${modifiers.dietary_pattern ?? 'not set'}`,
  );
  modifierLines.push(
    `- meal_service_willingness: ${modifiers.meal_service_willingness ?? 'not set'}`,
  );
  modifierLines.push(
    `- snacking_style: ${modifiers.snacking_style ?? 'not set'}`,
  );
  modifierLines.push(`- gut_sensitivity: ${modifiers.gut_sensitivity}`);
  modifierLines.push(
    `- cardio_days_per_week (cardio_assessments, when present — drives activity-mismatch detection): ${
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
    `- strength_days_per_week (strength_assessments, when present): ${
      modifiers.strength_days_per_week ?? 'no strength assessment yet'
    }`,
  );
  modifierLines.push(
    `- fatigue_level (weekly_reflections, last 14 days): ${
      modifiers.fatigue_level ?? 'no recent signal'
    }`,
  );
  modifierLines.push(
    `- fatigue_source (only load-bearing when fatigue_level = 'struggling' and source is cardio or strength): ${
      modifiers.fatigue_source ?? 'not attributed'
    }`,
  );
  modifierLines.push(
    `- hrv_trend (sleep_logs.hrv_rmssd 7-day vs 28-day baseline; load-bearing when goal_direction is 'lose_fat' or 'cut'; directional only, NEVER cite the number): ${
      modifiers.hrv_trend ?? 'no signal — insufficient data or no wearable'
    }`,
  );

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

  // Weight-loss plan layer (only populated when goal_weight + timeline
  // are set; otherwise the lines explicitly say "not set" so the
  // prompt can fall through to the qualitative path).
  if (weightLossPlan) {
    modifierLines.push(
      `- goal_weight_lbs: ${weightLossPlan.goal_weight_lbs}`,
    );
    modifierLines.push(
      `- weeks_requested: ${weightLossPlan.weeks_requested}`,
    );
    modifierLines.push(
      `- bf_pct_assessment: ${assessment.bf_pct_assessment ?? 'not provided — tier classified by BMI'}`,
    );
    modifierLines.push(
      `- safe_rate_tier: ${weightLossPlan.tier} (max ${(weightLossPlan.safe_max_weekly_pct * 100).toFixed(1)}%/week, ≈ ${weightLossPlan.safe_max_weekly_lbs} lbs/week at current weight)`,
    );
    modifierLines.push(
      `- realistic_weeks: ${weightLossPlan.realistic_weeks}${
        weightLossPlan.was_timeline_extended
          ? ` (auto-extended from ${weightLossPlan.weeks_requested} — requested rate exceeded the safe-rate cap)`
          : ' (matches user request)'
      }`,
    );
    modifierLines.push(
      `- projected_loss_range_lbs: ${weightLossPlan.projected_loss_low_lbs}–${weightLossPlan.projected_loss_high_lbs} lbs over ${weightLossPlan.realistic_weeks} weeks`,
    );
    modifierLines.push(
      `- daily_deficit_kcal: ${weightLossPlan.daily_deficit_kcal}`,
    );
  } else {
    modifierLines.push(
      '- goal_weight_lbs: not set (qualitative-only path; use the flat -500 deficit calorie_target above)',
    );
  }

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
- What they have tried: ${
    assessment.what_tried.length > 0
      ? assessment.what_tried
          .map((w) => NUTRITION_WHAT_TRIED_LABEL[w])
          .join('; ')
      : 'not specified'
  }
- Fasting protocol: ${FASTING_PROTOCOL_LABEL[assessment.fasting_protocol]}
- Alcohol use: ${ALCOHOL_USE_LABEL[assessment.alcohol_use]}
- Cannabis use: ${CANNABIS_USE_LABEL[assessment.cannabis_use]}
- Cheat-day pattern: ${assessment.cheat_day_pattern ? CHEAT_DAY_PATTERN_LABEL[assessment.cheat_day_pattern] : 'not set'}

What the user said they want:
${assessment.nutrition_goal_text ? `"${assessment.nutrition_goal_text}"` : '(nothing volunteered)'}
--- END ASSESSMENT ---

--- MODIFIERS ---
${modifierLines.join('\n')}
--- END MODIFIERS ---

Write the four-section nutrition / body-comp plan now. 280 words maximum. Use the exact H2 headings specified in the system prompt. Lead "The next move" with the calorie target + macro grams when they're available — these numbers are the load-bearing piece. Apply the eating-disorder-adjacency safeguard if triggered. Apply the alcohol_use, cannabis_use, fasting_protocol, and food picker rules when they apply. Do not narrate the modifiers back to the user — let them shape what you emphasize.`;
}
