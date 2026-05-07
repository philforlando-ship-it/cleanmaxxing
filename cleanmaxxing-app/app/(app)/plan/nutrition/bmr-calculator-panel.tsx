'use client';

// BMR calculator panel on /plan/nutrition. Renders the math behind
// the recommended numbers — BMR via Mifflin-St Jeor, TDEE via the
// activity multiplier, and a 4-row table (cut / maintain / recomp /
// bulk) showing what the targets WOULD be for each goal.
//
// Inputs prepopulate from the user's profile + age. When any input
// is missing, the panel switches to a "complete these in /profile"
// prompt that names the missing fields.
//
// Collapsed by default — this is informational, not load-bearing.
// The user can expand to see the math; advanced users will, average
// users won't.

import { useState } from 'react';
import Link from 'next/link';
import {
  MISSING_INPUT_LABEL,
  type ActivityLevelSource,
  type BmrCalculatorResult,
  type GoalsForPanel,
  type MissingInputName,
  type NutritionTargets,
} from '@/lib/nutrition/tdee';

const GOAL_LABEL: Record<GoalsForPanel, string> = {
  lose_fat: 'Cut (lose fat)',
  maintain: 'Maintain',
  recomp: 'Recomp',
  gain_muscle: 'Bulk (gain muscle)',
};

const ACTIVITY_LABEL: Record<string, string> = {
  sedentary: 'Sedentary',
  lightly_active: 'Lightly active',
  moderately_active: 'Moderately active',
  very_active: 'Very active',
};

type Props = {
  result: BmrCalculatorResult;
};

export function BmrCalculatorPanel({ result }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-baseline justify-between gap-3 px-5 py-4 text-left"
      >
        <div>
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            The math behind your numbers
          </h2>
          <p className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">
            BMR · TDEE · per-goal targets
          </p>
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {expanded ? 'Hide' : 'Show'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
          {result.bmr === null ? (
            <MissingInputsView missing={result.missing} />
          ) : (
            <ComputedView
              bmr={result.bmr}
              tdee={result.tdee}
              perGoal={result.per_goal}
              activity_level={result.activity_level}
              activity_level_source={result.activity_level_source}
            />
          )}
        </div>
      )}
    </section>
  );
}

function MissingInputsView({ missing }: { missing: MissingInputName[] }) {
  return (
    <div className="space-y-3">
      <p className="text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        We can show you BMR + TDEE + per-goal targets once your profile is
        complete. Missing right now:
      </p>
      <ul className="ml-5 list-disc space-y-1 text-[13px] text-zinc-700 dark:text-zinc-300">
        {missing.map((m) => (
          <li key={m}>{MISSING_INPUT_LABEL[m]}</li>
        ))}
      </ul>
      <Link
        href="/profile"
        className="inline-block text-[13px] underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        Update profile →
      </Link>
    </div>
  );
}

function ComputedView({
  bmr,
  tdee,
  perGoal,
  activity_level,
  activity_level_source,
}: {
  bmr: number;
  tdee: number;
  perGoal: Record<GoalsForPanel, NutritionTargets>;
  activity_level: string;
  activity_level_source: ActivityLevelSource;
}) {
  const activityLabel =
    activity_level in ACTIVITY_LABEL
      ? ACTIVITY_LABEL[activity_level]
      : 'your activity level';
  const sourceNote =
    activity_level_source === 'inferred_from_training_minutes'
      ? 'estimated from your training minutes'
      : activity_level_source === 'default'
        ? 'default — not set on profile'
        : null;

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-[13px]">
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            BMR
          </dt>
          <dd className="text-zinc-900 dark:text-zinc-100">
            ~{bmr.toLocaleString()} kcal/day
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            TDEE ({activityLabel})
          </dt>
          <dd className="text-zinc-900 dark:text-zinc-100">
            ~{tdee.toLocaleString()} kcal/day
            {sourceNote && (
              <span className="ml-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                ({sourceNote})
              </span>
            )}
          </dd>
        </div>
      </dl>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-2 pr-3 text-left font-semibold text-zinc-700 dark:text-zinc-300">
                Goal
              </th>
              <th className="py-2 pr-3 text-right font-semibold text-zinc-700 dark:text-zinc-300">
                Calories
              </th>
              <th className="py-2 pr-3 text-right font-semibold text-zinc-700 dark:text-zinc-300">
                Protein
              </th>
              <th className="py-2 pr-3 text-right font-semibold text-zinc-700 dark:text-zinc-300">
                Carbs
              </th>
              <th className="py-2 text-right font-semibold text-zinc-700 dark:text-zinc-300">
                Fat
              </th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(perGoal) as GoalsForPanel[]).map((goal) => {
              const t = perGoal[goal];
              return (
                <tr
                  key={goal}
                  className="border-b border-zinc-100 last:border-b-0 dark:border-zinc-900"
                >
                  <td className="py-1.5 pr-3 text-zinc-800 dark:text-zinc-200">
                    {GOAL_LABEL[goal]}
                  </td>
                  <td className="py-1.5 pr-3 text-right text-zinc-800 dark:text-zinc-200">
                    {t.calorie_target?.toLocaleString() ?? '—'}
                  </td>
                  <td className="py-1.5 pr-3 text-right text-zinc-800 dark:text-zinc-200">
                    {t.protein_target_g != null ? `${t.protein_target_g}g` : '—'}
                  </td>
                  <td className="py-1.5 pr-3 text-right text-zinc-800 dark:text-zinc-200">
                    {t.carb_target_g != null ? `${t.carb_target_g}g` : '—'}
                  </td>
                  <td className="py-1.5 text-right text-zinc-800 dark:text-zinc-200">
                    {t.fat_target_g != null ? `${t.fat_target_g}g` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
        Mifflin-St Jeor BMR. Cut = TDEE − 500 kcal; Bulk = TDEE + 250 kcal.
        Protein scales by goal (0.75 g/lb maintenance, 0.85 recomp, 1.0 cut /
        bulk; 1.1 on GLP-1; 1.0 floor at age 50+). Fat held at 0.35 g/lb.
        Targets get snapshotted onto your plan when you submit the assessment.{' '}
        <Link
          href="/profile"
          className="underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-200"
        >
          Update profile
        </Link>{' '}
        if any of these inputs change.
      </p>
    </div>
  );
}
