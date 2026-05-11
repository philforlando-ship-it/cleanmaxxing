'use client';

// /today tile for facial-structure monthly photo cadence. Mounted by
// today/page.tsx only when:
//   - User has a facial_structure assessment with a report
//   - Stage 1 has been acknowledged (otherwise the photo cadence
//     hasn't started — they haven't engaged with the lever yet)
//   - last_facial_photo_logged_at is null (never logged) OR >30 days ago
//
// Mirrors hair Stage 5 tile shape — informational + a "logged" button
// that stamps the timestamp. The actual photo capture happens
// wherever the user prefers (camera roll, /photos surface); this is
// the cadence reminder, not a photo upload flow.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  isFirstSession: boolean;
  // days since last log (null on first session)
  daysSinceLast: number | null;
};

export function FacialStructurePhotoCard({
  isFirstSession,
  daysSinceLast,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function logSession() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          '/api/plan/facial-structure/photo-session-logged',
          {
            method: 'POST',
          },
        );
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
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          Facial structure — monthly photo
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {isFirstSession
            ? 'Baseline'
            : daysSinceLast !== null
              ? `${daysSinceLast} ${daysSinceLast === 1 ? 'day' : 'days'} since last`
              : 'Due'}
        </span>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        Same lighting, same camera distance, casual face, ideally morning
        before food. Daily mirror checks are too noisy; the monthly
        comparison is the only honest read on whether the face is
        drifting.
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        Take it anywhere you keep photos — phone library, the{' '}
        <a
          href="/photos"
          className="underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          /photos
        </a>{' '}
        surface — and confirm here when done.
      </p>
      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="mt-3">
        <button
          type="button"
          onClick={logSession}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Saving…' : 'I’ve taken this month’s photo'}
        </button>
      </div>
    </section>
  );
}
