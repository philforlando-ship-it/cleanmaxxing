'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function ContinueAnywayButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setError(null);
    const res = await fetch('/api/onboarding/submit', { method: 'POST' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Something went wrong. Try again.');
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
        onClick={go}
        disabled={pending}
        className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Continue anyway
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
