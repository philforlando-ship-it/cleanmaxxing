'use client';

// Stage 3 card on /plan/hair. Four states:
//   1. locked          → Stage 2 not locked in
//   2. not generated   → "Generate product picks" CTA
//   3. generated, not acknowledged → markdown render + "I have what I need" gate
//   4. acknowledged    → collapsed summary
//
// Renders the recommendation as markdown — same pattern as the report
// page. No structured product objects in v1; the markdown body IS the
// recommendation.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  stage2LockedIn: boolean;
  recommendationText: string | null;
  generatedAt: string | null;
  acknowledgedAt: string | null;
};

export function HairStage3Card({
  stage2LockedIn,
  recommendationText,
  generatedAt,
  acknowledgedAt,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isGenerated = generatedAt !== null && recommendationText !== null;
  const isAcked = acknowledgedAt !== null;

  function generate() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/hair/stage-3/generate', {
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

  function acknowledge() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/hair/stage-3/acknowledge', {
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

  // State 1 — locked.
  if (!stage2LockedIn) {
    return (
      <section className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-5 py-4 dark:border-zinc-700 dark:bg-zinc-900/50">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Stage 3 — Product match
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Unlocks when Stage 2 is locked in
          </span>
        </div>
      </section>
    );
  }

  // State 4 — acknowledged.
  if (isAcked) {
    return (
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">Stage 3 — Products</span>
            <span className="text-zinc-500"> · You have what you need</span>
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Acknowledged{' '}
            {new Date(acknowledgedAt!).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </section>
    );
  }

  // State 3 — generated, awaiting acknowledgment.
  if (isGenerated && recommendationText) {
    return (
      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Stage 3 — Product match
          </h2>
          <button
            type="button"
            onClick={generate}
            disabled={pending}
            className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Re-generate
          </button>
        </div>

        <div className="mt-4">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => (
                <h3 className="mt-6 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {children}
                </h3>
              ),
              h3: ({ children }) => (
                <h4 className="mt-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {children}
                </h4>
              ),
              p: ({ children }) => (
                <p className="mt-2 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {children}
                </p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {children}
                </strong>
              ),
              ul: ({ children }) => (
                <ul className="mt-2 ml-5 list-disc space-y-1 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {children}
                </ul>
              ),
              li: ({ children }) => <li className="pl-1">{children}</li>,
            }}
          >
            {recommendationText}
          </ReactMarkdown>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={acknowledge}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? 'Saving…' : 'I have what I need'}
          </button>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            No new purchase required if you already have a usable equivalent.
          </span>
        </div>
      </section>
    );
  }

  // State 2 — not generated yet.
  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        Stage 3 — Product match
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        Mister P picks three products (or scalp-care items, if you’re on the
        bald track) matched to your hair type and density. Classes, not
        brands — you pick the SKU.
      </p>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Mister P is picking…' : 'Generate product picks'}
        </button>
      </div>
    </section>
  );
}
