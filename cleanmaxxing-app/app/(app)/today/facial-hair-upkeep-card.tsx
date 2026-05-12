'use client';

// Facial-hair weekly upkeep tile. Surfaces on /today when the user
// is overdue for a groom relative to their stated time_commitment
// cadence. Append-only logging — clicking "just did it" records a
// groom event and the card hides until next due.
//
// Cadence is per-user via time_commitment from the assessment:
//   low    → 7 days
//   medium → 4 days
//   high   → 2 days

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { HairDryerIcon } from '@phosphor-icons/react/ssr';
import { TileIcon } from './tile-icon';
import type { FacialHairGroomState } from '@/lib/facial-hair/groom-service';
import type { TimeCommitment } from '@/lib/facial-hair/types';

type Props = {
  state: FacialHairGroomState;
  timeCommitment: TimeCommitment;
};

const CADENCE_LABEL: Record<TimeCommitment, string> = {
  low: 'About once a week',
  medium: 'A couple times a week',
  high: 'Every other day',
};

export function FacialHairUpkeepCard({ state, timeCommitment }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function record() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/facial-hair/groom', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ notes: null }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Save failed (${res.status})`);
        }
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  const overdueText =
    state.daysSinceLastGroom === null
      ? 'Log when you first do it.'
      : state.daysSinceLastGroom >= state.cadenceDays * 2
        ? `Last groom was ${state.daysSinceLastGroom} days ago — well past your cadence.`
        : `Last groom was ${state.daysSinceLastGroom} days ago.`;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <TileIcon icon={HairDryerIcon} tone="amber" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-lg font-medium">Time for upkeep.</h2>
            <span className="text-[11px] uppercase tracking-wider text-zinc-500">
              {CADENCE_LABEL[timeCommitment]}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {overdueText}
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Cheek line, neckline, stray hairs. The shape matters more than the
            length — a few minutes here is what separates intentional from
            unkempt.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={record}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Logging…' : 'Just did it'}
        </button>
      </div>
    </section>
  );
}
