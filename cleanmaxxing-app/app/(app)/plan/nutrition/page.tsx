// /plan/nutrition — Pattern A sixth topic, v0. Combines nutrition
// + body-composition direction. Uses the existing felt-sense protein
// log (nutrition_logs) as a live data signal — the report names "X
// out of last Y days hit the protein target" the same way the sleep
// report names rolling avg hours.
//
// Same four states as the other Pattern A v0 plans:
//   1. No assessment yet                    → render the assessment form
//   2. Assessment, no report                → form pre-populated + warning
//   3. Report present, ?edit=1              → form pre-populated for edit
//   4. Report present, no edit param        → render the report

import Link from 'next/link';
import { redirect } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient, getUser } from '@/lib/supabase/server';
import { getProtocolRollup } from '@/lib/interventions/service';
import {
  getUserProfile,
  syncBodyStatsFromSurveyIfMissing,
} from '@/lib/profile/service';
import { computeBmrCalculator } from '@/lib/nutrition/tdee';
import {
  getNutritionAssessment,
  getRecentProteinSignal,
} from '@/lib/nutrition/service';
import { getMostRecentMealPlan } from '@/lib/nutrition/generate-meal-plan';
import type { NutritionAssessment } from '@/lib/nutrition/types';
import {
  NutritionAssessmentForm,
  type NutritionAssessmentInitialValues,
} from './assessment-form';
import { BmrCalculatorPanel } from './bmr-calculator-panel';
import { FoodLibraryPanel } from './food-library-panel';
import { MealPlanPanel } from './meal-plan-panel';
import { NutritionReEvalCard } from './re-eval-card';

type Props = {
  searchParams: Promise<{ edit?: string }>;
};

export default async function NutritionPlanPage({ searchParams }: Props) {
  const params = await searchParams;
  const editParam = params.edit === '1';

  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  // Pull assessment + protein signal + most-recent meal plan in
  // parallel. Targets are read off the assessment row (snapshotted at
  // generation time, no recomputation needed for display).
  const [
    assessment,
    proteinSignal,
    mostRecentMealPlan,
    glp1Rollup,
    initialProfile,
    { data: userRow },
  ] = await Promise.all([
    getNutritionAssessment(supabase, user.id),
    getRecentProteinSignal(supabase, user.id),
    getMostRecentMealPlan(supabase, user.id),
    getProtocolRollup(supabase, user.id, 'glp1'),
    getUserProfile(supabase, user.id),
    supabase.from('users').select('age').eq('id', user.id).maybeSingle(),
  ]);
  // Backfill weight/height from the onboarding survey if the profile
  // columns are still null (pre-dates the onboarding-submit mirror).
  const profile = await syncBodyStatsFromSurveyIfMissing(
    supabase,
    user.id,
    initialProfile,
  );
  const age = (userRow as { age: number | null } | null)?.age ?? null;
  const bmrResult = computeBmrCalculator({
    weight_lbs: profile.current_weight_lbs,
    height_inches: profile.height_inches,
    age,
    activity_level: profile.activity_level,
    daily_training_minutes: profile.daily_training_minutes,
    current_interventions: profile.current_interventions,
  });
  const hasReport = assessment?.report_text != null;
  const showForm = !assessment || !hasReport || editParam;
  const hasComputedTargets =
    assessment !== null &&
    assessment.calorie_target !== null &&
    assessment.protein_target_g !== null;

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
          Your nutrition plan
        </h1>
        {!assessment && (
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Four short questions about your goal, timeline, eating context,
            and what you&rsquo;ve tried. Mister P writes a short, specific
            plan — protein floor + a few high-leverage moves, not a calorie
            target. Felt-sense over surveillance.
          </p>
        )}
        {assessment && editParam && hasReport && (
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Edit your answers and submit. Mister P will rewrite the plan
            with the new inputs.
          </p>
        )}
        {assessment && hasReport && !editParam && (
          <p className="mt-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Body composition changes show up over months, not weeks. Stay
            on the protein floor, give the rest of the plan time, come
            back when something shifts.
          </p>
        )}
      </header>

      <BmrCalculatorPanel result={bmrResult} />

      {glp1Rollup === 'on_protocol' && (
        <aside className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-[13px] text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          You&rsquo;re on a GLP-1. The protein floor here gets emphasized
          — appetite suppression makes underhitting easy. The protocol
          surface is at{' '}
          <Link
            href="/plan/glp1"
            className="underline decoration-dotted underline-offset-2 hover:text-zinc-950 dark:hover:text-zinc-100"
          >
            /plan/glp1
          </Link>
          .
        </aside>
      )}

      {/* Pre-form data preview — only when there's no plan yet AND the
          user has logged at least one day. */}
      {!assessment && proteinSignal.logged_days > 0 && (
        <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            What Mister P will see when writing your plan
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
            <DataRow
              label={`Protein hits (last ${proteinSignal.window_days} days)`}
            >
              {proteinSignal.hit_days}/{proteinSignal.logged_days}
            </DataRow>
            <DataRow label="Logged days in window">
              {proteinSignal.logged_days}
            </DataRow>
          </dl>
          {proteinSignal.logged_days < 7 && (
            <p className="mt-3 text-[12px] text-zinc-500 dark:text-zinc-400">
              Fewer than a week of logged days — the plan will lean on your
              self-report rather than the data signal.
            </p>
          )}
        </section>
      )}

      {assessment && !hasReport && (
        <p className="mt-8 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Mister P couldn&rsquo;t finish your plan last time. Submit again
          and we&rsquo;ll try once more.
        </p>
      )}

      {showForm && (
        <section className={assessment && !hasReport ? 'mt-4' : 'mt-8'}>
          <NutritionAssessmentForm
            initialValues={
              assessment ? assessmentToInitialValues(assessment) : undefined
            }
            currentWeightLbs={profile.current_weight_lbs}
            heightInches={profile.height_inches}
          />
        </section>
      )}

      {!showForm && assessment && hasReport && hasComputedTargets && (
        <section className="mt-8 rounded-xl border-2 border-zinc-900 bg-zinc-50 p-5 dark:border-zinc-100 dark:bg-zinc-900/60">
          <h2 className="text-[12px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Your daily targets
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-5">
            <TargetCell label="Calories" value={`${assessment.calorie_target}`} unit="kcal" />
            <TargetCell label="Protein" value={`${assessment.protein_target_g}`} unit="g" />
            <TargetCell label="Carbs" value={`${assessment.carb_target_g}`} unit="g" />
            <TargetCell label="Fat" value={`${assessment.fat_target_g}`} unit="g" />
            <TargetCell
              label="TDEE estimate"
              value={`${assessment.tdee_estimate}`}
              unit="kcal"
            />
          </dl>
          {(() => {
            const cal = assessment.calorie_target!;
            const p = assessment.protein_target_g!;
            const c = assessment.carb_target_g!;
            const f = assessment.fat_target_g!;
            const pPct = Math.round(((p * 4) / cal) * 100);
            const cPct = Math.round(((c * 4) / cal) * 100);
            const fPct = Math.round(((f * 9) / cal) * 100);
            return (
              <p className="mt-3 text-[12px] text-zinc-600 dark:text-zinc-300">
                Macro split:{' '}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {pPct}% protein · {cPct}% carbs · {fPct}% fat
                </span>
              </p>
            );
          })()}
          <p className="mt-2 text-[12px] text-zinc-500 dark:text-zinc-400">
            Computed from your weight, height, age, and activity level
            (Mifflin-St Jeor × activity multiplier), adjusted for your
            goal. Re-runs whenever you re-generate the plan.
          </p>
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

          {/* 12-week re-evaluation gate. Show when 84+ days since the
              most recent of report_generated_at and last_evaluated_at. */}
          {(() => {
            const lastTouch = assessment.last_evaluated_at
              ? new Date(
                  Math.max(
                    new Date(assessment.last_evaluated_at).getTime(),
                    new Date(assessment.report_generated_at!).getTime(),
                  ),
                )
              : new Date(assessment.report_generated_at!);
            const ageMs = Date.now() - lastTouch.getTime();
            const showReEval = ageMs >= 84 * 24 * 60 * 60 * 1000;
            return showReEval ? (
              <NutritionReEvalCard
                lastEvaluatedAt={lastTouch.toISOString()}
              />
            ) : null;
          })()}

          <FoodLibraryPanel
            dietaryPattern={assessment.dietary_pattern}
            cookingCapacity={assessment.cooking_capacity}
            goalDirection={assessment.goal_direction}
            initialPreferences={assessment.food_preferences}
            initialExclusions={assessment.food_exclusions}
            initialFilterText={assessment.food_filter_text}
          />

          <MealPlanPanel
            initialPlan={
              mostRecentMealPlan
                ? {
                    id: mostRecentMealPlan.id,
                    week_start_app_day: mostRecentMealPlan.week_start_app_day,
                    week_end_app_day: mostRecentMealPlan.week_end_app_day,
                    plan_text: mostRecentMealPlan.plan_text,
                    generated_at: mostRecentMealPlan.generated_at,
                  }
                : null
            }
            hasComputedTargets={hasComputedTargets}
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
              href="/plan/nutrition?edit=1"
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

function TargetCell({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="text-zinc-900 dark:text-zinc-100">
        <span className="text-lg font-semibold">{value}</span>{' '}
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {unit}
        </span>
      </dd>
    </div>
  );
}

function DataRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="text-zinc-800 dark:text-zinc-200">{children}</dd>
    </div>
  );
}

function assessmentToInitialValues(
  a: NutritionAssessment,
): NutritionAssessmentInitialValues {
  return {
    goal_direction: a.goal_direction,
    urgency: a.urgency,
    eating_context: a.eating_context,
    what_tried: a.what_tried,
    fasting_protocol: a.fasting_protocol,
    alcohol_use: a.alcohol_use,
    cannabis_use: a.cannabis_use,
    cooking_capacity: a.cooking_capacity,
    dietary_pattern: a.dietary_pattern,
    meal_service_willingness: a.meal_service_willingness,
    snacking_style: a.snacking_style,
    goal_weight_lbs: a.goal_weight_lbs,
    goal_target_weeks: a.goal_target_weeks,
    bf_pct_assessment: a.bf_pct_assessment,
    nutrition_goal_text: a.nutrition_goal_text,
  };
}
