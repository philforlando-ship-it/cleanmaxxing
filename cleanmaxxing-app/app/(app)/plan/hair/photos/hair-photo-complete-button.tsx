'use client';

// "Mark session complete" button. Closes the open session, fires the
// Stage 5 counter bump, refreshes the page so the session moves to the
// completed list. Captures optional notes.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  hasFrontOrTopDown: boolean;
};

export function HairPhotoCompleteButton({ hasFrontOrTopDown }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  function complete() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/hair/photos/session/complete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ notes: notes.trim() || null }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="mt-6 rounded-lg border border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        Done with this session?
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
        Closing the session bumps your Stage 5 count and locks the photos in
        as a comparison reference. You can still delete individual photos
        later.
      </p>

      <div className="mt-3">
        <label
          htmlFor="hair-session-notes"
          className="block text-[12px] text-zinc-600 dark:text-zinc-400"
        >
          Notes (optional)
        </label>
        <input
          id="hair-session-notes"
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          placeholder="e.g. one month into fin"
          disabled={pending}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {!hasFrontOrTopDown && (
        <p className="mt-3 text-[12px] text-amber-700 dark:text-amber-400">
          Heads up: at least a Front or Top-down photo makes future
          comparisons reliable. You can still complete without one.
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={complete}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Completing…' : 'Mark session complete'}
        </button>
      </div>
    </div>
  );
}
