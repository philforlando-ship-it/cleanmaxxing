'use client';

// Weekly reflection v2 (Phase F).
//
// Sections:
//   1. Process adherence per active journey — one tier-3 question per
//      Pattern A topic the user has engaged with + per active Pattern D
//      protocol.
//   2. Outcome observations — three fixed weekly questions about what
//      happened in the user's life.
//   3. Directional flag — single early-warning self-report; replaces
//      the legacy stuck-confidence detector.
//   4. Free-text reflection with one rotating prompt.
//
// Voice posture: external observation, not self-rating. The user
// reports what happened; the system never asks them to score
// themselves.
//
// When a current-week reflection is already saved, the form
// renders a compact saved view with an Edit affordance.

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  hasV2Data,
  type WeeklyReflectionState,
} from '@/lib/weekly-reflection/service';
import {
  DIRECTIONAL_FLAG_LABEL,
  FREE_TEXT_PROMPTS,
  OUTCOME_INITIATED_LABEL,
  OUTCOME_PHYSICAL_FEEL_LABEL,
  PROCESS_ADHERENCE_TIER_LABEL,
  PROCESS_ADHERENCE_TIERS,
  pickFreeTextPrompt,
  type ActiveJourney,
  type DirectionalFlag,
  type OutcomeInitiated,
  type OutcomePhysicalFeel,
  type ProcessAdherence,
  type ProcessAdherenceTier,
} from '@/lib/weekly-reflection/types';

type Props = {
  initialState: WeeklyReflectionState;
  activeJourneys: ActiveJourney[];
  // Current weight from user_profile, surfaced as the default value for
  // the optional weekly weigh-in. Null when the user hasn't recorded a
  // weight yet (e.g. early-onboarding nutrition assessment skipped).
  // The weigh-in section still renders when null — the user can enter
  // a starting value the same way.
  currentWeightLbs: number | null;
};

const DIRECTIONAL_FLAGS: DirectionalFlag[] = [
  'more_on_track',
  'about_the_same',
  'less_on_track',
  'losing_momentum',
];

const OUTCOME_INITIATED_OPTIONS: OutcomeInitiated[] = [
  'yes',
  'no',
  'not_applicable',
];
const OUTCOME_PHYSICAL_FEEL_OPTIONS: OutcomePhysicalFeel[] = [
  'better',
  'same',
  'worse',
  'mixed',
];

export function WeeklyReflectionCard({
  initialState,
  activeJourneys,
  currentWeightLbs,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const { current, week_start } = initialState;
  const initialIsV2Saved = current != null && hasV2Data(current);
  const [editing, setEditing] = useState(!initialIsV2Saved);

  const promptKey = pickFreeTextPrompt(week_start);
  const promptText = FREE_TEXT_PROMPTS[promptKey];

  const [adherence, setAdherence] = useState<ProcessAdherence>(
    () => current?.process_adherence ?? {},
  );
  const [appearanceComment, setAppearanceComment] = useState<boolean | null>(
    current?.outcome_appearance_comment ?? null,
  );
  const [appearanceCommentText, setAppearanceCommentText] = useState(
    current?.outcome_appearance_comment_text ?? '',
  );
  const [initiated, setInitiated] = useState<OutcomeInitiated | null>(
    current?.outcome_initiated ?? null,
  );
  const [physicalFeel, setPhysicalFeel] = useState<OutcomePhysicalFeel | null>(
    current?.outcome_physical_feel ?? null,
  );
  const [directionalFlag, setDirectionalFlag] = useState<DirectionalFlag | null>(
    current?.directional_flag ?? null,
  );
  const [notes, setNotes] = useState(current?.notes ?? '');
  // Optional weekly weigh-in. The string state lets users clear the
  // field without committing the prior value. Empty string = "skip
  // this week"; a parsed numeric value writes through to user_profile.
  const [weightInput, setWeightInput] = useState<string>(
    currentWeightLbs != null ? String(currentWeightLbs) : '',
  );

  const requiredAdherenceMissing = useMemo(
    () => activeJourneys.some((j) => adherence[j.topic] == null),
    [activeJourneys, adherence],
  );

  function setTier(topic: ActiveJourney['topic'], tier: ProcessAdherenceTier) {
    setAdherence((prev) => ({ ...prev, [topic]: tier }));
  }

  function submit() {
    setError(null);
    if (requiredAdherenceMissing) {
      return setError('Pick a tier for each active journey.');
    }
    if (appearanceComment == null) {
      return setError('Answer the appearance-comment question.');
    }
    if (!initiated) return setError('Answer the initiation question.');
    if (!physicalFeel) return setError('Answer the physical-feel question.');
    if (!directionalFlag) return setError('Pick a directional flag.');

    // Parse the optional weight. Empty string = skipped; otherwise we
    // require a sane numeric in the same range user_profile enforces
    // (80–500 lbs). On parse failure, surface an inline error rather
    // than silently dropping the entry.
    let weightLbs: number | null = null;
    const trimmedWeight = weightInput.trim();
    if (trimmedWeight.length > 0) {
      const n = Number(trimmedWeight);
      if (!Number.isFinite(n) || n < 80 || n > 500) {
        return setError('Weight should be a number between 80 and 500 lbs.');
      }
      weightLbs = Math.round(n * 10) / 10;
    }

    const payload = {
      process_adherence: adherence,
      outcome_appearance_comment: appearanceComment,
      outcome_appearance_comment_text:
        appearanceComment && appearanceCommentText.trim().length > 0
          ? appearanceCommentText.trim()
          : null,
      outcome_initiated: initiated,
      outcome_physical_feel: physicalFeel,
      directional_flag: directionalFlag,
      prompt_used: promptKey,
      notes: notes.trim() || null,
      weight_lbs: weightLbs,
    };

    startTransition(async () => {
      try {
        const res = await fetch('/api/weekly-reflection', {
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
        setEditing(false);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  // Saved view (compact summary + Edit affordance).
  if (!editing && current && hasV2Data(current)) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <header className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            This week&rsquo;s reflection
          </h2>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Edit
          </button>
        </header>
        <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          Saved. The chart below picks it up.
        </p>
        {current.directional_flag && (
          <p className="mt-2 text-[13px] text-zinc-600 dark:text-zinc-400">
            Direction:{' '}
            <strong className="font-medium text-zinc-800 dark:text-zinc-200">
              {DIRECTIONAL_FLAG_LABEL[current.directional_flag]}
            </strong>
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <header>
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          This week&rsquo;s reflection
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          Report what happened — not how you feel about yourself. Five
          minutes.
        </p>
      </header>

      {/* Process adherence */}
      {activeJourneys.length > 0 && (
        <div className="mt-6 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Process — did the work happen?
          </p>
          {activeJourneys.map((j) => (
            <div key={j.topic}>
              <p className="text-[14px] text-zinc-800 dark:text-zinc-200">
                {j.question}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PROCESS_ADHERENCE_TIERS.map((tier) => (
                  <ToggleButton
                    key={tier}
                    active={adherence[j.topic] === tier}
                    onClick={() => setTier(j.topic, tier)}
                    disabled={pending}
                    label={PROCESS_ADHERENCE_TIER_LABEL[tier]}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Outcome observations */}
      <div className="mt-8 space-y-5 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Outcomes — what changed in the world?
        </p>

        <div>
          <p className="text-[14px] text-zinc-800 dark:text-zinc-200">
            Did anyone comment on your appearance this week?
          </p>
          <div className="mt-2 flex gap-2">
            <ToggleButton
              active={appearanceComment === true}
              onClick={() => setAppearanceComment(true)}
              disabled={pending}
              label="Yes"
            />
            <ToggleButton
              active={appearanceComment === false}
              onClick={() => {
                setAppearanceComment(false);
                setAppearanceCommentText('');
              }}
              disabled={pending}
              label="No"
            />
          </div>
          {appearanceComment === true && (
            <input
              type="text"
              value={appearanceCommentText}
              onChange={(e) => setAppearanceCommentText(e.target.value)}
              maxLength={280}
              disabled={pending}
              placeholder="Optional — what was it?"
              className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          )}
        </div>

        <div>
          <p className="text-[14px] text-zinc-800 dark:text-zinc-200">
            Did you initiate a photo, social interaction, or situation
            you&rsquo;d normally avoid?
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {OUTCOME_INITIATED_OPTIONS.map((opt) => (
              <ToggleButton
                key={opt}
                active={initiated === opt}
                onClick={() => setInitiated(opt)}
                disabled={pending}
                label={OUTCOME_INITIATED_LABEL[opt]}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-[14px] text-zinc-800 dark:text-zinc-200">
            Did anything physical feel different — energy, sleep, how
            clothes fit, recovery?
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {OUTCOME_PHYSICAL_FEEL_OPTIONS.map((opt) => (
              <ToggleButton
                key={opt}
                active={physicalFeel === opt}
                onClick={() => setPhysicalFeel(opt)}
                disabled={pending}
                label={OUTCOME_PHYSICAL_FEEL_LABEL[opt]}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Optional weekly weigh-in. Sits between Outcomes and
          Direction because it pairs with the "did anything physical
          feel different" question. Empty input = skip; a numeric
          value writes through to user_profile.current_weight_lbs and
          downstream surfaces (nutrition deficit, milestone triggers,
          /plan/nutrition rate cap) read from there automatically. */}
      <div className="mt-8 space-y-2 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Weekly weigh-in (optional)
        </p>
        <p className="text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          Same conditions as last time — morning, after the bathroom,
          before food or water. One number a week beats stepping on a
          scale every day. Skip the box to skip the week.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min={80}
            max={500}
            value={weightInput}
            onChange={(e) => setWeightInput(e.target.value)}
            disabled={pending}
            placeholder={currentWeightLbs != null ? String(currentWeightLbs) : 'Weight'}
            className="w-32 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">lbs</span>
        </div>
      </div>

      {/* Directional flag */}
      <div className="mt-8 space-y-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Direction
        </p>
        <p className="text-[14px] text-zinc-800 dark:text-zinc-200">
          Compared to last week, my work on Cleanmaxxing feels —
        </p>
        <div className="space-y-2">
          {DIRECTIONAL_FLAGS.map((f) => (
            <label
              key={f}
              className={
                directionalFlag === f
                  ? 'flex cursor-pointer items-center gap-3 rounded-md border border-zinc-900 bg-zinc-50 px-3 py-2 dark:border-zinc-100 dark:bg-zinc-800'
                  : 'flex cursor-pointer items-center gap-3 rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
              }
            >
              <input
                type="radio"
                name="directional_flag"
                checked={directionalFlag === f}
                onChange={() => setDirectionalFlag(f)}
                disabled={pending}
                className="h-4 w-4 border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700"
              />
              <span className="text-sm text-zinc-900 dark:text-zinc-100">
                {DIRECTIONAL_FLAG_LABEL[f]}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Free text */}
      <div className="mt-8 space-y-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          One thing to note (optional)
        </p>
        <p className="text-[14px] text-zinc-800 dark:text-zinc-200">
          {promptText}
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          rows={3}
          disabled={pending}
          placeholder="A specific thing that happened. External, observable."
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Saving…' : 'Save reflection'}
        </button>
        {initialIsV2Saved && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={pending}
            className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}

function ToggleButton({
  active,
  onClick,
  disabled,
  label,
}: {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        active
          ? 'rounded-full border border-zinc-900 bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
          : 'rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
      }
    >
      {label}
    </button>
  );
}
