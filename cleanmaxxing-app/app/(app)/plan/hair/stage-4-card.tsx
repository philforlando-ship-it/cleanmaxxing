'use client';

// Stage 4 card on /plan/hair. Four states:
//   1. locked         → Stage 2 not locked in yet
//   2. not started    → "Start daily routine" CTA + target hint
//   3. in progress    → "Day X of N" + log button (or "logged for today")
//   4. complete       → collapsed summary
//
// The daily check-in tile that lives on /today is a separate component
// (hair-routine-card.tsx) — same endpoints, smaller surface, only
// rendered while Stage 4 is in progress. Both surfaces show the
// "Day X of N" framing so pacing is always visible.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  STAGE_4_MISSED_DAY_COPY,
  STAGE_4_TILE_DONE,
  STAGE_4_TILE_LOG_BUTTON,
  milestoneFor,
  progressLine,
  stage4Copy,
} from '@/lib/hair/stage-4-content';

type Props = {
  stage3Acknowledged: boolean;
  isStarted: boolean;
  isComplete: boolean;
  target: number | null;
  count: number;
  hasLoggedToday: boolean;
  startedAt: string | null;
  completedAt: string | null;
  /** When true, the card uses scalp-routine copy instead of the
   *  hair-styling copy. Bald-track / clean-shave / transition users
   *  don't have hair to style; their daily action is scalp care. */
  isBaldTrack: boolean;
};

export function HairStage4Card({
  stage3Acknowledged,
  isStarted,
  isComplete,
  target,
  count,
  hasLoggedToday,
  completedAt,
  isBaldTrack,
}: Props) {
  const copy = stage4Copy(isBaldTrack);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/hair/stage-4/start', {
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

  function log() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/hair/stage-4/log', {
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
  if (!stage3Acknowledged) {
    return (
      <section className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900/50">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Stage 4 — Daily routine
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Unlocks when Stage 3 is acknowledged
          </span>
        </div>
      </section>
    );
  }

  // State 4 — complete.
  if (isComplete && completedAt) {
    return (
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">Stage 4 — Daily routine</span>
            {target && (
              <span className="text-zinc-500">
                {' · '}
                {target} of {target}
              </span>
            )}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Done {new Date(completedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </section>
    );
  }

  // State 3 — in progress.
  if (isStarted && target !== null) {
    const milestone = hasLoggedToday
      ? milestoneFor(count, target, isBaldTrack)
      : null;
    return (
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Stage 4 — Daily routine
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {progressLine(count, target)}
          </span>
        </div>

        <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          {copy.body}
        </p>

        {hasLoggedToday ? (
          <div className="mt-5 space-y-2">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {STAGE_4_TILE_DONE}
            </p>
            {milestone && (
              <p className="text-[13px] text-zinc-600 dark:text-zinc-400">
                {milestone}
              </p>
            )}
          </div>
        ) : (
          <>
            {error && (
              <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={log}
                disabled={pending}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {pending ? 'Saving…' : STAGE_4_TILE_LOG_BUTTON}
              </button>
              {count > 0 && (
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  {STAGE_4_MISSED_DAY_COPY}
                </span>
              )}
            </div>
          </>
        )}
      </section>
    );
  }

  // State 2 — not started.
  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        Stage 4 — Daily routine
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        {copy.title.toLowerCase()} as a daily {isBaldTrack ? 'two' : 'three'}
        -minute habit. Mister P will check in with you on /today. The pace runs
        across two to three weeks — there’s nothing to power through.
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
          {pending ? 'Starting…' : 'Start daily routine'}
        </button>
      </div>
    </section>
  );
}
