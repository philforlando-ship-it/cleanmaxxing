'use client';

// Beginner ramp graduation card. Shows for users whose
// training_experience is 'none' or 'under_1y' AND who haven't yet
// marked the ramp as completed. After 8+ weeks since the report was
// generated, the card prompts them to graduate from the full-body
// ramp to the main Israetel framework with a split.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  weeksSinceReport: number;
};

export function BeginnerRampCard({ weeksSinceReport }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Don't show before week 6 — too early for the graduation
  // conversation. Show as "tracking" between 6-8, "ready" at 8+.
  const ready = weeksSinceReport >= 8;

  function graduate() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/strength/graduate-beginner-ramp', {
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
            ? 'Ready to graduate from the beginner ramp'
            : 'Beginner ramp — in progress'}
        </h2>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">
          {weeksSinceReport} of 8+ weeks
        </span>
      </div>
      {ready ? (
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200">
          You&rsquo;ve put in 8+ weeks of consistent linear progression.
          The next move is graduating to a real split — the full-body
          ramp stops paying back beyond this point. Marking yourself as
          graduated re-runs the plan against the main Israetel framework,
          which will recommend a split based on your days_per_week and
          equipment access.
        </p>
      ) : (
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          Stay on the full-body ramp — 3 days a week, 2-3 sets per
          exercise, RIR ramping from 3-4 down to 2 across the weeks.
          Linear progression on the compounds is the signal to track.
          The graduation card unlocks at week 8.
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
            onClick={graduate}
            disabled={pending}
            className="rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {pending
              ? 'Mister P is rewriting your plan…'
              : 'Mark ramp complete and re-run plan'}
          </button>
        </div>
      )}
    </section>
  );
}
