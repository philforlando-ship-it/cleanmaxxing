'use client';

// Stage 6 card on /plan/hair. Three states:
//   1. locked       → Stage 5 not started
//   2. not started  → "Lock in maintenance" CTA + cadence preview
//   3. active       → cadence summary + revisit triggers + edit-answers link
//
// Terminal stage. Once active, the journey enters perpetual maintenance
// mode — /today goes quiet on hair unless an event fires (Stage 4 still
// in progress, Stage 5 photo session due).

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  STAGE_6_INTRO,
  STAGE_6_REVISIT_TRIGGERS,
  cadenceLabel,
} from '@/lib/hair/stage-6-content';
import type { CutFamily } from '@/lib/hair/types';

type Props = {
  stage5Started: boolean;
  startedAt: string | null;
  cutCadenceWeeks: number | null;
  cutFamily: CutFamily | null;
};

export function HairStage6Card({
  stage5Started,
  startedAt,
  cutCadenceWeeks,
  cutFamily,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/hair/stage-6/start', {
          method: 'POST',
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  // State 1 — locked.
  if (!stage5Started) {
    return (
      <section className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900/50">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Stage 6 — Maintenance
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Unlocks when Stage 5 is started
          </span>
        </div>
      </section>
    );
  }

  // State 3 — active.
  if (startedAt && cutCadenceWeeks !== null) {
    return (
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Stage 6 — Maintenance
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Locked in{' '}
            {new Date(startedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>

        <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          {STAGE_6_INTRO}
        </p>

        <div className="mt-6">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            Cut cadence
          </h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            {cadenceLabel(cutFamily, cutCadenceWeeks)}
          </p>
        </div>

        <div className="mt-6">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            When to revisit the plan
          </h3>
          <ul className="mt-2 ml-5 list-disc space-y-1.5 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            {STAGE_6_REVISIT_TRIGGERS.map((trigger) => (
              <li key={trigger}>{trigger}</li>
            ))}
          </ul>
        </div>

        <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <Link
            href="/plan/hair?edit=1"
            className="text-sm text-zinc-700 underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            Re-run the assessment →
          </Link>
        </div>
      </section>
    );
  }

  // State 2 — not started.
  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        Stage 6 — Maintenance
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        Lock in your cut cadence + the revisit triggers. After this, the plan
        runs in the background. Most weeks, hair shouldn’t be on your mind.
      </p>
      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="mt-4">
        <button
          type="button"
          onClick={start}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Locking in…' : 'Lock in maintenance'}
        </button>
      </div>
    </section>
  );
}
