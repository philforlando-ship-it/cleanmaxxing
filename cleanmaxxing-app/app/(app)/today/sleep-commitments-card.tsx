'use client';

// /today tile for daily sleep-plan adherence. Lists 1-3 commitments
// derived from the user's sleep assessment and lets them check each
// off for tonight (or this morning, depending on how the user reads
// the list). Per-day state is stored in sleep_commitment_logs.
//
// Design note: the tile shows the LIST regardless of completion,
// rather than collapsing once everything is checked. The visible
// progress signal ("3/3 done") is the daily reward.

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { CommitmentWithTodayLog } from '@/lib/sleep/commitments';

type Props = {
  commitments: CommitmentWithTodayLog[];
};

export function SleepCommitmentsCard({ commitments }: Props) {
  // Mirror server state in local state so toggles render instantly
  // and re-syncs after a server confirm. On error we revert.
  const [items, setItems] = useState(commitments);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const completedCount = items.filter((c) => c.completed_today).length;
  const total = items.length;

  function toggle(commitmentId: string, currentCompleted: boolean) {
    if (pendingId) return; // serialize toggles
    const next = !currentCompleted;
    setError(null);
    setPendingId(commitmentId);
    // Optimistic update.
    setItems((prev) =>
      prev.map((c) =>
        c.id === commitmentId ? { ...c, completed_today: next } : c,
      ),
    );
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/plan/sleep/commitment/${commitmentId}/log`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ completed: next }),
          },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
          };
          throw new Error(
            body.message ?? body.error ?? `Save failed (${res.status})`,
          );
        }
      } catch (err) {
        // Revert on failure so the UI matches the server.
        setItems((prev) =>
          prev.map((c) =>
            c.id === commitmentId
              ? { ...c, completed_today: currentCompleted }
              : c,
          ),
        );
        setError((err as Error).message);
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          Tonight&rsquo;s sleep commitments
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {completedCount}/{total} done
        </span>
      </div>
      <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
        From your{' '}
        <Link
          href="/plan/sleep"
          className="underline decoration-dotted underline-offset-2"
        >
          sleep plan
        </Link>
        . Tap to mark.
      </p>

      <ul className="mt-3 space-y-1.5">
        {items.map((c) => {
          const isPending = pendingId === c.id;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => toggle(c.id, c.completed_today)}
                disabled={pendingId !== null && !isPending}
                className={
                  c.completed_today
                    ? 'flex w-full items-start gap-3 rounded-md border border-zinc-900 bg-zinc-50 px-3 py-2 text-left disabled:opacity-50 dark:border-zinc-100 dark:bg-zinc-800'
                    : 'flex w-full items-start gap-3 rounded-md border border-zinc-200 px-3 py-2 text-left hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
                }
              >
                <span
                  className={
                    c.completed_today
                      ? 'mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border border-zinc-900 bg-zinc-900 text-[10px] text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                      : 'mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded border border-zinc-300 dark:border-zinc-700'
                  }
                  aria-hidden
                >
                  {c.completed_today ? '✓' : ''}
                </span>
                <span
                  className={
                    c.completed_today
                      ? 'flex-1 text-sm text-zinc-700 line-through dark:text-zinc-400'
                      : 'flex-1 text-sm text-zinc-900 dark:text-zinc-100'
                  }
                >
                  {c.text}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="mt-2 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
