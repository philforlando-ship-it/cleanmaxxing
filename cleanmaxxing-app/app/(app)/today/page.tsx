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
import { FirstConversationCard } from './first-conversation-card';
import { getFirstConvoState } from '@/lib/first-convo/service';
import { DailyNoteCard } from './daily-note-card';
import { getOrCreateTodayNote } from '@/lib/daily-note/service';
import { StuckConfidenceCard } from './stuck-confidence-card';
import { QuarterlySurveyCard } from './quarterly-survey-card';
import { getTodayCheckInState, getWeeklyCheckInSummary, getStalestGoal } from '@/lib/check-in/service';
import { onrampFor } from '@/lib/content/onramp';
import { getProfileCompletion } from '@/lib/profile/completion';
import { getStuckConfidenceSignal } from '@/lib/confidence/stuck-signal';
import { getQuarterlySurveyState } from '@/lib/quarterly-survey/service';
import { getWeeklyReflectionState } from '@/lib/weekly-reflection/service';
import { getCheckpointState } from '@/lib/checkpoint/service';

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
// purity lint warning doesn't reflect real instability here.
function computeIsFirstRun(onboardingCompletedAt: string): boolean {
  const onboardedAt = new Date(onboardingCompletedAt);
  const daysSince = Math.floor(
    (Date.now() - onboardedAt.getTime()) / 86_400_000,
  );
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
    .select('onboarding_completed_at, tracking_paused_at')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.onboarding_completed_at) redirect('/onboarding');

  const steppedAway = Boolean(profile.tracking_paused_at);

  // First-run window: seven days from onboarding completion. The card is
  // only mounted while the window is open; the client component then
  // decides whether to render based on localStorage dismissal.
  const isFirstRun = computeIsFirstRun(profile.onboarding_completed_at as string);

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
    weeklyLetter,
    firstConvoState,
    { data: goalsRaw },
    { data: photoRowsRaw },
  ] = await Promise.all([
    getTodayCheckInState(supabase, user.id),
    getWeeklyReflectionState(supabase, user.id),
    getCheckpointState(supabase, user.id),
    getWeeklyCheckInSummary(supabase, user.id),
    getStalestGoal(supabase, user.id),
    getStuckConfidenceSignal(supabase, user.id),
    getQuarterlySurveyState(supabase, user.id),
    getProfileCompletion(supabase, user.id),
    getSleepState(supabase, user.id),
    getWorkoutState(supabase, user.id),
    getCurrentWeeklyLetter(supabase, user.id),
    getFirstConvoState(supabase, user.id),
    supabase
      .from('goals')
      .select('id, title, source_slug, created_at, baseline_stage, target_date, last_phase_seen')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: true }),
    supabase
      .from('progress_photos')
      .select('slot')
      .eq('user_id', user.id),
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
  }>;

  // Set of source_slugs that have an authored walkthrough. The Daily
  // Check-In card uses this to gate per-goal "Focus →" deep links so
  // we don't render a link to a section that doesn't exist for goals
  // whose POV hasn't had its on-ramp structured yet.
  const slugsWithFocus = activeGoals
    .map((g) => g.source_slug as string | null)
    .filter((slug): slug is string => Boolean(slug && onrampFor(slug)));

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
  const chatGoals = activeGoals.map((g) => ({ id: g.id, title: g.title }));

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
  const daysSinceOnboarding = Math.floor(
    (Date.now() - onboardedAt.getTime()) / 86_400_000,
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
  // for slot 1) and not stepped away. Uses server-local date as
  // "today"; users far from the server timezone will see the rollover
  // happen at a slightly off time, which is acceptable for v1 — the
  // alternative is storing user timezone, deferred until LLM-generated
  // notes land in v2.
  let todayNote = null;
  if (!steppedAway && firstConvoState.completed) {
    const { count: priorNotesCount } = await supabase
      .from('daily_notes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);
    const todayDate = (() => {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    })();
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

        {!steppedAway && todayNote && <DailyNoteCard note={todayNote} />}

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
        {!steppedAway && (
          <SleepLogCard
            recent={sleepState.recent}
            rollingAvgHours={sleepState.rollingAvgHours}
            rollingCount={sleepState.rollingCount}
          />
        )}
        {!steppedAway && <WorkoutLogCard recent={workoutState.recent} />}
        {!steppedAway && (
          <DailyCheckInCard
            initialState={checkInState}
            spotlight={welcome && checkInState.check_in_id === null}
            slugsWithFocus={slugsWithFocus}
          />
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
          <WeeklyFocusCard goals={activeGoals} weeklySummary={weeklySummary} />
        )}
        <MisterPChatCard goals={chatGoals} initialThreads={initialThreads} />
        {!steppedAway && (
          <WeeklyReflectionCard
            initialState={reflectionState}
            weeklySummary={weeklySummary}
          />
        )}
        <ConfidenceTrendChart history={reflectionState.history} />
      </div>
    </main>
  );
}
