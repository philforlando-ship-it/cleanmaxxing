'use client';

// Welcome card for users in their first week post-onboarding. Orients
// them to the /today layout below so the five empty cards don't read
// as "I'm not sure what to do here."
//
// Server gates this on `isFirstRun` (within 7 days of
// onboarding_completed_at), so this component only mounts for users
// who qualify. Dismissal persists via localStorage — cross-device
// sync isn't worth a column for a first-run hint that expires in a week.

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'cleanmaxxing:first-run-dismissed:v1';

export function FirstRunCard() {
  // mounted is used to gate the first render so SSR output always
  // matches the client's pre-localStorage state. Without this, a user
  // who dismissed the card sees a flash of the card before it hides.
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') {
        setDismissed(true);
      }
    } catch {
      // localStorage can throw in private browsing or with storage
      // quota issues. Fall through — worst case the card stays visible.
    }
    setMounted(true);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Non-fatal — the card hides for this session either way.
    }
    setDismissed(true);
  }

  if (!mounted || dismissed) return null;

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
            This week&rsquo;s focus
          </strong>{' '}
          shows a single concrete step for each goal, calibrated to where
          you said you&rsquo;re starting from. Adjust if the placement feels off.
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
