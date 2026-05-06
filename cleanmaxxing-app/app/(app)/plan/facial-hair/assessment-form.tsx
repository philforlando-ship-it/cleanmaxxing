'use client';

// Facial hair assessment form. Mirrors hair / style v0 form structure:
// four required questions + optional free text. Same submit pattern.
//
// Adds a visual reference panel above Q1 — the 12 named styles from
// FACIAL_HAIR_STYLES, collapsible. Pure visual aid; doesn't capture an
// answer. Stage 1 (later) will turn this into a real picker.

import Image from 'next/image';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CURRENT_STATE_LABEL,
  FACIAL_HAIR_GOAL_LABEL,
  FACIAL_HAIR_STYLES,
  GROWTH_QUALITY_LABEL,
  TIME_COMMITMENT_LABEL,
  type CurrentState,
  type FacialHairGoal,
  type GrowthQuality,
  type TimeCommitment,
} from '@/lib/facial-hair/types';

const CURRENT_STATES: CurrentState[] = [
  'clean_shaven',
  'light_stubble',
  'heavy_stubble',
  'short_beard',
  'medium_beard',
  'long_beard',
];

const GROWTH_QUALITIES: GrowthQuality[] = [
  'full',
  'mostly_full',
  'patchy',
  'very_patchy',
  'unsure',
];

const GOALS: FacialHairGoal[] = [
  'grow_more',
  'style_what_i_have',
  'try_new_style',
  'stay_clean',
  'not_sure_yet',
];

const TIME_COMMITMENTS: TimeCommitment[] = ['low', 'medium', 'high'];

export type FacialHairAssessmentInitialValues = {
  current_state: CurrentState;
  growth_quality: GrowthQuality;
  goal: FacialHairGoal;
  time_commitment: TimeCommitment;
  facial_hair_goal_text: string | null;
};

export function FacialHairAssessmentForm({
  initialValues,
}: {
  initialValues?: FacialHairAssessmentInitialValues;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [currentState, setCurrentState] = useState<CurrentState | null>(
    initialValues?.current_state ?? null,
  );
  const [growthQuality, setGrowthQuality] = useState<GrowthQuality | null>(
    initialValues?.growth_quality ?? null,
  );
  const [goal, setGoal] = useState<FacialHairGoal | null>(
    initialValues?.goal ?? null,
  );
  const [timeCommitment, setTimeCommitment] = useState<TimeCommitment | null>(
    initialValues?.time_commitment ?? null,
  );
  const [goalText, setGoalText] = useState(
    initialValues?.facial_hair_goal_text ?? '',
  );

  const isEditing = initialValues !== undefined;

  function submit() {
    setError(null);
    if (!currentState) return setError('Pick your current state.');
    if (!growthQuality) return setError('Pick your growth quality.');
    if (!goal) return setError('Pick a goal.');
    if (!timeCommitment) return setError('Pick a time commitment.');

    const payload = {
      current_state: currentState,
      growth_quality: growthQuality,
      goal,
      time_commitment: timeCommitment,
      facial_hair_goal_text: goalText.trim() || null,
    };

    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/facial-hair/assessment', {
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
        router.push('/plan/facial-hair');
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-10">
      <StyleReferencePanel />

      <Question
        number={1}
        title="What do you have right now?"
        helper="Honest read of where your facial hair is today."
      >
        <div className="space-y-2">
          {CURRENT_STATES.map((s) => (
            <RadioRow
              key={s}
              checked={currentState === s}
              onChange={() => setCurrentState(s)}
              disabled={pending}
              label={CURRENT_STATE_LABEL[s]}
              name="current_state"
            />
          ))}
        </div>
      </Question>

      <Question
        number={2}
        title="How does it grow in?"
        helper="Density and patchiness. Pick honestly — patchy isn't a problem, but pretending it isn't there is."
      >
        <div className="space-y-2">
          {GROWTH_QUALITIES.map((g) => (
            <RadioRow
              key={g}
              checked={growthQuality === g}
              onChange={() => setGrowthQuality(g)}
              disabled={pending}
              label={GROWTH_QUALITY_LABEL[g]}
              name="growth_quality"
            />
          ))}
        </div>
      </Question>

      <Question
        number={3}
        title="What direction are you going?"
        helper="Browse the reference styles above first if you’re not sure. You can change this later — same form, different answer."
      >
        <div className="space-y-2">
          {GOALS.map((g) => (
            <RadioRow
              key={g}
              checked={goal === g}
              onChange={() => setGoal(g)}
              disabled={pending}
              label={FACIAL_HAIR_GOAL_LABEL[g]}
              name="goal"
            />
          ))}
        </div>
      </Question>

      <Question
        number={4}
        title="How much time will you actually spend on this?"
        helper="Calibrates the recommendation. There’s no right answer."
      >
        <div className="space-y-2">
          {TIME_COMMITMENTS.map((t) => (
            <RadioRow
              key={t}
              checked={timeCommitment === t}
              onChange={() => setTimeCommitment(t)}
              disabled={pending}
              label={TIME_COMMITMENT_LABEL[t]}
              name="time_commitment"
            />
          ))}
        </div>
      </Question>

      <Question
        number={5}
        title="Anything you want Mister P to know? (optional)"
        helper="One line. A specific situation, a stuck point, a constraint."
      >
        <input
          type="text"
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
          disabled={pending}
          maxLength={280}
          placeholder="e.g. job is conservative, beard cap of short box"
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
              : 'Get my facial hair plan'}
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

// Collapsible visual reference for the 12 named styles. Lives at the
// top of the form so the user can browse before answering Q3 (goal).
// No state is captured — the assessment doesn't ask for a target style
// in v0; that's a stage-1 expansion.
function StyleReferencePanel() {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left"
      >
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Browse the 12 styles Mister P will draw from
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>

      {open && (
        <div className="border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
            Reference only. The assessment doesn’t lock you into one — Mister
            P will recommend a fitting style based on your answers.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3">
            {FACIAL_HAIR_STYLES.map((style) => (
              <li key={style.slug} className="flex flex-col">
                <div className="relative aspect-square w-full overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
                  <Image
                    src={style.image_path}
                    alt={style.label}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <span className="mt-2 text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                  {style.label}
                </span>
                <span className="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">
                  {style.blurb}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
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
