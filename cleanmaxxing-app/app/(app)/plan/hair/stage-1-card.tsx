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
import { cutsForAge } from '@/lib/hair/cut-by-age';

// Density states where we prefer the `_balding` image variant when
// one exists. `mature_hairline` is intentionally excluded — that
// state is "hairline at adult position but density intact," not
// active recession; the regular images already represent it well.
const BALDING_DENSITY_STATES: ReadonlyArray<DensityState> = [
  'receding_hairline',
  'crown_thinning',
  'diffuse_thinning',
  'advanced_thinning',
  'shaved_or_buzzed',
];

// Image candidates in priority order for a (cutFamily, cohort,
// isBalding) tuple. Each suffix priority is then crossed with the
// .png / .jpg / .webp extension order so reference assets can ship
// in any of those formats.
//
// Suffix priority by quadrant:
//   balding + mature   → _balding_mature, _mature, _balding, ""
//   balding + young    → _balding, "", _balding_mature, _mature
//   non-balding + mature → _mature, "", _balding_mature, _balding
//   non-balding + young  → "", _mature, _balding, _balding_mature
//
// The fallbacks let the UI degrade gracefully when only some
// variants exist for a given cut.
function imageCandidates(
  cutFamily: CutFamily,
  cohort: 'young' | 'mature',
  isBalding: boolean,
): string[] {
  const isMature = cohort === 'mature';
  let suffixOrder: string[];
  if (isBalding && isMature) {
    suffixOrder = ['_balding_mature', '_mature', '_balding', ''];
  } else if (isBalding && !isMature) {
    suffixOrder = ['_balding', '', '_balding_mature', '_mature'];
  } else if (!isBalding && isMature) {
    suffixOrder = ['_mature', '', '_balding_mature', '_balding'];
  } else {
    suffixOrder = ['', '_mature', '_balding', '_balding_mature'];
  }
  const exts = ['.png', '.jpg', '.webp'];
  const out: string[] = [];
  for (const suffix of suffixOrder) {
    for (const ext of exts) {
      out.push(`${cutFamily}${suffix}${ext}`);
    }
  }
  return out;
}

// Renders the best available reference image for a cut family,
// keyed on (age cohort × density). The cohort signal is the
// effective-age computed from actual age + age-feel — a 47-year-old
// who self-identifies as much younger gets the young images.
function CutFamilyImage({
  cutFamily,
  cohort,
  density,
  className = 'mt-3 max-h-64 w-full rounded-md object-cover object-top',
}: {
  cutFamily: CutFamily;
  cohort: 'young' | 'mature';
  density: DensityState | null;
  className?: string;
}) {
  const isBalding = density != null && BALDING_DENSITY_STATES.includes(density);
  const candidates = imageCandidates(cutFamily, cohort, isBalding);
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
  // Density drives the alternative-cuts menu and the image-variant
  // chooser (CutFamilyImage prefers _balding files when the user is
  // in active recession / thinning).
  densityState: DensityState;
  age: number | null;
  // Self-perceived age delta from confidence_appearance (2-10 scale,
  // 6 = "about my age"). Combined with actual age to compute the
  // image cohort: a 47yo who reads as much younger gets young
  // images, a 38yo who reads as much older gets mature ones. Null
  // when the user hasn't taken the survey or the value couldn't
  // be parsed.
  ageFeelValue: number | null;
};

// Effective age for image-cohort selection. Cut menu eligibility
// stays on actual age (in lib/hair/cut-by-age.ts) — that's about
// content appropriateness for actual hair coverage. Image cohort is
// purely visual representation, so it tracks how the user reads.
//
// Formula: effective_age = age + (6 - age_feel_value) × 2
// Scale 2 gives a ±8-year swing across the 5 age-feel options.
function effectiveAgeForImageCohort(
  age: number | null,
  ageFeelValue: number | null,
): number | null {
  if (age == null) return null;
  if (ageFeelValue == null) return age;
  return age + (6 - ageFeelValue) * 2;
}

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
  ageFeelValue,
}: Props) {
  const effectiveAge = effectiveAgeForImageCohort(age, ageFeelValue);
  const cohort: 'young' | 'mature' =
    effectiveAge != null && effectiveAge >= 45 ? 'mature' : 'young';
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
        <CutFamilyImage
          cutFamily={cutFamily}
          cohort={cohort}
          density={densityState}
        />
        <p className="mt-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          AI-generated reference. Yours will look different — same family,
          your face, your hairline. Reference cuts here are calibrated for
          straight-to-wavy hair (types 1–2C); coily and tightly-curled
          textures (types 3B–4C) sit, lay, and shape differently — book a
          barber who specializes in your texture and bring this as a
          starting point, not a target.
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
          age={age}
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

// Density+age-filtered alternative cuts. Surfaced under the LLM
// recommendation as "Other cuts that work for you." The user doesn't
// pick from here — Mister P already picked one. This is transparency:
// the user sees the curated subset for their density AND age cohort
// (so a 42-year-old never sees broccoli alongside their slick-back).
// Capped at 4 alternates so the user sees a curated 5-cut set (1
// recommended + up to 4 alternates) without scrolling. Each alternate
// has a "Use this cut" button that POSTs to the override endpoint and
// re-generates the barber instructions for the chosen cut.
const MAX_ALTERNATES = 4;

function OtherCutsForDensity({
  densityState,
  recommended,
  cohort,
  age,
}: {
  densityState: DensityState;
  recommended: CutFamily;
  cohort: 'young' | 'mature';
  age: number | null;
}) {
  const router = useRouter();
  const [overriding, setOverriding] = useState<CutFamily | null>(null);
  const [error, setError] = useState<string | null>(null);

  const densityCuts = cutsForDensity(densityState);
  const ageFiltered = cutsForAge(age, densityCuts);
  const others = ageFiltered
    .filter((c) => c !== recommended)
    .slice(0, MAX_ALTERNATES);
  if (others.length === 0) return null;

  async function chooseCut(cutFamily: CutFamily) {
    setError(null);
    setOverriding(cutFamily);
    try {
      const res = await fetch('/api/plan/hair/stage-1/override', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ cut_family: cutFamily }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? `Override failed (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setOverriding(null);
    }
  }

  return (
    <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-800">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Other cuts that work for you
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        Mister P picked the one above. Pick a different one if it
        suits you better — the barber instructions will rewrite for
        whatever you choose.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-2">
        {others.map((slug) => {
          const isOverriding = overriding === slug;
          return (
            <li
              key={slug}
              className="rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <CutFamilyImage
                cutFamily={slug}
                cohort={cohort}
                density={densityState}
                className="h-32 w-full rounded object-cover object-top"
              />
              <p className="mt-2 text-[12px] font-medium leading-tight text-zinc-800 dark:text-zinc-200">
                {CUT_FAMILY_LABEL[slug]}
              </p>
              <button
                type="button"
                onClick={() => chooseCut(slug)}
                disabled={overriding !== null}
                className="mt-2 w-full rounded border border-zinc-300 bg-white px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {isOverriding ? 'Updating…' : 'Use this cut'}
              </button>
            </li>
          );
        })}
      </ul>
      {error && (
        <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
