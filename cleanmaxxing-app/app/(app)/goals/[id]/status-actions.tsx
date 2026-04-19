'use client';

// Goal status controls on the detail page. "Mark complete" writes the
// finish state; "Abandon" retires the goal without the finish semantics.
// Both call /api/goals/[id]/status and redirect back to /goals.
//
// Abandon has a two-step confirm because it's the one that's annoying
// if clicked by accident — completed goals stay in history, but an
// abandoned goal requires re-adding from the library to revive.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  goalId: string;
};

export function StatusActions({ goalId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(status: 'completed' | 'abandoned') {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/goals/${goalId}/status`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Save failed (${res.status})`);
        }
        router.push('/goals');
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => submit('completed')}
        disabled={pending}
        className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
      >
        Mark complete
      </button>
      {confirmAbandon ? (
        <>
          <span className="text-xs text-zinc-700 dark:text-zinc-300">
            Abandon this goal?
          </span>
          <button
            type="button"
            onClick={() => submit('abandoned')}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? 'Saving…' : 'Yes, abandon'}
          </button>
          <button
            type="button"
            onClick={() => setConfirmAbandon(false)}
            disabled={pending}
            className="text-xs text-zinc-500 underline dark:text-zinc-400"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmAbandon(true)}
          disabled={pending}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Abandon
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
