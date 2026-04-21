'use client';

// Surfaces when one confidence dimension has stayed persistently low
// across the last N reflections. Intent: quiet prompt toward
// acceptance-oriented POV reading, not a "you're failing" alarm. The
// safety POVs (54 / 55 / 56) are the right content for this moment —
// they exist precisely to widen the frame when goal progress alone
// isn't moving a confidence dimension.
//
// Dismissal is per-dimension via localStorage so dismissing the card
// for appearance doesn't suppress a future card that fires on social.
// The signal re-computes server-side each load, so once the dimension
// climbs back above threshold the card naturally disappears.

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import type { StuckSignal } from '@/lib/confidence/stuck-signal';

type Props = {
  signal: StuckSignal;
};

function storageKeyFor(dimension: string): string {
  return `cleanmaxxing:stuck-confidence-dismissed:${dimension}:v1`;
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

export function StuckConfidenceCard({ signal }: Props) {
  const storageKey = storageKeyFor(signal.dimension);
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

  return (
    <section className="rounded-xl border border-zinc-300 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium">Worth reading</h2>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Not now
        </button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {signal.prompt}
      </p>
      <Link
        href={`/povs/${signal.povSlug}`}
        className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Read: {signal.povTitle}
      </Link>
    </section>
  );
}
