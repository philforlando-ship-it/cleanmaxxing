import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Pre-survey contract screen. Lands before question 0 so the user
// knows what they're signing up for *before* answering. Without
// this, the survey starts cold and a returning week-1 user
// frequently churns the moment they discover the daily/weekly
// cadence (which they only see at the end of onboarding).
//
// Skip-on-resume: if the user has already answered any question,
// the entry redirector will route them straight to their next
// unanswered step rather than re-running this screen. We don't
// gate this screen separately — the entry redirector is the
// source of truth for "where should the user be next."

export default async function OnboardingIntroPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Survey already submitted? Goal pickup. We don't bounce users
  // who have *started* the survey — they may be navigating back
  // from question 1, and the /onboarding entry redirector is the
  // only place that sends returning users here in the first place
  // (only when no answers exist), so a direct visit is safe.
  const { data: profile } = await supabase
    .from('users')
    .select('age_segment')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.age_segment) redirect('/onboarding/complete');

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-xl flex-col px-6 py-10">
      <div className="flex flex-1 flex-col">
        <h1 className="text-2xl font-semibold leading-tight tracking-tight">
          Here&rsquo;s the shape of it.
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Before we ask anything, here&rsquo;s what the product asks of you.
          About fifteen seconds to read — then a short survey to tune your
          starting goals.
        </p>

        <ul className="mt-8 space-y-5">
          <li className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-medium">Daily check-in</h2>
              <span className="shrink-0 text-xs text-zinc-500">~10 seconds</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              Tick which of your goals you moved forward on today. No score,
              no rating, no streak. Missed days are fine.
            </p>
          </li>
          <li className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-medium">Weekly reflection</h2>
              <span className="shrink-0 text-xs text-zinc-500">~2 minutes, Sunday</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              Four sliders on how the week felt — social, work, physical, age
              — plus a short note. This is the snapshot. Not a daily dial.
            </p>
          </li>
          <li className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-medium">Monthly checkpoint</h2>
              <span className="shrink-0 text-xs text-zinc-500">~5 minutes, day 30</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              A read on what&rsquo;s working, what isn&rsquo;t, and what to
              keep, drop, or add. The first one shows up after thirty days.
            </p>
          </li>
        </ul>

        <p className="mt-8 text-xs text-zinc-500 dark:text-zinc-400">
          You can pause tracking any time. There&rsquo;s no streak to break and
          no AI looking at your photos.
        </p>

        <div className="mt-8 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-500" />
          <Link
            href="/onboarding/0"
            className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Start the survey
          </Link>
        </div>
      </div>
    </main>
  );
}
