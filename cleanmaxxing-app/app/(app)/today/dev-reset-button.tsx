'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function DevResetButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function reset() {
    setError(null);
    const res = await fetch('/api/dev/reset-onboarding', { method: 'POST' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Reset failed.');
      return;
    }
    startTransition(() => {
      router.push('/onboarding/complete');
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={reset}
        disabled={pending}
        title="Dev only — abandons active goals and sends you back to the goal picker"
        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/60"
      >
        {pending ? 'Resetting…' : 'Reset to picker (dev)'}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
