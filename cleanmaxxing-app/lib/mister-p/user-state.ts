/**
 * Per-user behavioral state for Mister P's prompt.
 *
 * The app collects a lot of signal (check-in cadence, confidence
 * trajectory, stuck-low dimensions, the specific-thing text the user
 * wrote at onboarding or quarterly re-survey) that historically never
 * reached Mister P. This helper pulls the fast, recent-state snapshot
 * into a structured object the prompt layer can render.
 *
 * Intentionally NOT included here: per-goal check-in counts, monthly
 * checkpoint status, or anything that would make the prompt long.
 * Mister P should have enough state to calibrate substance — not
 * enough to narrate it back to the user.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { getUserProfile, type UserProfile } from '@/lib/profile/service';

export type ConfidenceTrend = 'rising' | 'flat' | 'declining';

export type ConfidenceSnapshot = {
  social: { value: number; trend: ConfidenceTrend | null };
  work: { value: number; trend: ConfidenceTrend | null };
  physical: { value: number; trend: ConfidenceTrend | null };
  appearance: { value: number; trend: ConfidenceTrend | null };
};

export type MisterPUserState = {
  // Free-text capture from the onboarding `specific_thing` question OR
  // the quarterly re-survey update. Quarterly takes precedence when set.
  specificThing: string | null;

  // Rough tenure signal so Mister P can calibrate "how deep to go."
  daysSinceOnboarding: number;

  // Share of possible goal-tick slots ticked over the last 7 days.
  // Null when there are no active goals or the user is < 2 days old.
  weeklyCompletionRate: number | null;

  // Per-dimension latest reflection value + direction vs. the prior
  // reflection. Null when there are no reflections yet.
  confidence: ConfidenceSnapshot | null;

  // Dimensions that have been < 4 across each of the last 3 reflections.
  // Matches the stuck-signal detector used on /today so surfaces stay in
  // sync. Empty when no dimension qualifies or < 3 reflections exist.
  stuckDimensions: string[];

  // Onboarding self-report. Age is required at onboarding so it's
  // always populated; height and weight are optional and frequently
  // null. Mister P uses these to ground answers that depend on body
  // size (calorie targets, protein grams, dose-by-bodyweight content)
  // — and to know when to ask the user for the missing piece rather
  // than answering with a generic placeholder.
  age: number | null;
  heightInches: number | null;
  weightLbs: number | null;

  // /profile self-report. All fields nullable — the user fills in
  // whatever they're comfortable sharing. Mister P treats absent
  // fields as "don't know," not "default to X."
  profile: UserProfile;
};

const MS_PER_DAY = 86_400_000;
const DIMS = [
  'social_confidence',
  'work_confidence',
  'physical_confidence',
  'appearance_confidence',
] as const;

type DimKey = typeof DIMS[number];

function trendBetween(latest: number, prior: number | null): ConfidenceTrend | null {
  if (prior === null) return null;
  if (latest > prior + 0.5) return 'rising';
  if (latest < prior - 0.5) return 'declining';
  return 'flat';
}

export async function getMisterPUserState(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<MisterPUserState> {
  // Survey responses: specific-thing (quarterly wins over onboarding),
  // plus the optional body-size questions from onboarding. All four
  // come from the same table; one query covers them all.
  const { data: specificRows } = await supabase
    .from('survey_responses')
    .select('question_key, response_value')
    .eq('user_id', userId)
    .in('question_key', [
      'specific_thing',
      'specific_thing_q1',
      'height_inches',
      'weight_lbs',
    ]);
  const byKey = new Map<string, string>();
  for (const row of specificRows ?? []) {
    const r = row as { question_key: string; response_value: string | null };
    if (r.response_value) byKey.set(r.question_key, r.response_value);
  }
  const specificThing =
    byKey.get('specific_thing_q1') ?? byKey.get('specific_thing') ?? null;

  function asPositiveInt(raw: string | undefined): number | null {
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const heightInches = asPositiveInt(byKey.get('height_inches'));
  const weightLbs = asPositiveInt(byKey.get('weight_lbs'));

  // Tenure + age.
  const { data: userRow } = await supabase
    .from('users')
    .select('created_at, age')
    .eq('id', userId)
    .maybeSingle();
  const createdAtMs = userRow?.created_at
    ? new Date(userRow.created_at as string).getTime()
    : now.getTime();
  const daysSinceOnboarding = Math.max(
    0,
    Math.floor((now.getTime() - createdAtMs) / MS_PER_DAY),
  );
  const age =
    userRow?.age != null && Number.isFinite(Number(userRow.age))
      ? Number(userRow.age)
      : null;

  // Weekly completion rate — share of tickable slots actually ticked
  // across all active goals in the last 7 days. Mirrors
  // getWeeklyCheckInSummary's semantics without importing it to keep
  // this helper self-contained.
  const weeklyCompletionRate = await computeWeeklyCompletion(supabase, userId, now);

  // Confidence snapshot — latest reflection plus direction vs. prior.
  // Pull 3 rows so we can both reason about trend and identify stuck
  // dimensions in one query.
  const { data: refRowsRaw } = await supabase
    .from('weekly_reflections')
    .select(
      'social_confidence, work_confidence, physical_confidence, appearance_confidence, week_start',
    )
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(3);
  const refRows = (refRowsRaw ?? []) as Array<Record<DimKey, number> & { week_start: string }>;

  let confidence: ConfidenceSnapshot | null = null;
  if (refRows.length > 0) {
    const latest = refRows[0];
    const prior = refRows[1] ?? null;
    confidence = {
      social: {
        value: latest.social_confidence,
        trend: trendBetween(latest.social_confidence, prior?.social_confidence ?? null),
      },
      work: {
        value: latest.work_confidence,
        trend: trendBetween(latest.work_confidence, prior?.work_confidence ?? null),
      },
      physical: {
        value: latest.physical_confidence,
        trend: trendBetween(latest.physical_confidence, prior?.physical_confidence ?? null),
      },
      appearance: {
        value: latest.appearance_confidence,
        trend: trendBetween(latest.appearance_confidence, prior?.appearance_confidence ?? null),
      },
    };
  }

  // Stuck detection — identical threshold/window to the /today stuck
  // signal so the two surfaces never contradict each other.
  const stuckDimensions: string[] = [];
  if (refRows.length >= 3) {
    for (const dim of DIMS) {
      if (refRows.every((r) => r[dim] < 4)) {
        stuckDimensions.push(dim.replace('_confidence', ''));
      }
    }
  }

  const profile = await getUserProfile(supabase, userId);

  return {
    specificThing,
    daysSinceOnboarding,
    weeklyCompletionRate,
    confidence,
    stuckDimensions,
    age,
    heightInches,
    weightLbs,
    profile,
  };
}

async function computeWeeklyCompletion(
  supabase: SupabaseClient,
  userId: string,
  now: Date,
): Promise<number | null> {
  const endMs = now.getTime();
  const startObj = new Date(now);
  startObj.setDate(startObj.getDate() - 6);

  function dateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }
  const startDate = dateString(startObj);
  const endDate = dateString(now);

  const { data: goalRows } = await supabase
    .from('goals')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('status', 'active');
  const activeGoals = (goalRows ?? []) as Array<{ id: string; created_at: string }>;
  if (activeGoals.length === 0) return null;

  let possible = 0;
  for (const g of activeGoals) {
    const daysSince = Math.floor((endMs - new Date(g.created_at).getTime()) / MS_PER_DAY) + 1;
    possible += Math.max(0, Math.min(7, daysSince));
  }
  if (possible === 0) return null;

  const { data: checkInRows } = await supabase
    .from('check_ins')
    .select('id')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate);
  const checkInIds = (checkInRows ?? []).map((c) => c.id as string);
  if (checkInIds.length === 0) return 0;

  const { data: tickedRows } = await supabase
    .from('goal_check_ins')
    .select('id')
    .in('check_in_id', checkInIds)
    .in('goal_id', activeGoals.map((g) => g.id))
    .eq('completed', true);
  const ticked = (tickedRows ?? []).length;

  return Math.max(0, Math.min(1, ticked / possible));
}
