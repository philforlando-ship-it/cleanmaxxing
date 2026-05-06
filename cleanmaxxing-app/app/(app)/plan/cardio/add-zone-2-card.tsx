'use client';

// NEAT → structured Zone 2 transition card. Shows for users who
// started at days_per_week='0_days' (step count baseline only) once
// 4+ weeks have passed since the report was generated and they
// haven't already advanced. Clicking the action bumps days_per_week
// to '1_2_days' and re-runs the report.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  weeksSinceReport: number;
};

export function AddZone2Card({ weeksSinceReport }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const ready = weeksSinceReport >= 4;

  function addZone2() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/cardio/add-zone-2', {
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
            ? 'Step count baseline locked in — add Zone 2'
            : 'Step count baseline — building'}
        </h2>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">
          {weeksSinceReport} of 4+ weeks
        </span>
      </div>
      {ready ? (
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200">
          You&rsquo;ve held the step count floor for a month. The next
          structured layer is 2 Zone 2 sessions a week (30–40 min each)
          on whatever modality you tolerate. Heart rate at conversation
          pace — full sentences but you can&rsquo;t sing. Marking this
          updates your plan to include the structured sessions on top of
          step count.
        </p>
      ) : (
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          Stay on 8,000–10,000 daily steps. Below 7,000, no amount of
          structured cardio fully compensates. Once you&rsquo;ve held
          this for 4 weeks the Zone 2 layer becomes the next move.
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
            onClick={addZone2}
            disabled={pending}
            className="rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {pending
              ? 'Mister P is rewriting your plan…'
              : 'Add Zone 2 and re-run plan'}
          </button>
        </div>
      )}
    </section>
  );
}
