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
import { getSleepState } from '@/lib/sleep/service';
import { getWorkoutState } from '@/lib/workout/service';
import { FIRST_CONVO_KEYS } from '@/lib/first-convo/service';

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

  // Recent sleep, rolled up over the last N logged nights (max 7).
  // Distinct from profile.avg_sleep_hours, which is a one-time
  // self-report. When sleepRecentCount is 0, the prompt-side
  // renderer falls back to the profile field; when ≥ 1, the
  // tracker data takes precedence because it reflects what the
  // user is actually sleeping right now.
  sleepRecentAvgHours: number | null;
  sleepRecentAvgQuality: number | null;
  sleepRecentCount: number;

  // Workout-tracker rollups for the last 7 days. Nullable shape
  // when the user hasn't logged any sessions yet — Mister P
  // treats absence as "no signal" rather than "trained zero
  // times" (avoids the prompt narrating "you haven't worked out"
  // when the user just hasn't been logging).
  workoutCountLast7: number;
  workoutTypesLast7: Partial<
    Record<'strength' | 'cardio' | 'mobility' | 'other', number>
  >;
  workoutMostRecentDate: string | null;

  // First-conversation captures, written by the scripted /today
  // exchange that fires once after onboarding. These are deeper
  // free-text signal than the structured survey can reach: what
  // the user identifies as their actual blocker (time, money,
  // energy) and what they've tried before that didn't stick. Both
  // null when the user hasn't completed the exchange yet.
  firstConvoBlockers: string | null;
  firstConvoTriedBefore: string | null;

  // Storage path for the user's baseline face photo (if uploaded).
  // The chat route uses this to optionally attach the photo as an
  // image content part on each turn so Mister P can reference visible
  // features when relevant. Null when the user hasn't captured a
  // baseline yet — Mister P falls back to text-only behavior.
  baselineFacePhotoPath: string | null;

  // Most-recent face progress photo (30d / 90d / 180d, whichever is
  // newest). When present, lets Mister P answer body-comp + facial-
  // change questions with two-shot comparison context (baseline +
  // most-recent). Null when no progress photos captured yet.
  latestFaceProgressPhotoPath: string | null;
  latestFaceProgressSlot: 'progress_30d' | 'progress_90d' | 'progress_180d' | null;

  // Most-recent body progress photo (front angle preferred, any
  // category=body row). When chat is body-comp-related, gives Mister
  // P visual context the baseline-face + hair photos don't carry.
  latestBodyProgressPhotoPath: string | null;

  // Most-recent fit (clothed outfit) photo. Distinct from body
  // photos — fit is for chat-mediated outfit / fit troubleshooting
  // (sleeves, shoulders, taper, proportions), not body-comp tracking.
  // Null when the user hasn't uploaded any fit photos yet.
  latestFitPhotoPath: string | null;

  // Storage path for the anchor photo from the user's most recent
  // COMPLETED hair session (front for hair track, top_down for bald
  // track). One image per chat turn — adding all 5 hair angles would
  // 5x the input-token cost. Anchor angle is sufficient for most
  // visible-feature questions; the user can ask about other angles
  // through /plan/hair/photos directly.
  latestHairAnchorPhotoPath: string | null;
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
      FIRST_CONVO_KEYS.blockers,
      FIRST_CONVO_KEYS.triedBefore,
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
  const firstConvoBlockers = byKey.get(FIRST_CONVO_KEYS.blockers) ?? null;
  const firstConvoTriedBefore = byKey.get(FIRST_CONVO_KEYS.triedBefore) ?? null;

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
  const sleepState = await getSleepState(supabase, userId);
  const workoutState = await getWorkoutState(supabase, userId, now);

  // Baseline face photo lookup. Filtered to (slot=baseline, angle=front,
  // category=face) — that's the canonical headshot the user captured at
  // onboarding. Side / close angles aren't included; the chat doesn't
  // need them and keeping the payload to one image keeps cost predictable.
  const { data: baselinePhotoRow } = await supabase
    .from('progress_photos')
    .select('storage_path')
    .eq('user_id', userId)
    .eq('slot', 'baseline')
    .eq('angle', 'front')
    .eq('category', 'face')
    .maybeSingle();
  const baselineFacePhotoPath =
    (baselinePhotoRow as { storage_path: string } | null)?.storage_path ??
    null;

  // Most-recent face progress photo (30d / 90d / 180d). One query;
  // we resolve "newest" client-side since the progression slots are
  // fixed and Postgres ORDER BY on a custom enum priority is overkill.
  const { data: faceProgressRows } = await supabase
    .from('progress_photos')
    .select('slot, storage_path, captured_at')
    .eq('user_id', userId)
    .eq('angle', 'front')
    .eq('category', 'face')
    .in('slot', ['progress_30d', 'progress_90d', 'progress_180d']);
  const faceProgress = (faceProgressRows ?? []) as Array<{
    slot: 'progress_30d' | 'progress_90d' | 'progress_180d';
    storage_path: string;
    captured_at: string;
  }>;
  const newestFaceProgress =
    faceProgress.length > 0
      ? faceProgress.reduce((acc, p) =>
          p.captured_at > acc.captured_at ? p : acc,
        )
      : null;
  const latestFaceProgressPhotoPath =
    newestFaceProgress?.storage_path ?? null;
  const latestFaceProgressSlot = newestFaceProgress?.slot ?? null;

  // Most-recent body photo. category='body', any slot, prefer 'front'
  // angle. Lightweight lookup — the body-comp question pattern is
  // strong enough to justify the second photo column.
  //
  // POLICY NOTE (2026-05-07): migration 0030's original comment said
  // body photos are "never sent to any AI." That rule was written
  // when the only AI consumer was the scoring-adjacent
  // facial-analysis route. The policy is now nuanced:
  //
  //   - Body photos ARE allowed on the Mister P chat surface, where
  //     the prompt's anti-attractiveness / anti-ranking rules and
  //     "alpha"-framing refusals govern behavior. Chat asks like
  //     "am I leaner than my baseline?" are a legitimate use case.
  //
  //   - Body photos remain HARD-excluded from any scoring-style
  //     analysis route. The facial-analysis route at
  //     app/api/facial-analysis/analyze/route.ts still filters
  //     strictly to category='face' on the photo lookup — that
  //     hard-filter is the load-bearing exclusion.
  //
  // This lookup feeds Mister P chat only. Don't reuse it for any
  // future scoring-adjacent surface without revisiting the policy.
  const { data: bodyRows } = await supabase
    .from('progress_photos')
    .select('storage_path, captured_at, angle')
    .eq('user_id', userId)
    .eq('category', 'body')
    .order('captured_at', { ascending: false })
    .limit(5);
  const bodyPhotos = (bodyRows ?? []) as Array<{
    storage_path: string;
    captured_at: string;
    angle: string;
  }>;
  const latestBodyProgressPhotoPath =
    bodyPhotos.find((b) => b.angle === 'front')?.storage_path ??
    bodyPhotos[0]?.storage_path ??
    null;

  // Most-recent fit (outfit) photo. Chat-only context for fit
  // troubleshooting; never sent to the scoring-style facial-analysis
  // route (that path hard-filters to category='face'). One photo
  // per turn keeps token cost predictable; users with multiple fit
  // photos can ask Mister P about a specific one verbally and the
  // most recent will be in scope.
  const { data: fitRows } = await supabase
    .from('progress_photos')
    .select('storage_path, captured_at')
    .eq('user_id', userId)
    .eq('category', 'fit')
    .order('captured_at', { ascending: false })
    .limit(1);
  const latestFitPhotoPath =
    (fitRows ?? [])[0]?.storage_path ?? null;

  // Latest completed hair session anchor photo (front for hair track,
  // top_down for bald track). One query joins the most recent
  // completed session to its anchor angle photo. We try 'front' first
  // and fall back to 'top_down' if the user is on the bald track.
  let latestHairAnchorPhotoPath: string | null = null;
  const { data: latestSessionRow } = await supabase
    .from('hair_photo_sessions')
    .select('id')
    .eq('user_id', userId)
    .not('completed_at', 'is', null)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const latestSessionId =
    (latestSessionRow as { id: string } | null)?.id ?? null;
  if (latestSessionId) {
    const { data: anchorRow } = await supabase
      .from('hair_photos')
      .select('storage_path, angle')
      .eq('user_id', userId)
      .eq('session_id', latestSessionId)
      .in('angle', ['front', 'top_down']);
    const anchors = (anchorRow ?? []) as Array<{
      storage_path: string;
      angle: string;
    }>;
    // Prefer 'front' over 'top_down' when both exist (the hair track is
    // the more common case).
    const front = anchors.find((a) => a.angle === 'front');
    const top = anchors.find((a) => a.angle === 'top_down');
    latestHairAnchorPhotoPath = front?.storage_path ?? top?.storage_path ?? null;
  }

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
    sleepRecentAvgHours: sleepState.rollingAvgHours,
    sleepRecentAvgQuality: sleepState.rollingAvgQuality,
    sleepRecentCount: sleepState.rollingCount,
    workoutCountLast7: workoutState.countLast7,
    workoutTypesLast7: workoutState.countLast7ByType,
    workoutMostRecentDate: workoutState.mostRecentDate,
    firstConvoBlockers,
    firstConvoTriedBefore,
    baselineFacePhotoPath,
    latestFaceProgressPhotoPath,
    latestFaceProgressSlot,
    latestBodyProgressPhotoPath,
    latestFitPhotoPath,
    latestHairAnchorPhotoPath,
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
