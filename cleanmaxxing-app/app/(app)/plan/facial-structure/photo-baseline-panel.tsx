'use client';

// Photo-baseline analysis panel for the facial-structure journey.
// Pro-gated. Triggers the structured photo extractor and renders the
// resulting categorical features. Subsequent generate-report calls
// read these features as modifiers — the panel itself is the
// transparency layer for the user (so they see what the report is
// reading from the photos).
//
// States:
//   - no baseline front photo on file  → empty state pointing to /profile
//   - never run                        → "Run analysis" button
//   - features present                 → categorical list + re-run option
//   - refused                          → refusal note + re-run option

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import {
  PHOTO_FEATURE_LABEL,
  PHOTO_FEATURE_ORDER,
  featureValueLabel,
  type PhotoFeatures,
} from '@/lib/facial-structure/photo-baseline/types';

type Props = {
  isPremium: boolean;
  // True when at least one face/baseline/front photo exists. False
  // suppresses the action button and points to /profile to capture.
  hasBaselineFront: boolean;
  // Currently persisted features (null if never run / refused).
  features: PhotoFeatures | null;
  // True when the last run was refused (no features but a reason).
  refused: boolean;
  refusalReason: string | null;
  // ISO timestamp of last run (any outcome).
  lastRunAt: string | null;
};

const CONSENT_LS_KEY = 'cm.facial-structure-photo-baseline.consented-v1';

export function PhotoBaselinePanel({
  isPremium,
  hasBaselineFront,
  features,
  refused,
  refusalReason,
  lastRunAt,
}: Props) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
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
    setRunning(true);
    try {
      const res = await fetch('/api/plan/facial-structure/photo-baseline', {
        method: 'POST',
      });
      const body = (await res.json().catch(() => ({}))) as
        | { features: PhotoFeatures | null; refused: boolean }
        | { error: string; message?: string };
      if (!res.ok) {
        const err = body as { error: string; message?: string };
        if (err.error === 'premium_required') {
          setError('This is a Pro feature.');
        } else if (err.error === 'front_photo_required') {
          setError(
            err.message ?? 'Capture a baseline front-facing photo first.',
          );
        } else if (err.error === 'rate_limited') {
          setError(err.message ?? 'Wait a minute before re-running.');
        } else if (err.error === 'assessment_required') {
          setError(
            err.message ?? 'Complete the assessment before running analysis.',
          );
        } else {
          setError(err.message ?? 'Analysis failed. Try again later.');
        }
        return;
      }
      router.refresh();
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setRunning(false);
    }
  }

  function onTriggerClick() {
    if (!isPremium || !hasBaselineFront) return;
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
    <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between">
        <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Photo baseline
        </h3>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">
          Pro · Optional
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Mister P reads your baseline photo and emits structured observations
        (jaw definition, chin projection, midface balance, etc.) that sharpen
        the plan. Categorical, never numeric — no scores, no ranking, no
        comparison to anyone else.
      </p>

      {!hasBaselineFront && (
        <div className="mt-4 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300">
          Capture a baseline front-facing face photo on{' '}
          <Link
            href="/photos"
            className="underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            /photos
          </Link>
          {' '}first. Side and close-up photos are optional and improve coverage.
        </div>
      )}

      {hasBaselineFront && !isPremium && (
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
      )}

      {hasBaselineFront && isPremium && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onTriggerClick}
            disabled={running}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {running
              ? 'Reading…'
              : features
                ? 'Re-run analysis'
                : 'Run analysis'}
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
            Your baseline face photos are sent to Anthropic&rsquo;s API for
            an observational read. Anthropic does not train on your data.
            The output is categorical and never numeric.
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

      {refused && !features && (
        <div className="mt-5 rounded-lg border border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          <p>
            {refusalReason ??
              'Mister P couldn’t read the baseline photos reliably.'}
          </p>
        </div>
      )}

      {features && <FeaturesList features={features} lastRunAt={lastRunAt} />}

      {features && (
        <p className="mt-4 text-[12px] text-zinc-500 dark:text-zinc-400">
          Want to read what visibly changed over time?{' '}
          <Link
            href="/photos"
            className="underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            Compare your photos
          </Link>{' '}
          (Pro · separate observational read across two timepoints).
        </p>
      )}
    </section>
  );
}

function FeaturesList({
  features,
  lastRunAt,
}: {
  features: PhotoFeatures;
  lastRunAt: string | null;
}) {
  const readable = PHOTO_FEATURE_ORDER.filter(
    (k) => k !== 'angles_used' && k !== 'notes',
  ).filter((k) => (features[k] as string) !== 'unreadable');

  return (
    <div className="mt-5">
      <ul className="space-y-2.5">
        {readable.map((k) => (
          <li
            key={k}
            className="flex items-baseline justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900/40"
          >
            <span className="text-zinc-700 dark:text-zinc-300">
              {PHOTO_FEATURE_LABEL[k as keyof typeof PHOTO_FEATURE_LABEL]}
            </span>
            <span className="text-zinc-900 dark:text-zinc-100">
              {featureValueLabel(k, features[k] as string)}
            </span>
          </li>
        ))}
      </ul>
      {features.notes && (
        <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {features.notes}
        </p>
      )}
      <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500">
        <span>Angles read: {features.angles_used.join(', ')}</span>
        {lastRunAt && (
          <span>
            {new Date(lastRunAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
        )}
      </div>
    </div>
  );
}
