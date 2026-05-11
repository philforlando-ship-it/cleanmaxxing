'use client';

// Introduce-retinoid stage card. Shows for users 4+ weeks into the
// plan whose primary_concern is in the retinoid-relevant set
// (acne / aging / uneven_tone) and who haven't already started a
// retinoid. Pivots the plan from baseline-routine to retinoid-
// included routine.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CMSpinner } from '@/components/cm-logo';

type Props = {
  weeksSinceReport: number;
};

export function StartRetinoidCard({ weeksSinceReport }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const ready = weeksSinceReport >= 4;

  function start() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/skincare/start-retinoid', {
          method: 'POST',
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

  return (
    <section
      className={
        ready
          ? 'mt-8 rounded-xl border-2 border-emerald-500 bg-emerald-50 p-5 dark:border-emerald-600 dark:bg-emerald-950/30'
          : 'mt-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900'
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          {ready
            ? 'Baseline routine in. Time to add a retinoid.'
            : 'Baseline routine — building tolerance'}
        </h2>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">
          {weeksSinceReport} of 4+ weeks
        </span>
      </div>
      {ready ? (
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200">
          You&rsquo;ve had cleanser + moisturizer + SPF in for a month —
          your barrier should be settled. The single highest-leverage
          next move is introducing a retinoid: adapalene 0.1% OTC at
          night (start 2 nights a week, ramp to nightly), OR tretinoin
          if you can get a prescriber conversation. Marking this re-runs
          the plan with the retinoid in the routine.
        </p>
      ) : (
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          Stay on cleanser + moisturizer + SPF. The barrier needs ~4
          weeks of consistent baseline before adding actives — too soon
          and you trade short-term irritation for long-term progress.
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
            onClick={start}
            disabled={pending}
            className="rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {pending
              ? 'Mister P is rewriting your plan…'
              : 'Mark started and re-run plan'}
          </button>
          {pending && <CMSpinner size="xs" className="ml-3" />}
        </div>
      )}
    </section>
  );
}
