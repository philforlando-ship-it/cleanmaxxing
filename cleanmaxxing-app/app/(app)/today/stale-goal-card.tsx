'use client';

// Low-stakes re-entry card. Fires when a single active goal hasn't been
// ticked in 9+ days (and the goal is past its 14-day grace window).
// Tone: awareness, not reproach. Two exits: manage the goal (adjust
// baseline / pause / swap on its detail page) or dismiss for this
// session.
//
// Dismissal is per-goal via localStorage keyed by goal_id so dismissing
// one stale goal doesn't suppress a future different stale goal. Not a
// server-side suppression because the nudge naturally clears the next
// time the user ticks the goal (stale detection returns null once the
// last-tick date is fresh again).

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import type { StaleGoal } from '@/lib/check-in/service';

type Props = {
  staleGoal: StaleGoal;
};

function storageKeyFor(goalId: string): string {
  return `cleanmaxxing:stale-goal-dismissed:${goalId}:v1`;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function makeGetClientSnapshot(key: string): () => boolean {
  return () => {
    try {
      return localStorage.getItem(key) === 'true';
    } catch {
      return false;
    }
  };
}

function getServerSnapshot(): boolean {
  return false;
}

export function StaleGoalCard({ staleGoal }: Props) {
  const storageKey = storageKeyFor(staleGoal.goal_id);
  const dismissed = useSyncExternalStore(
    subscribe,
    makeGetClientSnapshot(storageKey),
    getServerSnapshot,
  );

  function dismiss() {
    try {
      localStorage.setItem(storageKey, 'true');
      window.dispatchEvent(new StorageEvent('storage', { key: storageKey }));
    } catch {
      // non-fatal
    }
  }

  if (dismissed) return null;

  const copy =
    staleGoal.daysSinceLastTick === null
      ? `You haven\u2019t logged any movement on "${staleGoal.title}" yet.`
      : `You haven\u2019t moved "${staleGoal.title}" forward in ${staleGoal.daysSinceLastTick} days.`;

  return (
    <section className="rounded-xl border border-amber-300 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium text-amber-900 dark:text-amber-200">
          Something changed on this one?
        </h2>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-xs text-amber-900/70 underline hover:text-amber-900 dark:text-amber-200/70 dark:hover:text-amber-200"
        >
          Dismiss
        </button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
        {copy} No judgment &mdash; sometimes the goal needs to shrink,
        sometimes it needs to go. You can adjust the baseline, pause it,
        or swap it out from the goal&rsquo;s detail page. Or just tick it
        today in the check-in below if the gap was just a rough week.
      </p>
      <Link
        href={`/goals/${staleGoal.goal_id}`}
        className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Manage this goal
      </Link>
    </section>
  );
}
