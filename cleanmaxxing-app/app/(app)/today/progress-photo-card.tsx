'use client';

// Progress photo nudge card on /today. Two states:
//   - no baseline: prompt to capture one
//   - 90-day window open, no 90d photo: prompt to capture progress
// Silent otherwise (between baseline capture and day 89, or when
// both photos exist).
//
// Dismissal persists per-state via localStorage — dismissing the
// baseline nudge doesn't auto-dismiss the 90-day nudge 90 days later.

import { useSyncExternalStore } from 'react';
import Link from 'next/link';

type Variant = 'baseline' | 'progress_90d';

type Props = {
  variant: Variant;
};

const STORAGE_KEYS: Record<Variant, string> = {
  baseline: 'cleanmaxxing:progress-baseline-dismissed:v1',
  progress_90d: 'cleanmaxxing:progress-90d-dismissed:v1',
};

function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function makeGetClientSnapshot(storageKey: string): () => boolean {
  return () => {
    try {
      return localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  };
}

function getServerSnapshot(): boolean {
  return false;
}

export function ProgressPhotoCard({ variant }: Props) {
  const storageKey = STORAGE_KEYS[variant];
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

  if (variant === 'baseline') {
    return (
      <section className="rounded-xl border border-zinc-300 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-medium">Capture a baseline photo</h2>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Not now
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          One front-facing photo now becomes your reference point in ninety
          days. Stored privately, visible only to you, no AI analysis.
          Delete any time from Settings.
        </p>
        <Link
          href="/progress"
          className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Take baseline photo
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-emerald-300 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/30">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium">Ninety days in. Capture your progress photo.</h2>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Later
        </button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
        Match the conditions of your baseline as closely as you can — same
        lighting, same angle, neutral expression. The comparison is for you
        to see.
      </p>
      <Link
        href="/progress"
        className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Take 90-day photo
      </Link>
    </section>
  );
}
