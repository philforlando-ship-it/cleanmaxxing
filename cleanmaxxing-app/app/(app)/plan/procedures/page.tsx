// /plan/procedures — Considering view for cosmetic procedures plus a
// Pro-gated "procedural-fit check" that produces a personalized read
// on which procedures (if any) would meaningfully help the user.
//
// Pattern note: this isn't a Pattern A journey (no assessment + report
// + stages) and isn't a Pattern D protocol (procedures are one-shot
// events with a re-up cadence, not a continuous protocol). It sits
// on its own — educational content as the standing surface, on-demand
// analysis as the personalized layer.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import { getPremiumStatus } from '@/lib/billing/is-premium';
import { PROCEDURES_CONSIDERING } from '@/lib/procedural-fit/considering-content';
import { getLatestProceduralFitAnalysis } from '@/lib/procedural-fit/service';
import { RunFitCheckButton } from './run-fit-check-button';
import { ProceduralFitResult } from './procedural-fit-result';
import { AdvancedPlanProGate } from '@/components/billing/advanced-plan-pro-gate';

export default async function ProceduresPlanPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  // Hard Pro gate (2026-05-12). Procedures is part of the
  // advanced-tools tier (alongside TRT / GLP-1 / peptides) and is
  // Pro-only. The legacy in-page UpgradeNotice for just the
  // fit-check is now redundant — the whole page never renders for
  // free users.
  const { isPremium } = await getPremiumStatus(user.id);
  if (!isPremium) {
    return (
      <AdvancedPlanProGate
        title="Cosmetic procedures"
        description="The framework view covers Botox, fillers, hair transplant, jawline filler, and structural surgery — when each is genuinely worth it, when it isn't, what's overhyped, and what to ask before consenting. The personalized procedural-fit check then reads your baseline face photo and reports which procedures (if any) would meaningfully help."
        povSlug="28-cosmetic-procedures"
        povTitle="Cosmetic procedures POV"
      />
    );
  }

  const supabase = await createClient();

  // Baseline face photo presence — gates the run CTA. Same hard
  // filter (slot=baseline, angle=front, category=face) as the
  // analysis route to keep the eligibility check honest.
  const { data: photoRow } = await supabase
    .from('progress_photos')
    .select('id')
    .eq('user_id', user.id)
    .eq('slot', 'baseline')
    .eq('angle', 'front')
    .eq('category', 'face')
    .maybeSingle();
  const hasBaselinePhoto = photoRow != null;

  const [premium, latestAnalysis] = await Promise.all([
    getPremiumStatus(user.id),
    getLatestProceduralFitAnalysis(supabase, user.id),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/today"
        className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Back to Today
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Cosmetic procedures
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          The advanced tier — Botox, fillers, structural surgery. Read
          the framework below, then run the personalized check to see
          which (if any) would meaningfully help your face given where
          you currently are.{' '}
          <Link
            href="/povs/28-cosmetic-procedures"
            className="underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Read the full POV
          </Link>{' '}
          for the unfiltered source material.
        </p>
      </header>

      <section className="mt-10">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          The framework
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          {PROCEDURES_CONSIDERING.intro}
        </p>
        <div className="mt-6 space-y-7">
          {PROCEDURES_CONSIDERING.sections.map((section) => (
            <div key={section.heading}>
              <h3 className="text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                {section.heading}
              </h3>
              <div className="mt-2 space-y-3">
                {section.body.map((paragraph, idx) => (
                  <p
                    key={idx}
                    className="text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Personalized procedural-fit check
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          Reads your baseline face photo against your structured state
          (age, age-feel, budget tier, hair status, skincare baseline)
          and tells you which procedure — if any — would actually move
          the needle for your face. Default answer is often &ldquo;no
          procedure yet, here&rsquo;s what to fix first.&rdquo;
        </p>
        <div className="mt-5">
          {!premium.isPremium ? (
            <UpgradeNotice />
          ) : !hasBaselinePhoto ? (
            <NeedsBaselinePhotoNotice />
          ) : (
            <RunFitCheckButton hasExistingResult={latestAnalysis !== null} />
          )}
        </div>
      </section>

      {latestAnalysis && (
        <section className="mt-10">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            Your latest read
          </h2>
          <p className="mt-2 text-[12px] text-zinc-500 dark:text-zinc-400">
            Generated {formatDate(latestAnalysis.created_at)}
          </p>
          <div className="mt-4">
            <ProceduralFitResult
              output={latestAnalysis.output}
              refused={latestAnalysis.refused}
              refusalReason={latestAnalysis.refusal_reason}
            />
          </div>
        </section>
      )}
    </main>
  );
}

function UpgradeNotice() {
  return (
    <div className="rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        The procedural-fit check is a Pro feature. Vision-model
        analysis isn&rsquo;t cheap to run, so it sits behind the
        paywall.
      </p>
      <Link
        href="/settings/billing"
        className="mt-3 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Upgrade to Pro
      </Link>
    </div>
  );
}

function NeedsBaselinePhotoNotice() {
  return (
    <div className="rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        The check needs your baseline face photo as the input. Capture
        one first — it takes a minute.
      </p>
      <Link
        href="/photos"
        className="mt-3 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Capture baseline photo
      </Link>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
