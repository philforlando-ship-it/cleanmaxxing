// /reflection — Pattern C surfaces consolidated (Phase C of the
// /today redesign).
//
// Pattern C is "perpetual reflective practice" per the journey
// redesign framework. These surfaces aren't journey-anchored and
// don't fit /today's primary-action / log discipline. They live
// here as a calm destination users open when they're ready to
// reflect, not because the app demanded it.
//
// What's here today:
//   - Weekly letter (when fresh — Mister P's Sunday note)
//   - Weekly reflection (when due)
//   - Monthly checkpoint (when due)
//   - Quarterly survey (when due)
//   - Self-acceptance nudge (when risk signal fires)
//   - Stale goal (when a goal hasn't been ticked in a while)
//   - Stuck confidence (when the trend is flat)
//
// What's NOT here yet:
//   - Daily note — still on /today; complex context-aware creation
//     deferred to a future ticket.
//   - ConfidenceTrendChart — becomes Area 3 in /today Phase D.
//   - Circuit-breaker (too many active journeys) — surfaces in
//     /today's PrimaryActionCard via bucket 8.

import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, getUser } from '@/lib/supabase/server';
import {
  getWeeklyReflectionState,
  getActiveJourneysForReflection,
} from '@/lib/weekly-reflection/service';
import { getCheckpointState } from '@/lib/checkpoint/service';
import { getQuarterlySurveyState } from '@/lib/quarterly-survey/service';
import { getCurrentWeeklyLetter } from '@/lib/weekly-letter/service';
import { pickSelfAcceptanceNudge } from '@/lib/self-acceptance/risk-signals';
import { getPremiumStatus } from '@/lib/billing/is-premium';
import { journeyCapFor } from '@/lib/journeys/cap';
import { getUpcomingCadenceEvents } from '@/lib/cadence/upcoming';
import { UpcomingCadenceStrip } from './upcoming-cadence-strip';
import { WeeklyLetterCard } from '@/app/(app)/today/weekly-letter-card';
import { WeeklyReflectionCard } from '@/app/(app)/today/weekly-reflection-card';
import { MonthlyCheckpointCard } from '@/app/(app)/today/monthly-checkpoint-card';
import { QuarterlySurveyCard } from '@/app/(app)/today/quarterly-survey-card';
import { SelfAcceptanceNudgeCard } from '@/app/(app)/today/self-acceptance-nudge-card';
import { ProcessOutcomeChart } from './process-outcome-chart';

export default async function ReflectionPage() {
  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('users')
    .select('timezone, tracking_paused_at')
    .eq('id', user.id)
    .maybeSingle();
  const timezone =
    (profile?.timezone as string | null) ?? 'America/New_York';
  const steppedAway = Boolean(profile?.tracking_paused_at);

  const [
    reflectionState,
    checkpointState,
    quarterlyState,
    weeklyLetter,
    selfAcceptanceNudge,
    activeJourneys,
    profileRow,
    premium,
    upcomingCadence,
  ] = await Promise.all([
    getWeeklyReflectionState(supabase, user.id),
    getCheckpointState(supabase, user.id),
    getQuarterlySurveyState(supabase, user.id),
    getCurrentWeeklyLetter(supabase, user.id),
    pickSelfAcceptanceNudge(supabase, user.id),
    getActiveJourneysForReflection(supabase, user.id),
    supabase
      .from('user_profile')
      .select('current_weight_lbs')
      .eq('user_id', user.id)
      .maybeSingle(),
    getPremiumStatus(user.id),
    getUpcomingCadenceEvents(supabase, user.id),
  ]);
  // Journey cap on the quarterly-survey card. Only paying Pro
  // subscribers (status === 'active') see the 10 ceiling; trial +
  // free share the 3-journey cap per the 2026-05-11 policy change.
  const focusAreasCap = journeyCapFor(premium.status === 'active');

  const currentWeightLbs =
    (profileRow.data?.current_weight_lbs as number | null | undefined) ?? null;

  // Track whether anything pending surfaces. The weekly-reflection
  // card itself always renders (it shows history even when no
  // reflection is currently due), so the "quiet" empty state only
  // fires when ALL pending surfaces are absent AND there's no
  // reflection history yet.
  // Phase F: stuck-confidence signal retired in favor of the
  // directional_flag question on the reflection itself. Goals-era
  // stale-goal nudge retired in Sub-ship B (2026-05-10) — no users
  // on the goals model anymore. Monthly checkpoint kept, but its
  // goal-tracking content was stripped in the same ship; it's now
  // a slim month-in reflection (days-since-start + confidence delta
  // + "what preoccupied you" prompt).
  const hasAnyPending =
    weeklyLetter !== null ||
    selfAcceptanceNudge !== null ||
    checkpointState.status === 'eligible' ||
    quarterlyState.status === 'eligible';
  const hasReflectionHistory = reflectionState.history.length > 0;
  const hasUpcoming = upcomingCadence.length > 0;
  const hasAnyContent = hasAnyPending || hasReflectionHistory || hasUpcoming;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/today"
        className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Back to Today
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Reflection
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          Weekly, monthly, and quarterly surfaces — plus the quiet
          signals Mister P watches for. Read when you have ten
          minutes and want a step back. Nothing here is a daily ask.
        </p>
      </header>

      {steppedAway ? (
        <section className="mt-8 rounded-xl border border-zinc-300 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="text-lg font-medium">You&rsquo;re stepped away.</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Reflection surfaces are paused. Your history is saved.{' '}
            <Link
              href="/settings"
              className="underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Resume
            </Link>{' '}
            when you&rsquo;re ready.
          </p>
        </section>
      ) : !hasAnyContent ? (
        <section className="mt-8 rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-medium">Quiet.</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Nothing is due, no signals are firing. Come back at the
            end of the week — there&rsquo;s usually something here on
            Sunday.
          </p>
        </section>
      ) : (
        <div className="mt-8 space-y-6">
          {hasUpcoming && <UpcomingCadenceStrip events={upcomingCadence} />}

          {weeklyLetter && (
            <WeeklyLetterCard
              weekStart={weeklyLetter.week_start}
              body={weeklyLetter.body}
            />
          )}

          {selfAcceptanceNudge && (
            <SelfAcceptanceNudgeCard
              patternLabel={selfAcceptanceNudge.intro}
              recommendedSlug={selfAcceptanceNudge.recommendedSlug}
              recommendedTitle={selfAcceptanceNudge.recommendedTitle}
            />
          )}

          <div id="weekly-reflection" className="scroll-mt-16">
            <WeeklyReflectionCard
              initialState={reflectionState}
              activeJourneys={activeJourneys}
              currentWeightLbs={currentWeightLbs}
            />
          </div>

          {checkpointState.status === 'eligible' && (
            <MonthlyCheckpointCard summary={checkpointState.summary} />
          )}

          {quarterlyState.status === 'eligible' && (
            <QuarterlySurveyCard
              prior={quarterlyState.prior}
              focusAreasCap={focusAreasCap}
            />
          )}

          {/* Phase F: render the v2 process+outcome chart. Replaces
              ConfidenceTrendChart on this surface. The chart shows
              v2-only weeks; legacy v1 history isn't surfaced here
              (cohabit period; future ticket can add a Legacy
              expander). */}
          <ProcessOutcomeChart history={reflectionState.history} />
        </div>
      )}
    </main>
  );
}
