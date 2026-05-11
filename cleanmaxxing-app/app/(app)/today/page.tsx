import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DevResetButton } from './dev-reset-button';
import { MisterPChatCard, type ChatMessage } from './mister-p-chat-card';
import { FirstRunCard } from './first-run-card';
import { ProgressPhotoCard } from './progress-photo-card';
import { ProfileCompletionCard } from './profile-completion-card';
// Phase B (May 2026): plan-card imports removed — journey tiles now
// covered by the PrimaryActionCard. Phase C: log cards moved to
// /log; Pattern C cards (weekly letter, weekly reflection, monthly
// checkpoint, quarterly survey, self-acceptance nudge, stale goal,
// stuck confidence) moved to /reflection. Daily-note system
// retired 2026-05-09 — Phase E contextual prompts handle
// signal-based observations and Mister P chat handles open-ended
// touchpoints. Imports below are the residual set: event-driven
// daily-action tiles (hair routine / photo / sleep commitments /
// recovery check), onboarding cards, profile completion, weekly
// focus, Mister P chat surface.
import { HairRoutineCard } from './hair-routine-card';
import { HairPhotoDueCard } from './hair-photo-due-card';
import { FacialStructurePhotoCard } from './facial-structure-photo-card';
import { SleepCommitmentsCard } from './sleep-commitments-card';
import { RecoveryCheckCard } from './recovery-check-card';
import { SkincareSpfCard } from './skincare-spf-card';
import { FacialHairUpkeepCard } from './facial-hair-upkeep-card';
import {
  getYesterdayStrengthWorkout,
  hasFeedbackForWorkout,
} from '@/lib/strength/feedback';
import { getHairAssessment, getStage4State } from '@/lib/hair/service';
import { pickPrimaryAction } from '@/lib/today/primary-action-picker';
import { PrimaryActionCard } from './primary-action-card';
import { TodayClosureCard } from './today-closure-card';
import { EscapeHatch } from './escape-hatch';
import { detectAndRecordMilestones } from '@/lib/milestones/detect';
import { listRecentMilestones } from '@/lib/milestones/service';
import { syncJourneyStates } from '@/lib/journey-state/persist';
import { getWeeklyReflectionState } from '@/lib/weekly-reflection/service';
import { ProgressVisual } from './progress-visual';
import { selectContextualPrompt } from '@/lib/contextual-prompt/select';
import { ContextualPromptCard } from './contextual-prompt-card';
import { getPremiumStatus } from '@/lib/billing/is-premium';
import { hasSleepAssessment } from '@/lib/sleep/service';
import { hasStrengthAssessment } from '@/lib/strength/service';
import { hasSkincareAssessment } from '@/lib/skincare/service';
import { hasNutritionAssessment } from '@/lib/nutrition/service';
import { hasCardioAssessment } from '@/lib/cardio/service';
import { getStyleAssessment } from '@/lib/style/service';
import { JourneysGrid } from './journeys-grid';
import { sortJourneys } from '@/lib/today/journeys';
import { getSkincareLogState } from '@/lib/skincare/log-service';
import { getFacialHairAssessment } from '@/lib/facial-hair/service';
import { hasFacialStructureAssessment } from '@/lib/facial-structure/service';
import { getFacialHairGroomState } from '@/lib/facial-hair/groom-service';
import { getTodayCommitmentsState } from '@/lib/sleep/commitments';
import { daysUntilNext } from '@/lib/hair/stage-5-content';
import { getSleepState } from '@/lib/sleep/service';
import { getMisterPUserState } from '@/lib/mister-p/user-state';
// FirstConversationCard removed 2026-05-08 — the two open-ended
// questions ("what's been getting in the way" / "what didn't stick")
// produced low-quality prose intel that competed with the new
// PrimaryActionCard for user attention on /today, and the signal was
// largely redundant with structured onboarding fields. The card
// component, the /api/first-convo route, and lib/first-convo/service
// remain unrendered — kept around for ease of revert + so existing
// completed answers stay readable. Future cleanup ticket: delete the
// orphaned files once the change has settled.
import { appDayFor, daysBetweenAppDays, previousAppDayFor } from '@/lib/date/app-day';
import { getProfileCompletion } from '@/lib/profile/completion';

// Ninety-day progress-photo window. Matches the /profile page's
// PROGRESS_WINDOW_DAYS and the POVs' typical visible-change timeline.
const PROGRESS_WINDOW_DAYS = 90;

// Optional mid-point capture. Most interventions don't produce large
// visible change at 30 days, but the photo gives users a middle
// reference point before the 90-day window and surfaces a visible
// milestone during the span where first-month churn otherwise bites.
const MID_WINDOW_DAYS = 30;

// Six-month checkpoint. Slow-moving variables (hair regrowth, late
// aesthetic compounding, sustained recomp) only show their full
// effect at 180+ days; this is the photo that tells late-30s+ users
// whether their patient interventions are working.
const LATE_WINDOW_DAYS = 180;

// Pulled out of the component body so the impure Date.now() call is
// isolated to a single, explicit location. This is a server component
// running once per request, so the value is stable per-render — the
// purity lint warning doesn't reflect real instability here. Uses the
// user's app-day (3am-local cutoff) so first-run windows respect the
// same boundary as everything else on /today.
function computeIsFirstRun(
  onboardingCompletedAt: string,
  timezone: string,
): boolean {
  const onboardedDay = appDayFor(timezone, new Date(onboardingCompletedAt));
  const todayDay = appDayFor(timezone);
  const daysSince = daysBetweenAppDays(onboardedDay, todayDay);
  return daysSince >= 0 && daysSince < 7;
}

type Props = {
  searchParams: Promise<{ welcome?: string }>;
};

export default async function TodayPage({ searchParams }: Props) {
  await searchParams; // No-op — the only param we read here was
  // ?welcome=1 for the daily-check-in spotlight, which moved to
  // /log in Phase C. Awaiting still satisfies Next.js's
  // searchParams-must-be-awaited contract.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('onboarding_completed_at, tracking_paused_at, timezone, age')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.onboarding_completed_at) redirect('/onboarding');

  // Age threads into JourneysGrid for tier-aware sorting + display
  // (cardio's tier flips at 35+). Null when not on file; the helpers
  // fall back to the static configured tier in that case.
  const userAge = (profile.age as number | null | undefined) ?? null;

  const steppedAway = Boolean(profile.tracking_paused_at);
  const timezone =
    (profile.timezone as string | null) ?? 'America/New_York';

  // First-run window: seven days from onboarding completion. The card is
  // only mounted while the window is open; the client component then
  // decides whether to render based on localStorage dismissal.
  const isFirstRun = computeIsFirstRun(
    profile.onboarding_completed_at as string,
    timezone,
  );

  // Premium status is read up-front so it can gate the milestone
  // detector below as well as the contextual-prompt selector further
  // down. Pro-tier milestones (body-fat brackets, RHR trained-band,
  // protocol anniversaries, VO2max progression) only fire for Pro
  // users; free users still get the behavioral/state ones.
  const { isPremium: userIsPremium } = await getPremiumStatus(user.id);

  // Phase D: detect + record any new milestones BEFORE the
  // listRecentMilestones fetch below, so a freshly-fired
  // milestone shows up in the same render. Idempotent — the
  // unique (user_id, trigger_key) index prevents double-fires.
  // Wrapped to never throw; a milestone-detection failure must
  // not break /today.
  await detectAndRecordMilestones(supabase, user.id, userIsPremium).catch(
    (err) => {
      console.error('milestones_detect_failed', err);
    },
  );

  // Slice 1 of the maintenance reflection work (2026-05-11): sync
  // per-journey phase signal alongside milestones. Writes any
  // implementing -> maintaining transitions to journey_states and
  // fires the graduation milestone. Wrapped to never throw; a sync
  // failure must not break /today.
  await syncJourneyStates(supabase, user.id).catch((err) => {
    console.error('journey_states_sync_failed', err);
  });

  const [
    profileCompletion,
    sleepState,
    misterPUserState,
    reflectionState,
    recentMilestones,
    { data: photoRowsRaw },
    { data: healthIntegrationRow },
    { data: latestActivityRow },
    { data: weeklyActivityRows },
  ] = await Promise.all([
    getProfileCompletion(supabase, user.id),
    getSleepState(supabase, user.id),
    getMisterPUserState(supabase, user.id),
    getWeeklyReflectionState(supabase, user.id),
    listRecentMilestones(supabase, user.id),
    supabase
      .from('progress_photos')
      .select('slot, angle, category, storage_path')
      .eq('user_id', user.id),
    // Most-recent health integration row + most-recent activity row.
    // Drives the steps line on /today and the "hide manual sleep
    // prompt when Vital is fresh" logic below.
    supabase
      .from('health_integrations')
      .select('provider, last_synced_at')
      .eq('user_id', user.id)
      .order('connected_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Most recent daily_activity row. Pulls active calories alongside
    // steps so the daily readout can show both signals.
    supabase
      .from('daily_activity')
      .select('date, steps, active_calories, source')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Last 7 days of intensity minutes. Drives the weekly
    // moderate-or-vigorous metric (WHO 150-min/week target). Bounded
    // query — 7 rows max per user.
    supabase
      .from('daily_activity')
      .select('date, medium_minutes, high_minutes')
      .eq('user_id', user.id)
      .gte(
        'date',
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
      )
      .order('date', { ascending: false }),
  ]);
  // Hair + style plan tile gating. Pulls focus areas (single onboarding
  // survey row), the hair assessment (full row — used both for the
  // hair plan CTA and the Stage 4 / Stage 5 daily-tile derivations),
  // and the style assessment (lightweight has-state check, since the
  // style v0 doesn't have any /today daily tiles yet).
  const [
    { data: focusRow },
    hairAssessment,
    sleepAssessmentState,
    strengthAssessmentState,
    skincareAssessmentState,
    facialHairAssessment,
    // Added for the JourneysGrid (May 8 — all-journeys-on-/today).
    // Style + nutrition + cardio weren't fetched here previously
    // because their plan tiles came off /today in Phase B.
    styleAssessment,
    nutritionAssessmentState,
    cardioAssessmentState,
    facialStructureAssessmentState,
    { data: facialStructureCadenceRow },
  ] = await Promise.all([
    supabase
      .from('survey_responses')
      .select('response_value')
      .eq('user_id', user.id)
      .eq('question_key', 'focus_areas')
      .maybeSingle(),
    getHairAssessment(supabase, user.id),
    hasSleepAssessment(supabase, user.id),
    hasStrengthAssessment(supabase, user.id),
    hasSkincareAssessment(supabase, user.id),
    getFacialHairAssessment(supabase, user.id),
    getStyleAssessment(supabase, user.id),
    hasNutritionAssessment(supabase, user.id),
    hasCardioAssessment(supabase, user.id),
    hasFacialStructureAssessment(supabase, user.id),
    // Cadence read for the monthly photo tile. Only the three fields
    // the tile gates on — kept separate from hasFacialStructureAssessment
    // so the grid rollup stays a presence-only check.
    supabase
      .from('facial_structure_assessments')
      .select(
        'stage_1_acknowledged_at, last_facial_photo_logged_at, report_generated_at',
      )
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);
  // Focus-area flags remaining after Phase B cleanup. Style /
  // grooming / skin / body_composition flags were dropped because
  // their plan cards moved to the PrimaryActionCard's picker — those
  // focus areas are still honored, just by lib/today/primary-action-picker
  // rather than by per-card gates here.
  // Parse focus_areas once. Used both for the per-tile *IsFocus flags
  // (which gate event-driven daily tiles below) and the JourneysGrid
  // (which uses the full array for ordering — picked first, tier
  // tie-break).
  let focusAreasArray: string[] = [];
  if (focusRow?.response_value) {
    try {
      const parsed = JSON.parse(focusRow.response_value as string);
      if (Array.isArray(parsed)) {
        focusAreasArray = parsed.filter(
          (v): v is string => typeof v === 'string',
        );
      }
    } catch {
      // malformed survey value — leave focusAreasArray empty
    }
  }
  const hairIsFocus = focusAreasArray.includes('hair');
  const sleepIsFocus = focusAreasArray.includes('sleep');
  // The picker now writes 'strength' / 'cardio' as distinct values;
  // legacy users have 'fitness' which expands to both. The strength
  // recovery-feedback gate downstream only needs "did the user opt
  // into strength?" so collapse both signals into one flag.
  const fitnessIsFocus =
    focusAreasArray.includes('fitness') ||
    focusAreasArray.includes('strength') ||
    focusAreasArray.includes('cardio');
  // Skincare picker value is 'skincare' (current) or 'skin' (legacy).
  const skincareIsFocus =
    focusAreasArray.includes('skincare') || focusAreasArray.includes('skin');
  // Facial hair picker value is 'facial_hair' (current) or 'grooming' (legacy).
  const facialHairIsFocus =
    focusAreasArray.includes('facial_hair') ||
    focusAreasArray.includes('grooming');
  // Stage 4 state — only fetched when the user has an assessment AND
  // Stage 4 is started (so we don't run the daily-log count query for
  // every user every render). When in progress, drives the new daily
  // routine tile below.
  const hairStage4 =
    hairAssessment && hairAssessment.stage_4_started_at
      ? await getStage4State(
          supabase,
          user.id,
          hairAssessment,
          appDayFor(timezone),
        )
      : null;

  // Sleep commitments — only fetched when sleep is a focus area and
  // the user has a completed plan (no commitments before the report
  // exists). Cheap query; one read of active commitments + today's
  // logs joined client-side in the service.
  const sleepCommitmentsToday =
    sleepIsFocus && sleepAssessmentState.hasReport
      ? await getTodayCommitmentsState(
          supabase,
          user.id,
          appDayFor(timezone),
        )
      : [];

  // Skincare daily SPF — only fetched when skincare is in focus AND
  // the user has a finished report. Same pattern as sleep
  // commitments: focus-gated event-driven daily-action surface.
  const skincareLogState =
    skincareIsFocus && skincareAssessmentState.hasReport
      ? await getSkincareLogState(supabase, user.id, timezone)
      : null;

  // Facial-hair upkeep — focus-gated, requires a finished report
  // (we need time_commitment to set the cadence). The card itself
  // is overdue-gated inside the service via state.isDue.
  const facialHairGroomState =
    facialHairIsFocus &&
    facialHairAssessment !== null &&
    facialHairAssessment.report_text !== null
      ? await getFacialHairGroomState(
          supabase,
          user.id,
          facialHairAssessment.time_commitment,
        )
      : null;
  const showHairRoutineTile =
    hairIsFocus &&
    !steppedAway &&
    hairStage4 !== null &&
    hairStage4.isStarted &&
    !hairStage4.isComplete &&
    hairStage4.target !== null;

  // Stage 5 photo-due tile. Quiet between sessions — only renders when
  // the user is on the cadence AND a session is due (today or overdue),
  // OR they haven't taken their baseline yet. NOT a daily nag like Stage 4.
  const hairStage5Started =
    hairAssessment !== null &&
    hairAssessment.stage_5_started_at !== null &&
    hairAssessment.stage_5_cadence_days !== null;
  const hairStage5IsFirstSession =
    hairStage5Started && hairAssessment!.stage_5_session_count === 0;
  const hairStage5DaysUntil = hairStage5Started
    ? daysUntilNext(
        hairAssessment!.stage_5_last_session_at,
        hairAssessment!.stage_5_cadence_days!,
      )
    : null;
  const showHairPhotoDueTile =
    hairIsFocus &&
    !steppedAway &&
    hairStage5Started &&
    (hairStage5IsFirstSession ||
      (hairStage5DaysUntil !== null && hairStage5DaysUntil <= 0));

  // Facial-structure monthly photo cadence (Task 2 of facial-structure
  // post-Slice-3 work, 2026-05-11). Fires when:
  //   - report exists (assessment was generated)
  //   - Stage 1 acknowledged (user has explicitly engaged with the
  //     lever; before this, the photo cadence hasn't started)
  //   - last log is null (first session) OR >30 days ago
  const facialStructureCadence = (facialStructureCadenceRow as {
    stage_1_acknowledged_at: string | null;
    last_facial_photo_logged_at: string | null;
    report_generated_at: string | null;
  } | null) ?? null;
  const facialStructurePhotoIsFirstSession =
    facialStructureCadence !== null &&
    facialStructureCadence.report_generated_at !== null &&
    facialStructureCadence.stage_1_acknowledged_at !== null &&
    facialStructureCadence.last_facial_photo_logged_at === null;
  const facialStructurePhotoDaysSinceLast =
    facialStructureCadence?.last_facial_photo_logged_at
      ? Math.floor(
          (Date.now() -
            new Date(
              facialStructureCadence.last_facial_photo_logged_at,
            ).getTime()) /
            (24 * 60 * 60 * 1000),
        )
      : null;
  const showFacialStructurePhotoCard =
    !steppedAway &&
    facialStructureCadence !== null &&
    facialStructureCadence.report_generated_at !== null &&
    facialStructureCadence.stage_1_acknowledged_at !== null &&
    (facialStructurePhotoIsFirstSession ||
      (facialStructurePhotoDaysSinceLast !== null &&
        facialStructurePhotoDaysSinceLast >= 30));

  // C6 (hair analog): mint a signed URL for the latest hair-session
  // anchor when the photo-due tile will render AND a prior anchor
  // exists. First-session users have nothing to compare against, so
  // the thumbnail is skipped (the card shows "Baseline" framing).
  let priorHairAnchorSignedUrl: string | null = null;
  if (
    showHairPhotoDueTile &&
    !hairStage5IsFirstSession &&
    misterPUserState.latestHairAnchorPhotoPath
  ) {
    const { data: signed } = await supabase.storage
      .from('progress-photos')
      .createSignedUrl(
        misterPUserState.latestHairAnchorPhotoPath,
        60 * 60,
      );
    priorHairAnchorSignedUrl = signed?.signedUrl ?? null;
  }

  // Strength autoregulation morning-after recovery check. Surfaces
  // when the user trained strength yesterday AND no feedback row
  // has been written yet. Two queries (workout lookup + feedback
  // existence) are cheap and only run when fitness is in scope.
  const todayAppDay = appDayFor(timezone);
  const yesterdayAppDay = previousAppDayFor(timezone);
  const yesterdayStrengthWorkout =
    fitnessIsFocus && !steppedAway && strengthAssessmentState.hasReport
      ? await getYesterdayStrengthWorkout(supabase, user.id, yesterdayAppDay)
      : null;
  const recoveryCheckDone = yesterdayStrengthWorkout
    ? await hasFeedbackForWorkout(
        supabase,
        yesterdayStrengthWorkout.id,
        todayAppDay,
      )
    : false;
  const showRecoveryCheck =
    yesterdayStrengthWorkout !== null && !recoveryCheckDone;
  // Best-effort lift summary for the card header. workout_logs.lifts
  // is a free-form jsonb — we just collect names if present.
  const recoveryCheckLiftSummary = (() => {
    if (!yesterdayStrengthWorkout) return null;
    const lifts = yesterdayStrengthWorkout.lifts;
    if (!Array.isArray(lifts) || lifts.length === 0) return null;
    const names = lifts
      .map((l) =>
        typeof l === 'object' && l !== null && 'name' in l
          ? String((l as { name: unknown }).name)
          : null,
      )
      .filter((n): n is string => Boolean(n))
      .slice(0, 4);
    if (names.length === 0) return null;
    const more = lifts.length > names.length ? ` +${lifts.length - names.length} more` : '';
    return names.join(' · ') + more;
  })();

  // Note on health integration state: we used to suppress the
  // manual SleepLogCard when a Vital sync was "fresh" (synced in
  // last 24h). That hid sleep entirely from /today on days the
  // wearable hadn't pushed last-night's data yet. Now the
  // SleepLogCard renders unconditionally and adapts based on
  // whether sleep_logs has a row for last night — Vital-sourced
  // rows display values + "via [Provider]" tag; absent rows show
  // the manual form.

  const latestActivity = latestActivityRow as
    | {
        date: string;
        steps: number | null;
        active_calories: number | null;
        source: string;
      }
    | null;

  // Sum medium + high intensity minutes across the last 7 days.
  // WHO recommends 150 minutes of moderate-or-vigorous per week.
  // Null when no rows have any intensity data populated (older
  // wearables / old rows pre-migration 0033).
  type WeeklyActivityRow = {
    date: string;
    medium_minutes: number | null;
    high_minutes: number | null;
  };
  const weeklyRows = (weeklyActivityRows ?? []) as WeeklyActivityRow[];
  const weeklyHasIntensity = weeklyRows.some(
    (r) => r.medium_minutes != null || r.high_minutes != null,
  );
  const weeklyModerateOrVigorousMinutes: number | null = weeklyHasIntensity
    ? weeklyRows.reduce(
        (sum, r) => sum + (r.medium_minutes ?? 0) + (r.high_minutes ?? 0),
        0,
      )
    : null;
  const WEEKLY_TARGET_MINUTES = 150;

  // Date label for the activity line — "Today" / "Yesterday" / short
  // date, all relative to the user's IANA timezone. JS Date math
  // (.setDate / Date.now arithmetic) drops the timezone context;
  // Intl.DateTimeFormat with the IANA tz handles DST + offset edge
  // cases correctly.
  const ymdFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayYmd = ymdFmt.format(new Date());
  const yesterdayYmd = ymdFmt.format(new Date(Date.now() - 86_400_000));
  const activityDateLabel = (() => {
    if (!latestActivity) return '';
    if (latestActivity.date === todayYmd) return 'Today';
    if (latestActivity.date === yesterdayYmd) return 'Yesterday';
    // Plain YYYY-MM-DD parses as midnight UTC, which renders as the
    // previous day in tz west of UTC. Pin to noon UTC so the local
    // date is unambiguous.
    return new Date(`${latestActivity.date}T12:00:00Z`).toLocaleDateString(
      'en-US',
      { month: 'short', day: 'numeric', timeZone: timezone },
    );
  })();

  // Friendly provider label derived from the row's source. Manual
  // entries omit the source tag entirely.
  const ACTIVITY_PROVIDER_LABELS: Record<string, string> = {
    apple_health_kit: 'Apple Health',
    apple_health: 'Apple Health',
    google_fit: 'Google Fit',
    health_connect: 'Health Connect',
    fitbit: 'Fitbit',
    oura: 'Oura',
    whoop: 'Whoop',
    whoop_v2: 'Whoop',
    garmin: 'Garmin',
    strava: 'Strava',
    withings: 'Withings',
    polar: 'Polar',
    wahoo: 'Wahoo',
    ultrahuman: 'Ultrahuman',
  };
  const activitySourceLabel: string | null = (() => {
    if (!latestActivity) return null;
    const src = latestActivity.source.trim().toLowerCase();
    if (src === 'manual' || src === '') return null;
    if (ACTIVITY_PROVIDER_LABELS[src]) return ACTIVITY_PROVIDER_LABELS[src];
    return src
      .split(/[_\s]+/)
      .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
      .join(' ');
  })();

  // Hydrate every thread the chat-card picker can show: General
  // (journey_slug IS NULL AND goal_id IS NULL) + one per journey.
  // Per mig 0104 (2026-05-10), the picker is journey-scoped — the
  // legacy goal-scoped picker retired here, though legacy goal
  // threads are still readable on /goals/[id]. We load up to 50
  // pairs per thread without truncating message text, so the
  // visible UI matches exactly what the user wrote and Mister P
  // answered. The General-thread filter requires BOTH scope columns
  // to be null so legacy goal-scoped rows don't bleed into General.
  const journeyOrdering = sortJourneys(focusAreasArray, userAge);
  const journeySlugs = journeyOrdering.map((j) => j.slug);
  const { data: threadRowsRaw } = await supabase
    .from('mister_p_queries')
    .select('question, answer, journey_slug, goal_id, created_at')
    .eq('user_id', user.id)
    .or(
      `and(journey_slug.is.null,goal_id.is.null),journey_slug.in.(${journeySlugs.join(',')})`,
    )
    .order('created_at', { ascending: true });

  const GENERAL_KEY = '__general__';
  const initialThreads: Record<string, ChatMessage[]> = { [GENERAL_KEY]: [] };
  for (const slug of journeySlugs) initialThreads[slug] = [];
  for (const row of threadRowsRaw ?? []) {
    const r = row as {
      question: string;
      answer: string;
      journey_slug: string | null;
      goal_id: string | null;
    };
    // General thread: both scope columns null. Otherwise route by
    // journey_slug. Rows with only goal_id set (legacy goal-scoped
    // history) are skipped here — they remain accessible on
    // /goals/[id] but don't appear in /today's journey picker.
    let key: string | null = null;
    if (r.journey_slug && initialThreads[r.journey_slug]) {
      key = r.journey_slug;
    } else if (r.journey_slug === null && r.goal_id === null) {
      key = GENERAL_KEY;
    }
    if (!key) continue;
    initialThreads[key].push(
      { role: 'user', content: r.question },
      { role: 'assistant', content: r.answer },
    );
  }
  // Cap each thread's hydrated history at 50 pairs (100 messages) to
  // keep the initial payload modest. Recent messages take precedence.
  for (const key of Object.keys(initialThreads)) {
    const arr = initialThreads[key];
    if (arr.length > 100) initialThreads[key] = arr.slice(-100);
  }
  const chatJourneys = journeyOrdering.map((j) => ({
    slug: j.slug,
    label: j.label,
  }));

  // Progress photo surface decisions: which nudge (if any) fires on /today.
  // Card hides itself via localStorage dismissal — we only decide whether
  // to mount it based on server-side state.
  const photoSlots = new Set(
    (photoRowsRaw ?? []).map((r) => (r as { slot: string }).slot),
  );
  const hasBaseline = photoSlots.has('baseline');
  const hasProgress30d = photoSlots.has('progress_30d');
  const hasProgress90d = photoSlots.has('progress_90d');
  const hasProgress180d = photoSlots.has('progress_180d');
  const onboardedAt = new Date(profile.onboarding_completed_at as string);
  const daysSinceOnboarding = daysBetweenAppDays(
    appDayFor(timezone, onboardedAt),
    appDayFor(timezone),
  );
  const showBaselineNudge = !hasBaseline && isFirstRun;

  // C6: mint a signed URL for the user's front-face baseline so the
  // 30/90/180 nudges can show a thumbnail of what the user is
  // matching against. Skipped when no baseline (the baseline-variant
  // nudge doesn't render the thumbnail anyway). 1-hour TTL matches
  // the /photos page convention. The hair-anchor analog is minted
  // later, after showHairPhotoDueTile is computed.
  let baselineSignedUrl: string | null = null;
  if (hasBaseline) {
    const baselineRow = (photoRowsRaw ?? []).find((r) => {
      const row = r as {
        slot: string;
        angle: string;
        category: string;
        storage_path: string;
      };
      return (
        row.slot === 'baseline' &&
        row.angle === 'front' &&
        row.category === 'face'
      );
    }) as
      | {
          storage_path: string;
        }
      | undefined;
    if (baselineRow) {
      const { data: signed } = await supabase.storage
        .from('progress-photos')
        .createSignedUrl(baselineRow.storage_path, 60 * 60);
      baselineSignedUrl = signed?.signedUrl ?? null;
    }
  }
  // Hair anchor signed URL is minted later, after showHairPhotoDueTile
  // is computed — see below.
  // 30-day nudge window: open from day 30 until the 90-day nudge
  // takes over. Users who skip this still get the 90-day prompt on
  // schedule — the 30-day photo is optional scaffolding, not a gate.
  const show30dNudge =
    hasBaseline &&
    !hasProgress30d &&
    daysSinceOnboarding >= MID_WINDOW_DAYS &&
    daysSinceOnboarding < PROGRESS_WINDOW_DAYS;
  // 90-day nudge window: open from day 90 until the 180-day nudge
  // takes over so we don't double-prompt during the six-month window.
  const show90dNudge =
    hasBaseline &&
    !hasProgress90d &&
    daysSinceOnboarding >= PROGRESS_WINDOW_DAYS &&
    daysSinceOnboarding < LATE_WINDOW_DAYS;
  const show180dNudge =
    hasBaseline &&
    !hasProgress180d &&
    daysSinceOnboarding >= LATE_WINDOW_DAYS;

  // Mister P daily note — rules-based selection of one observation +
  // one question, cached per user per day. The day key uses the user's
  // app-day in their stored timezone (3am-local cutoff) so the same
  // boundary applies as the rest of /today.
  // Daily-note system retired 2026-05-09. Phase E contextual prompts
  // do the signal-based observation work that the daily-note rules
  // engine duplicated; Mister P chat handles open-ended touchpoints
  // organically. Forcing a daily observation when there was no real
  // signal produced fallback templates that diluted /today.

  // Hero priority resolver. Picks one surface to pin at the top so
  // hero / milestone / showUpStat / nutritionLoggedToday / pickHero
  // inputs removed in Phase B — they fed TodayHeroCard, which the
  // PrimaryActionCard supersedes. The milestone / continuity
  // surfaces will return as Area 3 (Phase D) with absolute /
  // self-comparison framing rather than the legacy shape.

  const isDev = process.env.NODE_ENV === 'development';

  // Phase A of the /today redesign — single primary action surfaced
  // above the existing tile waterfall. The picker runs its own data
  // fetch (some redundant with the above; acceptable for v1) so it
  // can be lifted to other surfaces unchanged.
  const primaryAction = await pickPrimaryAction(supabase, user.id);

  // Phase E — Area 2 contextual prompt. Returns null when no
  // prompt fires (empty Area 2 is better than filler). Takes
  // primaryAction.kind so prompts can suppress themselves when
  // they'd duplicate the Area 1 message.
  // I1 — premium status (read up-front above) gates the
  // cross_journey_dependency detector set inside
  // selectContextualPrompt. Free users get only the
  // cardio_cut_conflict teaser; Pro users get the full set. Also
  // passed to ContextualPromptCard so it can render the optional
  // "How cross-journey signals work" ceiling hint for free users.
  const contextualPrompt = await selectContextualPrompt(
    supabase,
    user.id,
    primaryAction.kind,
    todayAppDay,
    userIsPremium,
  );

  // Closure signal: render `TodayClosureCard` in place of the primary
  // action when (a) the picker has nothing pressing, (b) no contextual
  // prompt is firing, and (c) no event-driven daily tile would render.
  // Listens to existing self-suppression state on every gating tile —
  // no new check-off buttons. The "Done for today" affordance was
  // missing after the Phase A–F redesign retired the unified daily
  // check-in concept; this restores the closure signal habit-app
  // users expect.
  const hasUnresolvedDailyTile =
    !steppedAway &&
    (sleepCommitmentsToday.length > 0 ||
      Boolean(skincareLogState) ||
      Boolean(facialHairGroomState?.isDue && facialHairAssessment) ||
      Boolean(showRecoveryCheck && yesterdayStrengthWorkout) ||
      Boolean(
        showHairRoutineTile && hairStage4 && hairStage4.target !== null,
      ) ||
      showHairPhotoDueTile ||
      showFacialStructurePhotoCard ||
      show30dNudge ||
      show90dNudge ||
      show180dNudge ||
      showBaselineNudge ||
      isFirstRun);
  const isAllClear =
    !steppedAway &&
    primaryAction.kind === 'all_quiet' &&
    contextualPrompt === null &&
    !hasUnresolvedDailyTile;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Today&rsquo;s Check-in
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Your check-in for today. Log and Reflection are there when you
            need them.
          </p>
        </div>
        {isDev && <DevResetButton />}
      </div>

      <div className="mt-10 space-y-6">
        {isAllClear ? (
          <TodayClosureCard />
        ) : (
          <PrimaryActionCard action={primaryAction} />
        )}

        {/* Phase E — Area 2 contextual prompt. Renders zero or
            one prompt; null when nothing fires. Sits between Area
            1 and the rest so it stays in the natural reading flow
            without competing with Area 1 for attention. */}
        <ContextualPromptCard
          prompt={contextualPrompt}
          isPremium={userIsPremium}
        />

        {/* All-journeys grid (May 8 redesign). Surfaces every journey
            regardless of focus_areas; ordering is picked-first, with
            the Cleanmaxxing pyramid tier breaking ties. */}
        {!steppedAway && (
          <JourneysGrid
            focusAreas={focusAreasArray}
            age={userAge}
            assessments={{
              hair: {
                hasAssessment: hairAssessment !== null,
                hasReport: hairAssessment?.report_text != null,
              },
              style: {
                hasAssessment: styleAssessment !== null,
                hasReport: styleAssessment?.report_text != null,
              },
              body_composition: nutritionAssessmentState,
              strength: strengthAssessmentState,
              cardio: cardioAssessmentState,
              sleep: sleepAssessmentState,
              skincare: skincareAssessmentState,
              facial_hair: {
                hasAssessment: facialHairAssessment !== null,
                hasReport: facialHairAssessment?.report_text != null,
              },
              facial_structure: facialStructureAssessmentState,
              // Presentation has no assessment surface — the page is a
              // curated content hub. Mark always-ready so the tile
              // renders with the "Open" CTA instead of "Start" / "Resume".
              presentation: { hasAssessment: true, hasReport: true },
            }}
          />
        )}

        {isFirstRun && !steppedAway && <FirstRunCard />}

        {/* FirstConversationCard removed 2026-05-08 — see import-block
            comment up top. WeeklyLetterCard / SelfAcceptanceNudgeCard
            moved to /reflection in Phase C of the /today redesign. */}

        {!steppedAway && (
          <ProfileCompletionCard completion={profileCompletion} />
        )}

        {/* Plan-card render blocks removed in Phase B of the /today
            redesign. The PrimaryActionCard at the top now surfaces
            the right journey's next action; per-journey "open your
            plan" tiles are redundant. SleepCommitmentsCard +
            RecoveryCheckCard remain because they're daily-action
            surfaces, not journey-pointer tiles. */}

        {!steppedAway && sleepCommitmentsToday.length > 0 && (
          <SleepCommitmentsCard commitments={sleepCommitmentsToday} />
        )}

        {!steppedAway && skincareLogState && (
          <SkincareSpfCard state={skincareLogState} timezone={timezone} />
        )}

        {!steppedAway &&
          facialHairGroomState &&
          facialHairGroomState.isDue &&
          facialHairAssessment && (
            <FacialHairUpkeepCard
              state={facialHairGroomState}
              timeCommitment={facialHairAssessment.time_commitment}
            />
          )}

        {showRecoveryCheck && yesterdayStrengthWorkout && (
          <RecoveryCheckCard
            workoutLogId={yesterdayStrengthWorkout.id}
            recordedOn={todayAppDay}
            yesterdayLabel="Yesterday"
            liftSummary={recoveryCheckLiftSummary}
          />
        )}

        {showHairRoutineTile && hairStage4 && hairStage4.target !== null && (
          <HairRoutineCard
            count={hairStage4.count}
            target={hairStage4.target}
            hasLoggedToday={hairStage4.hasLoggedToday}
            isBaldTrack={
              hairAssessment !== null &&
              (hairAssessment.stage_1_cut_family === 'bald_track' ||
                hairAssessment.stage_1_cut_family === 'clean_shave' ||
                hairAssessment.density_state === 'shaved_or_buzzed' ||
                hairAssessment.stage_2_path === 'transition')
            }
          />
        )}

        {showHairPhotoDueTile && (
          <HairPhotoDueCard
            isFirstSession={hairStage5IsFirstSession}
            daysUntil={hairStage5DaysUntil}
            priorAnchorSignedUrl={priorHairAnchorSignedUrl}
          />
        )}

        {showFacialStructurePhotoCard && (
          <FacialStructurePhotoCard
            isFirstSession={facialStructurePhotoIsFirstSession}
            daysSinceLast={facialStructurePhotoDaysSinceLast}
          />
        )}

        {show180dNudge && !steppedAway && (
          <ProgressPhotoCard
            variant="progress_180d"
            baselineSignedUrl={baselineSignedUrl}
          />
        )}
        {show90dNudge && !steppedAway && (
          <ProgressPhotoCard
            variant="progress_90d"
            baselineSignedUrl={baselineSignedUrl}
          />
        )}
        {show30dNudge && !steppedAway && (
          <ProgressPhotoCard
            variant="progress_30d"
            baselineSignedUrl={baselineSignedUrl}
          />
        )}
        {showBaselineNudge && !steppedAway && (
          <ProgressPhotoCard variant="baseline" />
        )}

        {/* MonthlyCheckpoint / QuarterlySurvey / StaleGoal /
            StuckConfidence cards moved to /reflection in Phase C. */}

        {steppedAway && (
          <section className="rounded-xl border border-zinc-300 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-lg font-medium">You&rsquo;re stepped away.</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              Check-ins and weekly reflection are paused. Your goals and
              history are saved. Taking a break is a legitimate and
              sometimes correct choice — come back when you&rsquo;re ready.
            </p>
            <Link
              href="/settings"
              className="mt-4 inline-block rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Resume in settings →
            </Link>
          </section>
        )}

        {/* Order reflects what the user is here to do today. Daily
            check-in is the primary action (the returning user's reason
            for opening the page), so it leads. Mister P sits second —
            after state-threading (specific_thing, confidence trajectory,
            completion rate, stuck dimensions) he is now the most
            personalized surface in the product, and keeping him buried
            at the bottom undersold that. The flow reads "log what I
            did → now what should I be thinking about." Weekly summary /
            focus / reflection / chart follow as reference material the
            user scrolls to when they want it. Chat and chart stay
            accessible when stepped away — the chart is history (useful
            for reflection) and the chat has no tracking side effects
            (asking Mister P something isn't the same as
            self-surveillance). */}
        {/* Sleep / nutrition / workout / daily-check-in log cards
            moved to /log in Phase C. The passive-activity readout
            (steps + weekly minutes) stays here for now — it's a
            quiet readout, not a logger; it might move to Area 2 in
            Phase E or to /log later. */}
        {!steppedAway && latestActivity && latestActivity.steps != null && (
          <div className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <div>
              <span className="text-zinc-500">{activityDateLabel}:</span>{' '}
              <strong className="font-medium text-zinc-900 dark:text-zinc-100">
                {latestActivity.steps.toLocaleString()}
              </strong>{' '}
              steps
              {latestActivity.active_calories != null && (
                <>
                  {' · '}
                  <strong className="font-medium text-zinc-900 dark:text-zinc-100">
                    {latestActivity.active_calories.toLocaleString()}
                  </strong>{' '}
                  active cal
                </>
              )}
              {activitySourceLabel && (
                <span className="ml-2 text-[10px] uppercase tracking-wider text-zinc-500">
                  {activitySourceLabel}
                </span>
              )}
            </div>
            {weeklyModerateOrVigorousMinutes != null && (
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                <span className="text-zinc-500">This week:</span>{' '}
                <strong className="font-medium text-zinc-900 dark:text-zinc-100">
                  {weeklyModerateOrVigorousMinutes}
                </strong>{' '}
                / {WEEKLY_TARGET_MINUTES} min moderate-or-vigorous
              </div>
            )}
          </div>
        )}
        {/* WeeklyFocusCard retired (2026-05-09). Pre-redesign goal
            dashboard surface; per-goal walkthrough phase content now
            lives on the journey's /plan/* surface and on /system,
            and the weekly X/Y check-in summary it carried is
            substantially overlapped by the Weekly Reflection v2
            process_adherence capture on /reflection. The card was
            self-hiding most of the time anyway via the dismiss-then-
            reappear-on-phase-cross pattern. */}

        {/* Phase D — Area 3 progress visual. Renders milestone fires
            (when active in their 7-day window) above a confidence
            trend chart + weekly check-in counter. Component
            self-hides when there's no history and no recent
            milestones (first-day users). Voice posture: absolute /
            self-comparison only — no cohort framing. */}
        <ProgressVisual
          recentMilestones={recentMilestones}
          confidenceHistory={reflectionState.history}
        />

        <div id="mister-p" className="scroll-mt-16">
          <MisterPChatCard journeys={chatJourneys} initialThreads={initialThreads} />
        </div>

        <EscapeHatch />
      </div>
    </main>
  );
}
