'use client';

// Per-photo delete control. Two-step confirm to guard against
// accidental clicks on the one-way action.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  photoId: string;
  label: string;
};

export function DeletePhotoButton({ photoId, label }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/progress-photos/delete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: photoId }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Delete failed (${res.status})`);
        }
        setConfirming(false);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-zinc-700 dark:text-zinc-300">Sure?</span>
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="rounded-md bg-zinc-900 px-2.5 py-1 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? 'Deleting…' : 'Yes, delete'}
      </button>
      <button
        type="button"
        onClick={() => {
          setConfirming(false);
          setError(null);
        }}
        disabled={pending}
        className="text-zinc-500 underline dark:text-zinc-400"
      >
        Cancel
      </button>
      {error && <span className="text-red-600">{error}</span>}
    </div>
  );
}
