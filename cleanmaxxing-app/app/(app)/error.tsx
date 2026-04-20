'use client';

// Error boundary for (app) routes. Rendered when a child component throws
// during render. Keeps the user authenticated and inside the app chrome
// rather than dropping them onto a generic browser error screen.
//
// error.tsx must be a client component per Next's conventions — Next
// hydrates this boundary so the reset() call can re-attempt render
// without a full page reload.

import { useEffect } from 'react';
import Link from 'next/link';

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AppError({ error, reset }: Props) {
  useEffect(() => {
    // Surface the error in the console in dev so it's actually debuggable.
    // In production this is silent for the user but can hook into telemetry.
    console.error('App error boundary caught:', error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Something broke</h1>
      <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        We hit an unexpected error rendering this page. Your data is fine —
        this is a display issue, not a lost check-in or goal. Try the page
        again, or head back to Today.
      </p>
      {error.digest && (
        <p className="mt-4 text-xs text-zinc-500">
          Reference: <code className="font-mono">{error.digest}</code>
        </p>
      )}
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Try again
        </button>
        <Link
          href="/today"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Back to Today
        </Link>
      </div>
    </main>
  );
}
