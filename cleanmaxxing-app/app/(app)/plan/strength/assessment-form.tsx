'use client';

// Strength training assessment form. Mirrors the other Pattern A v0
// forms: four required questions + optional free text.

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CMSpinner } from '@/components/cm-logo';
import {
  StreamingPlanPreview,
  consumeTextStream,
} from '@/components/streaming-plan-preview';
import {
  ASYMMETRY_CONCERN_LABEL,
  ASYMMETRY_CONCERNS,
  BODYWEIGHT_PREFERENCE_LABEL,
  BODYWEIGHT_PREFERENCES,
  CURRENT_SPLIT_LABEL,
  DAYS_PER_WEEK_LABEL,
  INJURY_CONSTRAINT_LABEL,
  INJURY_CONSTRAINTS,
  PRIMARY_GOAL_LABEL,
  PRIORITY_MUSCLES,
  PRIORITY_MUSCLE_LABEL,
  PRIORITY_MUSCLE_MAX,
  SECONDARY_OBJECTIVE_LABEL,
  SECONDARY_OBJECTIVES,
  type StrengthAsymmetryConcern,
  type StrengthBodyweightPreference,
  type StrengthCurrentSplit,
  type StrengthDaysPerWeek,
  type StrengthEquipmentAccess,
  type StrengthInjuryConstraint,
  type StrengthPrimaryGoal,
  type StrengthPriorityMuscle,
  type StrengthSecondaryObjective,
} from '@/lib/strength/types';
import type { TrainingExperience } from '@/lib/profile/service';

const TRAINING_EXPERIENCES: TrainingExperience[] = [
  'none',
  'under_1y',
  '1_to_3y',
  '3_to_10y',
  'over_10y',
];

// Tuned for the in-form question. Profile page has its own labels.
const TRAINING_EXPERIENCE_FORM_LABEL: Record<TrainingExperience, string> = {
  none: 'Never trained — or it was a long time ago',
  under_1y: 'Under a year of consistent training',
  '1_to_3y': '1 to 3 years',
  '3_to_10y': '3 to 10 years',
  over_10y: '10+ years',
};

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

// Home-setup tier — the conditional follow-up shown only when the
// user says they don't train at a gym. Same enum values as
// equipment_access (excluding full_commercial_gym which is set
// directly when the gym binary is "yes").
type HomeSetup = Exclude<StrengthEquipmentAccess, 'full_commercial_gym'>;

const HOME_SETUPS: HomeSetup[] = [
  'home_rack_bench',
  'dumbbells_and_bench',
  'minimal_dumbbells',
  'bodyweight_only',
];

// Friendlier labels for the no-gym funnel branch. Original
// EQUIPMENT_ACCESS_LABEL values stay in lib/strength/types.ts as the
// canonical labels (used by the report-prompt + analytics surfaces);
// these are tuned to the "what do you have at home" framing.
const HOME_SETUP_LABEL: Record<HomeSetup, string> = {
  home_rack_bench: 'Home gym with a rack, bench, barbell + plates',
  dumbbells_and_bench: 'Dumbbells + a bench (no barbell or rack)',
  minimal_dumbbells: 'Just dumbbells (and maybe some bands)',
  bodyweight_only: 'Nothing right now (or just a mat)',
};

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
  // Lives on user_profile (single source of truth across journeys).
  // Page passes profile.training_experience here so the form pre-fills
  // when the user has already answered it on /profile or in a prior
  // strength assessment.
  training_experience: TrainingExperience | null;
  current_split: StrengthCurrentSplit;
  strength_goal_text: string | null;
  priority_muscles: StrengthPriorityMuscle[];
  lagging_muscles_text: string | null;
  secondary_objective: StrengthSecondaryObjective[];
  injury_constraints: StrengthInjuryConstraint[];
  bodyweight_preference: StrengthBodyweightPreference | null;
  asymmetry_concern: StrengthAsymmetryConcern | null;
};

export function StrengthAssessmentForm({
  initialValues,
  // First-time users (no assessment yet) may already have
  // training_experience set on their profile from /profile or a
  // legacy strength assessment. Pre-fill the new Q4 from that signal
  // so they don't re-answer. Ignored when initialValues is provided
  // (edit case) — that path already carries the value.
  initialTrainingExperience,
  cancelHref,
}: {
  initialValues?: StrengthAssessmentInitialValues;
  initialTrainingExperience?: TrainingExperience | null;
  // When set (only on edit-flow with an existing report), renders a
  // "Cancel — keep current plan" link next to the submit button.
  cancelHref?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState<string | null>(null);

  const [primaryGoal, setPrimaryGoal] =
    useState<StrengthPrimaryGoal | null>(initialValues?.primary_goal ?? null);
  const [daysPerWeek, setDaysPerWeek] =
    useState<StrengthDaysPerWeek | null>(initialValues?.days_per_week ?? null);
  // Two-step funnel for equipment_access: a binary "do you train at
  // a gym" leads, with a conditional home-setup follow-up only when
  // the answer is "no." Submission collapses this back into the
  // single equipment_access enum value the schema expects.
  //
  // When editing an existing assessment, derive the funnel state
  // from the persisted enum: full_commercial_gym → trainsAtGym='yes',
  // anything else → trainsAtGym='no' + that value as the home setup.
  const initialTrainsAtGym: 'yes' | 'no' | null = initialValues
    ? initialValues.equipment_access === 'full_commercial_gym'
      ? 'yes'
      : 'no'
    : null;
  const initialHomeSetup: HomeSetup | null =
    initialValues && initialValues.equipment_access !== 'full_commercial_gym'
      ? (initialValues.equipment_access as HomeSetup)
      : null;
  const [trainsAtGym, setTrainsAtGym] = useState<'yes' | 'no' | null>(
    initialTrainsAtGym,
  );
  const [homeSetup, setHomeSetup] = useState<HomeSetup | null>(
    initialHomeSetup,
  );
  const [trainingExperience, setTrainingExperience] =
    useState<TrainingExperience | null>(
      initialValues?.training_experience ??
        initialTrainingExperience ??
        null,
    );
  const [currentSplit, setCurrentSplit] =
    useState<StrengthCurrentSplit | null>(
      initialValues?.current_split ?? null,
    );
  const [goalText, setGoalText] = useState(
    initialValues?.strength_goal_text ?? '',
  );
  const [priorityMuscles, setPriorityMuscles] = useState<
    StrengthPriorityMuscle[]
  >(initialValues?.priority_muscles ?? []);
  const [laggingText, setLaggingText] = useState(
    initialValues?.lagging_muscles_text ?? '',
  );
  const [secondaryObjectives, setSecondaryObjectives] = useState<
    StrengthSecondaryObjective[]
  >(initialValues?.secondary_objective ?? []);
  const [injuryConstraints, setInjuryConstraints] = useState<
    StrengthInjuryConstraint[]
  >(initialValues?.injury_constraints ?? []);
  const [bodyweightPreference, setBodyweightPreference] =
    useState<StrengthBodyweightPreference | null>(
      initialValues?.bodyweight_preference ?? null,
    );
  const [asymmetryConcern, setAsymmetryConcern] =
    useState<StrengthAsymmetryConcern | null>(
      initialValues?.asymmetry_concern ?? null,
    );

  const isEditing = initialValues !== undefined;

  function togglePriority(m: StrengthPriorityMuscle) {
    setPriorityMuscles((prev) => {
      if (prev.includes(m)) return prev.filter((x) => x !== m);
      if (prev.length >= PRIORITY_MUSCLE_MAX) return prev;
      return [...prev, m];
    });
  }

  function toggleInjury(i: StrengthInjuryConstraint) {
    setInjuryConstraints((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );
  }

  function submit() {
    setError(null);
    if (!primaryGoal) return setError('Pick a primary goal.');
    // Secondary objective is optional — empty array is canonical "no
    // secondary." No validation gate here.
    if (!daysPerWeek) return setError('Pick days per week.');
    if (trainsAtGym === null) {
      return setError('Tell us whether you train at a gym.');
    }
    if (trainsAtGym === 'no' && !homeSetup) {
      return setError('Pick your home setup.');
    }
    const equipmentAccess: StrengthEquipmentAccess =
      trainsAtGym === 'yes' ? 'full_commercial_gym' : (homeSetup as HomeSetup);
    if (!trainingExperience)
      return setError('Pick your training experience.');
    if (!currentSplit) return setError('Pick your current split.');
    if (!bodyweightPreference)
      return setError('Pick how you want bodyweight exercises handled.');
    if (!asymmetryConcern)
      return setError(
        'Answer the asymmetry question (none / mild / noticeable).',
      );

    const payload = {
      primary_goal: primaryGoal,
      days_per_week: daysPerWeek,
      equipment_access: equipmentAccess,
      training_experience: trainingExperience,
      current_split: currentSplit,
      strength_goal_text: goalText.trim() || null,
      priority_muscles: priorityMuscles,
      lagging_muscles_text: laggingText.trim() || null,
      secondary_objective: secondaryObjectives,
      injury_constraints: injuryConstraints,
      bodyweight_preference: bodyweightPreference,
      asymmetry_concern: asymmetryConcern,
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
        await consumeTextStream(res, setStreamingText);
        router.push('/plan/strength');
        router.refresh();
      } catch (err) {
        setStreamingText(null);
        setError((err as Error).message);
      }
    });
  }

  if (streamingText !== null) {
    return <StreamingPlanPreview text={streamingText} />;
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
        title="Any secondary objectives alongside strength? (optional, multi-select)"
        helper="Most 35+ users want strength PLUS something — pick any that apply. The plan honors each without diluting the primary goal. Leaving them all unchecked is fine."
      >
        <div className="space-y-2">
          {SECONDARY_OBJECTIVES.map((s) => {
            const checked = secondaryObjectives.includes(s);
            return (
              <label
                key={s}
                className={
                  checked
                    ? 'flex cursor-pointer items-start gap-3 rounded-md border border-zinc-900 bg-zinc-50 px-3 py-2 dark:border-zinc-100 dark:bg-zinc-800'
                    : 'flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
                }
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setSecondaryObjectives((prev) =>
                      prev.includes(s)
                        ? prev.filter((x) => x !== s)
                        : [...prev, s],
                    )
                  }
                  disabled={pending}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700"
                />
                <span className="flex-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {SECONDARY_OBJECTIVE_LABEL[s]}
                </span>
              </label>
            );
          })}
        </div>
      </Question>

      <Question
        number={3}
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
        number={4}
        title="Do you train at a gym, or plan to?"
        helper="Big-population catalogs only make sense if you have access to the equipment. If you don't, we'll keep it cleaner."
      >
        <div className="space-y-2">
          <RadioRow
            checked={trainsAtGym === 'yes'}
            onChange={() => {
              setTrainsAtGym('yes');
              setHomeSetup(null);
            }}
            disabled={pending}
            label="Yes — full commercial gym (machines, cables, free weights)"
            name="trains_at_gym"
          />
          <RadioRow
            checked={trainsAtGym === 'no'}
            onChange={() => setTrainsAtGym('no')}
            disabled={pending}
            label="No — I train at home or with limited equipment"
            name="trains_at_gym"
          />
        </div>
        {trainsAtGym === 'no' && (
          <div className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
            <p className="text-[13px] font-medium text-zinc-800 dark:text-zinc-200">
              What does your home setup look like?
            </p>
            <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
              Honest answer — we’ll only recommend exercises you can
              actually do.
            </p>
            <div className="mt-3 space-y-2">
              {HOME_SETUPS.map((h) => (
                <RadioRow
                  key={h}
                  checked={homeSetup === h}
                  onChange={() => setHomeSetup(h)}
                  disabled={pending}
                  label={HOME_SETUP_LABEL[h]}
                  name="home_setup"
                />
              ))}
            </div>
          </div>
        )}
      </Question>

      <Question
        number={5}
        title="How much strength training experience do you have?"
        helper="Time spent doing structured lifting, not general gym presence. The plan tunes prescription depth and the recomp deficit off this — beginners eat at maintenance and ride newbie gains; experienced lifters get a slight deficit so recomp is honest about what's possible."
      >
        <div className="space-y-2">
          {TRAINING_EXPERIENCES.map((te) => (
            <RadioRow
              key={te}
              checked={trainingExperience === te}
              onChange={() => setTrainingExperience(te)}
              disabled={pending}
              label={TRAINING_EXPERIENCE_FORM_LABEL[te]}
              name="training_experience"
            />
          ))}
        </div>
      </Question>

      <Question
        number={6}
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
        number={7}
        title="Which muscles do you most want to develop? (optional, pick up to 3)"
        helper="The visual-leverage stack. The plan biases volume + frequency toward what you pick — more sets per week and 2x-a-week minimum frequency on these specifically. Skip if you want balanced development."
      >
        <div className="space-y-2">
          {PRIORITY_MUSCLES.map((m) => {
            const checked = priorityMuscles.includes(m);
            const atCap =
              !checked && priorityMuscles.length >= PRIORITY_MUSCLE_MAX;
            return (
              <label
                key={m}
                className={
                  checked
                    ? 'flex cursor-pointer items-start gap-3 rounded-md border border-zinc-900 bg-zinc-50 px-3 py-2 dark:border-zinc-100 dark:bg-zinc-800'
                    : atCap
                      ? 'flex cursor-not-allowed items-start gap-3 rounded-md border border-zinc-200 px-3 py-2 opacity-50 dark:border-zinc-800'
                      : 'flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
                }
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePriority(m)}
                  disabled={pending || atCap}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700"
                />
                <span className="flex-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {PRIORITY_MUSCLE_LABEL[m]}
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-[12px] text-zinc-500 dark:text-zinc-400">
          {priorityMuscles.length}/{PRIORITY_MUSCLE_MAX} picked
        </p>
      </Question>

      <Question
        number={8}
        title="Anything that feels lagging? (optional)"
        helper="Free text. ‘Calves never grow’, ‘left side smaller than right’, ‘flat upper chest’. Mister P folds it into the prescription."
      >
        <input
          type="text"
          value={laggingText}
          onChange={(e) => setLaggingText(e.target.value)}
          disabled={pending}
          maxLength={280}
          placeholder="e.g. calves never grow despite three sessions a week"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Question>

      <Question
        number={9}
        title="Any chronic conditions to design around? (optional)"
        helper="Multi-select. The plan routes around these — no deadlifts under heavy load with lower-back pain on file, no overhead pressing with shoulder/neck issues, etc. Skip if you don’t have any."
      >
        <div className="space-y-2">
          {INJURY_CONSTRAINTS.map((i) => {
            const checked = injuryConstraints.includes(i);
            return (
              <label
                key={i}
                className={
                  checked
                    ? 'flex cursor-pointer items-start gap-3 rounded-md border border-zinc-900 bg-zinc-50 px-3 py-2 dark:border-zinc-100 dark:bg-zinc-800'
                    : 'flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
                }
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleInjury(i)}
                  disabled={pending}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700"
                />
                <span className="flex-1 text-sm text-zinc-900 dark:text-zinc-100">
                  {INJURY_CONSTRAINT_LABEL[i]}
                </span>
              </label>
            );
          })}
        </div>
      </Question>

      <Question
        number={10}
        title="Bodyweight exercises — push, mix, or only when needed?"
        helper="Three options. 'Primary' means push-ups, pull-ups, and plank work lead the plan even when you have a barbell. 'Mixed' is the default — bodyweight ranks alongside everything else. 'Fallback only' means Mister P only suggests bodyweight when no equipment-based option fits."
      >
        <div className="space-y-2">
          {BODYWEIGHT_PREFERENCES.map((b) => (
            <RadioRow
              key={b}
              checked={bodyweightPreference === b}
              onChange={() => setBodyweightPreference(b)}
              disabled={pending}
              label={BODYWEIGHT_PREFERENCE_LABEL[b]}
              name="bodyweight_preference"
            />
          ))}
        </div>
      </Question>

      <Question
        number={11}
        title="Left/right asymmetry — anything visible?"
        helper="Most men carry 5–10% asymmetry that's normal and invisible. 'Noticeable' triggers a unilateral-bias programming layer (lead with the weak side, +1–2 weekly sets on the weaker side, six to twelve months minimum to close the gap). Visible atrophy or sudden weakness is PT territory, not a programming question."
      >
        <div className="space-y-2">
          {ASYMMETRY_CONCERNS.map((a) => (
            <RadioRow
              key={a}
              checked={asymmetryConcern === a}
              onChange={() => setAsymmetryConcern(a)}
              disabled={pending}
              label={ASYMMETRY_CONCERN_LABEL[a]}
              name="asymmetry_concern"
            />
          ))}
        </div>
      </Question>

      <Question
        number={12}
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
        {cancelHref && !pending && (
          <Link
            href={cancelHref}
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Cancel — keep current plan
          </Link>
        )}
        {pending && <CMSpinner label="Takes about twenty seconds." />}
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
