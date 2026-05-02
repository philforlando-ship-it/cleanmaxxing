'use client';

// Tier 1 self-report fields surfaced on /profile. Covers the "where I
// am right now" axis: training volume, sleep, body comp, diet shape,
// height, weight. These flow into Mister P's prompt through the
// user_profile read path so his answers calibrate to what the user
// actually reports rather than treating every question as a blank
// slate.

import { useState, useTransition } from 'react';
import type {
  UserProfile,
  ActivityLevel,
  TrainingExperience,
  BodyFatEstimate,
} from '@/lib/profile/service';
import { HEIGHT_OPTIONS } from '@/lib/height-options';

type Props = {
  initial: UserProfile;
};

const ACTIVITY_OPTIONS: Array<{ value: ActivityLevel; label: string }> = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'lightly_active', label: 'Lightly active' },
  { value: 'moderately_active', label: 'Moderately active' },
  { value: 'very_active', label: 'Very active' },
];

const EXPERIENCE_OPTIONS: Array<{ value: TrainingExperience; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'under_1y', label: 'Under 1 year' },
  { value: '1_to_3y', label: '1–3 years' },
  { value: '3_to_10y', label: '3–10 years' },
  { value: 'over_10y', label: '10+ years' },
];

const BODY_FAT_OPTIONS: Array<{ value: BodyFatEstimate; label: string }> = [
  { value: 'under_12', label: 'Under 12%' },
  { value: '12_to_15', label: '12–15%' },
  { value: '15_to_20', label: '15–20%' },
  { value: '20_to_25', label: '20–25%' },
  { value: 'over_25', label: 'Over 25%' },
];

export function CurrentStatsForm({ initial }: Props) {
  const [activityLevel, setActivityLevel] = useState<ActivityLevel | null>(
    initial.activity_level,
  );
  const [trainingExperience, setTrainingExperience] =
    useState<TrainingExperience | null>(initial.training_experience);
  const [dailyTrainingMinutes, setDailyTrainingMinutes] = useState<string>(
    initial.daily_training_minutes !== null
      ? String(initial.daily_training_minutes)
      : '',
  );
  const [avgSleepHours, setAvgSleepHours] = useState<string>(
    initial.avg_sleep_hours !== null ? String(initial.avg_sleep_hours) : '',
  );
  const [bfPctSelfEstimate, setBfPctSelfEstimate] =
    useState<BodyFatEstimate | null>(initial.bf_pct_self_estimate);
  const [currentWeightLbs, setCurrentWeightLbs] = useState<string>(
    initial.current_weight_lbs !== null
      ? String(initial.current_weight_lbs)
      : '',
  );
  const [heightInches, setHeightInches] = useState<string>(
    initial.height_inches !== null ? String(initial.height_inches) : '',
  );
  const [dietRestrictions, setDietRestrictions] = useState<string>(
    initial.diet_restrictions ?? '',
  );
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    // Parse numerics. Empty string → null (cleared); invalid input is
    // surfaced as an error rather than silently dropped, since the user
    // typed something they expected to save.
    let minutes: number | null = null;
    if (dailyTrainingMinutes.trim() !== '') {
      const n = Number(dailyTrainingMinutes);
      if (!Number.isFinite(n) || n < 0 || n > 240) {
        setError('Daily training minutes must be between 0 and 240.');
        return;
      }
      minutes = Math.round(n);
    }
    let sleep: number | null = null;
    if (avgSleepHours.trim() !== '') {
      const n = Number(avgSleepHours);
      if (!Number.isFinite(n) || n < 0 || n > 14) {
        setError('Average sleep hours must be between 0 and 14.');
        return;
      }
      sleep = Math.round(n * 10) / 10;
    }
    let weight: number | null = null;
    if (currentWeightLbs.trim() !== '') {
      const n = Number(currentWeightLbs);
      if (!Number.isFinite(n) || n < 80 || n > 500) {
        setError('Current weight must be between 80 and 500 lbs.');
        return;
      }
      weight = Math.round(n * 10) / 10;
    }
    let height: number | null = null;
    if (heightInches.trim() !== '') {
      const n = Number(heightInches);
      if (!Number.isFinite(n) || n < 48 || n > 96) {
        setError('Height must be between 48 and 96 inches.');
        return;
      }
      height = Math.round(n);
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/profile', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            activity_level: activityLevel,
            training_experience: trainingExperience,
            daily_training_minutes: minutes,
            avg_sleep_hours: sleep,
            bf_pct_self_estimate: bfPctSelfEstimate,
            current_weight_lbs: weight,
            height_inches: height,
            diet_restrictions: dietRestrictions.trim() || null,
          }),
        });
        if (!res.ok) throw new Error(`Save failed (${res.status})`);
        setSavedAt(new Date());
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-10">
      <Field
        label="Activity level"
        help="Day-to-day movement and exertion outside of structured training."
      >
        <SelectButtons
          value={activityLevel}
          onChange={setActivityLevel}
          options={ACTIVITY_OPTIONS}
          allowNull
          disabled={pending}
        />
      </Field>

      <Field
        label="Training experience"
        help="How long you've been resistance-training consistently."
      >
        <SelectButtons
          value={trainingExperience}
          onChange={setTrainingExperience}
          options={EXPERIENCE_OPTIONS}
          allowNull
          disabled={pending}
        />
      </Field>

      <Field
        label="Daily training minutes"
        help="Average across a week. 0–240."
      >
        <input
          type="number"
          min={0}
          max={240}
          step={5}
          value={dailyTrainingMinutes}
          onChange={(e) => setDailyTrainingMinutes(e.target.value)}
          disabled={pending}
          placeholder="e.g. 45"
          className="w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <Field
        label="Average sleep hours"
        help="Best honest estimate. Decimals OK (e.g. 7.5)."
      >
        <input
          type="number"
          min={0}
          max={14}
          step={0.5}
          value={avgSleepHours}
          onChange={(e) => setAvgSleepHours(e.target.value)}
          disabled={pending}
          placeholder="e.g. 7"
          className="w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <Field
        label="Height"
        help="Prefilled from your onboarding answer if you provided one."
      >
        <select
          value={heightInches}
          onChange={(e) => setHeightInches(e.target.value)}
          disabled={pending}
          className="w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">Choose…</option>
          {HEIGHT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Current weight"
        help="In pounds. Prefilled from your onboarding answer; update whenever it changes."
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={80}
            max={500}
            step={0.5}
            value={currentWeightLbs}
            onChange={(e) => setCurrentWeightLbs(e.target.value)}
            disabled={pending}
            placeholder="e.g. 175"
            className="w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <span className="text-xs text-zinc-500">lbs</span>
        </div>
      </Field>

      <Field
        label="Body-fat self-estimate"
        help="Roughly. Used to calibrate advice — no judgment, no scoring."
      >
        <SelectButtons
          value={bfPctSelfEstimate}
          onChange={setBfPctSelfEstimate}
          options={BODY_FAT_OPTIONS}
          allowNull
          disabled={pending}
        />
      </Field>

      <Field
        label="Diet restrictions"
        help="Anything that shapes what you eat — vegetarian, dairy-free, religious, allergies, etc. Free text."
      >
        <textarea
          value={dietRestrictions}
          onChange={(e) => setDietRestrictions(e.target.value)}
          disabled={pending}
          maxLength={500}
          rows={2}
          placeholder="Optional"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        {savedAt && !pending && (
          <span className="text-xs text-zinc-500">
            Saved at {savedAt.toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {label}
      </div>
      {help && (
        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{help}</div>
      )}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function SelectButtons<T extends string | number>({
  value,
  onChange,
  options,
  allowNull,
  disabled,
}: {
  value: T | null;
  onChange: (v: T | null) => void;
  options: Array<{ value: T; label: string }>;
  allowNull?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(allowNull && selected ? null : opt.value)}
            className={
              selected
                ? 'rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900'
                : 'rounded-full border border-zinc-300 px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
