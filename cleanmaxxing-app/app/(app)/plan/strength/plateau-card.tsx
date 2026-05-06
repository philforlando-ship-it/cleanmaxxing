'use client';

// Plateau intervention card. Shows after 12+ weeks (~3 deload cycles)
// since the report was generated OR the last plateau intervention
// was run. The user invokes this when they're stuck — the prompt
// then centers the next move on the Israetel SFR re-test.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  weeksSinceLastIntervention: number;
};

export function PlateauCard({ weeksSinceLastIntervention }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function intervene() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/strength/plateau-intervention', {
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
          Stuck? Time to re-run the SFR test.
        </h2>
        <span className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-300">
          {weeksSinceLastIntervention}+ weeks since last
        </span>
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-amber-900 dark:text-amber-200">
        Three deload cycles in and progressive overload has stalled?
        That&rsquo;s the signal to re-run Israetel&rsquo;s 4-signal
        Stimulus-Fatigue-Ratio test on every working exercise: did the
        target muscle pump, did it get sore (without joint pain), do you
        actually enjoy doing it, did it leave you fresh enough? Anything
        that fails 2 of 4 gets swapped for a catalog alternative. Use
        the exercise library above to mark the swaps before invoking
        this — the regenerated plan will lean on those picks.
      </p>
      {error && (
        <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="mt-4">
        <button
          type="button"
          onClick={intervene}
          disabled={pending}
          className="rounded-lg bg-amber-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-300"
        >
          {pending
            ? 'Mister P is rewriting your plan…'
            : 'Run plateau intervention'}
        </button>
      </div>
    </section>
  );
}
