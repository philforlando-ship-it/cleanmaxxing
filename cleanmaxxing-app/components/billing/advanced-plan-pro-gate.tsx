// Shared Pro-gate teaser for the four advanced-tools plan surfaces
// (/plan/trt, /plan/glp1, /plan/peptides, /plan/procedures). Replaces
// the full plan content for Free users. Shipped 2026-05-12 as part of
// the "Pro-gate the advanced plans" decision: Pattern D pharma + the
// procedural-fit hub are now Pro-only features, not just buried
// surfaces.
//
// Voice posture: explain WHAT they'd get and WHY it's gated, in one
// breath. No hard-sell. The POV link gives free users a path to the
// underlying education without the protocol shell.

import Link from 'next/link';

type Props = {
  // Human-readable plan title, e.g. "TRT protocol".
  title: string;
  // One- or two-sentence description of what the Pro user gets that
  // the Free user doesn't. Should reference the Considering / On
  // Protocol / Off-ramp shape concretely.
  description: string;
  // Anchor POV slug for the supplementary read available to all
  // users via /povs/<slug>. Renders the POV link beneath the upgrade
  // CTA when set.
  povSlug?: string;
  povTitle?: string;
};

export function AdvancedPlanProGate({
  title,
  description,
  povSlug,
  povTitle,
}: Props) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/today"
        className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Back to Today
      </Link>

      <header className="mt-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {title}
          </h1>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/50 dark:text-amber-200">
            Pro
          </span>
        </div>
      </header>

      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-medium text-zinc-900 dark:text-zinc-100">
          A Pro plan.
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {description}
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          Cleanmaxxing&rsquo;s advanced-tools plans — TRT, GLP-1s,
          peptides, and the procedural-fit check — are part of what
          Pro unlocks. Free users get the ten focus-area journeys and
          the POV library.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/settings/billing"
            className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Upgrade to Pro
          </Link>
          {povSlug && (
            <Link
              href={`/povs/${povSlug}`}
              className="text-sm text-zinc-600 underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Read the {povTitle ?? 'POV'} in the meantime →
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
