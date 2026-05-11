'use client';

// AI facial-analysis trigger + result panel for the photo-compare
// surface. Premium-gated. Sends two slots to /api/facial-analysis/
// analyze, which compares the user's front (and optionally close /
// side) photos at each timepoint and returns qualitative
// observations. Never produces a score, ranking, or comparison to
// other people — see lib/facial-analysis/prompt.ts.

import { useState } from 'react';
import Link from 'next/link';

type Slot = 'baseline' | 'progress_30d' | 'progress_90d' | 'progress_180d';

type Observation = {
  dimension:
    | 'skin'
    | 'facial_fullness'
    | 'jawline_definition'
    | 'chin_projection'
    | 'beard'
    | 'hair'
    | 'undereye'
    | 'posture';
  change_direction: 'improved' | 'neutral' | 'regressed';
  evidence: string;
};

type AnalysisResult = {
  id: string;
  observations: {
    observations: Observation[];
    summary: string | null;
    refused: boolean;
    refusal_reason: string | null;
  };
  angles_used: string[];
};

type Props = {
  beforeSlot: Slot;
  afterSlot: Slot;
  isPremium: boolean;
};

const DIMENSION_LABEL: Record<Observation['dimension'], string> = {
  skin: 'Skin',
  facial_fullness: 'Facial fullness',
  jawline_definition: 'Jawline definition',
  chin_projection: 'Chin projection',
  beard: 'Beard',
  hair: 'Hair',
  undereye: 'Undereye',
  posture: 'Posture',
};

const DIRECTION_LABEL: Record<Observation['change_direction'], string> = {
  improved: '↑',
  neutral: '—',
  regressed: '↓',
};

const DIRECTION_TONE: Record<Observation['change_direction'], string> = {
  improved: 'text-emerald-700 dark:text-emerald-300',
  neutral: 'text-zinc-500 dark:text-zinc-400',
  regressed: 'text-amber-700 dark:text-amber-400',
};

const CONSENT_LS_KEY = 'cm.facial-analysis.consented-v1';

export function FacialAnalysisPanel({ beforeSlot, afterSlot, isPremium }: Props) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConsent, setShowConsent] = useState(false);

  function hasConsented(): boolean {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(CONSENT_LS_KEY) === '1';
  }

  function recordConsent() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CONSENT_LS_KEY, '1');
    }
  }

  async function runAnalysis() {
    setError(null);
    setResult(null);
    setAnalyzing(true);
    try {
      const res = await fetch('/api/facial-analysis/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          before_slot: beforeSlot,
          after_slot: afterSlot,
        }),
      });
      const body = (await res.json()) as
        | AnalysisResult
        | { error: string; message?: string };
      if (!res.ok) {
        const err = body as { error: string; message?: string };
        if (err.error === 'rate_limited') {
          setError('Daily limit reached. Try again tomorrow.');
        } else if (err.error === 'front_photo_required') {
          setError(
            err.message ?? 'Both timepoints need a front-facing photo.',
          );
        } else if (err.error === 'premium_required') {
          setError('This is a Pro feature.');
        } else {
          setError(err.message ?? 'Analysis failed. Try again later.');
        }
        return;
      }
      setResult(body as AnalysisResult);
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function deleteResult() {
    if (!result) return;
    const id = result.id;
    setResult(null);
    // Best-effort delete; failure is non-fatal because the row stays
    // private to the user and the UI is already cleared.
    await fetch(`/api/facial-analysis/${id}`, { method: 'DELETE' }).catch(
      () => {},
    );
  }

  function onTriggerClick() {
    if (!isPremium) return;
    if (hasConsented()) {
      void runAnalysis();
    } else {
      setShowConsent(true);
    }
  }

  function onConsentConfirm() {
    recordConsent();
    setShowConsent(false);
    void runAnalysis();
  }

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold tracking-tight">
          Observational read
        </h3>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">
          Pro
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Mister P reads what changed between the two photos. Qualitative
        observations only — never a score, ranking, or comparison to anyone
        else.
      </p>

      {!isPremium ? (
        <div className="mt-4 flex items-center gap-3">
          <Link
            href="/pricing"
            className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Upgrade to Pro
          </Link>
          <Link
            href="/pricing"
            className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            See free vs Pro →
          </Link>
        </div>
      ) : (
        <div className="mt-4">
          <button
            type="button"
            onClick={onTriggerClick}
            disabled={analyzing}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {analyzing ? 'Reading…' : 'Read this comparison'}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {error}
        </p>
      )}

      {showConsent && (
        <div className="mt-4 rounded-xl border border-zinc-300 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900/60">
          <p className="text-zinc-700 dark:text-zinc-300">
            We send these two photos to Anthropic&rsquo;s API for an
            observational read. Anthropic does not train on your data. You
            can delete the result at any time.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onConsentConfirm}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => setShowConsent(false)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {result && <ResultPanel result={result} onDelete={deleteResult} />}
    </section>
  );
}

function ResultPanel({
  result,
  onDelete,
}: {
  result: AnalysisResult;
  onDelete: () => void;
}) {
  const { observations } = result.observations;
  const { summary, refused, refusal_reason } = result.observations;

  if (refused) {
    return (
      <div className="mt-5 rounded-lg border border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
        <p>{refusal_reason ?? 'Mister P couldn’t read these reliably.'}</p>
        <button
          type="button"
          onClick={onDelete}
          className="mt-3 text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Delete this analysis
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5">
      {observations.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Mister P didn&rsquo;t see meaningful change in any tracked
          dimension between these two photos.
        </p>
      ) : (
        <ul className="space-y-3">
          {observations.map((obs, i) => (
            <li
              key={`${obs.dimension}-${i}`}
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40"
            >
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-base font-semibold ${DIRECTION_TONE[obs.change_direction]}`}
                  aria-label={obs.change_direction}
                >
                  {DIRECTION_LABEL[obs.change_direction]}
                </span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {DIMENSION_LABEL[obs.dimension]}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                {obs.evidence}
              </p>
            </li>
          ))}
        </ul>
      )}

      {summary && (
        <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {summary}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
        <span>
          Angles used: {result.angles_used.join(', ')}
        </span>
        <button
          type="button"
          onClick={onDelete}
          className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Delete this analysis
        </button>
      </div>
    </div>
  );
}
