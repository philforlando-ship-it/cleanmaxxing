// Sunday's letter is one corrective surface; this is the other.
// When the risk detector fires (over-capacity, polish-without-base,
// circuit breaker, abandon-restart) and the user has no
// self-acceptance goal active, surface a single nudge card linking
// to the recommended template. Server-rendered: dismissal lives in
// localStorage on the client side via a small inline button.

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const DISMISS_KEY = 'cm:self-acceptance-nudge-dismissed-at';
const DISMISS_TTL_DAYS = 14;
const MS_PER_DAY = 86_400_000;

type Props = {
  patternLabel: string;
  recommendedSlug: string;
  recommendedTitle: string;
};

export function SelfAcceptanceNudgeCard({
  patternLabel,
  recommendedSlug,
  recommendedTitle,
}: Props) {
  const [hidden, setHidden] = useState(true);

  // Read dismissal stamp on mount. Card stays hidden by default
  // while we read so users don't see a flicker.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DISMISS_KEY);
      if (!raw) {
        setHidden(false);
        return;
      }
      const ts = Number(raw);
      if (!Number.isFinite(ts)) {
        setHidden(false);
        return;
      }
      const ageDays = (Date.now() - ts) / MS_PER_DAY;
      setHidden(ageDays < DISMISS_TTL_DAYS);
    } catch {
      setHidden(false);
    }
  }, []);

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Ignore storage failures; the card just won't persist its dismissal.
    }
    setHidden(true);
  }

  if (hidden) return null;

  return (
    <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          A note from Mister P
        </h2>
        <button
          type="button"
          onClick={dismiss}
          className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Not now
        </button>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
        {patternLabel} You&rsquo;re doing the work. This might be a good time
        to add a goal that keeps the work from taking over.
      </p>
      <Link
        href={`/povs/${recommendedSlug}`}
        className="mt-3 inline-block text-sm font-medium text-zinc-900 underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300"
      >
        Read “{recommendedTitle}” →
      </Link>
    </section>
  );
}
