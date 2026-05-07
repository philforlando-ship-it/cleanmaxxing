'use client';

// /today tile for Stage 5 photo session due. Mounted by today/page.tsx
// only when Stage 5 is started AND a session is due (today or overdue).
// Quiet between sessions — this is NOT a daily nag like Stage 4. Most
// users see this once per quarter.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  isFirstSession: boolean;
  daysUntil: number | null; // negative = overdue; null = first session
  // Anchor photo from the user's most recent COMPLETED session
  // (front for hair track, top_down for bald track). Surfaced
  // alongside the "same place, same light, same angles" copy so
  // the user has a visual reference at the moment of capture.
  // Null on first session (no prior to compare against) or when
  // anchor lookup fails.
  priorAnchorSignedUrl?: string | null;
};

export function HairPhotoDueCard({
  isFirstSession,
  daysUntil,
  priorAnchorSignedUrl = null,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isOverdue = daysUntil !== null && daysUntil < 0;

  function logSession() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/hair/stage-5/log-session', {
          method: 'POST',
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
    <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          Hair photos
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {isFirstSession
            ? 'Baseline'
            : isOverdue
              ? `${Math.abs(daysUntil!)} ${Math.abs(daysUntil!) === 1 ? 'day' : 'days'} overdue`
              : 'Due today'}
        </span>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        Same place, same light, same angles as last time. Open{' '}
        <a
          href="/plan/hair"
          className="underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          /plan/hair
        </a>{' '}
        for the protocol if you need a refresher.
      </p>
      {priorAnchorSignedUrl && (
        <div className="mt-3 flex items-start gap-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950/60">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={priorAnchorSignedUrl}
            alt="Last session anchor"
            className="h-16 w-16 shrink-0 rounded object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Last session
            </p>
            <p className="mt-0.5 text-[12px] leading-snug text-zinc-700 dark:text-zinc-300">
              Match this. Same angle, same crop, same lighting — that’s
              what makes the comparison honest.
            </p>
          </div>
        </div>
      )}
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
          {pending ? 'Saving…' : 'I’ve taken them'}
        </button>
      </div>
    </section>
  );
}
