'use client';

// Welcome card for users in their first week post-onboarding. Orients
// them to the /today layout below so the five empty cards don't read
// as "I'm not sure what to do here."
//
// Server gates this on `isFirstRun` (within 7 days of
// onboarding_completed_at), so this component only mounts for users
// who qualify. Dismissal persists via localStorage — cross-device
// sync isn't worth a column for a first-run hint that expires in a week.

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'cleanmaxxing:first-run-dismissed:v1';

// useSyncExternalStore gives us the React-idiomatic pattern for reading
// external state (localStorage) without the setState-in-effect lint
// warning. Server snapshot always returns false so the card renders on
// first paint and hydrates consistently; post-hydration the client
// snapshot reads the real value and re-renders if dismissed.
function subscribe(callback: () => void): () => void {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getClientSnapshot(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

export function FirstRunCard() {
  const dismissed = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
      // Manually notify subscribers since setItem doesn't trigger the
      // storage event in the same tab that wrote it.
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    } catch {
      // Non-fatal — if storage throws the card just stays visible.
    }
  }

  if (dismissed) return null;

  return (
    <section className="rounded-xl border border-zinc-300 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium">Your first week</h2>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          aria-label="Dismiss first-run card"
        >
          Dismiss
        </button>
      </div>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        A quick orient — this card goes away after your first week.
      </p>
      <ul className="mt-5 space-y-3 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
        <li>
          <strong className="font-medium text-zinc-900 dark:text-zinc-100">
            Daily check-in
          </strong>{' '}
          takes under a minute. The check-in card below lists your goals —
          mark the ones you moved forward on today.
        </li>
        <li>
          <strong className="font-medium text-zinc-900 dark:text-zinc-100">
            Weekly reflection on Sunday
          </strong>{' '}
          asks four questions on a 1&ndash;10 scale. That&rsquo;s what draws
          the confidence trend you&rsquo;ll see over time.
        </li>
        <li>
          <strong className="font-medium text-zinc-900 dark:text-zinc-100">
            Current focus
          </strong>{' '}
          shows the concrete step for each goal&rsquo;s current phase,
          calibrated to where you said you&rsquo;re starting from. The text
          changes when you cross into a new phase, not every week. Adjust if
          the placement feels off.
        </li>
        <li>
          <strong className="font-medium text-zinc-900 dark:text-zinc-100">
            Mister P (the chat below)
          </strong>{' '}
          pulls from the full POV corpus. Use it when something isn&rsquo;t
          clear or you want deeper context on a goal.
        </li>
      </ul>
    </section>
  );
}
