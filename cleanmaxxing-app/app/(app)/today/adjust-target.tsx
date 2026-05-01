'use client';

// Compact inline control for setting/changing/clearing a goal's
// target_date after creation. Mirrors AdjustBaseline's
// closed-text + open-form pattern. Surfaced on /today's
// WeeklyFocusCard and on /goals/[id]'s detail page so the user
// can add a finishline or extend one without leaving the page.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  goalId: string;
  currentTarget: string | null; // YYYY-MM-DD or null
};

function formatTarget(iso: string): string {
  // Render as "Aug 15, 2026". Build via Date so the locale is
  // the user's; new Date('2026-08-15') treats it as UTC, which
  // can shift back a day in negative-offset zones — adding the
  // noon-Z time anchors it to the same calendar day everywhere.
  return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function AdjustTarget({ goalId, currentTarget }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(currentTarget ?? '');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(value: string | null) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/goals/${goalId}/target`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ target_date: value }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Save failed (${res.status})`);
        }
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(currentTarget ?? '');
          setOpen(true);
        }}
        className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        {currentTarget
          ? `Target: ${formatTarget(currentTarget)} · adjust`
          : 'Set a finishline'}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="date"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        disabled={pending}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="button"
        onClick={() =>
          save(draft && /^\d{4}-\d{2}-\d{2}$/.test(draft) ? draft : null)
        }
        disabled={pending || !/^\d{4}-\d{2}-\d{2}$/.test(draft)}
        className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? 'Saving…' : 'Save'}
      </button>
      {currentTarget && (
        <button
          type="button"
          onClick={() => save(null)}
          disabled={pending}
          className="text-xs text-zinc-500 underline dark:text-zinc-400"
        >
          Remove
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        disabled={pending}
        className="text-xs text-zinc-500 underline dark:text-zinc-400"
      >
        Cancel
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
