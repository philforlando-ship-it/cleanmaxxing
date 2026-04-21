/**
 * Monthly checkpoint service (spec §2.5 stickiness 5b).
 *
 * On day 30+, surface a one-shot card on the Today screen showing:
 *   - confidence delta (first reflection vs latest) with behavioral copy
 *   - goal completion rate across the lifetime of check-ins
 *   - 3 fresh goal suggestions the user hasn't tried yet
 *
 * Dismissal is persisted via `survey_responses` as a KV entry (key:
 * `monthly_checkpoint_dismissed_at`) so the card doesn't reappear. This
 * avoids a migration for one boolean — move to a real column once the
 * motivation_segment migration batch lands.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  rankCandidates,
  pickTopN,
  type PovDocRow,
  type SuggestedGoal,
  type MotivationSegment,
} from '@/lib/onboarding/goal-suggest';
import type { AgeSegment } from '@/lib/onboarding/types';
import { averageConfidence } from '@/lib/weekly-reflection/service';
import { contextFor, deltaPhrase } from '@/lib/confidence/context';
import {
  buildGoalInsights,
  type GoalInsight,
  type ReflectionRow,
} from '@/lib/goals/goal-insights';

const DISMISS_KEY = 'monthly_checkpoint_dismissed_at';
const CHECKPOINT_DAY_THRESHOLD = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type CheckpointSummary = {
  days_since_start: number;
  confidence_from: number | null;
  confidence_to: number | null;
  confidence_from_label: string | null;
  confidence_to_label: string | null;
  delta_phrase: string | null;
  completion_rate: number | null; // 0–1, null when no check-ins yet
  total_goal_check_ins: number;
  completed_goal_check_ins: number;
  suggestions: SuggestedGoal[];
  // Per-goal alignment insights correlating goal-active duration with
  // the relevant confidence dimension's trend. Empty array when there
  // isn't enough data (< 4 reflections, or no goals with enough weeks
  // active). Capped internally at 5 to avoid card overload.
  goal_insights: GoalInsight[];
  // The specific_thing free-text from onboarding (or the quarterly
  // re-survey update when set). One month in is the right moment for a
  // mirror — "is this still the thing?" — so the card can surface it
  // as a reflection prompt. Null when the user skipped the question.
  specific_thing: string | null;
};

export type CheckpointState =
  | { status: 'not_eligible'; days_since_start: number }
  | { status: 'dismissed' }
  | { status: 'eligible'; summary: CheckpointSummary };

export async function getCheckpointState(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date()
): Promise<CheckpointState> {
  // Load user created_at, age segment, and motivation segment (nullable
  // until the 0005 migration has been applied).
  const { data: profile } = await supabase
    .from('users')
    .select('created_at, age_segment, motivation_segment')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) return { status: 'not_eligible', days_since_start: 0 };

  const createdAt = profile.created_at
    ? new Date(profile.created_at as string).getTime()
    : now.getTime();
  const daysSinceStart = Math.floor((now.getTime() - createdAt) / MS_PER_DAY);

  // Dev-only force flag: set CHECKPOINT_FORCE_ELIGIBLE=1 in .env.local to
  // render the card without waiting 30 real days. Gated on
  // NODE_ENV !== 'production' so it cannot leak into a real deployment.
  const forceEligible =
    process.env.NODE_ENV !== 'production' &&
    process.env.CHECKPOINT_FORCE_ELIGIBLE === '1';

  if (!forceEligible && daysSinceStart < CHECKPOINT_DAY_THRESHOLD) {
    return { status: 'not_eligible', days_since_start: daysSinceStart };
  }

  // Dismissal marker.
  const { data: dismissRow } = await supabase
    .from('survey_responses')
    .select('id')
    .eq('user_id', userId)
    .eq('question_key', DISMISS_KEY)
    .maybeSingle();
  if (dismissRow) return { status: 'dismissed' };

  // Confidence delta — earliest reflection vs latest.
  const { data: reflections } = await supabase
    .from('weekly_reflections')
    .select(
      'week_start, social_confidence, work_confidence, physical_confidence, appearance_confidence'
    )
    .eq('user_id', userId)
    .order('week_start', { ascending: true });

  let confidenceFrom: number | null = null;
  let confidenceTo: number | null = null;
  let deltaCopy: string | null = null;
  const refRows = reflections ?? [];
  if (refRows.length > 0) {
    const first = refRows[0];
    const last = refRows[refRows.length - 1];
    confidenceFrom = Number(averageConfidence(first as never).toFixed(2));
    confidenceTo = Number(averageConfidence(last as never).toFixed(2));
    deltaCopy = deltaPhrase(confidenceFrom, confidenceTo);
  }

  // Goal completion rate — lifetime across all goal_check_ins visible to
  // this user via RLS (goal_check_ins RLS joins through check_ins.user_id).
  const { data: goalCheckIns } = await supabase
    .from('goal_check_ins')
    .select('completed');
  const totalChecks = goalCheckIns?.length ?? 0;
  const completedChecks = (goalCheckIns ?? []).filter(
    (r) => r.completed === true
  ).length;
  const completionRate = totalChecks > 0 ? completedChecks / totalChecks : null;

  // Fresh suggestions — rank everything, then filter out slugs the user
  // has already touched (active, completed, or abandoned).
  let suggestions: SuggestedGoal[] = [];
  if (profile.age_segment) {
    const { data: focusRow } = await supabase
      .from('survey_responses')
      .select('response_value')
      .eq('user_id', userId)
      .eq('question_key', 'focus_areas')
      .maybeSingle();

    let focusAreas: string[] = [];
    if (focusRow?.response_value) {
      try {
        const parsed = JSON.parse(focusRow.response_value as string);
        if (Array.isArray(parsed)) focusAreas = parsed;
      } catch {
        // ignore
      }
    }

    const { data: povRows } = await supabase
      .from('pov_docs')
      .select('slug, title, category, priority_tier, age_segments');

    const { data: touchedGoals } = await supabase
      .from('goals')
      .select('source_slug')
      .eq('user_id', userId);
    const touchedSlugs = new Set(
      (touchedGoals ?? [])
        .map((g) => g.source_slug as string | null)
        .filter((s): s is string => Boolean(s))
    );

    const ranked = rankCandidates({
      povDocs: (povRows ?? []) as PovDocRow[],
      ageSegment: profile.age_segment as AgeSegment,
      focusAreas,
      motivationSegment:
        ((profile as Record<string, unknown>).motivation_segment as MotivationSegment) ?? null,
    });
    const fresh = ranked.filter((g) => !touchedSlugs.has(g.source_slug));
    suggestions = pickTopN(fresh, 3);
  }

  // Goal-alignment insights. Pull the user's active goals and
  // correlate each against the relevant confidence dimension over its
  // active window. Uses the same reflection rows already loaded above.
  const { data: activeGoalsRaw } = await supabase
    .from('goals')
    .select('id, title, source_slug, created_at')
    .eq('user_id', userId)
    .eq('status', 'active');
  const activeGoals = (activeGoalsRaw ?? []).map((g) => ({
    id: g.id as string,
    title: g.title as string,
    source_slug: (g.source_slug as string | null) ?? null,
    created_at: g.created_at as string,
  }));
  const goalInsights = buildGoalInsights(
    activeGoals,
    refRows as ReflectionRow[],
    now,
  );

  // Specific-thing lookup — quarterly answer wins over onboarding answer
  // so a user who updated their framing at day 90 sees the current text,
  // not the stale one.
  const { data: specificRows } = await supabase
    .from('survey_responses')
    .select('question_key, response_value')
    .eq('user_id', userId)
    .in('question_key', ['specific_thing', 'specific_thing_q1']);
  const specificByKey = new Map<string, string>();
  for (const row of specificRows ?? []) {
    const r = row as { question_key: string; response_value: string | null };
    if (r.response_value) specificByKey.set(r.question_key, r.response_value);
  }
  const specificThing =
    specificByKey.get('specific_thing_q1') ??
    specificByKey.get('specific_thing') ??
    null;

  const summary: CheckpointSummary = {
    days_since_start: daysSinceStart,
    confidence_from: confidenceFrom,
    confidence_to: confidenceTo,
    confidence_from_label:
      confidenceFrom !== null ? contextFor(confidenceFrom).label : null,
    confidence_to_label:
      confidenceTo !== null ? contextFor(confidenceTo).label : null,
    delta_phrase: deltaCopy,
    completion_rate: completionRate,
    total_goal_check_ins: totalChecks,
    completed_goal_check_ins: completedChecks,
    suggestions,
    goal_insights: goalInsights,
    specific_thing: specificThing,
  };

  return { status: 'eligible', summary };
}

export async function dismissCheckpoint(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date()
): Promise<void> {
  await supabase.from('survey_responses').insert({
    user_id: userId,
    question_key: DISMISS_KEY,
    response_value: now.toISOString(),
  });
}
