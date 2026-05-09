'use client';

// Nutrition / body-comp assessment form. Mirrors the other Pattern A
// v0 forms: four required questions + optional free text.

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ALCOHOL_USE_LABEL,
  CANNABIS_USE_LABEL,
  COOKING_CAPACITY_LABEL,
  DIETARY_PATTERN_LABEL,
  EATING_CONTEXT_LABEL,
  FASTING_PROTOCOL_LABEL,
  GOAL_DIRECTION_LABEL,
  GUT_SENSITIVITY_LABEL,
  MEAL_SERVICE_WILLINGNESS_LABEL,
  NUTRITION_WHAT_TRIED_LABEL,
  SNACKING_STYLE_LABEL,
  URGENCY_LABEL,
  type AlcoholUse,
  type CannabisUse,
  type CookingCapacity,
  type DietaryPattern,
  type EatingContext,
  type FastingProtocol,
  type GoalDirection,
  type GutSensitivity,
  type MealServiceWillingness,
  type NutritionWhatTried,
  type SnackingStyle,
  type Urgency,
} from '@/lib/nutrition/types';
import { bmi22FloorLbs } from '@/lib/nutrition/safe-rate';

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

const COOKING_CAPACITIES: CookingCapacity[] = [
  'cook_often_real_meals',
  'cook_simple_quick',
  'cook_rarely',
  'dont_cook',
];

const DIETARY_PATTERNS: DietaryPattern[] = [
  'omnivore',
  'pescatarian',
  'vegetarian',
  'vegan',
  'mixed_no_pattern',
];

const MEAL_SERVICE_WILLINGNESSES: MealServiceWillingness[] = [
  'actively_using',
  'open_to_it',
  'prefer_not',
  'no_thanks',
];

const SNACKING_STYLES: SnackingStyle[] = [
  'three_meals_no_snacks',
  'three_meals_plus_snacks',
  'grazer',
  'inconsistent',
];

export type NutritionAssessmentInitialValues = {
  goal_direction: GoalDirection;
  urgency: Urgency;
  eating_context: EatingContext;
  what_tried: NutritionWhatTried;
  fasting_protocol: FastingProtocol;
  alcohol_use: AlcoholUse;
  cannabis_use: CannabisUse;
  cooking_capacity: CookingCapacity | null;
  dietary_pattern: DietaryPattern | null;
  meal_service_willingness: MealServiceWillingness | null;
  snacking_style: SnackingStyle | null;
  gut_sensitivity: GutSensitivity;
  goal_weight_lbs: number | null;
  goal_target_weeks: number | null;
  bf_pct_assessment: number | null;
  nutrition_goal_text: string | null;
};

export function NutritionAssessmentForm({
  initialValues,
  currentWeightLbs,
  heightInches,
  cancelHref,
}: {
  initialValues?: NutritionAssessmentInitialValues;
  // Current weight + height drive the BMI-22 goal-weight floor and
  // the visible "max safe loss at your weight" hint when goal_direction
  // is 'lose_fat'. Both nullable — when missing the goal-weight section
  // still renders but loses the floor enforcement; the server-side
  // safe-rate computation will kick in regardless.
  currentWeightLbs?: number | null;
  heightInches?: number | null;
  // When set (only on edit-flow with an existing report), renders a
  // "Cancel — keep current plan" link next to the submit button.
  cancelHref?: string;
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
  const [cookingCapacity, setCookingCapacity] = useState<CookingCapacity | null>(
    initialValues?.cooking_capacity ?? null,
  );
  const [dietaryPattern, setDietaryPattern] = useState<DietaryPattern | null>(
    initialValues?.dietary_pattern ?? null,
  );
  const [mealServiceWillingness, setMealServiceWillingness] =
    useState<MealServiceWillingness | null>(
      initialValues?.meal_service_willingness ?? null,
    );
  const [snackingStyle, setSnackingStyle] = useState<SnackingStyle | null>(
    initialValues?.snacking_style ?? null,
  );
  const [gutSensitivity, setGutSensitivity] = useState<GutSensitivity>(
    initialValues?.gut_sensitivity ?? 'none',
  );
  const [goalWeight, setGoalWeight] = useState<string>(
    initialValues?.goal_weight_lbs != null
      ? String(initialValues.goal_weight_lbs)
      : '',
  );
  const [goalWeeks, setGoalWeeks] = useState<string>(
    initialValues?.goal_target_weeks != null
      ? String(initialValues.goal_target_weeks)
      : '',
  );
  const [bfPct, setBfPct] = useState<string>(
    initialValues?.bf_pct_assessment != null
      ? String(initialValues.bf_pct_assessment)
      : '',
  );
  const [goalText, setGoalText] = useState(
    initialValues?.nutrition_goal_text ?? '',
  );

  // BMI-22 floor for the user's height — sub-floor goal weights get
  // hard-rejected at the form level (no auto-extension into territory
  // that's already underweight). Null when height is missing.
  const goalWeightFloor =
    heightInches != null ? bmi22FloorLbs(heightInches) : null;

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
    if (!cookingCapacity) return setError('Pick your cooking capacity.');
    if (!dietaryPattern) return setError('Pick your dietary pattern.');
    if (!mealServiceWillingness)
      return setError('Pick your meal-service willingness.');
    if (!snackingStyle) return setError('Pick your snacking style.');

    // Weight-loss goal layer (only when goal_direction is 'lose_fat').
    // Both fields are optional — empty inputs send null so the report
    // falls back to the qualitative path. When set, validate the
    // BMI-22 floor inline (the only hard reject; rate-cap violations
    // are silently auto-extended downstream).
    let goalWeightVal: number | null = null;
    let goalWeeksVal: number | null = null;
    if (goal === 'lose_fat') {
      const gwTrim = goalWeight.trim();
      const gwTrimWeeks = goalWeeks.trim();
      const goalSet = gwTrim !== '' || gwTrimWeeks !== '';
      if (goalSet) {
        if (gwTrim === '' || gwTrimWeeks === '') {
          return setError(
            'Set both goal weight and timeline, or leave both blank.',
          );
        }
        const gw = Number(gwTrim);
        const gwWeeks = Number(gwTrimWeeks);
        if (!Number.isFinite(gw) || gw < 80 || gw > 500) {
          return setError('Goal weight must be between 80 and 500 lbs.');
        }
        if (!Number.isFinite(gwWeeks) || gwWeeks < 2 || gwWeeks > 104) {
          return setError('Timeline must be between 2 and 104 weeks.');
        }
        if (
          currentWeightLbs != null &&
          gw >= currentWeightLbs
        ) {
          return setError(
            'Goal weight must be below your current weight to set a cut.',
          );
        }
        if (goalWeightFloor != null && gw < goalWeightFloor) {
          return setError(
            `Goal weight is below the BMI-22 floor (${goalWeightFloor} lbs at your height). Pick a higher target — Cleanmaxxing won't plan a cut into underweight territory.`,
          );
        }
        goalWeightVal = Math.round(gw);
        goalWeeksVal = Math.round(gwWeeks);
      }
    }

    let bfPctVal: number | null = null;
    const bfTrim = bfPct.trim();
    if (bfTrim !== '') {
      const bf = Number(bfTrim);
      if (!Number.isFinite(bf) || bf < 4 || bf > 60) {
        return setError('Body fat % must be between 4 and 60.');
      }
      bfPctVal = Math.round(bf);
    }

    const payload = {
      goal_direction: goal,
      urgency,
      eating_context: eatingContext,
      what_tried: whatTried,
      fasting_protocol: fastingProtocol,
      alcohol_use: alcoholUse,
      cannabis_use: cannabisUse,
      cooking_capacity: cookingCapacity,
      dietary_pattern: dietaryPattern,
      meal_service_willingness: mealServiceWillingness,
      snacking_style: snackingStyle,
      gut_sensitivity: gutSensitivity,
      goal_weight_lbs: goalWeightVal,
      goal_target_weeks: goalWeeksVal,
      bf_pct_assessment: bfPctVal,
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
        title="What's your real cooking capacity?"
        helper="Honest read on what you can sustain — not what you did last week. Drives whether the plan recommends real cooking, simple meals, or assembly / services."
      >
        <div className="space-y-2">
          {COOKING_CAPACITIES.map((c) => (
            <RadioRow
              key={c}
              checked={cookingCapacity === c}
              onChange={() => setCookingCapacity(c)}
              disabled={pending}
              label={COOKING_CAPACITY_LABEL[c]}
              name="cooking_capacity"
            />
          ))}
        </div>
      </Question>

      <Question
        number={9}
        title="Dietary pattern?"
        helper="Drives how the protein floor gets hit and which food categories the plan leans on. ‘Mixed / no clear pattern’ is fine."
      >
        <div className="space-y-2">
          {DIETARY_PATTERNS.map((d) => (
            <RadioRow
              key={d}
              checked={dietaryPattern === d}
              onChange={() => setDietaryPattern(d)}
              disabled={pending}
              label={DIETARY_PATTERN_LABEL[d]}
              name="dietary_pattern"
            />
          ))}
        </div>
      </Question>

      <Question
        number={10}
        title="Meal services — open to them?"
        helper="If your cooking capacity is low, services like Factor / Trifecta / Tovala can carry weight. Mister P only recommends them if you're open to it."
      >
        <div className="space-y-2">
          {MEAL_SERVICE_WILLINGNESSES.map((m) => (
            <RadioRow
              key={m}
              checked={mealServiceWillingness === m}
              onChange={() => setMealServiceWillingness(m)}
              disabled={pending}
              label={MEAL_SERVICE_WILLINGNESS_LABEL[m]}
              name="meal_service_willingness"
            />
          ))}
        </div>
      </Question>

      <Question
        number={11}
        title="How do you eat across the day?"
        helper="Three meals vs. snacking vs. grazing changes how protein gets distributed and what snack guidance (if any) shows up in the plan."
      >
        <div className="space-y-2">
          {SNACKING_STYLES.map((s) => (
            <RadioRow
              key={s}
              checked={snackingStyle === s}
              onChange={() => setSnackingStyle(s)}
              disabled={pending}
              label={SNACKING_STYLE_LABEL[s]}
              name="snacking_style"
            />
          ))}
        </div>
      </Question>

      <Question
        number={12}
        title="Sensitive gut?"
        helper="If high-acid (citrus, tomatoes), high-fat, or FODMAP-heavy foods (legumes, cruciferous, onions) consistently cause issues, picking 'sensitive' filters the worst offenders out of your food picker AND the meal plan. You'll still see the rest of the catalog."
      >
        <div className="space-y-2">
          <RadioRow
            checked={gutSensitivity === 'none'}
            onChange={() => setGutSensitivity('none')}
            disabled={pending}
            label={GUT_SENSITIVITY_LABEL.none}
            name="gut_sensitivity"
          />
          <RadioRow
            checked={gutSensitivity === 'sensitive'}
            onChange={() => setGutSensitivity('sensitive')}
            disabled={pending}
            label={GUT_SENSITIVITY_LABEL.sensitive}
            name="gut_sensitivity"
          />
        </div>
      </Question>

      {goal === 'lose_fat' && (
        <Question
          number={13}
          title="Set a weight target? (optional)"
          helper={
            goalWeightFloor != null
              ? `Both fields or neither. Mister P will check the rate against a safe-loss-per-week cap and silently extend the timeline if you've picked too aggressive. The form rejects goals below ${goalWeightFloor} lbs (BMI 22 at your height).`
              : 'Both fields or neither. Mister P will check the rate against a safe-loss-per-week cap and silently extend the timeline if you’ve picked too aggressive. Goals below the BMI-22 floor get rejected at submit.'
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            <div>
              <label
                htmlFor="goal_weight_lbs"
                className="block text-[12px] font-medium text-zinc-600 dark:text-zinc-400"
              >
                Goal weight (lbs)
              </label>
              <input
                id="goal_weight_lbs"
                type="number"
                inputMode="numeric"
                min={80}
                max={500}
                value={goalWeight}
                onChange={(e) => setGoalWeight(e.target.value)}
                disabled={pending}
                placeholder={
                  currentWeightLbs != null
                    ? `e.g. ${Math.max(
                        goalWeightFloor ?? 80,
                        Math.round(currentWeightLbs - 20),
                      )}`
                    : 'e.g. 180'
                }
                className="mt-1.5 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
            <div>
              <label
                htmlFor="goal_target_weeks"
                className="block text-[12px] font-medium text-zinc-600 dark:text-zinc-400"
              >
                Timeline (weeks)
              </label>
              <input
                id="goal_target_weeks"
                type="number"
                inputMode="numeric"
                min={2}
                max={104}
                value={goalWeeks}
                onChange={(e) => setGoalWeeks(e.target.value)}
                disabled={pending}
                placeholder="e.g. 12"
                className="mt-1.5 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            </div>
          </div>
        </Question>
      )}

      <Question
        number={goal === 'lose_fat' ? 13 : 12}
        title="Recent body fat % reading? (optional)"
        helper="Skip if you don't have a reading. A recent caliper, DEXA, or InBody number gives a more accurate safe-rate cap for users who are muscular (BMI alone miscategorizes athletes). Visual estimates are unreliable enough that we'd rather not have them."
      >
        <input
          id="bf_pct_assessment"
          type="number"
          inputMode="numeric"
          min={4}
          max={60}
          step={1}
          value={bfPct}
          onChange={(e) => setBfPct(e.target.value)}
          disabled={pending}
          placeholder="e.g. 18"
          className="w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Question>

      <Question
        number={goal === 'lose_fat' ? 14 : 13}
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
