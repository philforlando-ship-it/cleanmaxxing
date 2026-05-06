'use client';

// Try-on panel rendered below the facial-hair report on /plan/facial-hair.
// Renders the 12 reference styles in a grid; each cell can be swapped
// for an AI-generated preview using the user's baseline face photo.
//
// Three rendering paths:
//   - not premium → grid renders reference images only with an upgrade CTA
//   - premium + no baseline photo → grid renders reference images only,
//     "capture baseline at /photos" CTA at top
//   - premium + baseline → each cell has a "Try this on me" button.
//     Button swaps to the generated preview after a successful run.
//     Generated previews persist (server-side row + signed URL); on
//     re-render the cached most-recent generation loads instantly.
//
// Rate limit: 3 generations per 24h. The server returns 429 — surface
// inline so the user knows to come back tomorrow.

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import {
  FACIAL_HAIR_STYLES,
  type FacialHairStyleSlug,
} from '@/lib/facial-hair/types';

type Props = {
  isPremium: boolean;
  hasBaselinePhoto: boolean;
  // Map of style slug → signed URL of the most-recent generation.
  // Empty record when the user has no try-ons yet.
  initialTryOnUrls: Partial<Record<FacialHairStyleSlug, string>>;
  // Style Mister P named in the report (parsed from the report text).
  // null when the report didn't reference one of the 12 named styles
  // — usually because the recommendation was a non-style action like
  // "let it grow another week before deciding."
  recommendedSlug: FacialHairStyleSlug | null;
};

export function FacialHairTryOnPanel({
  isPremium,
  hasBaselinePhoto,
  initialTryOnUrls,
  recommendedSlug,
}: Props) {
  const [open, setOpen] = useState(false);
  const [tryOnUrls, setTryOnUrls] = useState<
    Partial<Record<FacialHairStyleSlug, string>>
  >(initialTryOnUrls);
  // Tracks which slug is currently generating. Null when no generation
  // in flight. Single-slot — server is rate-limited and ordering one at
  // a time keeps the UI predictable.
  const [generating, setGenerating] = useState<FacialHairStyleSlug | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  async function tryOn(slug: FacialHairStyleSlug) {
    if (generating !== null) return; // serialize
    setError(null);
    setGenerating(slug);
    try {
      const res = await fetch('/api/plan/facial-hair/try-on', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ target_style: slug }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        signed_url?: string | null;
        target_style?: FacialHairStyleSlug;
      };
      if (!res.ok) {
        if (body.error === 'rate_limited') {
          setError('Daily try-on limit reached. Try again tomorrow.');
        } else if (body.error === 'no_baseline_photo') {
          setError(
            body.message ?? 'Capture a baseline face photo at /photos first.',
          );
        } else if (body.error === 'premium_required') {
          setError('This is a Premium feature.');
        } else {
          setError(body.message ?? 'Generation failed. Try again later.');
        }
        return;
      }
      if (body.signed_url) {
        setTryOnUrls((prev) => ({ ...prev, [slug]: body.signed_url! }));
      }
    } catch (err) {
      setError(`Network error: ${(err as Error).message}`);
    } finally {
      setGenerating(null);
    }
  }

  // Label of the recommended style — used in the collapsed-view tease
  // and as the badge text on the highlighted grid cell.
  const recommendedLabel =
    recommendedSlug !== null
      ? (FACIAL_HAIR_STYLES.find((s) => s.slug === recommendedSlug)?.label ??
        null)
      : null;

  if (!open) {
    return (
      <section className="mt-8 rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Try a style on yourself
          </span>
          <span className="text-[11px] uppercase tracking-wider text-zinc-500">
            Premium · Optional
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          AI approximation of how each of the 12 styles would look on your
          face, using your baseline photo. Directional sanity check only —
          your real result depends on growth.
        </p>
        {recommendedLabel && (
          <p className="mt-2 text-[12px] text-zinc-700 dark:text-zinc-300">
            Mister P&rsquo;s pick from your plan:{' '}
            <span className="font-semibold">{recommendedLabel}</span>
          </p>
        )}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Open
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Try a style on yourself
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Close
        </button>
      </div>

      <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
        AI approximation. Generations run against your onboarding baseline
        face photo. Limit 3 per day.
      </p>

      {/* Top-of-panel gate — premium / baseline. The grid renders below
          either way; gating just hides the action buttons. */}
      {!isPremium ? (
        <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-[13px] text-zinc-700 dark:text-zinc-300">
            Try-on previews are a Premium feature.
          </p>
          <Link
            href="/settings/billing"
            className="mt-2 inline-block rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Upgrade to Premium
          </Link>
        </div>
      ) : !hasBaselinePhoto ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-[13px] text-amber-900 dark:text-amber-200">
            Capture a baseline face photo at{' '}
            <Link
              href="/photos"
              className="underline decoration-dotted underline-offset-2"
            >
              /photos
            </Link>{' '}
            first — the try-on uses it as the reference for your face.
          </p>
        </div>
      ) : null}

      {error && (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
        {FACIAL_HAIR_STYLES.map((style) => {
          const previewUrl = tryOnUrls[style.slug];
          const showingPreview = previewUrl !== undefined;
          const isGeneratingThis = generating === style.slug;
          const isRecommended = style.slug === recommendedSlug;
          return (
            <li key={style.slug} className="flex flex-col">
              {/* Ring (not border) so the highlight doesn't shift the
                  cell layout vs. unhighlighted cells. */}
              <div
                className={
                  'relative aspect-square w-full overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800' +
                  (isRecommended
                    ? ' ring-2 ring-zinc-900 ring-offset-2 ring-offset-white dark:ring-zinc-100 dark:ring-offset-zinc-900'
                    : '')
                }
              >
                {showingPreview ? (
                  // Generated previews are signed URLs from Supabase
                  // storage — next/image can't optimize them without
                  // domain whitelisting, so use a plain <img>.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={`${style.label} preview`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Image
                    src={style.image_path}
                    alt={style.label}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover"
                  />
                )}
                {isRecommended && (
                  <span className="absolute left-2 top-2 rounded-sm bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-900">
                    Mister P&rsquo;s pick
                  </span>
                )}
                {isGeneratingThis && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/60 text-[11px] text-zinc-100">
                    Generating…
                  </div>
                )}
              </div>
              <span
                className={
                  'mt-2 text-[13px] font-medium text-zinc-900 dark:text-zinc-100' +
                  (isRecommended ? ' underline underline-offset-2' : '')
                }
              >
                {style.label}
              </span>
              {showingPreview && (
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Your preview
                </span>
              )}
              {isPremium && hasBaselinePhoto && (
                <button
                  type="button"
                  onClick={() => tryOn(style.slug)}
                  disabled={generating !== null}
                  className="mt-1.5 self-start text-[11px] text-zinc-700 underline decoration-dotted underline-offset-2 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-300 dark:hover:text-zinc-100"
                >
                  {showingPreview ? 'Regenerate' : 'Try this on me'}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {generating && (
        <p className="mt-4 text-[12px] text-zinc-500 dark:text-zinc-400">
          Generation runs 20–40 seconds. Hang tight.
        </p>
      )}
    </section>
  );
}
