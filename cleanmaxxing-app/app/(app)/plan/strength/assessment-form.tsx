'use client';

// Strength training assessment form. Mirrors the other Pattern A v0
// forms: four required questions + optional free text.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CURRENT_SPLIT_LABEL,
  DAYS_PER_WEEK_LABEL,
  EQUIPMENT_ACCESS_LABEL,
  PRIMARY_GOAL_LABEL,
  type StrengthCurrentSplit,
  type StrengthDaysPerWeek,
  type StrengthEquipmentAccess,
  type StrengthPrimaryGoal,
} from '@/lib/strength/types';

const PRIMARY_GOALS: StrengthPrimaryGoal[] = [
  'size',
  'strength',
  'both',
  'general_fitness',
  'not_sure',
];

const DAYS_PER_WEEKS: StrengthDaysPerWeek[] = [
  '2_days',
  '3_days',
  '4_days',
  '5_days',
  '6_days',
];

const EQUIPMENT_ACCESSES: StrengthEquipmentAccess[] = [
  'full_commercial_gym',
  'home_rack_bench',
  'minimal_dumbbells',
  'bodyweight_only',
];

const CURRENT_SPLITS: StrengthCurrentSplit[] = [
  'none_or_inconsistent',
  'full_body',
  'upper_lower',
  'push_pull_legs',
  'bro_split',
  '5_day_aesthetic',
  'other',
];

export type StrengthAssessmentInitialValues = {
  primary_goal: StrengthPrimaryGoal;
  days_per_week: StrengthDaysPerWeek;
  equipment_access: StrengthEquipmentAccess;
  current_split: StrengthCurrentSplit;
  strength_goal_text: string | null;
};

export function StrengthAssessmentForm({
  initialValues,
}: {
  initialValues?: StrengthAssessmentInitialValues;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [primaryGoal, setPrimaryGoal] =
    useState<StrengthPrimaryGoal | null>(initialValues?.primary_goal ?? null);
  const [daysPerWeek, setDaysPerWeek] =
    useState<StrengthDaysPerWeek | null>(initialValues?.days_per_week ?? null);
  const [equipmentAccess, setEquipmentAccess] =
    useState<StrengthEquipmentAccess | null>(
      initialValues?.equipment_access ?? null,
    );
  const [currentSplit, setCurrentSplit] =
    useState<StrengthCurrentSplit | null>(
      initialValues?.current_split ?? null,
    );
  const [goalText, setGoalText] = useState(
    initialValues?.strength_goal_text ?? '',
  );

  const isEditing = initialValues !== undefined;

  function submit() {
    setError(null);
    if (!primaryGoal) return setError('Pick a primary goal.');
    if (!daysPerWeek) return setError('Pick days per week.');
    if (!equipmentAccess) return setError('Pick your equipment access.');
    if (!currentSplit) return setError('Pick your current split.');

    const payload = {
      primary_goal: primaryGoal,
      days_per_week: daysPerWeek,
      equipment_access: equipmentAccess,
      current_split: currentSplit,
      strength_goal_text: goalText.trim() || null,
    };

    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/strength/assessment', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `Save failed (${res.status})`);
        }
        router.push('/plan/strength');
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-10">
      <Question
        number={1}
        title="What are you training for?"
        helper="Looksmaxxing sits in the hypertrophy camp. Strength training tilts toward heavier, lower-rep work. ‘Both’ is the realistic answer for most lifters."
      >
        <div className="space-y-2">
          {PRIMARY_GOALS.map((g) => (
            <RadioRow
              key={g}
              checked={primaryGoal === g}
              onChange={() => setPrimaryGoal(g)}
              disabled={pending}
              label={PRIMARY_GOAL_LABEL[g]}
              name="primary_goal"
            />
          ))}
        </div>
      </Question>

      <Question
        number={2}
        title="How many days a week can you actually train?"
        helper="Honest. The plan is built around what you'll do, not what you wish you'd do."
      >
        <div className="space-y-2">
          {DAYS_PER_WEEKS.map((d) => (
            <RadioRow
              key={d}
              checked={daysPerWeek === d}
              onChange={() => setDaysPerWeek(d)}
              disabled={pending}
              label={DAYS_PER_WEEK_LABEL[d]}
              name="days_per_week"
            />
          ))}
        </div>
      </Question>

      <Question
        number={3}
        title="What equipment do you have?"
        helper="Drives the exercise vocabulary. Bodyweight users get a different list than commercial-gym users."
      >
        <div className="space-y-2">
          {EQUIPMENT_ACCESSES.map((e) => (
            <RadioRow
              key={e}
              checked={equipmentAccess === e}
              onChange={() => setEquipmentAccess(e)}
              disabled={pending}
              label={EQUIPMENT_ACCESS_LABEL[e]}
              name="equipment_access"
            />
          ))}
        </div>
      </Question>

      <Question
        number={4}
        title="What does your current training look like?"
        helper="The plan respects what's already working. ‘Nothing structured’ triggers the beginner ramp regardless of how strong you feel."
      >
        <div className="space-y-2">
          {CURRENT_SPLITS.map((s) => (
            <RadioRow
              key={s}
              checked={currentSplit === s}
              onChange={() => setCurrentSplit(s)}
              disabled={pending}
              label={CURRENT_SPLIT_LABEL[s]}
              name="current_split"
            />
          ))}
        </div>
      </Question>

      <Question
        number={5}
        title="Anything you want Mister P to know? (optional)"
        helper="One line. A specific situation, a constraint, a pattern. Bad shoulder, kid on the way, training before work, etc."
      >
        <input
          type="text"
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
          disabled={pending}
          maxLength={280}
          placeholder="e.g. left shoulder hates flat barbell bench"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Question>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex items-center gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending
            ? 'Mister P is writing your plan…'
            : isEditing
              ? 'Save changes and re-generate'
              : 'Get my strength plan'}
        </button>
        {pending && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Takes about ten seconds.
          </span>
        )}
      </div>
    </div>
  );
}

function Question({
  number,
  title,
  helper,
  children,
}: {
  number: number;
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        <span className="mr-2 text-zinc-400">{number}.</span>
        {title}
      </h2>
      {helper && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          {helper}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function RadioRow({
  checked,
  onChange,
  disabled,
  label,
  hint,
  name,
}: {
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  label: string;
  hint?: string;
  name: string;
}) {
  return (
    <label
      className={
        checked
          ? 'flex cursor-pointer items-start gap-3 rounded-md border border-zinc-900 bg-zinc-50 px-3 py-2 dark:border-zinc-100 dark:bg-zinc-800'
          : 'flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
      }
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700"
      />
      <span className="flex-1">
        <span className="block text-sm text-zinc-900 dark:text-zinc-100">
          {label}
        </span>
        {hint && (
          <span className="mt-0.5 block text-[12px] text-zinc-500 dark:text-zinc-400">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}
