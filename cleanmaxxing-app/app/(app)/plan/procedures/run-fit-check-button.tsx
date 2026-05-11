'use client';

// Run-button for the procedural-fit check. Posts to
// /api/plan/procedures/fit-check and refreshes the server component
// on success so the latest result renders inline.

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

type Props = {
  hasExistingResult: boolean;
};

export function RunFitCheckButton({ hasExistingResult }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState(false);

  async function run() {
    setError(null);
    setRunning(true);
    try {
      const res = await fetch('/api/plan/procedures/fit-check', {
        method: 'POST',
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        throw new Error(body.message ?? body.error ?? `Failed (${res.status})`);
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  const busy = running || pending;
  const label = hasExistingResult ? 'Run a fresh read' : 'Run the check';

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {busy ? 'Running…' : label}
      </button>
      {hasExistingResult && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Your previous result stays below. Re-runs build history rather than
          replacing it.
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
