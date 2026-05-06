'use client';

// /today daily tile for the Stage 4 hair routine. Mounted by today/page.tsx
// only when the user has an active Stage 4 (started + not complete).
// Compact tile, two states: needs to log today / already logged today.
// "Day X of N" framing is always visible — the multi-week pacing IS the
// answer to Chris's overload feedback.
//
// Bald-track variant swaps the title + body so a user without hair to
// style isn't told to apply product. Same endpoint, different copy.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  STAGE_4_TILE_DONE,
  STAGE_4_TILE_LOG_BUTTON,
  progressLine,
  stage4Copy,
} from '@/lib/hair/stage-4-content';

type Props = {
  count: number;
  target: number;
  hasLoggedToday: boolean;
  isBaldTrack: boolean;
};

export function HairRoutineCard({
  count,
  target,
  hasLoggedToday,
  isBaldTrack,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const copy = stage4Copy(isBaldTrack);

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

  if (hasLoggedToday) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {copy.title}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {STAGE_4_TILE_DONE} · {progressLine(count, target)}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          {copy.title}
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {progressLine(count, target)}
        </span>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        {copy.body}
      </p>
      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="mt-3">
        <button
          type="button"
          onClick={log}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Saving…' : STAGE_4_TILE_LOG_BUTTON}
        </button>
      </div>
    </section>
  );
}
