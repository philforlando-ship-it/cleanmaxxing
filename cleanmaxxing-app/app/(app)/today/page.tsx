import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DevResetButton } from './dev-reset-button';
import { DailyCheckInCard } from './daily-check-in-card';
import { MisterPChatCard } from './mister-p-chat-card';
import { WeeklyReflectionCard } from './weekly-reflection-card';
import { ConfidenceTrendChart } from './confidence-trend-chart';
import { MonthlyCheckpointCard } from './monthly-checkpoint-card';
import { getTodayCheckInState } from '@/lib/check-in/service';
import { getWeeklyReflectionState } from '@/lib/weekly-reflection/service';
import { getCheckpointState } from '@/lib/checkpoint/service';

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

  const [checkInState, reflectionState, checkpointState] = await Promise.all([
    getTodayCheckInState(supabase, user.id),
    getWeeklyReflectionState(supabase, user.id),
    getCheckpointState(supabase, user.id),
  ]);
  const isDev = process.env.NODE_ENV === 'development';

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
          <p className="mt-2 text-sm text-zinc-500">Signed in as {user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {isDev && <DevResetButton />}
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="mt-10 space-y-6">
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

        {!steppedAway && <DailyCheckInCard initialState={checkInState} />}
        {/* Chart and chat stay accessible even when stepped away — the
            chart is history (useful for reflection) and the chat has no
            tracking side effects (asking Mister P something isn't the
            same as self-surveillance). */}
        <ConfidenceTrendChart history={reflectionState.history} />
        {!steppedAway && <WeeklyReflectionCard initialState={reflectionState} />}
        <MisterPChatCard />
      </div>
    </main>
  );
}
