'use client';

// Nutrition / body-comp assessment form. Mirrors the other Pattern A
// v0 forms: four required questions + optional free text.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ALCOHOL_USE_LABEL,
  CANNABIS_USE_LABEL,
  EATING_CONTEXT_LABEL,
  FASTING_PROTOCOL_LABEL,
  GOAL_DIRECTION_LABEL,
  NUTRITION_WHAT_TRIED_LABEL,
  URGENCY_LABEL,
  type AlcoholUse,
  type CannabisUse,
  type EatingContext,
  type FastingProtocol,
  type GoalDirection,
  type NutritionWhatTried,
  type Urgency,
} from '@/lib/nutrition/types';

const GOAL_DIRECTIONS: GoalDirection[] = [
  'lose_fat',
  'recomp',
  'gain_muscle',
  'maintain',
  'not_sure',
];

const URGENCIES: Urgency[] = [
  'aggressive_short_term',
  'steady_6_to_12_months',
  'no_timeline',
];

const EATING_CONTEXTS: EatingContext[] = [
  'cook_most_meals',
  'mixed_cook_and_outside',
  'mostly_outside_delivery',
  'mostly_liquid_or_shakes',
  'inconsistent',
];

const WHAT_TRIEDS: NutritionWhatTried[] = [
  'nothing_systematic',
  'counted_macros',
  'restrictive_diet',
  'glp1_or_pharma',
  'multiple_things',
];

const FASTING_PROTOCOLS: FastingProtocol[] = [
  'none',
  'time_restricted_16_8',
  'time_restricted_18_6',
  'omad',
  'five_two',
  'other',
];

const ALCOHOL_USES: AlcoholUse[] = ['none', 'occasional', 'moderate', 'heavy'];

const CANNABIS_USES: CannabisUse[] = ['none', 'occasional', 'regular'];

export type NutritionAssessmentInitialValues = {
  goal_direction: GoalDirection;
  urgency: Urgency;
  eating_context: EatingContext;
  what_tried: NutritionWhatTried;
  fasting_protocol: FastingProtocol;
  alcohol_use: AlcoholUse;
  cannabis_use: CannabisUse;
  nutrition_goal_text: string | null;
};

export function NutritionAssessmentForm({
  initialValues,
}: {
  initialValues?: NutritionAssessmentInitialValues;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [goal, setGoal] = useState<GoalDirection | null>(
    initialValues?.goal_direction ?? null,
  );
  const [urgency, setUrgency] = useState<Urgency | null>(
    initialValues?.urgency ?? null,
  );
  const [eatingContext, setEatingContext] = useState<EatingContext | null>(
    initialValues?.eating_context ?? null,
  );
  const [whatTried, setWhatTried] = useState<NutritionWhatTried | null>(
    initialValues?.what_tried ?? null,
  );
  const [fastingProtocol, setFastingProtocol] = useState<FastingProtocol | null>(
    initialValues?.fasting_protocol ?? null,
  );
  const [alcoholUse, setAlcoholUse] = useState<AlcoholUse | null>(
    initialValues?.alcohol_use ?? null,
  );
  const [cannabisUse, setCannabisUse] = useState<CannabisUse | null>(
    initialValues?.cannabis_use ?? null,
  );
  const [goalText, setGoalText] = useState(
    initialValues?.nutrition_goal_text ?? '',
  );

  const isEditing = initialValues !== undefined;

  function submit() {
    setError(null);
    if (!goal) return setError('Pick a goal direction.');
    if (!urgency) return setError('Pick an urgency.');
    if (!eatingContext) return setError('Pick an eating context.');
    if (!whatTried) return setError('Pick what you have tried.');
    if (!fastingProtocol) return setError('Pick a fasting protocol (or "None").');
    if (!alcoholUse) return setError('Pick alcohol use level.');
    if (!cannabisUse) return setError('Pick cannabis use level.');

    const payload = {
      goal_direction: goal,
      urgency,
      eating_context: eatingContext,
      what_tried: whatTried,
      fasting_protocol: fastingProtocol,
      alcohol_use: alcoholUse,
      cannabis_use: cannabisUse,
      nutrition_goal_text: goalText.trim() || null,
    };

    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/nutrition/assessment', {
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
        router.push('/plan/nutrition');
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
        title="What direction do you want to go?"
        helper="Recomp is its own option — same weight, less fat, more muscle. It works best for new lifters; past that, the honest answer is cut OR bulk."
      >
        <div className="space-y-2">
          {GOAL_DIRECTIONS.map((g) => (
            <RadioRow
              key={g}
              checked={goal === g}
              onChange={() => setGoal(g)}
              disabled={pending}
              label={GOAL_DIRECTION_LABEL[g]}
              name="goal_direction"
            />
          ))}
        </div>
      </Question>

      <Question
        number={2}
        title="What's the timeline?"
        helper="Aggressive short-term costs more — friction, muscle-loss risk, harder to maintain. Mister P will name the trade-off if you pick it."
      >
        <div className="space-y-2">
          {URGENCIES.map((u) => (
            <RadioRow
              key={u}
              checked={urgency === u}
              onChange={() => setUrgency(u)}
              disabled={pending}
              label={URGENCY_LABEL[u]}
              name="urgency"
            />
          ))}
        </div>
      </Question>

      <Question
        number={3}
        title="What does your eating actually look like?"
        helper="Honest read. Single biggest predictor of whether the plan can be followed."
      >
        <div className="space-y-2">
          {EATING_CONTEXTS.map((e) => (
            <RadioRow
              key={e}
              checked={eatingContext === e}
              onChange={() => setEatingContext(e)}
              disabled={pending}
              label={EATING_CONTEXT_LABEL[e]}
              name="eating_context"
            />
          ))}
        </div>
      </Question>

      <Question
        number={4}
        title="What have you already tried?"
        helper="So Mister P doesn't open with 'have you tried protein?' when you've done eight different diets."
      >
        <div className="space-y-2">
          {WHAT_TRIEDS.map((w) => (
            <RadioRow
              key={w}
              checked={whatTried === w}
              onChange={() => setWhatTried(w)}
              disabled={pending}
              label={NUTRITION_WHAT_TRIED_LABEL[w]}
              name="what_tried"
            />
          ))}
        </div>
      </Question>

      <Question
        number={5}
        title="Are you fasting in any structured way?"
        helper="Affects how protein gets distributed and the meal plan structure. ‘None’ is a perfectly normal answer."
      >
        <div className="space-y-2">
          {FASTING_PROTOCOLS.map((f) => (
            <RadioRow
              key={f}
              checked={fastingProtocol === f}
              onChange={() => setFastingProtocol(f)}
              disabled={pending}
              label={FASTING_PROTOCOL_LABEL[f]}
              name="fasting_protocol"
            />
          ))}
        </div>
      </Question>

      <Question
        number={6}
        title="Alcohol use?"
        helper="Honest. Alcohol is the variable that quietly erases caloric deficits more than any other lifestyle factor — Mister P needs to know."
      >
        <div className="space-y-2">
          {ALCOHOL_USES.map((a) => (
            <RadioRow
              key={a}
              checked={alcoholUse === a}
              onChange={() => setAlcoholUse(a)}
              disabled={pending}
              label={ALCOHOL_USE_LABEL[a]}
              name="alcohol_use"
            />
          ))}
        </div>
      </Question>

      <Question
        number={7}
        title="Cannabis use?"
        helper="Affects food choices and consistency more than the substance itself. No moralizing — just calibration."
      >
        <div className="space-y-2">
          {CANNABIS_USES.map((c) => (
            <RadioRow
              key={c}
              checked={cannabisUse === c}
              onChange={() => setCannabisUse(c)}
              disabled={pending}
              label={CANNABIS_USE_LABEL[c]}
              name="cannabis_use"
            />
          ))}
        </div>
      </Question>

      <Question
        number={8}
        title="Anything you want Mister P to know? (optional)"
        helper="One line. A specific situation, a constraint, a pattern."
      >
        <input
          type="text"
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
          disabled={pending}
          maxLength={280}
          placeholder="e.g. travel for work 2 weeks a month, can’t cook on the road"
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
              : 'Get my nutrition plan'}
        </button>
        {pending && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Takes about five seconds.
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
