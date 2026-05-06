'use client';

// 12-week step-up card. Shows for users 12+ weeks past
// retinoid_started_at (or last_step_up_at if more recent). Pivots
// the prescription to the next layer in the ladder.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  weeksSinceLastTouch: number;
};

export function StepUpCard({ weeksSinceLastTouch }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function stepUp() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/skincare/step-up', {
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
    <section className="mt-8 rounded-xl border-2 border-emerald-500 bg-emerald-50 p-5 dark:border-emerald-600 dark:bg-emerald-950/30">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          12-week mark — time to step up
        </h2>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">
          {weeksSinceLastTouch}+ weeks since last
        </span>
      </div>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200">
        Skincare runs on a months-not-weeks timeline. Twelve weeks of a
        retinoid baseline is enough for the next layer to compound.
        Mister P&rsquo;s next-move recommendation will pivot to the
        appropriate step-up — prescription tretinoin if you&rsquo;re on
        OTC adapalene, vitamin C in the morning if you&rsquo;re on
        tretinoin already, or the professional layer (peels,
        microneedling) if both are in place.
      </p>
      {error && (
        <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="mt-4">
        <button
          type="button"
          onClick={stepUp}
          disabled={pending}
          className="rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          {pending
            ? 'Mister P is rewriting your plan…'
            : 'Step up and re-run plan'}
        </button>
      </div>
    </section>
  );
}
