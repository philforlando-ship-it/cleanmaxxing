import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DevResetButton } from './dev-reset-button';
import { DailyCheckInCard } from './daily-check-in-card';
import { MisterPChatCard, type ChatMessage } from './mister-p-chat-card';
import { WeeklyReflectionCard } from './weekly-reflection-card';
import { ConfidenceTrendChart } from './confidence-trend-chart';
import { MonthlyCheckpointCard } from './monthly-checkpoint-card';
import { WeeklyFocusCard } from './weekly-focus-card';
import { FirstRunCard } from './first-run-card';
import { ProgressPhotoCard } from './progress-photo-card';
import { StaleGoalCard } from './stale-goal-card';
import { ProfileCompletionCard } from './profile-completion-card';
import { SleepLogCard } from './sleep-log-card';
import { getSleepState } from '@/lib/sleep/service';
import { WorkoutLogCard } from './workout-log-card';
import { getWorkoutState } from '@/lib/workout/service';
import { WeeklyLetterCard } from './weekly-letter-card';
import { getCurrentWeeklyLetter } from '@/lib/weekly-letter/service';
import { SelfAcceptanceNudgeCard } from './self-acceptance-nudge-card';
import { pickSelfAcceptanceNudge } from '@/lib/self-acceptance/risk-signals';
import { templateBySlug } from '@/content/goal-templates';
import { onrampFor, currentState, isBaselineStage } from '@/lib/content/onramp';
import { getMisterPUserState } from '@/lib/mister-p/user-state';
import { FirstConversationCard } from './first-conversation-card';
import { getFirstConvoState } from '@/lib/first-convo/service';
import { DailyNoteCard } from './daily-note-card';
import { getOrCreateTodayNote } from '@/lib/daily-note/service';
import { StuckConfidenceCard } from './stuck-confidence-card';
import { QuarterlySurveyCard } from './quarterly-survey-card';
import { getTodayCheckInState, getWeeklyCheckInSummary, getStalestGoal } from '@/lib/check-in/service';
import { appDayFor, daysBetweenAppDays } from '@/lib/date/app-day';
import { getProfileCompletion } from '@/lib/profile/completion';
import { getStuckConfidenceSignal } from '@/lib/confidence/stuck-signal';
import { getQuarterlySurveyState } from '@/lib/quarterly-survey/service';
import { getWeeklyReflectionState } from '@/lib/weekly-reflection/service';
import { getCheckpointState } from '@/lib/checkpoint/service';
import { getNutritionState } from '@/lib/nutrition/service';
import { NutritionLogCard } from './nutrition-log-card';
import { TodayHeroCard } from './today-hero-card';
import { pickHero } from '@/lib/today/hero';
import { pickMilestone } from '@/lib/today/milestones';
import { getShowUpStat } from '@/lib/continuity/show-up-stat';

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
  const params = await searchParams;
  const welcome = params.welcome === '1';
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

  const [
    checkInState,
    reflectionState,
    checkpointState,
    weeklySummary,
    staleGoal,
    stuckSignal,
    quarterlyState,
    profileCompletion,
    sleepState,
    workoutState,
    nutritionState,
    weeklyLetter,
    selfAcceptanceNudge,
    misterPUserState,
    firstConvoState,
    { data: goalsRaw },
    { data: photoRowsRaw },
    { data: healthIntegrationRow },
    { data: latestActivityRow },
    { data: weeklyActivityRows },
  ] = await Promise.all([
    getTodayCheckInState(supabase, user.id, timezone),
    getWeeklyReflectionState(supabase, user.id),
    getCheckpointState(supabase, user.id),
    getWeeklyCheckInSummary(supabase, user.id, timezone),
    getStalestGoal(supabase, user.id, timezone),
    getStuckConfidenceSignal(supabase, user.id),
    getQuarterlySurveyState(supabase, user.id),
    getProfileCompletion(supabase, user.id),
    getSleepState(supabase, user.id),
    getWorkoutState(supabase, user.id),
    getNutritionState(supabase, user.id, timezone),
    getCurrentWeeklyLetter(supabase, user.id),
    pickSelfAcceptanceNudge(supabase, user.id),
    getMisterPUserState(supabase, user.id),
    getFirstConvoState(supabase, user.id),
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

  // Health integration state. "Fresh" means the last webhook event
  // arrived within the last 24 hours — used to suppress the manual
  // sleep prompt because Vital is presumed to be feeding sleep_logs.
  // A stale integration falls back to the manual prompt automatically.
  const healthIntegration = healthIntegrationRow as
    | { provider: string | null; last_synced_at: string | null }
    | null;
  const vitalSleepFresh = healthIntegration?.last_synced_at
    ? Date.now() - new Date(healthIntegration.last_synced_at).getTime() <
      24 * 60 * 60 * 1000
    : false;

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

  // Date label for the activity line — "Yesterday" when the row is
  // yesterday in the user's timezone, otherwise the short date.
  // Computed once here so the JSX stays readable.
  const activityDateLabel = (() => {
    if (!latestActivity) return '';
    const yesterday = new Date(
      new Date().toLocaleString('en-US', { timeZone: timezone }),
    );
    yesterday.setDate(yesterday.getDate() - 1);
    const ymd = yesterday.toISOString().slice(0, 10);
    if (latestActivity.date === ymd) return 'Yesterday';
    return new Date(latestActivity.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: timezone,
    });
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
  // Sunday density fix: when a fresh weekly letter exists, suppress
  // the daily note for Sundays so the user gets one reflective
  // surface instead of two stacked back-to-back. The letter is the
  // bigger reflective surface; the note can wait until Monday.
  const isSunday = new Date().getDay() === 0;
  const suppressNoteForLetter = isSunday && Boolean(weeklyLetter);
  let todayNote = null;
  if (!steppedAway && firstConvoState.completed && !suppressNoteForLetter) {
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
  // a returning user has a primary action above the waterfall. The
  // CTA scrolls to the underlying card via anchorId — the hero is a
  // pointer, not a duplicate logger. We pass the same data the
  // underlying cards consume so the hero never disagrees with what
  // the card itself shows.
  const todayDayForHero = appDayFor(timezone);
  const nutritionLoggedToday = Boolean(
    nutritionState.today && nutritionState.today.date === todayDayForHero,
  );
  const activeGoalSlugs = activeGoals
    .map((g) => g.source_slug)
    .filter((s): s is string => Boolean(s));
  const hero = pickHero({
    weekday: new Date().getDay(),
    steppedAway,
    hasActiveGoals: activeGoals.length > 0,
    checkIn: checkInState,
    reflection: reflectionState,
    recentSleep: sleepState.recent,
    recentWorkouts: workoutState.recent,
    nutritionLoggedToday,
    timezone,
    activeGoalSlugs,
  });

  // Milestone ribbon (day 7/30/90/180, first check-in, first goal
  // graduated). Fires only on the day the moment is reached so a
  // missed day doesn't carry the ribbon forward indefinitely.
  const milestone = steppedAway
    ? null
    : await pickMilestone(supabase, user.id, timezone, daysSinceOnboarding);

  // Soft continuity stat: "X of the last 30 days" with anything
  // logged. Suppressed inside the first 7 days so the line isn't
  // noise like "1 of 1." See lib/continuity/show-up-stat.ts.
  const showUpStat = steppedAway
    ? null
    : await getShowUpStat(supabase, user.id, timezone, daysSinceOnboarding);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
        </div>
        {isDev && <DevResetButton />}
      </div>

      <div className="mt-10 space-y-6">
        {hero && (
          <TodayHeroCard
            hero={hero}
            milestoneText={milestone?.ribbonText ?? null}
            continuity={
              showUpStat && showUpStat.eligible
                ? { showedUp: showUpStat.showedUp, total: showUpStat.total }
                : null
            }
          />
        )}

        {isFirstRun && !steppedAway && <FirstRunCard />}

        {!steppedAway && !firstConvoState.completed && (
          <FirstConversationCard initial={firstConvoState} />
        )}

        {weeklyLetter && (
          <WeeklyLetterCard
            weekStart={weeklyLetter.week_start}
            body={weeklyLetter.body}
          />
        )}

        {!steppedAway && selfAcceptanceNudge && (() => {
          const tmpl = templateBySlug(selfAcceptanceNudge.recommendedSlug);
          const title = tmpl?.title ?? 'this short read';
          return (
            <SelfAcceptanceNudgeCard
              patternLabel={selfAcceptanceNudge.intro}
              recommendedSlug={selfAcceptanceNudge.recommendedSlug}
              recommendedTitle={title}
            />
          );
        })()}

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

        {checkpointState.status === 'eligible' && !steppedAway && (
          <MonthlyCheckpointCard summary={checkpointState.summary} />
        )}

        {quarterlyState.status === 'eligible' && !steppedAway && (
          <QuarterlySurveyCard prior={quarterlyState.prior} />
        )}

        {staleGoal && !steppedAway && (
          <StaleGoalCard staleGoal={staleGoal} />
        )}

        {stuckSignal && !steppedAway && (
          <StuckConfidenceCard signal={stuckSignal} />
        )}

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
        {/* Vital-sourced sleep auto-fills the sleep_logs row, so the
            manual SleepLogCard becomes redundant when an Apple Health
            integration has synced inside the last 24 hours. We hide
            the whole card in that case; if the sync is stale (or no
            integration is connected) the manual card returns. */}
        {!steppedAway && !vitalSleepFresh && (
          <div id="sleep-log" className="scroll-mt-16">
            <SleepLogCard
              recent={sleepState.recent}
              rollingAvgHours={sleepState.rollingAvgHours}
              rollingCount={sleepState.rollingCount}
              timezone={timezone}
            />
          </div>
        )}
        {/* Passive-activity readout. Renders only when daily_activity
            has a row — i.e. a connected wearable is feeding steps.
            Two lines: yesterday's steps + active calories on the
            first; this week's moderate-or-vigorous total against the
            WHO 150-min target on the second. */}
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
        {!steppedAway && (
          <div id="workout-log" className="scroll-mt-16">
            <WorkoutLogCard recent={workoutState.recent} timezone={timezone} />
          </div>
        )}
        {!steppedAway && (
          <div id="nutrition-log" className="scroll-mt-16">
            <NutritionLogCard state={nutritionState} timezone={timezone} />
          </div>
        )}
        {!steppedAway && (
          <div id="daily-check-in" className="scroll-mt-16">
            <DailyCheckInCard
              initialState={checkInState}
              spotlight={welcome && checkInState.check_in_id === null}
              slugsWithFocus={slugsWithFocus}
            />
          </div>
        )}
        {/* This Week's Focus sits directly under Daily Check-In so the
            user's flow is "tick today → see what to focus on this week
            for those same goals" without scrolling past unrelated
            surfaces. Letter pills (A./B./C.) line up between the two
            cards, and the Focus → links on each daily row scroll to
            the matching entry below. The weekly count line + progress
            bar (formerly its own WeeklySummaryStrip) is now folded
            into this card's header so the weekly narrative reads as
            one card, not two. */}
        {!steppedAway && (
          <WeeklyFocusCard
            goals={activeGoals}
            weeklySummary={weeklySummary}
            userState={misterPUserState}
          />
        )}
        <MisterPChatCard goals={chatGoals} initialThreads={initialThreads} />
        {!steppedAway && (
          <div id="weekly-reflection" className="scroll-mt-16">
            <WeeklyReflectionCard
              initialState={reflectionState}
              weeklySummary={weeklySummary}
            />
          </div>
        )}
        <ConfidenceTrendChart history={reflectionState.history} />
      </div>
    </main>
  );
}
