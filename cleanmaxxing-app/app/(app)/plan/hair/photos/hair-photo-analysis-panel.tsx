'use client';

// AI hair-photo analysis panel. Premium-gated, opt-in per use, mirrors
// the FacialAnalysisPanel UX: pick two completed sessions, consent on
// first use, run the analysis, render qualitative observations.
//
// Hair-specific dimensions (hairline / crown_density / overall_density /
// scalp_visibility / texture / styling) instead of facial dimensions.

import { useState } from 'react';
import Link from 'next/link';

type Observation = {
  dimension:
    | 'hairline'
    | 'crown_density'
    | 'overall_density'
    | 'scalp_visibility'
    | 'texture'
    | 'styling';
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

type SessionOption = {
  id: string;
  capturedAt: string;
};

type Props = {
  sessions: SessionOption[];
  isPremium: boolean;
};

const DIMENSION_LABEL: Record<Observation['dimension'], string> = {
  hairline: 'Hairline',
  crown_density: 'Crown density',
  overall_density: 'Overall density',
  scalp_visibility: 'Scalp visibility',
  texture: 'Texture',
  styling: 'Styling',
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

const CONSENT_LS_KEY = 'cm.hair-photo-analysis.consented-v1';

export function HairPhotoAnalysisPanel({ sessions, isPremium }: Props) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConsent, setShowConsent] = useState(false);
  const [beforeId, setBeforeId] = useState<string>(
    sessions.length >= 2 ? sessions[sessions.length - 1].id : '',
  );
  const [afterId, setAfterId] = useState<string>(
    sessions.length >= 2 ? sessions[0].id : '',
  );

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
      const res = await fetch('/api/plan/hair/photos/analyze', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          before_session_id: beforeId,
          after_session_id: afterId,
        }),
      });
      const body = (await res.json()) as
        | AnalysisResult
        | { error: string; message?: string };
      if (!res.ok) {
        const err = body as { error: string; message?: string };
        if (err.error === 'rate_limited') {
          setError('Daily limit reached. Try again tomorrow.');
        } else if (err.error === 'anchor_photo_required') {
          setError(
            err.message ??
              'Both sessions need a Front or Top-down photo to compare.',
          );
        } else if (err.error === 'premium_required') {
          setError('This is a Premium feature.');
        } else if (err.error === 'session_not_completed') {
          setError('Both sessions must be marked complete first.');
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
    // For v1, hair_photo_analyses don't have a delete route — they
    // live as user-private rows that the user can clear by deleting
    // the underlying photos. We just clear the on-screen result.
    setResult(null);
  }

  function onTriggerClick() {
    if (!isPremium) return;
    if (!beforeId || !afterId || beforeId === afterId) {
      setError('Pick two different completed sessions to compare.');
      return;
    }
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

  if (sessions.length < 2) {
    return (
      <section className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-900/60">
        <h3 className="text-base font-semibold tracking-tight">
          Observational read
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Mister P can compare two of your completed photo sessions and write
          qualitative observations. Available once you have at least two
          sessions on file.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold tracking-tight">
          Observational read
        </h3>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">
          Premium · Optional
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        Mister P reads what changed between two sessions. Qualitative
        observations only — never a score, ranking, medical interpretation,
        or comparison to anyone else.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="block text-xs text-zinc-600 dark:text-zinc-400">
            Earlier session
          </span>
          <select
            value={beforeId}
            onChange={(e) => setBeforeId(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {new Date(s.capturedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="block text-xs text-zinc-600 dark:text-zinc-400">
            Later session
          </span>
          <select
            value={afterId}
            onChange={(e) => setAfterId(e.target.value)}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {new Date(s.capturedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!isPremium ? (
        <div className="mt-4 flex items-center gap-3">
          <Link
            href="/pricing"
            className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Upgrade to Premium
          </Link>
          <Link
            href="/pricing"
            className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            See free vs premium →
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
            We send these two sessions to Anthropic&rsquo;s API for an
            observational read. Anthropic does not train on your data.
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

      {result && <ResultPanel result={result} onClose={deleteResult} />}
    </section>
  );
}

function ResultPanel({
  result,
  onClose,
}: {
  result: AnalysisResult;
  onClose: () => void;
}) {
  const { observations } = result.observations;
  const { summary, refused, refusal_reason } = result.observations;

  if (refused) {
    return (
      <div className="mt-5 rounded-lg border border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
        <p>{refusal_reason ?? 'Mister P couldn’t read these reliably.'}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 text-xs text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="mt-5">
      {observations.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Mister P didn&rsquo;t see meaningful change in any tracked
          dimension between these two sessions.
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
        <span>Angles used: {result.angles_used.join(', ')}</span>
        <button
          type="button"
          onClick={onClose}
          className="underline hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
