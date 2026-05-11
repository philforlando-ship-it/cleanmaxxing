'use client';

// Baseline-floor stage card. Surfaces between the personal report
// and the retinoid card for users whose current_routine at
// assessment was 'none' or 'cleanser_only' — the report itself is
// already authored to anchor on the floor for these users, but the
// active gate (retinoid card) shouldn't unlock until the user
// confirms the floor is actually in place. Marking establishes
// baseline_established_at and re-runs the report so the next-move
// language shifts to the active.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CMSpinner } from '@/components/cm-logo';

export function BaselineFloorCard() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function mark() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/skincare/baseline-established', {
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
      <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
        Lock in the floor before any active.
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200">
        Three products, in this order: a fragrance-free gentle cleanser
        AM and PM, a moisturizer matched to your skin behavior, and SPF
        30+ every morning. That&rsquo;s the floor. Run it for two weeks
        consistently before adding anything — actives on top of a
        compromised barrier give you irritation without progress.
      </p>
      <p className="mt-3 text-[13px] text-zinc-700 dark:text-zinc-300">
        Once those three are in place daily, mark below. Mister P will
        rewrite your plan to recommend the next move.
      </p>
      {error && (
        <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      <div className="mt-4">
        <button
          type="button"
          onClick={mark}
          disabled={pending}
          className="rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          {pending
            ? 'Mister P is rewriting your plan…'
            : 'Floor is in — re-run plan'}
        </button>
        {pending && <CMSpinner size="xs" className="ml-3" />}
      </div>
    </section>
  );
}
