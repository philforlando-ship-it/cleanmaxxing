'use client';

// Compact inline control for adjusting a goal's baseline stage after
// acceptance. Rendered inside each weekly-focus-card entry so the user
// can correct a misplacement without leaving the Today screen.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type BaselineStage = 'new' | 'light' | 'partial' | 'established';

const BASELINE_LABEL: Record<BaselineStage, string> = {
  new: 'Just starting',
  light: 'Some experience',
  partial: 'Mostly consistent',
  established: 'Already consistent',
};

type Props = {
  goalId: string;
  currentStage: BaselineStage;
};

export function AdjustBaseline({ goalId, currentStage }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BaselineStage>(currentStage);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/goals/${goalId}/baseline`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ baseline_stage: draft }),
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
          setDraft(currentStage);
          setOpen(true);
        }}
        className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        Starting from: {BASELINE_LABEL[currentStage]} · adjust
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={draft}
        onChange={(e) => setDraft(e.target.value as BaselineStage)}
        disabled={pending}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="new">{BASELINE_LABEL.new}</option>
        <option value="light">{BASELINE_LABEL.light}</option>
        <option value="partial">{BASELINE_LABEL.partial}</option>
        <option value="established">{BASELINE_LABEL.established}</option>
      </select>
      <button
        type="button"
        onClick={save}
        disabled={pending || draft === currentStage}
        className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? 'Saving…' : 'Save'}
      </button>
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
