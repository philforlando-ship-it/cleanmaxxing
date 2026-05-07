'use client';

// Cardio assessment form. Mirrors the other Pattern A v0 forms:
// four required questions + optional free text.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CARDIO_DAYS_PER_WEEK_LABEL,
  CARDIO_EQUIPMENT_ACCESS_LABEL,
  CARDIO_EQUIPMENT_ACCESSES,
  CARDIO_INJURY_CONSTRAINT_LABEL,
  CARDIO_INJURY_CONSTRAINTS,
  CARDIO_OCCUPATION_ACTIVITIES,
  CARDIO_OCCUPATION_ACTIVITY_LABEL,
  CARDIO_OUTDOOR_ACCESS_LABEL,
  CARDIO_OUTDOOR_ACCESSES,
  CARDIO_TIME_PER_SESSION_LABEL,
  CARDIO_TIME_PER_SESSIONS,
  CURRENT_MOVEMENT_LABEL,
  MODALITY_PREFERENCE_LABEL,
  PRIMARY_ROLE_LABEL,
  type CardioCurrentMovement,
  type CardioDaysPerWeek,
  type CardioEquipmentAccess,
  type CardioInjuryConstraint,
  type CardioModalityPreference,
  type CardioOccupationActivity,
  type CardioOutdoorAccess,
  type CardioPrimaryRole,
  type CardioTimePerSession,
} from '@/lib/cardio/types';

const PRIMARY_ROLES: CardioPrimaryRole[] = [
  'support_fat_loss',
  'cardiovascular_health',
  'conditioning_for_lifting',
  'general_movement',
  'not_sure',
];

const CURRENT_MOVEMENTS: CardioCurrentMovement[] = [
  'mostly_sedentary',
  'light_movement',
  'some_cardio',
  'regular_cardio',
  'inconsistent',
];

const MODALITY_PREFERENCES: CardioModalityPreference[] = [
  'running_jogging',
  'cycling',
  'rowing',
  'walking_hiking',
  'classes_group',
  'swimming',
  'hate_all_cardio',
];

const DAYS_PER_WEEKS: CardioDaysPerWeek[] = [
  '0_days',
  '1_2_days',
  '3_4_days',
  '5_plus_days',
];

export type CardioAssessmentInitialValues = {
  primary_role: CardioPrimaryRole;
  current_movement: CardioCurrentMovement;
  modality_preference: CardioModalityPreference;
  days_per_week: CardioDaysPerWeek;
  cardio_goal_text: string | null;
  injury_constraints: CardioInjuryConstraint[];
  equipment_access: CardioEquipmentAccess | null;
  outdoor_access: CardioOutdoorAccess | null;
  time_per_session: CardioTimePerSession | null;
  occupation_activity: CardioOccupationActivity | null;
};

export function CardioAssessmentForm({
  initialValues,
}: {
  initialValues?: CardioAssessmentInitialValues;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [primaryRole, setPrimaryRole] = useState<CardioPrimaryRole | null>(
    initialValues?.primary_role ?? null,
  );
  const [currentMovement, setCurrentMovement] =
    useState<CardioCurrentMovement | null>(
      initialValues?.current_movement ?? null,
    );
  const [modalityPreference, setModalityPreference] =
    useState<CardioModalityPreference | null>(
      initialValues?.modality_preference ?? null,
    );
  const [daysPerWeek, setDaysPerWeek] = useState<CardioDaysPerWeek | null>(
    initialValues?.days_per_week ?? null,
  );
  const [goalText, setGoalText] = useState(
    initialValues?.cardio_goal_text ?? '',
  );
  const [injuryConstraints, setInjuryConstraints] = useState<
    CardioInjuryConstraint[]
  >(initialValues?.injury_constraints ?? []);
  const [equipmentAccess, setEquipmentAccess] =
    useState<CardioEquipmentAccess | null>(
      initialValues?.equipment_access ?? null,
    );
  const [outdoorAccess, setOutdoorAccess] = useState<CardioOutdoorAccess | null>(
    initialValues?.outdoor_access ?? null,
  );
  const [timePerSession, setTimePerSession] =
    useState<CardioTimePerSession | null>(
      initialValues?.time_per_session ?? null,
    );
  const [occupationActivity, setOccupationActivity] =
    useState<CardioOccupationActivity | null>(
      initialValues?.occupation_activity ?? null,
    );

  function toggleInjury(i: CardioInjuryConstraint) {
    setInjuryConstraints((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i],
    );
  }

  const isEditing = initialValues !== undefined;

  function submit() {
    setError(null);
    if (!primaryRole) return setError('Pick a primary role.');
    if (!currentMovement) return setError('Pick your current movement level.');
    if (!modalityPreference) return setError('Pick a modality preference.');
    if (!daysPerWeek) return setError('Pick days per week.');
    if (!equipmentAccess) return setError('Pick your equipment access.');
    if (!outdoorAccess) return setError('Pick your outdoor-cardio access.');
    if (!timePerSession) return setError('Pick your time per session.');
    if (!occupationActivity)
      return setError('Pick your day-job activity level.');

    const payload = {
      primary_role: primaryRole,
      current_movement: currentMovement,
      modality_preference: modalityPreference,
      days_per_week: daysPerWeek,
      cardio_goal_text: goalText.trim() || null,
      injury_constraints: injuryConstraints,
      equipment_access: equipmentAccess,
      outdoor_access: outdoorAccess,
      time_per_session: timePerSession,
      occupation_activity: occupationActivity,
    };

    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/cardio/assessment', {
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
        router.push('/plan/cardio');
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
        title="What's the role of cardio for you?"
        helper="Cardio is a support tool, not the driver of fat loss. Diet does that work. Picking the role here determines what shape the prescription takes."
      >
        <div className="space-y-2">
          {PRIMARY_ROLES.map((r) => (
            <RadioRow
              key={r}
              checked={primaryRole === r}
              onChange={() => setPrimaryRole(r)}
              disabled={pending}
              label={PRIMARY_ROLE_LABEL[r]}
              name="primary_role"
            />
          ))}
        </div>
      </Question>

      <Question
        number={2}
        title="How much do you actually move now?"
        helper="Honest read. The recommendation differs sharply between sedentary baselines (where step count is the headline) and already-moving baselines (where Zone 2 / HIIT structure starts to matter)."
      >
        <div className="space-y-2">
          {CURRENT_MOVEMENTS.map((m) => (
            <RadioRow
              key={m}
              checked={currentMovement === m}
              onChange={() => setCurrentMovement(m)}
              disabled={pending}
              label={CURRENT_MOVEMENT_LABEL[m]}
              name="current_movement"
            />
          ))}
        </div>
      </Question>

      <Question
        number={3}
        title="Which modality will you actually do?"
        helper="The program you'll still be running in twelve months beats the optimal one you'll quit in two months. Pick what you tolerate."
      >
        <div className="space-y-2">
          {MODALITY_PREFERENCES.map((m) => (
            <RadioRow
              key={m}
              checked={modalityPreference === m}
              onChange={() => setModalityPreference(m)}
              disabled={pending}
              label={MODALITY_PREFERENCE_LABEL[m]}
              name="modality_preference"
            />
          ))}
        </div>
      </Question>

      <Question
        number={4}
        title="How many days per week can you do structured cardio?"
        helper="Separate from baseline step count. Pick 0 if you want to rely on daily movement only — that's a legitimate answer."
      >
        <div className="space-y-2">
          {DAYS_PER_WEEKS.map((d) => (
            <RadioRow
              key={d}
              checked={daysPerWeek === d}
              onChange={() => setDaysPerWeek(d)}
              disabled={pending}
              label={CARDIO_DAYS_PER_WEEK_LABEL[d]}
              name="days_per_week"
            />
          ))}
        </div>
      </Question>

      <Question
        number={5}
        title="What equipment do you have access to?"
        helper="Drives modality recommendations. ‘None / minimal’ is honest — incline walking outdoors covers a lot of ground."
      >
        <div className="space-y-2">
          {CARDIO_EQUIPMENT_ACCESSES.map((e) => (
            <RadioRow
              key={e}
              checked={equipmentAccess === e}
              onChange={() => setEquipmentAccess(e)}
              disabled={pending}
              label={CARDIO_EQUIPMENT_ACCESS_LABEL[e]}
              name="equipment_access"
            />
          ))}
        </div>
      </Question>

      <Question
        number={6}
        title="Outdoor-cardio access?"
        helper="Climate + location matter. The plan defaults to indoor when outdoor isn’t reliable; favors outdoor when it is."
      >
        <div className="space-y-2">
          {CARDIO_OUTDOOR_ACCESSES.map((o) => (
            <RadioRow
              key={o}
              checked={outdoorAccess === o}
              onChange={() => setOutdoorAccess(o)}
              disabled={pending}
              label={CARDIO_OUTDOOR_ACCESS_LABEL[o]}
              name="outdoor_access"
            />
          ))}
        </div>
      </Question>

      <Question
        number={7}
        title="Time budget per session?"
        helper="The realistic answer, not the aspirational one."
      >
        <div className="space-y-2">
          {CARDIO_TIME_PER_SESSIONS.map((t) => (
            <RadioRow
              key={t}
              checked={timePerSession === t}
              onChange={() => setTimePerSession(t)}
              disabled={pending}
              label={CARDIO_TIME_PER_SESSION_LABEL[t]}
              name="time_per_session"
            />
          ))}
        </div>
      </Question>

      <Question
        number={8}
        title="What does your day job look like?"
        helper="If you’re on your feet for ten hours doing physical work, the cardio prescription downweights — you’re already doing a lot of the daily-movement layer."
      >
        <div className="space-y-2">
          {CARDIO_OCCUPATION_ACTIVITIES.map((o) => (
            <RadioRow
              key={o}
              checked={occupationActivity === o}
              onChange={() => setOccupationActivity(o)}
              disabled={pending}
              label={CARDIO_OCCUPATION_ACTIVITY_LABEL[o]}
              name="occupation_activity"
            />
          ))}
        </div>
      </Question>

      <Question
        number={9}
        title="Any chronic conditions to design around? (optional)"
        helper="Multi-select. The plan routes around these — knee pain steers off running; back pain modifies rowing form; respiratory conditions soften early HIIT prescriptions. Skip if you don’t have any."
      >
        <div className="space-y-2">
          {CARDIO_INJURY_CONSTRAINTS.map((i) => {
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
                  {CARDIO_INJURY_CONSTRAINT_LABEL[i]}
                </span>
              </label>
            );
          })}
        </div>
      </Question>

      <Question
        number={10}
        title="Anything you want Mister P to know? (optional)"
        helper="One line. A specific situation, a constraint, a pattern. Training for an event, hate running outdoors, recovering from a marathon, etc."
      >
        <input
          type="text"
          value={goalText}
          onChange={(e) => setGoalText(e.target.value)}
          disabled={pending}
          maxLength={280}
          placeholder="e.g. bad knees, can only do low-impact"
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
              : 'Get my cardio plan'}
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
