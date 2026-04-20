import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DevResetButton } from './dev-reset-button';
import { DailyCheckInCard } from './daily-check-in-card';
import { MisterPChatCard } from './mister-p-chat-card';
import { WeeklyReflectionCard } from './weekly-reflection-card';
import { ConfidenceTrendChart } from './confidence-trend-chart';
import { MonthlyCheckpointCard } from './monthly-checkpoint-card';
import { WeeklyFocusCard } from './weekly-focus-card';
import { FirstRunCard } from './first-run-card';
import { ProgressPhotoCard } from './progress-photo-card';
import { getTodayCheckInState } from '@/lib/check-in/service';
import { getWeeklyReflectionState } from '@/lib/weekly-reflection/service';
import { getCheckpointState } from '@/lib/checkpoint/service';

// Ninety-day progress-photo window. Matches the /progress page's
// PROGRESS_WINDOW_DAYS and the POVs' typical visible-change timeline.
const PROGRESS_WINDOW_DAYS = 90;

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

export default async function TodayPage() {
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
    { data: goalsRaw },
    { data: photoRowsRaw },
  ] = await Promise.all([
    getTodayCheckInState(supabase, user.id),
    getWeeklyReflectionState(supabase, user.id),
    getCheckpointState(supabase, user.id),
    supabase
      .from('goals')
      .select('id, title, source_slug, created_at, baseline_stage')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: true }),
    supabase
      .from('progress_photos')
      .select('slot')
      .eq('user_id', user.id),
  ]);
  const activeGoals = goalsRaw ?? [];

  // Progress photo surface decisions: which nudge (if any) fires on /today.
  // Card hides itself via localStorage dismissal — we only decide whether
  // to mount it based on server-side state.
  const photoSlots = new Set(
    (photoRowsRaw ?? []).map((r) => (r as { slot: string }).slot),
  );
  const hasBaseline = photoSlots.has('baseline');
  const hasProgress90d = photoSlots.has('progress_90d');
  const onboardedAt = new Date(profile.onboarding_completed_at as string);
  const daysSinceOnboarding = Math.floor(
    (Date.now() - onboardedAt.getTime()) / 86_400_000,
  );
  const showBaselineNudge = !hasBaseline && isFirstRun;
  const show90dNudge =
    hasBaseline && !hasProgress90d && daysSinceOnboarding >= PROGRESS_WINDOW_DAYS;

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

        {show90dNudge && !steppedAway && (
          <ProgressPhotoCard variant="progress_90d" />
        )}
        {showBaselineNudge && !steppedAway && (
          <ProgressPhotoCard variant="baseline" />
        )}

        {checkpointState.status === 'eligible' && !steppedAway && (
          <MonthlyCheckpointCard summary={checkpointState.summary} />
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

        {/* Order reflects what the user is actually here to do today.
            Daily check-in is the primary action (returning users'
            reason for opening the page). Weekly focus is secondary
            context. Reflection sits above the chart so the flow reads
            action → resulting trend rather than trend → action.
            Chart and chat stay accessible even when stepped away — the
            chart is history (useful for reflection) and the chat has no
            tracking side effects (asking Mister P something isn't the
            same as self-surveillance). */}
        {!steppedAway && <DailyCheckInCard initialState={checkInState} />}
        {!steppedAway && <WeeklyFocusCard goals={activeGoals} />}
        {!steppedAway && <WeeklyReflectionCard initialState={reflectionState} />}
        <ConfidenceTrendChart history={reflectionState.history} />
        <MisterPChatCard />
      </div>
    </main>
  );
}
