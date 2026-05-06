'use client';

// 12-week re-evaluation card. Surfaces below the report when it's
// been 12+ weeks since the report was generated (or last
// re-evaluated). The button re-runs the plan against the user's
// current profile — if their weight changed, TDEE + macro targets
// recompute automatically.
//
// The cut→maintenance transition is the most common failure mode in
// this domain; this card exists specifically to interrupt the
// "I've been cutting for 6 months" pattern.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  // ISO timestamp of the most recent generation OR re-eval, whichever
  // is newer. Page passes max(report_generated_at, last_evaluated_at).
  lastEvaluatedAt: string;
};

export function NutritionReEvalCard({ lastEvaluatedAt }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const lastDate = new Date(lastEvaluatedAt);
  const weeksSince = Math.floor(
    (Date.now() - lastDate.getTime()) / (7 * 24 * 60 * 60 * 1000),
  );

  function reEvaluate() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/nutrition/re-evaluate', {
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
    <section className="mt-8 rounded-xl border-2 border-amber-300 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-950/40">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-medium text-amber-900 dark:text-amber-200">
          Time to re-evaluate
        </h2>
        <span className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-300">
          {weeksSince}+ weeks since last update
        </span>
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-amber-900 dark:text-amber-200">
        Body comp is downstream of weight × activity × goal, all of which
        drift over months. Update your weight on{' '}
        <a
          href="/profile"
          className="underline decoration-dotted underline-offset-2"
        >
          /profile
        </a>{' '}
        first, then re-run the plan. If you&rsquo;ve been cutting this
        whole time, this is the natural decision point: keep cutting, or
        move to maintenance and let your body settle?
      </p>
      {error && (
        <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={reEvaluate}
          disabled={pending}
          className="rounded-lg bg-amber-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-300"
        >
          {pending
            ? 'Mister P is rewriting your plan…'
            : 'Re-evaluate now'}
        </button>
      </div>
    </section>
  );
}
