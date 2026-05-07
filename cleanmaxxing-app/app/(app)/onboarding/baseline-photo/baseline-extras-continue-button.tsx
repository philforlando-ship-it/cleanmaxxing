'use client';

// "Continue" path off the baseline-extras phase. The user has
// captured the front-face baseline and now sees optional extras
// (close-up, side profile, body front). They can capture as many
// or as few as they want, then click this button to set the
// onboarding_baseline_acked marker and move to /onboarding/complete.
//
// Identical to the skip button's persistence path — POST the
// marker, then push. The split lets the UI carry distinct labels
// for "Skip for now" (no front baseline) vs. "Continue"
// (front captured, extras optional).

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function BaselineExtrasContinueButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function continueOn() {
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
        onClick={continueOn}
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? 'Continuing…' : 'Continue'}
      </button>
    </div>
  );
}
