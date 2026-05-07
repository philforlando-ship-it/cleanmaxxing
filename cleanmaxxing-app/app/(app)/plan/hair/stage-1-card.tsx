'use client';

// Stage 1 card on /plan/hair. Three states driven by the assessment row:
//   1. not generated         → "Generate cut recommendation" button
//   2. generated, not done   → cut family + barber instructions + "I got
//                              the cut" button
//   3. completed             → collapsed one-line summary
//
// v1 only — when stage 2 ships, "completed" should also surface a "now
// move to stage 2" affordance. For now it's a quiet end state.

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CUT_FAMILY_LABEL,
  type CutFamily,
  type DensityState,
} from '@/lib/hair/types';
import { cutsForDensity } from '@/lib/hair/cut-by-density';

// Tries the cohort-aware variant first (e.g. caesar_mature.png for
// users 45+), then the un-suffixed file, then .jpg/.webp fallbacks.
// Lets reference assets ship incrementally without the UI breaking
// when only some cut family images exist.
function CutFamilyImage({
  cutFamily,
  cohort,
  className = 'mt-3 max-h-64 w-full rounded-md object-cover',
}: {
  cutFamily: CutFamily;
  cohort: 'young' | 'mature';
  className?: string;
}) {
  const candidates =
    cohort === 'mature'
      ? [
          `${cutFamily}_mature.png`,
          `${cutFamily}_mature.jpg`,
          `${cutFamily}_mature.webp`,
          `${cutFamily}.png`,
          `${cutFamily}.jpg`,
          `${cutFamily}.webp`,
        ]
      : [`${cutFamily}.png`, `${cutFamily}.jpg`, `${cutFamily}.webp`];
  const [idx, setIdx] = useState(0);
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={`/images/cut-families/${candidates[idx]}`}
      alt={CUT_FAMILY_LABEL[cutFamily]}
      onError={() => {
        if (idx < candidates.length - 1) setIdx(idx + 1);
        else setHidden(true);
      }}
      className={className}
    />
  );
}

type Props = {
  cutFamily: CutFamily | null;
  barberText: string | null;
  generatedAt: string | null;
  completedAt: string | null;
  // Try-on additions: when isPremium, the user can generate a "see
  // yourself with this cut" preview. existingTryOnUrl is the
  // most-recent generation for THIS cut family (null when nothing
  // exists yet, or when the user changed cuts since their last try-on).
  isPremium: boolean;
  hasBaselinePhoto: boolean;
  existingTryOnUrl: string | null;
  // Density drives the alternative-cuts menu rendered alongside
  // the LLM recommendation. Age 45+ flips the imagery to the mature
  // cohort variants when available.
  densityState: DensityState;
  age: number | null;
};

export function HairStage1Card({
  cutFamily,
  barberText,
  generatedAt,
  completedAt,
  isPremium,
  hasBaselinePhoto,
  existingTryOnUrl,
  densityState,
  age,
}: Props) {
  const cohort: 'young' | 'mature' = age != null && age >= 45 ? 'mature' : 'young';
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Try-on state. tryOnUrl mirrors existingTryOnUrl on first render,
  // then swaps to the freshly-generated URL after a successful run.
  // tryOnGenerating is the loading state — generation can take 30s+
  // because the Responses API + image_generation tool is slow.
  const [tryOnUrl, setTryOnUrl] = useState<string | null>(existingTryOnUrl);
  const [tryOnGenerating, setTryOnGenerating] = useState(false);
  const [tryOnError, setTryOnError] = useState<string | null>(null);

  const isGenerated = generatedAt !== null;
  const isComplete = completedAt !== null;

  function generate() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/hair/stage-1/generate', {
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

  async function generateTryOn() {
    setTryOnError(null);
    setTryOnGenerating(true);
    try {
      const res = await fetch('/api/plan/hair/try-on', { method: 'POST' });
      const body = (await res.json()) as
        | { id: string; signed_url: string | null; cut_family: CutFamily; created_at: string }
        | { error: string; message?: string };
      if (!res.ok) {
        const err = body as { error: string; message?: string };
        if (err.error === 'rate_limited') {
          setTryOnError('Daily try-on limit reached. Try again tomorrow.');
        } else if (err.error === 'no_baseline_photo') {
          setTryOnError(
            err.message ?? 'Capture a baseline face photo at /photos first.',
          );
        } else if (err.error === 'premium_required') {
          setTryOnError('This is a Premium feature.');
        } else {
          setTryOnError(err.message ?? 'Generation failed. Try again later.');
        }
        return;
      }
      const ok = body as { signed_url: string | null };
      setTryOnUrl(ok.signed_url ?? null);
    } catch (err) {
      setTryOnError(`Network error: ${(err as Error).message}`);
    } finally {
      setTryOnGenerating(false);
    }
  }

  function markComplete() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/hair/stage-1/complete', {
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

  // State 3 — completed: collapsed summary line.
  if (isComplete) {
    return (
      <section className="mt-10 rounded-xl border border-zinc-200 bg-white px-5 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">Stage 1 — Cut</span>
            {cutFamily && (
              <span className="text-zinc-500">
                {' · '}
                {CUT_FAMILY_LABEL[cutFamily]}
              </span>
            )}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Done {new Date(completedAt!).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </section>
    );
  }

  // State 2 — generated, awaiting "I got the cut" gate.
  if (isGenerated && cutFamily && barberText) {
    return (
      <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Stage 1 — Cut strategy
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

        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Recommended cut family
        </p>
        <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {CUT_FAMILY_LABEL[cutFamily]}
        </p>
        <CutFamilyImage cutFamily={cutFamily} cohort={cohort} />
        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          Reference image. Yours will look different — same family, your
          face, your texture, your hairline.
        </p>

        <p className="mt-5 text-sm text-zinc-600 dark:text-zinc-400">
          Tell your barber
        </p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 font-sans text-[14px] leading-relaxed text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
{barberText}
        </pre>

        <TryOnSection
          isPremium={isPremium}
          hasBaselinePhoto={hasBaselinePhoto}
          tryOnUrl={tryOnUrl}
          tryOnGenerating={tryOnGenerating}
          tryOnError={tryOnError}
          onGenerate={generateTryOn}
        />

        <OtherCutsForDensity
          densityState={densityState}
          recommended={cutFamily}
          cohort={cohort}
        />

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
            {pending ? 'Saving…' : 'I got the cut'}
          </button>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Mark this when the cut’s done. Stage 2 unlocks from here.
          </span>
        </div>
      </section>
    );
  }

  // State 1 — not generated yet.
  return (
    <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
        Stage 1 — Cut strategy
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        Mister P picks a cut family that fits your face, density, and hair
        type, and writes the instructions you can hand to a barber. About five
        seconds.
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
          {pending ? 'Mister P is picking your cut…' : 'Generate cut recommendation'}
        </button>
      </div>
    </section>
  );
}

// Try-on section. Renders below the barber instructions in state 2 of
// the Stage 1 card. Three rendering paths:
//   - not premium → upgrade prompt
//   - premium + no baseline photo → "capture a baseline first" prompt
//   - premium + has baseline → button to generate (or render existing)
function TryOnSection({
  isPremium,
  hasBaselinePhoto,
  tryOnUrl,
  tryOnGenerating,
  tryOnError,
  onGenerate,
}: {
  isPremium: boolean;
  hasBaselinePhoto: boolean;
  tryOnUrl: string | null;
  tryOnGenerating: boolean;
  tryOnError: string | null;
  onGenerate: () => void;
}) {
  return (
    <div className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          See yourself with this cut
        </p>
        <span className="text-[11px] uppercase tracking-wider text-zinc-500">
          Premium · Optional
        </span>
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
        AI approximation. Not a real preview — take the barber instructions
        above to your barber for the actual cut. Useful as a directional
        sanity check, not as a commitment.
      </p>

      {!isPremium ? (
        <div className="mt-3">
          <Link
            href="/settings/billing"
            className="inline-block rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Upgrade to Premium
          </Link>
        </div>
      ) : !hasBaselinePhoto ? (
        <p className="mt-3 text-[13px] text-amber-700 dark:text-amber-400">
          Capture a baseline face photo at{' '}
          <Link href="/photos" className="underline">
            /photos
          </Link>{' '}
          first — the try-on uses it as the reference for your face.
        </p>
      ) : tryOnUrl && !tryOnGenerating ? (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={tryOnUrl}
            alt="Try-on preview"
            className="w-full max-w-sm rounded-md object-contain"
          />
          <div className="mt-3">
            <button
              type="button"
              onClick={onGenerate}
              disabled={tryOnGenerating}
              className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Try again
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <button
            type="button"
            onClick={onGenerate}
            disabled={tryOnGenerating}
            className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {tryOnGenerating ? 'Generating preview…' : 'Generate preview'}
          </button>
          {tryOnGenerating && (
            <span className="ml-3 text-[12px] text-zinc-500 dark:text-zinc-400">
              Takes 20-40 seconds.
            </span>
          )}
        </div>
      )}

      {tryOnError && (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400">
          {tryOnError}
        </p>
      )}
    </div>
  );
}

// Density-filtered alternative cuts. Surfaced under the LLM
// recommendation as "Other cuts that work for your density." The user
// doesn't pick from here — Mister P already picked one. This is
// transparency: the user sees the curated subset for their density
// instead of believing the recommendation came from the full 12-cut
// roster. Collapsed by default; expand reveals thumbnails.
function OtherCutsForDensity({
  densityState,
  recommended,
  cohort,
}: {
  densityState: DensityState;
  recommended: CutFamily;
  cohort: 'young' | 'mature';
}) {
  const [expanded, setExpanded] = useState(false);
  const others = cutsForDensity(densityState).filter((c) => c !== recommended);
  if (others.length === 0) return null;
  return (
    <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-baseline justify-between text-left"
      >
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Other cuts that work for your density
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {expanded ? 'Hide' : `Show ${others.length}`}
        </span>
      </button>
      {expanded && (
        <>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Mister P picked the one above. These are the others that
            also fit your density — for context, not for picking.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {others.map((slug) => (
              <li
                key={slug}
                className="rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <CutFamilyImage
                  cutFamily={slug}
                  cohort={cohort}
                  className="h-32 w-full rounded object-cover"
                />
                <p className="mt-2 text-[12px] font-medium leading-tight text-zinc-800 dark:text-zinc-200">
                  {CUT_FAMILY_LABEL[slug]}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
