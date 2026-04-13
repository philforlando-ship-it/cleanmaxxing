'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function FinalizeClient() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch('/api/onboarding/submit', { method: 'POST' });
      if (cancelled) return;
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Something went wrong finishing onboarding.');
        return;
      }
      router.push('/onboarding/complete');
      router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="mx-auto flex min-h-[100svh] max-w-xl flex-col items-center justify-center px-6 py-10">
      {error ? (
        <div className="text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => location.reload()}
            className="mt-4 rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Try again
          </button>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Setting things up…</p>
      )}
    </main>
  );
}
