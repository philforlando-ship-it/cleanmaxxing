'use client';

// Weekly sleep review panel rendered on /plan/sleep below the
// commitments section. Shows the most-recent generated review and a
// button to (re-)generate. Generation is idempotent for the current
// week — re-clicking overwrites the same row.

import { useState, useTransition } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type ReviewSummary = {
  id: string;
  week_start_app_day: string;
  week_end_app_day: string;
  review_text: string;
  generated_at: string;
};

type Props = {
  initialReview: ReviewSummary | null;
};

export function SleepWeeklyReviewPanel({ initialReview }: Props) {
  const [review, setReview] = useState<ReviewSummary | null>(initialReview);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/sleep/weekly-review/generate', {
          method: 'POST',
        });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
          review?: ReviewSummary;
        };
        if (!res.ok) {
          throw new Error(
            body.message ?? body.error ?? `Request failed (${res.status})`,
          );
        }
        if (body.review) setReview(body.review);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          Weekly review
        </h2>
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className="text-xs text-zinc-700 underline decoration-dotted underline-offset-2 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          {pending
            ? 'Mister P is reading your week…'
            : review
              ? 'Re-roll'
              : 'Generate this week'}
        </button>
      </div>
      <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
        7-day retrospective using your sleep logs + commitment adherence.
        Idempotent for the current week — re-rolling overwrites.
      </p>

      {error && (
        <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {review ? (
        <article className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {formatRange(review.week_start_app_day, review.week_end_app_day)}
            {' · '}generated{' '}
            {new Date(review.generated_at).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </p>
          <div className="mt-2">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => (
                  <h3 className="mt-4 text-[14px] font-semibold text-zinc-900 first:mt-0 dark:text-zinc-100">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="mt-2 text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {children}
                  </strong>
                ),
                ul: ({ children }) => (
                  <ul className="mt-2 ml-5 list-disc space-y-1 text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                    {children}
                  </ul>
                ),
                li: ({ children }) => <li className="pl-1">{children}</li>,
              }}
            >
              {review.review_text}
            </ReactMarkdown>
          </div>
        </article>
      ) : (
        <p className="mt-3 text-[13px] text-zinc-600 dark:text-zinc-400">
          No review generated yet. Click &ldquo;Generate this week&rdquo; once
          you have a few logged nights and a few days of commitment data.
        </p>
      )}
    </section>
  );
}

function formatRange(startAppDay: string, endAppDay: string): string {
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00Z').toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  return `${fmt(startAppDay)} – ${fmt(endAppDay)}`;
}
