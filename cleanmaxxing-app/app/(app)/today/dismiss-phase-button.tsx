'use client';

// "Got it" button on each Current Focus entry. Posts the
// current phase identifier to /api/goals/[id]/phase-seen and
// router.refresh()es so the entry stops rendering until the
// user crosses into a new phase. Bounded to the anchor goal of
// each WeeklyFocusCard entry — phase tracking is per-POV, not
// per-goal-when-multiple-share-a-slug, because the walkthrough
// is shared.

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  goalId: string;
  phase: string;
};

export function DismissPhaseButton({ goalId, phase }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function dismiss() {
    startTransition(async () => {
      try {
        await fetch(`/api/goals/${goalId}/phase-seen`, {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ phase }),
        });
        router.refresh();
      } catch {
        // Non-fatal — if the request fails, the user just sees
        // the same entry on next load and can try again.
      }
    });
  }

  return (
    <button
      type="button"
      onClick={dismiss}
      disabled={pending}
      className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {pending ? 'Saving…' : 'Got it'}
    </button>
  );
}
