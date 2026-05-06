'use client';

// Style assessment form. Mirrors hair v0 form structure: four required
// questions + optional free text. Same submit pattern (POST →
// router.push('/plan/style') so ?edit=1 drops out).

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ARCHETYPE_HINT,
  ARCHETYPE_LABEL,
  CLOSET_STATE_LABEL,
  FRAME_ESTIMATE_LABEL,
  type ClosetState,
  type CurrentArchetype,
  type FrameEstimate,
  type StyleArchetype,
} from '@/lib/style/types';

const FRAMES: FrameEstimate[] = [
  'slim',
  'athletic',
  'regular',
  'broader',
  'heavier',
];

const TARGET_ARCHETYPES: StyleArchetype[] = [
  'clean_minimalist',
  'athletic_casual',
  'rugged_masculine',
  'mature_professional',
  'streetwear',
  'creative_eclectic',
];

const CURRENT_ARCHETYPES: CurrentArchetype[] = [
  ...TARGET_ARCHETYPES,
  'no_clear_archetype',
];

const CLOSET_STATES: ClosetState[] = [
  'well_curated',
  'functional',
  'outdated',
  'starting_from_scratch',
];

export type StyleAssessmentInitialValues = {
  frame_estimate: FrameEstimate;
  current_archetype: CurrentArchetype;
  target_archetype: StyleArchetype;
  closet_state: ClosetState;
  style_goal_text: string | null;
};

export function StyleAssessmentForm({
  initialValues,
}: {
  initialValues?: StyleAssessmentInitialValues;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [frame, setFrame] = useState<FrameEstimate | null>(
    initialValues?.frame_estimate ?? null,
  );
  const [currentArchetype, setCurrentArchetype] =
    useState<CurrentArchetype | null>(
      initialValues?.current_archetype ?? null,
    );
  const [targetArchetype, setTargetArchetype] =
    useState<StyleArchetype | null>(initialValues?.target_archetype ?? null);
  const [closetState, setClosetState] = useState<ClosetState | null>(
    initialValues?.closet_state ?? null,
  );
  const [goalText, setGoalText] = useState(
    initialValues?.style_goal_text ?? '',
  );

  const isEditing = initialValues !== undefined;

  function submit() {
    setError(null);
    if (!frame) return setError('Pick a frame.');
    if (!currentArchetype) return setError('Pick a current archetype.');
    if (!targetArchetype) return setError('Pick a target archetype.');
    if (!closetState) return setError('Pick your closet state.');

    const payload = {
      frame_estimate: frame,
      current_archetype: currentArchetype,
      target_archetype: targetArchetype,
      closet_state: closetState,
      style_goal_text: goalText.trim() || null,
    };

    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/style/assessment', {
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
        router.push('/plan/style');
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
        title="What's your frame?"
        helper="Honest read. Frame doesn't change a style plan in obvious ways but it does shift cuts and proportion calls."
      >
        <div className="space-y-2">
          {FRAMES.map((f) => (
            <RadioRow
              key={f}
              checked={frame === f}
              onChange={() => setFrame(f)}
              disabled={pending}
              label={FRAME_ESTIMATE_LABEL[f]}
              name="frame_estimate"
            />
          ))}
        </div>
      </Question>

      <Question
        number={2}
        title="What are you dressing as today?"
        helper="The honest current read — what your wardrobe actually looks like, not what you'd like it to be. 'No clear archetype yet' is a fine answer."
      >
        <div className="space-y-2">
          {CURRENT_ARCHETYPES.map((a) => (
            <RadioRow
              key={a}
              checked={currentArchetype === a}
              onChange={() => setCurrentArchetype(a)}
              disabled={pending}
              label={ARCHETYPE_LABEL[a]}
              hint={ARCHETYPE_HINT[a]}
              name="current_archetype"
            />
          ))}
        </div>
      </Question>

      <Question
        number={3}
        title="What are you moving toward?"
        helper="Pick the one closest to who you want to look like in a year. You can change this later — same form, different answer."
      >
        <div className="space-y-2">
          {TARGET_ARCHETYPES.map((a) => (
            <RadioRow
              key={a}
              checked={targetArchetype === a}
              onChange={() => setTargetArchetype(a)}
              disabled={pending}
              label={ARCHETYPE_LABEL[a]}
              hint={ARCHETYPE_HINT[a]}
              name="target_archetype"
            />
          ))}
        </div>
      </Question>

      <Question
        number={4}
        title="What's the state of your closet?"
        helper="Drives whether the plan focuses on auditing what you have or building from scratch."
      >
        <div className="space-y-2">
          {CLOSET_STATES.map((c) => (
            <RadioRow
              key={c}
              checked={closetState === c}
              onChange={() => setClosetState(c)}
              disabled={pending}
              label={CLOSET_STATE_LABEL[c]}
              name="closet_state"
            />
          ))}
        </div>
      </Question>

      <Question
        number={5}
        title="Anything you want Mister P to know? (optional)"
        helper="One line. Specific situation, a stuck point, a budget reality."
      >
        <input
          type="text"
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
          disabled={pending}
          maxLength={280}
          placeholder="e.g. work is hybrid, I want one outfit that covers both"
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
              : 'Get my style plan'}
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
