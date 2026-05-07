'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  journeyLabels: string[];
};

export function JourneyWelcome({ journeyLabels }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function finish() {
    setError(null);
    startTransition(async () => {
      const res = await fetch('/api/onboarding/finish', { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Something went wrong.');
        return;
      }
      router.push('/today');
      router.refresh();
    });
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Your plan is ready.
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          {journeyLabels.length > 0
            ? 'You’ll start with these journeys. Each one runs at its own pace — Mister P writes you a focused plan inside.'
            : 'Mister P will guide you from /today. You can pick journeys to focus on at any time.'}
        </p>
      </header>

      {journeyLabels.length > 0 && (
        <ul className="mb-10 flex flex-col gap-2">
          {journeyLabels.map((label) => (
            <li
              key={label}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium dark:border-zinc-800 dark:bg-zinc-900"
            >
              {label}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex flex-col gap-3">
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={finish}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? 'Loading…' : 'Go to Today'}
        </button>
      </div>
    </>
  );
}
