'use client';

// Stage 2 card on /plan/style. Foundation-pieces capsule for the
// user's target archetype. Three states:
//   1. locked     → render only when stage 1 is complete; before that,
//                   the page does not render this card at all
//   2. in progress → checklist with toggleable acquired flags + manual
//                    "Call it good" button
//   3. completed   → collapsed summary line
//
// Auto-completes server-side when all 5 slugs are acquired (see
// /api/plan/style/stage-2/piece). Users can also manually complete
// via the "Call it good" button.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { FoundationPiece } from '@/lib/style/foundation-pieces-content';

type Props = {
  pieces: ReadonlyArray<FoundationPiece>;
  initialAcquired: ReadonlyArray<string>;
  completedAt: string | null;
};

export function StyleStage2Card({
  pieces,
  initialAcquired,
  completedAt,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [acquired, setAcquired] = useState<Set<string>>(
    () => new Set(initialAcquired),
  );

  const isComplete = completedAt !== null;
  const acquiredCount = acquired.size;

  function togglePiece(slug: string) {
    const willBeAcquired = !acquired.has(slug);
    setError(null);
    // Optimistic update so the chip toggles instantly.
    setAcquired((prev) => {
      const next = new Set(prev);
      if (willBeAcquired) next.add(slug);
      else next.delete(slug);
      return next;
    });
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/style/stage-2/piece', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            piece_slug: slug,
            acquired: willBeAcquired,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        // If the server auto-completed (all 5 acquired), refresh so
        // the page collapses to state 3.
        if (willBeAcquired && acquiredCount + 1 === pieces.length) {
          router.refresh();
        }
      } catch (err) {
        // Revert optimistic update.
        setAcquired((prev) => {
          const next = new Set(prev);
          if (willBeAcquired) next.delete(slug);
          else next.add(slug);
          return next;
        });
        setError((err as Error).message);
      }
    });
  }

  function callItGood() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/style/stage-2/complete', {
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

  if (isComplete) {
    return (
      <section className="mt-10 rounded-xl border border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">Stage 2 — Foundation pieces</span>
            <span className="text-zinc-500"> · {acquiredCount}/{pieces.length} acquired</span>
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {new Date(completedAt!).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        Stage 2 — Foundation pieces
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        The five pieces that anchor your archetype. You don’t need
        them all at once — work through one or two at a time, in the
        order that fits your budget. Mark each as you acquire it.
      </p>

      <ul className="mt-6 space-y-5">
        {pieces.map((piece) => {
          const isAcquired = acquired.has(piece.slug);
          return (
            <li
              key={piece.slug}
              className={`rounded-md border px-4 py-3 transition-colors ${
                isAcquired
                  ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950'
                  : 'border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">
                    {piece.label}
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                    {piece.guidance}
                  </p>
                  {piece.modifier_note && (
                    <p className="mt-1 text-[12px] italic text-zinc-600 dark:text-zinc-400">
                      {piece.modifier_note}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => togglePiece(piece.slug)}
                  disabled={pending}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                    isAcquired
                      ? 'border-emerald-700 bg-emerald-700 text-white hover:bg-emerald-800'
                      : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  {isAcquired ? 'Acquired' : 'Mark acquired'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={callItGood}
          disabled={pending || acquiredCount === 0}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Call it good — Stage 3 ready
        </button>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {acquiredCount}/{pieces.length} pieces marked. Auto-completes
          at {pieces.length}.
        </span>
      </div>
    </section>
  );
}
