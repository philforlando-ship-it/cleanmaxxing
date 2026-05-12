'use client';

// Monthly photo cadence card on /plan/facial-structure. Pairs with the
// PrimaryActionCard surface on /today — when due, /today's top card
// announces the cadence and links here; this card provides the actual
// log button. When not due, the same card reads as a quiet "next photo
// in N days" reference so the user understands the rhythm without
// being pushed.
//
// Gate: only renders when Stage 1 has been acknowledged (the cadence
// doesn't start until the user has engaged with the lever). Parent
// page passes nulls when prerequisites aren't met and the component
// short-circuits.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CameraIcon } from '@phosphor-icons/react/ssr';
import { TileIcon } from '@/app/(app)/today/tile-icon';

type Props = {
  // Last facial photo log timestamp, or null for first session.
  lastFacialPhotoLoggedAt: string | null;
  // Stage 1 acknowledgement gate. Null hides the card entirely — the
  // cadence hasn't started.
  stage1AcknowledgedAt: string | null;
};

const CADENCE_DAYS = 30;

export function PhotoCadenceCard({
  lastFacialPhotoLoggedAt,
  stage1AcknowledgedAt,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!stage1AcknowledgedAt) return null;

  const isFirstSession = lastFacialPhotoLoggedAt === null;
  const daysSinceLast = lastFacialPhotoLoggedAt
    ? Math.floor(
        (Date.now() - new Date(lastFacialPhotoLoggedAt).getTime()) /
          (24 * 60 * 60 * 1000),
      )
    : null;
  const isDue = isFirstSession || (daysSinceLast !== null && daysSinceLast >= CADENCE_DAYS);
  const daysUntilDue =
    !isFirstSession && daysSinceLast !== null
      ? Math.max(0, CADENCE_DAYS - daysSinceLast)
      : 0;

  function logSession() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          '/api/plan/facial-structure/photo-session-logged',
          { method: 'POST' },
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

  // Reference mode: not due, show a quiet "next photo in N days" line.
  // No button, no urgency.
  if (!isDue) {
    return (
      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <TileIcon icon={CameraIcon} tone="violet" compact />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Monthly photo cadence
            </h3>
            <p className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">
              {daysSinceLast !== null && (
                <>
                  Last logged {daysSinceLast}{' '}
                  {daysSinceLast === 1 ? 'day' : 'days'} ago.{' '}
                </>
              )}
              Next photo in {daysUntilDue}{' '}
              {daysUntilDue === 1 ? 'day' : 'days'}.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Due mode: log button + capture guidance.
  return (
    <section className="mt-10 rounded-xl border border-violet-300 bg-violet-50 p-5 dark:border-violet-900 dark:bg-violet-950/30">
      <div className="flex items-start gap-3">
        <TileIcon icon={CameraIcon} tone="violet" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
              {isFirstSession
                ? 'Baseline facial photo'
                : "This month's facial photo"}
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {isFirstSession
                ? 'Baseline'
                : `${daysSinceLast} ${daysSinceLast === 1 ? 'day' : 'days'} since last`}
            </span>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Same lighting, same camera distance, casual face, ideally
            morning before food. Daily mirror checks are too noisy; the
            monthly comparison is the only honest read on whether the
            face is drifting.
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
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="mt-3">
            <button
              type="button"
              onClick={logSession}
              disabled={pending}
              className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {pending
                ? 'Saving…'
                : isFirstSession
                  ? "I've taken my baseline"
                  : "I've taken this month's photo"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
