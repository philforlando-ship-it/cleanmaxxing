// /plan/facial-hair — Pattern A third topic, v0.
//
// Same four states as /plan/hair v0:
//   1. No assessment yet                    → render the assessment form
//   2. Assessment, no report                → form pre-populated + warning
//   3. Report present, ?edit=1              → form pre-populated for edit
//   4. Report present, no edit param        → render the report
//
// "plan" not "journey" in URL and headings — Mister P never uses that
// word in user-facing copy.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient, getUser } from '@/lib/supabase/server';
import { getFacialHairAssessment } from '@/lib/facial-hair/service';
import { listMostRecentTryOnsByStyle } from '@/lib/facial-hair/try-on/service';
import { extractRecommendedStyleSlug } from '@/lib/facial-hair/recommended-style';
import { getPremiumStatus } from '@/lib/billing/is-premium';
import type {
  FacialHairAssessment,
  FacialHairStyleSlug,
} from '@/lib/facial-hair/types';
import {
  FacialHairAssessmentForm,
  type FacialHairAssessmentInitialValues,
} from './assessment-form';
import { FacialHairTryOnPanel } from './try-on-panel';
import { GrowoutCard } from './growout-card';

type Props = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function FacialHairPlanPage({ searchParams }: Props) {
  const params = await searchParams;
  const editParam = params.edit === '1';

  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  // Pull assessment + try-on prerequisites in parallel. Try-on only
  // shows under the report, but the data is cheap to fetch alongside
  // the assessment and lets us avoid a render/refetch flicker.
  const [assessment, { data: baselinePhotoRow }, premium, tryOnsByStyle] =
    await Promise.all([
      getFacialHairAssessment(supabase, user.id),
      supabase
        .from('progress_photos')
        .select('id')
        .eq('user_id', user.id)
        .eq('slot', 'baseline')
        .eq('angle', 'front')
        .eq('category', 'face')
        .maybeSingle(),
      getPremiumStatus(user.id),
      listMostRecentTryOnsByStyle(supabase, user.id),
    ]);
  const hasReport = assessment?.report_text != null;
  const showForm = !assessment || !hasReport || editParam;
  const hasBaselinePhoto = baselinePhotoRow !== null;

  // Convert the Map<slug, full row> into a Record<slug, signed_url>
  // for the client component — the panel only needs the URL string per
  // style, not the full row.
  const initialTryOnUrls: Partial<Record<FacialHairStyleSlug, string>> = {};
  for (const [slug, row] of tryOnsByStyle.entries()) {
    if (row.signed_url) initialTryOnUrls[slug] = row.signed_url;
  }

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
          Your facial hair plan
        </h1>
        {!assessment && (
          <>
            <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              Four quick questions about what you have, what comes in, and
              where you want to take it. Mister P writes you a short, specific
              plan.
            </p>
            <p className="mt-2 text-[13px] text-zinc-500 dark:text-zinc-400">
              {hasBaselinePhoto
                ? 'Premium users: once your plan is written, you can try any of the 12 reference styles on your onboarding baseline photo.'
                : 'Premium users get an extra: try any of the 12 styles on your face. Capture a baseline photo at /photos first to enable it.'}
            </p>
          </>
        )}
        {assessment && editParam && hasReport && (
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Edit your answers and submit. Mister P will rewrite the plan
            with the new inputs.
          </p>
        )}
        {assessment && hasReport && !editParam && (
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Facial hair takes weeks to read fairly. Do the next move, give it
            time, come back when something shifts.
          </p>
        )}
      </header>

      {assessment && !hasReport && (
        <p className="mt-8 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Mister P couldn&rsquo;t finish your plan last time. Submit again
          and we&rsquo;ll try once more.
        </p>
      )}

      {showForm && (
        <section className={assessment && !hasReport ? 'mt-4' : 'mt-8'}>
          <FacialHairAssessmentForm
            initialValues={
              assessment ? assessmentToInitialValues(assessment) : undefined
            }
          />
        </section>
      )}

      {!showForm && assessment && hasReport && (
        <article className="mt-8">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => (
                <h2 className="mt-10 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="mt-8 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="mt-3 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {children}
                </p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {children}
                </strong>
              ),
              ul: ({ children }) => (
                <ul className="mt-3 ml-5 list-disc space-y-1.5 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="mt-3 ml-5 list-decimal space-y-1.5 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {children}
                </ol>
              ),
              li: ({ children }) => <li className="pl-1">{children}</li>,
            }}
          >
            {assessment.report_text!}
          </ReactMarkdown>

          {/* 4-week grow-out test gate. Shows for users whose goal is
              'not_sure_yet' or 'try_new_style'. Other goals don't
              benefit from the test. */}
          {(assessment.goal === 'not_sure_yet' ||
            assessment.goal === 'try_new_style') && (
            <GrowoutCard
              startedAt={assessment.growout_test_started_at}
              completedAt={assessment.growout_test_completed_at}
            />
          )}

          <FacialHairTryOnPanel
            isPremium={premium.isPremium}
            hasBaselinePhoto={hasBaselinePhoto}
            initialTryOnUrls={initialTryOnUrls}
            recommendedSlug={extractRecommendedStyleSlug(
              assessment.report_text,
            )}
          />

          <footer className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>
              Written by Mister P on{' '}
              {new Date(assessment.report_generated_at!).toLocaleDateString(
                undefined,
                { year: 'numeric', month: 'short', day: 'numeric' },
              )}
              .
            </span>
            <Link
              href="/plan/facial-hair?edit=1"
              className="underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              Edit answers
            </Link>
          </footer>
        </article>
      )}
    </main>
  );
}

function assessmentToInitialValues(
  a: FacialHairAssessment,
): FacialHairAssessmentInitialValues {
  return {
    current_state: a.current_state,
    growth_quality: a.growth_quality,
    goal: a.goal,
    time_commitment: a.time_commitment,
    facial_hair_goal_text: a.facial_hair_goal_text,
  };
}
