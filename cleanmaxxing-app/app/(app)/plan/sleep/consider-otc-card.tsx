'use client';

// Behavioral baseline → OTC supplements consideration card. Shows
// for users 4+ weeks into the plan whose rolling avg is still poor
// (< 7 hours) — surfaces the OTC supplement layer as the next move
// before escalating to a prescriber conversation.
//
// Acknowledging the gate just stamps a timestamp; the report's
// existing supplement guidance is the real content. Future iteration
// could add per-supplement check-offs to the /today tile.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  weeksSinceReport: number;
  rollingAvgHours: number | null;
};

export function ConsiderOtcCard({
  weeksSinceReport,
  rollingAvgHours,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function acknowledge() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/sleep/consider-otc', {
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
          Behavioral baseline in. Time to consider OTC supplements.
        </h2>
        <span className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-300">
          {weeksSinceReport}+ weeks{' '}
          {rollingAvgHours !== null
            ? ` · avg ${rollingAvgHours}h`
            : ''}
        </span>
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-amber-900 dark:text-amber-200">
        You&rsquo;ve worked the schedule + caffeine + alcohol levers for
        a month. If sleep still isn&rsquo;t landing, the OTC supplements
        in your plan are the next layer worth trying — magnesium glycinate
        (200–400mg), glycine (3g), or melatonin (0.3–1mg, NOT 5–10mg) at
        the timings the plan describes. If after another 4 weeks
        nothing has shifted, that&rsquo;s the prescriber conversation.
      </p>
      {error && (
        <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="mt-4">
        <button
          type="button"
          onClick={acknowledge}
          disabled={pending}
          className="rounded-lg bg-amber-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-300"
        >
          {pending ? 'Saving…' : 'Acknowledge — moving to OTC layer'}
        </button>
      </div>
    </section>
  );
}
