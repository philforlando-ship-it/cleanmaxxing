/**
 * Quarterly re-survey service (day-90 refocus).
 *
 * Three-month is long enough that the onboarding answers (focus areas,
 * motivation segment, the "one specific thing" text) may no longer
 * describe the user's reality. This surface re-asks those three
 * variables, persists the updated answers to `survey_responses` with a
 * version-suffixed key so the originals stay intact for historical
 * ranker audits, and returns fresh ranker suggestions using the new
 * inputs.
 *
 * Storage: answers go into `survey_responses` as KV rows keyed by
 * `focus_areas_q1`, `motivation_segment_q1`, `specific_thing_q1`. A
 * fourth row `quarterly_survey_q1_completed_at` acts as the "done"
 * marker — same pattern the monthly checkpoint uses for its dismissal
 * state. Avoids a migration for a one-shot feature.
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

const QUARTERLY_DAY_THRESHOLD = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const QUARTERLY_KEYS = {
  focusAreas: 'focus_areas_q1',
  motivation: 'motivation_segment_q1',
  specificThing: 'specific_thing_q1',
  completedAt: 'quarterly_survey_q1_completed_at',
} as const;

export type QuarterlyAnswers = {
  focusAreas: string[];
  motivationSegment: string;
  specificThing: string | null;
};

export type QuarterlySurveyPrior = {
  focusAreas: string[];
  motivationSegment: string | null;
  specificThing: string | null;
};

export type QuarterlySurveyState =
  | { status: 'not_eligible'; days_since_start: number }
  | { status: 'completed' }
  | { status: 'eligible'; prior: QuarterlySurveyPrior };

export async function getQuarterlySurveyState(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<QuarterlySurveyState> {
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

  // Dev-only fast-forward, matching the monthly-checkpoint pattern.
  const forceEligible =
    process.env.NODE_ENV !== 'production' &&
    process.env.QUARTERLY_SURVEY_FORCE_ELIGIBLE === '1';

  if (!forceEligible && daysSinceStart < QUARTERLY_DAY_THRESHOLD) {
    return { status: 'not_eligible', days_since_start: daysSinceStart };
  }

  // Already completed?
  const { data: doneRow } = await supabase
    .from('survey_responses')
    .select('id')
    .eq('user_id', userId)
    .eq('question_key', QUARTERLY_KEYS.completedAt)
    .maybeSingle();
  if (doneRow) return { status: 'completed' };

  // Pull original onboarding answers so the card can preselect what the
  // user said before — makes re-answering a 30-second tweak rather than
  // a blank-slate re-survey.
  const priorKeys = ['focus_areas', 'motivation_segment', 'specific_thing'];
  const { data: priorRows } = await supabase
    .from('survey_responses')
    .select('question_key, response_value')
    .eq('user_id', userId)
    .in('question_key', priorKeys);

  const priorByKey = new Map<string, string>();
  for (const row of priorRows ?? []) {
    const r = row as { question_key: string; response_value: string | null };
    if (r.response_value !== null) priorByKey.set(r.question_key, r.response_value);
  }

  let focusAreas: string[] = [];
  const focusRaw = priorByKey.get('focus_areas');
  if (focusRaw) {
    try {
      const parsed = JSON.parse(focusRaw);
      if (Array.isArray(parsed)) focusAreas = parsed;
    } catch {
      // ignore
    }
  }

  return {
    status: 'eligible',
    prior: {
      focusAreas,
      motivationSegment: priorByKey.get('motivation_segment') ?? null,
      specificThing: priorByKey.get('specific_thing') ?? null,
    },
  };
}

/**
 * Persist the quarterly-survey answers and return fresh ranker
 * suggestions based on the updated inputs. Suggestions are filtered to
 * exclude slugs the user has already accepted, completed, or
 * abandoned — the surface is for new directions, not re-proposing the
 * same slugs.
 */
export async function saveQuarterlySurvey(
  supabase: SupabaseClient,
  userId: string,
  answers: QuarterlyAnswers,
  now: Date = new Date(),
): Promise<{ suggestions: SuggestedGoal[] }> {
  // survey_responses has no unique constraint on (user_id, question_key)
  // in the 0001 schema, so we follow the same delete-then-insert pattern
  // the onboarding answer endpoint uses rather than crafting an upsert
  // against a missing conflict target.
  const quarterlyKeys = [
    QUARTERLY_KEYS.focusAreas,
    QUARTERLY_KEYS.motivation,
    QUARTERLY_KEYS.specificThing,
    QUARTERLY_KEYS.completedAt,
  ];
  const { error: delError } = await supabase
    .from('survey_responses')
    .delete()
    .eq('user_id', userId)
    .in('question_key', quarterlyKeys);
  if (delError) throw delError;

  const rows = [
    {
      user_id: userId,
      question_key: QUARTERLY_KEYS.focusAreas,
      response_value: JSON.stringify(answers.focusAreas),
    },
    {
      user_id: userId,
      question_key: QUARTERLY_KEYS.motivation,
      response_value: answers.motivationSegment,
    },
    {
      user_id: userId,
      question_key: QUARTERLY_KEYS.specificThing,
      response_value: answers.specificThing,
    },
    {
      user_id: userId,
      question_key: QUARTERLY_KEYS.completedAt,
      response_value: now.toISOString(),
    },
  ];
  const { error: insError } = await supabase.from('survey_responses').insert(rows);
  if (insError) throw insError;

  // Run the ranker with the updated inputs. Age segment is stable; we
  // read it from the users table rather than re-asking.
  const { data: profile } = await supabase
    .from('users')
    .select('age_segment')
    .eq('id', userId)
    .maybeSingle();
  if (!profile?.age_segment) return { suggestions: [] };

  const { data: povRows } = await supabase
    .from('pov_docs')
    .select('slug, title, category, priority_tier, age_segments');

  const { data: touchedGoals } = await supabase
    .from('goals')
    .select('source_slug')
    .eq('user_id', userId);
  const touched = new Set(
    (touchedGoals ?? [])
      .map((g) => g.source_slug as string | null)
      .filter((s): s is string => Boolean(s)),
  );

  const ranked = rankCandidates({
    povDocs: (povRows ?? []) as PovDocRow[],
    ageSegment: profile.age_segment as AgeSegment,
    focusAreas: answers.focusAreas,
    motivationSegment: answers.motivationSegment as MotivationSegment,
  });
  const fresh = ranked.filter((g) => !touched.has(g.source_slug));
  return { suggestions: pickTopN(fresh, 3) };
}
