import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DevResetButton } from './dev-reset-button';
import { MisterPChatCard, type ChatMessage } from './mister-p-chat-card';
import { WeeklyFocusCard } from './weekly-focus-card';
import { FirstRunCard } from './first-run-card';
import { ProgressPhotoCard } from './progress-photo-card';
import { ProfileCompletionCard } from './profile-completion-card';
// Phase B (May 2026): plan-card imports removed — journey tiles now
// covered by the PrimaryActionCard. Phase C: log cards moved to
// /log; Pattern C cards (weekly letter, weekly reflection, monthly
// checkpoint, quarterly survey, self-acceptance nudge, stale goal,
// stuck confidence) moved to /reflection. Imports below are the
// post-Phase-C residual set: event-driven daily-action tiles
// (hair routine / photo / sleep commitments / recovery check),
// onboarding cards, profile completion, weekly focus, Mister P
// chat surface, and the still-on-/today daily note.
import { HairRoutineCard } from './hair-routine-card';
import { HairPhotoDueCard } from './hair-photo-due-card';
import { SleepCommitmentsCard } from './sleep-commitments-card';
import { RecoveryCheckCard } from './recovery-check-card';
import {
  getYesterdayStrengthWorkout,
  hasFeedbackForWorkout,
} from '@/lib/strength/feedback';
import { getHairAssessment, getStage4State } from '@/lib/hair/service';
import { pickPrimaryAction } from '@/lib/today/primary-action-picker';
import { PrimaryActionCard } from './primary-action-card';
import { EscapeHatch } from './escape-hatch';
import { detectAndRecordMilestones } from '@/lib/milestones/detect';
import { listRecentMilestones } from '@/lib/milestones/service';
import { getWeeklyReflectionState } from '@/lib/weekly-reflection/service';
import { ProgressVisual } from './progress-visual';
import { selectContextualPrompt } from '@/lib/contextual-prompt/select';
import { ContextualPromptCard } from './contextual-prompt-card';
import { hasSleepAssessment } from '@/lib/sleep/service';
import { hasStrengthAssessment } from '@/lib/strength/service';
import { getTodayCommitmentsState } from '@/lib/sleep/commitments';
import { daysUntilNext } from '@/lib/hair/stage-5-content';
import { getSleepState } from '@/lib/sleep/service';
import { onrampFor, currentState, isBaselineStage } from '@/lib/content/onramp';
import { getMisterPUserState } from '@/lib/mister-p/user-state';
import { FirstConversationCard } from './first-conversation-card';
import { getFirstConvoState } from '@/lib/first-convo/service';
import { DailyNoteCard } from './daily-note-card';
import { getOrCreateTodayNote } from '@/lib/daily-note/service';
import { getWeeklyCheckInSummary, getStalestGoal } from '@/lib/check-in/service';
import { appDayFor, daysBetweenAppDays, previousAppDayFor } from '@/lib/date/app-day';
import { getProfileCompletion } from '@/lib/profile/completion';
import { getStuckConfidenceSignal } from '@/lib/confidence/stuck-signal';

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
    .select('onboarding_completed_at, tracking_paused_at, timezone')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.onboarding_completed_at) redirect('/onboarding');

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

  // Phase D: detect + record any new milestones BEFORE the
  // listRecentMilestones fetch below, so a freshly-fired
  // milestone shows up in the same render. Idempotent — the
  // unique (user_id, trigger_key) index prevents double-fires.
  // Wrapped to never throw; a milestone-detection failure must
  // not break /today.
  await detectAndRecordMilestones(supabase, user.id).catch((err) => {
    console.error('milestones_detect_failed', err);
  });

  const [
    weeklySummary,
    staleGoal,
    stuckSignal,
    profileCompletion,
    sleepState,
    misterPUserState,
    firstConvoState,
    reflectionState,
    recentMilestones,
    { data: goalsRaw },
    { data: photoRowsRaw },
    { data: healthIntegrationRow },
    { data: latestActivityRow },
    { data: weeklyActivityRows },
  ] = await Promise.all([
    getWeeklyCheckInSummary(supabase, user.id, timezone),
    getStalestGoal(supabase, user.id, timezone),
    getStuckConfidenceSignal(supabase, user.id),
    getProfileCompletion(supabase, user.id),
    getSleepState(supabase, user.id),
    getMisterPUserState(supabase, user.id),
    getFirstConvoState(supabase, user.id),
    getWeeklyReflectionState(supabase, user.id),
    listRecentMilestones(supabase, user.id),
    supabase
      .from('goals')
      .select('id, title, source_slug, created_at, baseline_stage, target_date, last_phase_seen, chat_execution_mode, chat_execution_prompt_acked')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: true }),
    supabase
      .from('progress_photos')
      .select('slot')
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
  ]);
  // Focus-area flags remaining after Phase B cleanup. Style /
  // grooming / skin / body_composition flags were dropped because
  // their plan cards moved to the PrimaryActionCard's picker — those
  // focus areas are still honored, just by lib/today/primary-action-picker
  // rather than by per-card gates here.
  let hairIsFocus = false;
  let sleepIsFocus = false;
  let fitnessIsFocus = false;
  if (focusRow?.response_value) {
    try {
      const parsed = JSON.parse(focusRow.response_value as string);
      if (Array.isArray(parsed)) {
        if (parsed.includes('hair')) hairIsFocus = true;
        if (parsed.includes('sleep')) sleepIsFocus = true;
        if (parsed.includes('fitness')) fitnessIsFocus = true;
      }
    } catch {
      // malformed survey value — leave all flags false
    }
  }
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

  // Cast to the WeeklyFocusCard's ActiveGoal shape. The supabase
  // client's inferred response type drops columns it doesn't have
  // in its generated schema (target_date was added in migration
  // 0020 and the schema types haven't been regenerated yet); the
  // select string is the source of truth here.
  const activeGoals = (goalsRaw ?? []) as Array<{
    id: string;
    title: string;
    source_slug: string | null;
    created_at: string;
    baseline_stage: string | null;
    target_date: string | null;
    last_phase_seen: string | null;
    chat_execution_mode: boolean | null;
    chat_execution_prompt_acked: boolean | null;
  }>;

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

  // Compute the slug set that the WeeklyFocusCard will render today.
  // Mirrors that card's "newPhaseEntries" filter: an onramp is
  // authored AND the user's current phase differs from the last
  // phase they dismissed. Used to gate the per-row "Focus →" button
  // in the daily check-in so it only appears when there's a live
  // entry to scroll to.
  const slugsWithFocus: string[] = [];
  {
    const grouped = new Map<string, typeof activeGoals[number]>();
    for (const g of activeGoals) {
      if (!g.source_slug) continue;
      const existing = grouped.get(g.source_slug);
      if (
        !existing ||
        new Date(g.created_at).getTime() <
          new Date(existing.created_at).getTime()
      ) {
        grouped.set(g.source_slug, g);
      }
    }
    for (const [slug, anchor] of grouped) {
      const onramp = onrampFor(slug);
      if (!onramp) continue;
      const stage = isBaselineStage(anchor.baseline_stage)
        ? anchor.baseline_stage
        : 'new';
      const state = currentState(onramp, new Date(anchor.created_at), stage);
      const currentPhase =
        state.kind === 'graduated' ? 'graduated' : state.block.range;
      if (anchor.last_phase_seen !== currentPhase) slugsWithFocus.push(slug);
    }
  }

  // Hydrate every thread the chat-card picker can show: General
  // (goal_id IS NULL) + one per active goal. We load up to 50 pairs
  // per thread without truncating message text, so the visible UI
  // matches exactly what the user wrote and Mister P answered.
  // Bounded per-user query (active goals are capped at 5) so the
  // single round-trip stays cheap.
  const activeGoalIds = activeGoals.map((g) => g.id);
  const { data: threadRowsRaw } = await supabase
    .from('mister_p_queries')
    .select('question, answer, goal_id, created_at')
    .eq('user_id', user.id)
    .or(
      activeGoalIds.length > 0
        ? `goal_id.is.null,goal_id.in.(${activeGoalIds.join(',')})`
        : 'goal_id.is.null',
    )
    .order('created_at', { ascending: true });

  const GENERAL_KEY = '__general__';
  const initialThreads: Record<string, ChatMessage[]> = { [GENERAL_KEY]: [] };
  for (const g of activeGoals) initialThreads[g.id] = [];
  for (const row of threadRowsRaw ?? []) {
    const r = row as {
      question: string;
      answer: string;
      goal_id: string | null;
    };
    const key = r.goal_id ?? GENERAL_KEY;
    if (!initialThreads[key]) continue; // skip threads for inactive goals
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
  const chatGoals = activeGoals.map((g) => ({
    id: g.id,
    title: g.title,
    executionMode: Boolean(g.chat_execution_mode),
    promptAcked: Boolean(g.chat_execution_prompt_acked),
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
  // one question, cached per user per day. Only fires when the user
  // is past the first conversation (so the two surfaces don't compete
  // for slot 1) and not stepped away. The day key uses the user's
  // app-day in their stored timezone (3am-local cutoff) so the same
  // boundary applies as the rest of /today.
  //
  // Phase C note: the Sunday-suppression-when-weekly-letter-exists
  // dance was dropped here. The weekly letter moved to /reflection,
  // so there's no /today stack-up problem to defend against. The
  // daily note still surfaces every day post-onboarding.
  let todayNote = null;
  if (!steppedAway && firstConvoState.completed) {
    const { count: priorNotesCount } = await supabase
      .from('daily_notes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    const todayDate = appDayFor(timezone);
    const completionRate =
      weeklySummary.possible > 0
        ? weeklySummary.ticked / weeklySummary.possible
        : null;
    todayNote = await getOrCreateTodayNote(supabase, user.id, todayDate, {
      daysSinceOnboarding: Math.max(0, daysSinceOnboarding),
      weekday: new Date().getDay(),
      sleepRecentAvgHours: sleepState.rollingAvgHours,
      sleepRecentCount: sleepState.rollingCount,
      weeklyCompletionRate: completionRate,
      staleGoalTitle: staleGoal?.title ?? null,
      staleGoalDaysIdle: staleGoal?.daysSinceLastTick ?? null,
      stuckDimensions: stuckSignal ? [stuckSignal.dimensionLabel] : [],
      isFirstDailyNote: (priorNotesCount ?? 0) === 0,
    });
  }

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
  const contextualPrompt = await selectContextualPrompt(
    supabase,
    user.id,
    primaryAction.kind,
    todayAppDay,
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
        </div>
        {isDev && <DevResetButton />}
      </div>

      <div className="mt-10 space-y-6">
        <PrimaryActionCard action={primaryAction} />

        {/* Phase E — Area 2 contextual prompt. Renders zero or
            one prompt; null when nothing fires. Sits between Area
            1 and the rest so it stays in the natural reading flow
            without competing with Area 1 for attention. */}
        <ContextualPromptCard prompt={contextualPrompt} />

        {isFirstRun && !steppedAway && <FirstRunCard />}

        {!steppedAway && !firstConvoState.completed && (
          <FirstConversationCard initial={firstConvoState} />
        )}

        {/* WeeklyLetterCard / SelfAcceptanceNudgeCard moved to
            /reflection in Phase C of the /today redesign. */}

        {!steppedAway && todayNote && (
          <div id="daily-note" className="scroll-mt-16">
            {/* Key on note.id so the card unmounts/remounts when the
                day rolls over. Without this, a tab left open across
                the 3am app-day boundary keeps stale client state from
                yesterday's response and hides today's fresh input. */}
            <DailyNoteCard key={todayNote.id} note={todayNote} />
          </div>
        )}

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
          />
        )}

        {show180dNudge && !steppedAway && (
          <ProgressPhotoCard variant="progress_180d" />
        )}
        {show90dNudge && !steppedAway && (
          <ProgressPhotoCard variant="progress_90d" />
        )}
        {show30dNudge && !steppedAway && (
          <ProgressPhotoCard variant="progress_30d" />
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
        {/* WeeklyFocusCard stays here — it's the goal-tracking
            companion to the daily check-in. WeeklyReflectionCard +
            ConfidenceTrendChart moved to /reflection in Phase C.
            MisterPChatCard stays for now; will be reconsidered in
            Phase E. */}
        {!steppedAway && (
          <WeeklyFocusCard
            goals={activeGoals}
            weeklySummary={weeklySummary}
            userState={misterPUserState}
          />
        )}

        {/* Phase D — Area 3 progress visual. Renders milestone fires
            (when active in their 7-day window) above a confidence
            trend chart + weekly check-in counter. Component
            self-hides when there's no history and no recent
            milestones (first-day users). Voice posture: absolute /
            self-comparison only — no cohort framing. */}
        <ProgressVisual
          recentMilestones={recentMilestones}
          confidenceHistory={reflectionState.history}
          weeklyTickedCount={weeklySummary.ticked}
          weeklyPossibleCount={weeklySummary.possible}
        />

        <MisterPChatCard goals={chatGoals} initialThreads={initialThreads} />

        <EscapeHatch />
      </div>
    </main>
  );
}
