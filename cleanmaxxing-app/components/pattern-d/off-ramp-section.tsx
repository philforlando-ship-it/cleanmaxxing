'use client';

// Generic Pattern D Off-ramp section. Renders authored exit-planning
// content + the "I've stopped" button that flips intervention.status
// to 'off'. Surface is reachable from On Protocol pre-stop and is
// the terminal state once status='off'.
//
// Lifted from app/(app)/plan/glp1/off-ramp-section.tsx during the TRT
// buildout. Per-topic strings + API path are passed in via props.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { OffRampContent } from '@/lib/pattern-d/shell-types';
import type { Intervention } from '@/lib/interventions/types';

type Props = {
  content: OffRampContent;
  /** The interventions about to be ended (or already ended). */
  interventions: Intervention[];
  /** When true, the user has marked all interventions of this topic
   *  off and the End CTA is hidden — only history view + maintenance
   *  copy remains. */
  alreadyOff: boolean;
  /** Topic short name shown in the section heading (e.g. "GLP-1"). */
  topicShortName: string;
  /** Slug for the topic — used in copy strings ("Your {topic} protocol"). */
  topicLowerName: string;
  /** Topic page path (e.g. "/plan/glp1") — referenced in already-off copy. */
  topicPagePath: string;
  /** Per-topic copy describing what flips back to non-protocol framing
   *  when the user stops. e.g. "Your nutrition and strength plans
   *  return to their non-GLP-1 framing from that point." */
  endsWithCopy: string;
  /** API base path for this topic, no trailing slash. */
  apiBasePath: string;
};

export function OffRampSection({
  content,
  interventions,
  alreadyOff,
  topicShortName,
  topicLowerName,
  topicPagePath,
  endsWithCopy,
  apiBasePath,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function endAll() {
    setError(null);
    startTransition(async () => {
      try {
        // End each active intervention sequentially. Could parallelize
        // but the surface usually has 1 active row; keeping it
        // sequential makes failure-mode messaging cleaner.
        for (const intervention of interventions) {
          if (intervention.status === 'off') continue;
          const res = await fetch(
            `${apiBasePath}/intervention/${intervention.id}/end`,
            { method: 'POST' },
          );
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as {
              error?: string;
              message?: string;
            };
            throw new Error(
              body.message ?? body.error ?? `Request failed (${res.status})`,
            );
          }
        }
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          {topicShortName} — Off-ramp
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Pattern D
        </span>
      </div>

      <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        {content.intro}
      </p>

      {content.sections.map((section) => (
        <div key={section.heading} className="mt-6">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {section.heading}
          </h3>
          {section.body.map((p, i) => (
            <p
              key={i}
              className="mt-2 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200"
            >
              {p}
            </p>
          ))}
        </div>
      ))}

      <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        {alreadyOff ? (
          <p className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
            Your {topicLowerName} protocol is marked off in the app. The
            history is on file. Re-engage from {topicPagePath} if you start
            again — that creates a new protocol row rather than reactivating
            this one.
          </p>
        ) : (
          <>
            <p className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
              When the protocol actually ends — last dose taken, no plan to
              re-start in the near term — mark it here. {endsWithCopy}
            </p>

            {error && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="mt-4">
              <button
                type="button"
                onClick={endAll}
                disabled={pending}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {pending ? 'Saving…' : content.endProtocolButtonLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
