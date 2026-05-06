'use client';

// 4-week grow-out test card. Three states:
//   1. Not started — show "Start the test" with explanation
//   2. In progress — show progress + days remaining
//   3. Complete — surface the "now decide" prompt and link to Edit
//      answers so the user can re-pick goal / target style
//
// Shows for users whose goal is 'not_sure_yet' or 'try_new_style'
// (other goals don't benefit from the grow-out test).

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Props = {
  startedAt: string | null;
  completedAt: string | null;
};

const TEST_DAYS = 28;

export function GrowoutCard({ startedAt, completedAt }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function call(action: 'start' | 'complete') {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/facial-hair/growout', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
          };
          throw new Error(
            body.message ?? body.error ?? `Request failed (${res.status})`,
          );
        }
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  // Not started
  if (!startedAt) {
    return (
      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          The 4-week grow-out test
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          The cheapest way to find out what your beard actually wants to
          be: don&rsquo;t shave for 4 weeks, then evaluate. Density,
          shape, and connection patterns become visible at week 3-4 in
          a way they aren&rsquo;t at the stubble stage. After the test
          you&rsquo;ll know enough to commit to a style or commit to
          staying clean.
        </p>
        {error && (
          <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => call('start')}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? 'Saving…' : 'Start the test'}
          </button>
        </div>
      </section>
    );
  }

  // Complete — user has marked done
  if (completedAt) {
    return (
      <section className="mt-8 rounded-xl border-2 border-emerald-500 bg-emerald-50 p-5 dark:border-emerald-600 dark:bg-emerald-950/30">
        <h2 className="text-base font-medium text-emerald-900 dark:text-emerald-200">
          Test complete — time to decide
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-emerald-900 dark:text-emerald-200">
          You&rsquo;ve grown it out. The data&rsquo;s now in. Re-run the
          assessment with what you know now — your real density, the
          shape that actually came in, and a clearer goal (commit to a
          style, or commit to staying clean).
        </p>
        <div className="mt-4">
          <Link
            href="/plan/facial-hair?edit=1"
            className="inline-block rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            Re-pick goal
          </Link>
        </div>
      </section>
    );
  }

  // In progress
  const startDate = new Date(startedAt);
  const elapsedDays = Math.floor(
    (Date.now() - startDate.getTime()) / (24 * 60 * 60 * 1000),
  );
  const remainingDays = Math.max(0, TEST_DAYS - elapsedDays);
  const ready = elapsedDays >= TEST_DAYS;

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          {ready ? 'Test window complete' : 'Grow-out test — in progress'}
        </h2>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">
          Day {Math.min(elapsedDays, TEST_DAYS)} of {TEST_DAYS}
        </span>
      </div>
      {ready ? (
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200">
          You&rsquo;ve hit 4 weeks. Time to evaluate what came in and
          decide direction. Marking complete unlocks the re-pick step.
        </p>
      ) : (
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          Don&rsquo;t shave or trim until day {TEST_DAYS}.{' '}
          {remainingDays} day{remainingDays === 1 ? '' : 's'} to go. The
          temptation to clean up at week 2 is the most common reason
          this test fails — push through.
        </p>
      )}
      {error && (
        <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {ready && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => call('complete')}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? 'Saving…' : 'Mark complete'}
          </button>
        </div>
      )}
    </section>
  );
}
