'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

// Persists the `onboarding_review_acked` marker in survey_responses
// then forwards to the baseline photo step. We POST through the
// existing /api/onboarding/answer route so the storage path is the
// same one the survey questions use — no new endpoint, no new
// table column.

export function ReviewContinueButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function continueToBaseline() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/onboarding/marker', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ marker: 'onboarding_review_acked' }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? 'Could not save. Try again.');
        }
        router.push('/onboarding/baseline-photo');
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="button"
        onClick={continueToBaseline}
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? 'Continuing…' : 'Looks right — continue'}
      </button>
    </div>
  );
}
