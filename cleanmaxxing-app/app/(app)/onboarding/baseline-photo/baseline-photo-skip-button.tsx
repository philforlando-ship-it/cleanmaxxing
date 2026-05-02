'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

// "Skip" path off the baseline-photo step. Persists the
// `onboarding_baseline_acked` marker so the entry redirector
// doesn't drop the user back here next time they open
// /onboarding. The user can still capture a baseline later via
// /profile or the /today nudge in the first week.
//
// We do not auto-ack on upload — the /onboarding entry redirector
// detects an existing baseline row directly, so a successful
// upload short-circuits the same way without needing the marker.

export function BaselinePhotoSkipButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function skip() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/onboarding/marker', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ marker: 'onboarding_baseline_acked' }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? 'Could not save. Try again.');
        }
        router.push('/onboarding/complete');
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="button"
        onClick={skip}
        disabled={pending}
        className="rounded-lg border border-zinc-300 px-5 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {pending ? 'Skipping…' : 'Skip for now'}
      </button>
    </div>
  );
}
