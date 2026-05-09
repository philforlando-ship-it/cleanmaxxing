'use client';

// Sleep assessment form. Pattern A v0 shape, but Q1, Q2, and Q4 are
// multi-select (the others are still single-pick). Q1 and Q2 cap at 3
// — sleep concerns and blockers commonly co-occur, but more than 3
// dilutes the recommendation. Q4 (what's been tried) is uncapped —
// the more the user has tried, the more the report needs to know to
// avoid suggesting something they've already done.

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  BIGGEST_BLOCKER_LABEL,
  PRIMARY_CONCERN_LABEL,
  SCHEDULE_CONSISTENCY_LABEL,
  WHAT_TRIED_LABEL,
  type SleepBiggestBlocker,
  type SleepPrimaryConcern,
  type SleepScheduleConsistency,
  type SleepWhatTried,
} from '@/lib/sleep/types';

const PRIMARY_CONCERNS: SleepPrimaryConcern[] = [
  'not_enough_total',
  'cant_fall_asleep',
  'wake_during_night',
  'wake_up_tired',
  'inconsistent_schedule',
  'generally_fine',
];

const BIGGEST_BLOCKERS: SleepBiggestBlocker[] = [
  'screens_late',
  'caffeine_late',
  'evening_alcohol',
  'late_exercise',
  'racing_thoughts',
  'environment',
  'partner_or_kids',
  'nothing_obvious',
];

const SCHEDULE_CONSISTENCIES: SleepScheduleConsistency[] = [
  'consistent_daily',
  'consistent_weekday_only',
  'inconsistent',
  'shift_work',
];

const WHAT_TRIEDS: SleepWhatTried[] = [
  'nothing_systematic',
  'caffeine_cutoffs',
  'screen_cutoffs',
  'supplements',
  'mindfulness_breathing',
  'multiple_things',
];

const PRIMARY_CONCERN_CAP = 3;
const BIGGEST_BLOCKER_CAP = 3;

export type SleepAssessmentInitialValues = {
  primary_concerns: SleepPrimaryConcern[];
  biggest_blockers: SleepBiggestBlocker[];
  schedule_consistency: SleepScheduleConsistency;
  what_tried: SleepWhatTried[];
  sleep_goal_text: string | null;
};

export function SleepAssessmentForm({
  initialValues,
  cancelHref,
}: {
  initialValues?: SleepAssessmentInitialValues;
  // When set (only on edit-flow with an existing report), renders a
  // "Cancel — keep current plan" link next to the submit button.
  cancelHref?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [primaryConcerns, setPrimaryConcerns] = useState<
    SleepPrimaryConcern[]
  >(initialValues?.primary_concerns ?? []);
  const [biggestBlockers, setBiggestBlockers] = useState<
    SleepBiggestBlocker[]
  >(initialValues?.biggest_blockers ?? []);
  const [scheduleConsistency, setScheduleConsistency] =
    useState<SleepScheduleConsistency | null>(
      initialValues?.schedule_consistency ?? null,
    );
  const [whatTried, setWhatTried] = useState<SleepWhatTried[]>(
    initialValues?.what_tried ?? [],
  );
  const [goalText, setGoalText] = useState(
    initialValues?.sleep_goal_text ?? '',
  );

  const isEditing = initialValues !== undefined;

  // Toggle helper for multi-select. Adds when not present, removes when
  // present. Cap (when set) is enforced — clicking a new option past
  // the cap is a no-op.
  function toggleMulti<T extends string>(
    current: T[],
    value: T,
    cap?: number,
  ): T[] {
    if (current.includes(value)) {
      return current.filter((v) => v !== value);
    }
    if (cap !== undefined && current.length >= cap) {
      return current; // at cap; no-op
    }
    return [...current, value];
  }

  function submit() {
    setError(null);
    if (primaryConcerns.length === 0)
      return setError('Pick at least one primary concern.');
    if (biggestBlockers.length === 0)
      return setError('Pick at least one blocker.');
    if (!scheduleConsistency) return setError('Pick a schedule consistency.');
    if (whatTried.length === 0)
      return setError('Pick at least one item under what you have tried.');

    const payload = {
      primary_concerns: primaryConcerns,
      biggest_blockers: biggestBlockers,
      schedule_consistency: scheduleConsistency,
      what_tried: whatTried,
      sleep_goal_text: goalText.trim() || null,
    };

    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/sleep/assessment', {
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
        router.push('/plan/sleep');
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
        title="What are you trying to fix?"
        helper={`Pick up to ${PRIMARY_CONCERN_CAP}. Sleep concerns commonly co-occur — the plan addresses the most data-consistent one first and defers the rest.`}
      >
        <SelectionCount
          count={primaryConcerns.length}
          cap={PRIMARY_CONCERN_CAP}
        />
        <div className="mt-2 space-y-2">
          {PRIMARY_CONCERNS.map((c) => (
            <CheckboxRow
              key={c}
              checked={primaryConcerns.includes(c)}
              onChange={() =>
                setPrimaryConcerns(
                  toggleMulti(primaryConcerns, c, PRIMARY_CONCERN_CAP),
                )
              }
              disabled={pending}
              label={PRIMARY_CONCERN_LABEL[c]}
              atCap={
                primaryConcerns.length >= PRIMARY_CONCERN_CAP &&
                !primaryConcerns.includes(c)
              }
            />
          ))}
        </div>
      </Question>

      <Question
        number={2}
        title="What's blocking you on a typical night?"
        helper={`Pick up to ${BIGGEST_BLOCKER_CAP}. The plan picks the highest-leverage one of your set as the focus this week.`}
      >
        <SelectionCount
          count={biggestBlockers.length}
          cap={BIGGEST_BLOCKER_CAP}
        />
        <div className="mt-2 space-y-2">
          {BIGGEST_BLOCKERS.map((b) => (
            <CheckboxRow
              key={b}
              checked={biggestBlockers.includes(b)}
              onChange={() =>
                setBiggestBlockers(
                  toggleMulti(biggestBlockers, b, BIGGEST_BLOCKER_CAP),
                )
              }
              disabled={pending}
              label={BIGGEST_BLOCKER_LABEL[b]}
              atCap={
                biggestBlockers.length >= BIGGEST_BLOCKER_CAP &&
                !biggestBlockers.includes(b)
              }
            />
          ))}
        </div>
      </Question>

      <Question
        number={3}
        title="How consistent is your schedule?"
        helper="Schedule consistency drives sleep architecture more than total hours for many users."
      >
        <div className="space-y-2">
          {SCHEDULE_CONSISTENCIES.map((s) => (
            <RadioRow
              key={s}
              checked={scheduleConsistency === s}
              onChange={() => setScheduleConsistency(s)}
              disabled={pending}
              label={SCHEDULE_CONSISTENCY_LABEL[s]}
              name="schedule_consistency"
            />
          ))}
        </div>
      </Question>

      <Question
        number={4}
        title="What have you already tried?"
        helper="Pick all that apply — no cap. The more the report knows, the less it wastes recommending things you already do."
      >
        <SelectionCount count={whatTried.length} />
        <div className="mt-2 space-y-2">
          {WHAT_TRIEDS.map((w) => (
            <CheckboxRow
              key={w}
              checked={whatTried.includes(w)}
              onChange={() => setWhatTried(toggleMulti(whatTried, w))}
              disabled={pending}
              label={WHAT_TRIED_LABEL[w]}
            />
          ))}
        </div>
      </Question>

      <Question
        number={5}
        title="Anything you want Mister P to know? (optional)"
        helper="One line. A specific situation, a constraint, a pattern."
      >
        <input
          type="text"
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
          disabled={pending}
          maxLength={280}
          placeholder="e.g. wake up at 4am most nights and can’t fall back asleep"
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
              : 'Get my sleep plan'}
        </button>
        {cancelHref && !pending && (
          <Link
            href={cancelHref}
            className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Cancel — keep current plan
          </Link>
        )}
        {pending && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Takes about fifteen seconds.
          </span>
        )}
      </div>
    </div>
  );
}

function SelectionCount({ count, cap }: { count: number; cap?: number }) {
  return (
    <p className="text-[12px] text-zinc-500 dark:text-zinc-400">
      {count} selected{cap !== undefined ? ` of ${cap}` : ''}
    </p>
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

function CheckboxRow({
  checked,
  onChange,
  disabled,
  label,
  atCap,
}: {
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  label: string;
  // True when the user has hit the selection cap and this option is
  // not part of their selection — render dimmed so it's clear the
  // option isn't available without first deselecting one.
  atCap?: boolean;
}) {
  const isDimmed = atCap === true;
  return (
    <label
      className={
        checked
          ? 'flex cursor-pointer items-start gap-3 rounded-md border border-zinc-900 bg-zinc-50 px-3 py-2 dark:border-zinc-100 dark:bg-zinc-800'
          : isDimmed
            ? 'flex cursor-not-allowed items-start gap-3 rounded-md border border-zinc-200 px-3 py-2 opacity-50 dark:border-zinc-800'
            : 'flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
      }
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled || isDimmed}
        className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700"
      />
      <span className="flex-1 text-sm text-zinc-900 dark:text-zinc-100">
        {label}
      </span>
    </label>
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
