'use client';

// Stage 1 card on /plan/style. Three states driven by the assessment row:
//   1. no audit yet              → render chip catalog + submit
//   2. audit generated, not done → render audit_text + "I've done this"
//   3. completed                 → collapsed summary line
//
// The chip catalog is loaded from lib/style/closet-audit-content.ts and
// is archetype-scoped — passed in as a prop from the page.

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ClosetAuditChip } from '@/lib/style/closet-audit-content';
import {
  ARCHETYPE_LABEL,
  type ClosetAuditSelections,
  type StyleArchetype,
} from '@/lib/style/types';

// UI state per chip. Three visual states: empty (don't own), owned
// (one tap), owned-but-wrong (second tap). Stored using the existing
// ClosetAuditDirection wire format: 'keep' = owned, 'replace' = owned
// but wrong. The legacy 'cut' direction is no longer emitted by the UI
// but stays readable for any pre-existing rows.
type ChipState = 'empty' | 'owned' | 'wrong';
const CHIP_STATE_TO_DIRECTION = {
  owned: 'keep' as const,
  wrong: 'replace' as const,
};
function directionToState(d: string | undefined): ChipState {
  if (d === 'keep') return 'owned';
  if (d === 'replace') return 'wrong';
  // Legacy 'cut' selections coexist by treating them as 'wrong' so the
  // user can see the prior intent without losing the row.
  if (d === 'cut') return 'wrong';
  return 'empty';
}
function nextState(s: ChipState): ChipState {
  if (s === 'empty') return 'owned';
  if (s === 'owned') return 'wrong';
  return 'empty';
}

// Tries .png → .jpg → .webp before giving up. Lets reference assets
// ship incrementally without the UI breaking when only some archetype
// images exist. Cohort is picked by the parent.
function ArchetypeImage({
  archetype,
  cohort,
}: {
  archetype: StyleArchetype;
  cohort: 'young' | 'mature';
}) {
  const [extIndex, setExtIndex] = useState(0);
  const [hidden, setHidden] = useState(false);
  const exts = ['.png', '.jpg', '.webp'];
  if (hidden) return null;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={`/images/style-archetypes/${archetype}_${cohort}${exts[extIndex]}`}
      alt={ARCHETYPE_LABEL[archetype]}
      onError={() => {
        if (extIndex < exts.length - 1) setExtIndex(extIndex + 1);
        else setHidden(true);
      }}
      className="mt-3 max-h-80 w-full rounded-md object-cover"
    />
  );
}

type Props = {
  targetArchetype: StyleArchetype;
  ageCohort: 'young' | 'mature';
  chips: ReadonlyArray<ClosetAuditChip>;
  existingSelections: ClosetAuditSelections | null;
  auditText: string | null;
  generatedAt: string | null;
  completedAt: string | null;
};

export function StyleStage1Card({
  targetArchetype,
  ageCohort,
  chips,
  existingSelections,
  auditText,
  generatedAt,
  completedAt,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selections, setSelections] = useState<ClosetAuditSelections>(
    existingSelections ?? {},
  );

  const isGenerated = generatedAt !== null && auditText !== null;
  const isComplete = completedAt !== null;

  const counts = useMemo(() => {
    let owned = 0;
    let wrong = 0;
    for (const slug of Object.keys(selections)) {
      const s = directionToState(selections[slug]);
      if (s === 'owned') owned += 1;
      else if (s === 'wrong') wrong += 1;
    }
    return { owned, wrong, total: owned + wrong };
  }, [selections]);

  function cycleChip(slug: string) {
    setSelections((prev) => {
      const current = directionToState(prev[slug]);
      const next = nextState(current);
      const out = { ...prev };
      if (next === 'empty') {
        delete out[slug];
      } else {
        out[slug] = CHIP_STATE_TO_DIRECTION[next];
      }
      return out;
    });
  }

  function submitAudit() {
    setError(null);
    if (counts.total === 0) {
      setError('Tap at least one item before submitting.');
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/style/stage-1/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chip_selections: selections }),
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

  function markComplete() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/style/stage-1/complete', {
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

  // State 3 — completed.
  if (isComplete) {
    return (
      <section className="mt-10 rounded-xl border border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">Stage 1 — Closet audit</span>
            <span className="text-zinc-500"> · done</span>
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {new Date(completedAt!).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </section>
    );
  }

  // State 2 — audit generated, awaiting completion.
  if (isGenerated && auditText) {
    return (
      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Stage 1 — Closet audit
        </h2>

        <article className="mt-4">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => (
                <h3 className="mt-6 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {children}
                </h3>
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
              ol: ({ children }) => (
                <ol className="mt-2 ml-5 list-decimal space-y-1.5 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {children}
                </ol>
              ),
              ul: ({ children }) => (
                <ul className="mt-2 ml-5 list-disc space-y-1.5 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {children}
                </ul>
              ),
              li: ({ children }) => <li className="pl-1">{children}</li>,
            }}
          >
            {auditText}
          </ReactMarkdown>
        </article>

        {error && (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={markComplete}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? 'Saving…' : 'I’ve done this'}
          </button>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Mark this when the audit is done. Stage 2 opens from here.
          </span>
        </div>
      </section>
    );
  }

  // State 1 — chip form.
  return (
    <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        Stage 1 — Closet audit
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        Tap each item you own. Tap again if you own it but it&rsquo;s not
        working — wrong fit, wrong color, dated. Skip anything you
        don&rsquo;t own. Mister P uses what you tap to decide what to do
        first.
      </p>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border border-zinc-300 dark:border-zinc-700" />
          Don&rsquo;t own
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-zinc-900 dark:bg-zinc-100" />
          Own
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full bg-amber-500" />
          Own but wrong
        </span>
      </div>

      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        Target archetype
      </p>
      <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {ARCHETYPE_LABEL[targetArchetype]}
      </p>
      <ArchetypeImage archetype={targetArchetype} cohort={ageCohort} />

      <ul className="mt-6 space-y-2">
        {chips.map((chip) => {
          const state = directionToState(selections[chip.slug]);
          const stateClass =
            state === 'owned'
              ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
              : state === 'wrong'
                ? 'border-amber-500 bg-amber-500/90 text-white dark:bg-amber-500/80'
                : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800';
          const ariaLabel =
            state === 'owned'
              ? `${chip.label} — owned (tap to mark wrong, tap again to clear)`
              : state === 'wrong'
                ? `${chip.label} — owned but wrong (tap to clear)`
                : `${chip.label} — not owned (tap to mark owned)`;
          return (
            <li key={chip.slug}>
              <button
                type="button"
                onClick={() => cycleChip(chip.slug)}
                disabled={pending}
                aria-label={ariaLabel}
                aria-pressed={state !== 'empty'}
                className={`flex w-full items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors disabled:opacity-50 ${stateClass}`}
              >
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium">
                    {chip.label}
                  </span>
                  {chip.hint && (
                    <span
                      className={`mt-0.5 block text-xs ${
                        state === 'empty'
                          ? 'text-zinc-500 dark:text-zinc-400'
                          : 'text-white/80'
                      }`}
                    >
                      {chip.hint}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[11px] font-medium uppercase tracking-wider">
                  {state === 'owned'
                    ? 'Own'
                    : state === 'wrong'
                      ? 'Own · wrong'
                      : 'Tap to mark'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={submitAudit}
          disabled={pending || counts.total === 0}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Mister P is reading your audit…' : 'Submit audit'}
        </button>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {counts.total === 0
            ? 'Tap at least one item to enable submit.'
            : `${counts.owned} own · ${counts.wrong} own but wrong`}
        </span>
      </div>
    </section>
  );
}
