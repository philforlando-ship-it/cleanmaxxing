/**
 * Monthly checkpoint service.
 *
 * On day 30+, surface a one-shot card on /reflection showing:
 *   - days since onboarding
 *   - confidence delta (first reflection vs latest) with behavioral copy
 *   - specific_thing reflection prompt
 *
 * Dismissal persists via `survey_responses` as a KV entry (key:
 * `monthly_checkpoint_dismissed_at`) so the card doesn't reappear.
 *
 * Goals-era content (completion rate, suggested adds, per-goal
 * insights) retired in Sub-ship B (2026-05-10) once the legacy v1
 * user population was wiped. The card is now a slim month-in
 * reflection sitting between the weekly cadence and the quarterly
 * survey.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { averageConfidence } from '@/lib/weekly-reflection/service';
import { contextFor, deltaPhrase } from '@/lib/confidence/context';

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
  const { data: profile } = await supabase
    .from('users')
    .select('created_at')
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
