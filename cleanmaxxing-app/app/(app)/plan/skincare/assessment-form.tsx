'use client';

// Skincare assessment form. Mirrors the other Pattern A v0 forms:
// four required questions + optional free text.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  BARRIER_STATE_LABEL,
  CONCERN_LABEL,
  CURRENT_ROUTINE_LABEL,
  SENSITIVITY_HISTORY_LABEL,
  SKIN_BEHAVIOR_LABEL,
  SUN_EXPOSURE_LABEL,
  type SkinBehavior,
  type SkincareBarrierState,
  type SkincareConcern,
  type SkincareCurrentRoutine,
  type SkincareSensitivityHistory,
  type SkincareSunExposure,
} from '@/lib/skincare/types';

const SKIN_BEHAVIORS: SkinBehavior[] = [
  'oily',
  'dry',
  'combo',
  'sensitive',
  'normal',
  'not_sure',
];

const CONCERNS: SkincareConcern[] = [
  'acne',
  'aging',
  'uneven_tone',
  'dullness',
  'sensitivity_redness',
  'dryness',
  'nothing_specific',
];

const CURRENT_ROUTINES: SkincareCurrentRoutine[] = [
  'none',
  'cleanser_only',
  'cleanser_moisturizer',
  'full_routine',
  'overcomplicated',
];

const SUN_EXPOSURES: SkincareSunExposure[] = [
  'minimal_indoor',
  'moderate',
  'heavy_outdoor',
];

const SENSITIVITY_HISTORIES: SkincareSensitivityHistory[] = [
  'yes',
  'no',
  'unsure',
];

const BARRIER_STATES: SkincareBarrierState[] = [
  'compromised',
  'normal',
  'unsure',
];

export type SkincareAssessmentInitialValues = {
  skin_behavior: SkinBehavior;
  primary_concern: SkincareConcern;
  current_routine: SkincareCurrentRoutine;
  sun_exposure: SkincareSunExposure;
  sensitivity_history: SkincareSensitivityHistory | null;
  barrier_state: SkincareBarrierState | null;
  skincare_goal_text: string | null;
};

export function SkincareAssessmentForm({
  initialValues,
}: {
  initialValues?: SkincareAssessmentInitialValues;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [skinBehavior, setSkinBehavior] = useState<SkinBehavior | null>(
    initialValues?.skin_behavior ?? null,
  );
  const [concern, setConcern] = useState<SkincareConcern | null>(
    initialValues?.primary_concern ?? null,
  );
  const [currentRoutine, setCurrentRoutine] =
    useState<SkincareCurrentRoutine | null>(
      initialValues?.current_routine ?? null,
    );
  const [sunExposure, setSunExposure] = useState<SkincareSunExposure | null>(
    initialValues?.sun_exposure ?? null,
  );
  const [sensitivityHistory, setSensitivityHistory] =
    useState<SkincareSensitivityHistory | null>(
      initialValues?.sensitivity_history ?? null,
    );
  const [barrierState, setBarrierState] = useState<SkincareBarrierState | null>(
    initialValues?.barrier_state ?? null,
  );
  const [goalText, setGoalText] = useState(
    initialValues?.skincare_goal_text ?? '',
  );

  const isEditing = initialValues !== undefined;

  function submit() {
    setError(null);
    if (!skinBehavior) return setError('Pick what your skin does.');
    if (!concern) return setError('Pick a primary concern.');
    if (!currentRoutine) return setError('Pick your current routine.');
    if (!sunExposure) return setError('Pick a sun exposure.');
    if (!sensitivityHistory)
      return setError('Pick whether you’ve reacted to actives before.');
    if (!barrierState) return setError('Pick your current barrier state.');

    const payload = {
      skin_behavior: skinBehavior,
      primary_concern: concern,
      current_routine: currentRoutine,
      sun_exposure: sunExposure,
      sensitivity_history: sensitivityHistory,
      barrier_state: barrierState,
      skincare_goal_text: goalText.trim() || null,
    };

    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/skincare/assessment', {
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
        router.push('/plan/skincare');
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
        title="What does your skin do?"
        helper="The honest day-to-day read. Different from Fitzpatrick (sun reaction) — this is texture and oil."
      >
        <div className="space-y-2">
          {SKIN_BEHAVIORS.map((b) => (
            <RadioRow
              key={b}
              checked={skinBehavior === b}
              onChange={() => setSkinBehavior(b)}
              disabled={pending}
              label={SKIN_BEHAVIOR_LABEL[b]}
              name="skin_behavior"
            />
          ))}
        </div>
      </Question>

      <Question
        number={2}
        title="What do you most want to address?"
        helper="One concern. Mister P writes the plan around this — others get noted but deferred."
      >
        <div className="space-y-2">
          {CONCERNS.map((c) => (
            <RadioRow
              key={c}
              checked={concern === c}
              onChange={() => setConcern(c)}
              disabled={pending}
              label={CONCERN_LABEL[c]}
              name="primary_concern"
            />
          ))}
        </div>
      </Question>

      <Question
        number={3}
        title="What's your current routine?"
        helper="Honest. The plan won't tell someone with a 12-product stack to add another one."
      >
        <div className="space-y-2">
          {CURRENT_ROUTINES.map((r) => (
            <RadioRow
              key={r}
              checked={currentRoutine === r}
              onChange={() => setCurrentRoutine(r)}
              disabled={pending}
              label={CURRENT_ROUTINE_LABEL[r]}
              name="current_routine"
            />
          ))}
        </div>
      </Question>

      <Question
        number={4}
        title="How much sun do you actually get?"
        helper="Drives the sunscreen recommendation. Honest read of an average week."
      >
        <div className="space-y-2">
          {SUN_EXPOSURES.map((s) => (
            <RadioRow
              key={s}
              checked={sunExposure === s}
              onChange={() => setSunExposure(s)}
              disabled={pending}
              label={SUN_EXPOSURE_LABEL[s]}
              name="sun_exposure"
            />
          ))}
        </div>
      </Question>

      <Question
        number={5}
        title="Have actives ever irritated you?"
        helper="Retinoids, AHAs, vitamin C, benzoyl peroxide. A 'yes' means we ramp slower and lean drugstore-tier first."
      >
        <div className="space-y-2">
          {SENSITIVITY_HISTORIES.map((s) => (
            <RadioRow
              key={s}
              checked={sensitivityHistory === s}
              onChange={() => setSensitivityHistory(s)}
              disabled={pending}
              label={SENSITIVITY_HISTORY_LABEL[s]}
              name="sensitivity_history"
            />
          ))}
        </div>
      </Question>

      <Question
        number={6}
        title="What's your barrier doing right now?"
        helper="If it's compromised, we don't add actives — we repair first. Honest read: peeling, persistent redness, burning when products go on."
      >
        <div className="space-y-2">
          {BARRIER_STATES.map((b) => (
            <RadioRow
              key={b}
              checked={barrierState === b}
              onChange={() => setBarrierState(b)}
              disabled={pending}
              label={BARRIER_STATE_LABEL[b]}
              name="barrier_state"
            />
          ))}
        </div>
      </Question>

      <Question
        number={7}
        title="Anything you want Mister P to know? (optional)"
        helper="One line. A specific situation, a constraint, a pattern."
      >
        <input
          type="text"
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
          disabled={pending}
          maxLength={280}
          placeholder="e.g. tried tretinoin and stopped because of irritation"
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
              : 'Get my skincare plan'}
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
