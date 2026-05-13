'use client';

// Interactive exercise library panel — replaces the static reference
// panel. Shows the catalog filtered by the user's equipment_access
// (read from the assessment) and a free-form constraints text box.
// Each exercise renders with a single-row crop of its source
// infographic (CSS background-position trick — each infographic is
// 4 stacked rows, we show one quarter). Users mark exercises as
// preferred or excluded; preferences save to the assessment row
// without re-running the LLM. A separate "Regenerate plan" button
// triggers the report regeneration with the new picks.

import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CMSpinner } from '@/components/cm-logo';
import {
  MUSCLE_GROUP_LABEL,
  type MuscleGroup,
  type StrengthBodyweightPreference,
  type StrengthEquipmentAccess,
  type StrengthExercise,
  type StrengthInjuryConstraint,
  type StrengthPriorityMuscle,
  type StrengthSecondaryObjective,
} from '@/lib/strength/types';
import { getRecommendedExercises } from '@/lib/strength/recommended-exercises';

const GROUP_ORDER: MuscleGroup[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'glutes',
  'core',
  'calves',
];

type Props = {
  equipmentAccess: StrengthEquipmentAccess;
  injuryConstraints: StrengthInjuryConstraint[];
  priorityMuscles: StrengthPriorityMuscle[];
  secondaryObjective: StrengthSecondaryObjective[];
  bodyweightPreference: StrengthBodyweightPreference | null;
  // The user's fine-grained gear list. Threaded through to the
  // recommender so bodyweight-tagged exercises that need a pull-up
  // bar (bodyweight_row, hanging_leg_raise) get hidden when the user
  // doesn't own one.
  equipmentOwned: string[] | null;
  initialSelected: string[];
  initialExcluded: string[];
  initialFilterText: string | null;
};

type ExerciseStateMap = Map<string, 'selected' | 'excluded' | 'neutral'>;

export function ExerciseLibraryPanel({
  equipmentAccess,
  injuryConstraints,
  priorityMuscles,
  secondaryObjective,
  bodyweightPreference,
  equipmentOwned,
  initialSelected,
  initialExcluded,
  initialFilterText,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Recommended subset: applies equipment + injury hard filters and
  // priority + secondary up-rank. The picker default-renders the
  // recommended group; "Show all" toggle reveals filteredOut
  // exercises dimmed below it. hiddenByEquipment never renders —
  // those exercises are irrelevant to this user.
  const recommendedResult = useMemo(
    () =>
      getRecommendedExercises({
        equipment_access: equipmentAccess,
        injury_constraints: injuryConstraints,
        priority_muscles: priorityMuscles,
        secondary_objective: secondaryObjective,
        bodyweight_preference: bodyweightPreference,
        equipment_owned: equipmentOwned,
      }),
    [
      equipmentAccess,
      injuryConstraints,
      priorityMuscles,
      secondaryObjective,
      bodyweightPreference,
      equipmentOwned,
    ],
  );

  // If the user has saved selections that are in the filteredOut
  // set (e.g. they picked "deadlift" before lower_back_pain went
  // on file), auto-expand so they don't lose visibility on those
  // picks. Once they've toggled the panel manually, respect that.
  const filteredOutSlugSet = useMemo(
    () => new Set(recommendedResult.filteredOut.map((e) => e.slug)),
    [recommendedResult.filteredOut],
  );
  const hasFilteredOutSelections = useMemo(
    () =>
      initialSelected.some((s) => filteredOutSlugSet.has(s)) ||
      initialExcluded.some((s) => filteredOutSlugSet.has(s)),
    [initialSelected, initialExcluded, filteredOutSlugSet],
  );
  const [showAll, setShowAll] = useState(hasFilteredOutSelections);

  // Per-exercise state. Reconciled from initial props on mount.
  const [stateMap, setStateMap] = useState<ExerciseStateMap>(() => {
    const m = new Map<string, 'selected' | 'excluded' | 'neutral'>();
    for (const slug of initialSelected) m.set(slug, 'selected');
    for (const slug of initialExcluded) m.set(slug, 'excluded');
    return m;
  });
  const [filterText, setFilterText] = useState(initialFilterText ?? '');

  // Track whether the local state has diverged from server state. Used
  // to enable/disable Save and to show a "you have unsaved changes"
  // hint if the user tries to regenerate.
  const initialSelectedRef = useRef(new Set(initialSelected));
  const initialExcludedRef = useRef(new Set(initialExcluded));
  const initialFilterTextRef = useRef(initialFilterText ?? '');

  const dirty = useMemo(() => {
    const sel = new Set<string>();
    const exc = new Set<string>();
    for (const [slug, st] of stateMap) {
      if (st === 'selected') sel.add(slug);
      if (st === 'excluded') exc.add(slug);
    }
    if (sel.size !== initialSelectedRef.current.size) return true;
    for (const s of sel) if (!initialSelectedRef.current.has(s)) return true;
    if (exc.size !== initialExcludedRef.current.size) return true;
    for (const s of exc) if (!initialExcludedRef.current.has(s)) return true;
    if (filterText !== initialFilterTextRef.current) return true;
    return false;
  }, [stateMap, filterText]);

  const [savingPrefs, startSavingPrefs] = useTransition();
  const [regenerating, startRegenerating] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  // Apply the free-form text filter on top of the recommended
  // subset (and filteredOut when showAll is on). The LLM still
  // gets the full filter_text in the prompt for nuanced
  // interpretation; this is just to keep the menu focused.
  const filterLower = filterText.trim().toLowerCase();
  function passesText(ex: StrengthExercise): boolean {
    if (filterLower.length === 0) return true;
    const haystack = `${ex.label} ${ex.primary_muscles.join(
      ' ',
    )} ${ex.movement_pattern} ${ex.equipment}`.toLowerCase();
    return haystack.includes(filterLower);
  }

  const recommendedVisible = useMemo(
    () => recommendedResult.recommended.filter(passesText),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recommendedResult.recommended, filterLower],
  );
  const filteredOutVisible = useMemo(
    () => (showAll ? recommendedResult.filteredOut.filter(passesText) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recommendedResult.filteredOut, showAll, filterLower],
  );

  const groupedRecommended = useMemo(() => {
    const map = new Map<MuscleGroup, StrengthExercise[]>();
    for (const e of recommendedVisible) {
      const list = map.get(e.primary_group) ?? [];
      list.push(e);
      map.set(e.primary_group, list);
    }
    return map;
  }, [recommendedVisible]);

  const groupedFilteredOut = useMemo(() => {
    const map = new Map<MuscleGroup, StrengthExercise[]>();
    for (const e of filteredOutVisible) {
      const list = map.get(e.primary_group) ?? [];
      list.push(e);
      map.set(e.primary_group, list);
    }
    return map;
  }, [filteredOutVisible]);

  function setExerciseState(slug: string, next: 'selected' | 'excluded') {
    setStateMap((prev) => {
      const m = new Map(prev);
      const current = m.get(slug) ?? 'neutral';
      // Click the already-active state to clear it.
      m.set(slug, current === next ? 'neutral' : next);
      return m;
    });
  }

  function savePreferences() {
    setError(null);
    setSavedHint(null);
    const selected: string[] = [];
    const excluded: string[] = [];
    for (const [slug, st] of stateMap) {
      if (st === 'selected') selected.push(slug);
      if (st === 'excluded') excluded.push(slug);
    }
    const payload = {
      selected_exercise_slugs: selected,
      excluded_exercise_slugs: excluded,
      exercise_filter_text: filterText.trim() || null,
    };
    startSavingPrefs(async () => {
      try {
        const res = await fetch('/api/plan/strength/exercise-preferences', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
          };
          throw new Error(
            body.message ?? body.error ?? `Save failed (${res.status})`,
          );
        }
        // Update the "what was last saved" refs so dirty resets.
        initialSelectedRef.current = new Set(selected);
        initialExcludedRef.current = new Set(excluded);
        initialFilterTextRef.current = filterText;
        setSavedHint('Saved. Click Regenerate to update your plan.');
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function regeneratePlan() {
    setError(null);
    setSavedHint(null);
    startRegenerating(async () => {
      try {
        const res = await fetch('/api/plan/strength/regenerate', {
          method: 'POST',
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
          };
          throw new Error(
            body.message ??
              body.error ??
              `Regeneration failed (${res.status})`,
          );
        }
        // Refresh the page so the new report renders.
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  if (!open) {
    const selectedCount = Array.from(stateMap.values()).filter(
      (s) => s === 'selected',
    ).length;
    const excludedCount = Array.from(stateMap.values()).filter(
      (s) => s === 'excluded',
    ).length;
    return (
      <section className="mt-8 rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Exercise library — pick your preferences
          </span>
          <span className="text-[11px] uppercase tracking-wider text-zinc-500">
            {selectedCount} preferred · {excludedCount} excluded
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          Filter the catalog by your equipment and constraints, then mark
          which exercises Mister P should lean on or avoid. Saved picks
          shape the next plan regeneration.
        </p>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Open
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Exercise library
        </h3>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Close
        </button>
      </div>

      <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
        Recommended for you ({recommendedResult.recommended.length}) —
        filtered to your equipment ({equipmentAccess.replace(/_/g, ' ')})
        {injuryConstraints.length > 0 && (
          <>
            {' '}
            and routed around your injury constraints
          </>
        )}
        . Click an exercise to mark it preferred (Mister P will lean on
        it) or excluded (Mister P won&rsquo;t recommend it).
      </p>

      <div className="mt-4">
        <label className="block text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Constraints (free-form, optional)
        </label>
        <textarea
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="e.g. no overhead pressing, bad knees so no jumping, hate barbell deadlifts"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[13px] dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          Coarse text match filters the menu; the full text is also passed
          to Mister P for the actual prescription.
        </p>
      </div>

      <div className="mt-6 space-y-6">
        {GROUP_ORDER.map((group) => {
          const list = groupedRecommended.get(group);
          if (!list || list.length === 0) return null;
          return (
            <div key={group}>
              <h4 className="text-[12px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {MUSCLE_GROUP_LABEL[group]}
              </h4>
              <ul className="mt-2 space-y-3">
                {list.map((ex) => (
                  <ExerciseRow
                    key={ex.slug}
                    exercise={ex}
                    state={stateMap.get(ex.slug) ?? 'neutral'}
                    onMark={(next) => setExerciseState(ex.slug, next)}
                  />
                ))}
              </ul>
            </div>
          );
        })}
        {recommendedVisible.length === 0 && (
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
            No exercises match your filter. Loosen the constraints text to
            see more.
          </p>
        )}

        {/* Show all toggle — reveals exercises that don't fit your
            profile (filtered out by injury constraints). The user can
            still pick from these; the recommendation is informational. */}
        {recommendedResult.filteredOut.length > 0 && (
          <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-[12px] text-zinc-600 underline decoration-dotted underline-offset-2 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              {`${showAll ? 'Hide' : 'Show'} ${recommendedResult.filteredOut.length} more exercises that don’t fit your profile`}
            </button>
            {showAll && (
              <div className="mt-4 space-y-6 opacity-70">
                {GROUP_ORDER.map((group) => {
                  const list = groupedFilteredOut.get(group);
                  if (!list || list.length === 0) return null;
                  return (
                    <div key={`fo-${group}`}>
                      <h4 className="text-[12px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        {MUSCLE_GROUP_LABEL[group]}
                      </h4>
                      <ul className="mt-2 space-y-3">
                        {list.map((ex) => (
                          <ExerciseRow
                            key={ex.slug}
                            exercise={ex}
                            state={stateMap.get(ex.slug) ?? 'neutral'}
                            onMark={(next) =>
                              setExerciseState(ex.slug, next)
                            }
                            doesNotFitProfile
                          />
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {savedHint && (
        <p className="mt-4 text-[12px] text-zinc-700 dark:text-zinc-300">
          {savedHint}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <button
          type="button"
          onClick={savePreferences}
          disabled={savingPrefs || regenerating || !dirty}
          className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {savingPrefs ? 'Saving…' : 'Save preferences'}
        </button>
        <button
          type="button"
          onClick={regeneratePlan}
          disabled={savingPrefs || regenerating}
          className="rounded-lg border border-zinc-900 px-3.5 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {regenerating
            ? 'Mister P is rewriting your plan…'
            : 'Regenerate plan with these picks'}
        </button>
        {regenerating && <CMSpinner size="xs" />}
        {dirty && !savingPrefs && !regenerating && (
          <span className="text-[11px] text-amber-700 dark:text-amber-400">
            Unsaved picks — save before regenerating to apply them.
          </span>
        )}
      </div>
    </section>
  );
}

// ===========================================================
// Exercise row — single-row image crop + form cues + toggles
// ===========================================================

function ExerciseRow({
  exercise,
  state,
  onMark,
  doesNotFitProfile = false,
}: {
  exercise: StrengthExercise;
  state: 'selected' | 'excluded' | 'neutral';
  onMark: (next: 'selected' | 'excluded') => void;
  // True when rendered under "Show all" — the exercise was filtered
  // out by an injury constraint or profile mismatch. Renders a
  // small badge so the user knows this isn't a top recommendation.
  doesNotFitProfile?: boolean;
}) {
  const cardClass =
    state === 'selected'
      ? 'rounded-md border-2 border-emerald-500 bg-emerald-50 px-3 py-2.5 dark:border-emerald-500 dark:bg-emerald-950/30'
      : state === 'excluded'
        ? 'rounded-md border-2 border-red-400 bg-red-50 px-3 py-2.5 opacity-70 dark:border-red-500 dark:bg-red-950/30'
        : 'rounded-md border border-zinc-200 px-3 py-2.5 dark:border-zinc-800';

  return (
    <li className={cardClass}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
          {exercise.label}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          {exercise.equipment.replace(/_/g, ' ')} ·{' '}
          {exercise.movement_pattern.replace(/_/g, ' ')}
        </span>
      </div>
      {doesNotFitProfile && (
        <p className="mt-1 text-[11px] italic text-zinc-500 dark:text-zinc-400">
          Doesn&rsquo;t fit your profile — pickable, but not in your
          recommended set.
        </p>
      )}
      <p className="mt-0.5 text-[12px] text-zinc-500 dark:text-zinc-400">
        Primary: {exercise.primary_muscles.join(', ')}
      </p>

      {/* Single-exercise reference image (2026-05-12 — switched from
          row-cropped multi-exercise infographics to one-image-per-
          exercise PNGs). Source assets are roughly square; the
          container uses object-contain so any odd aspect doesn't
          distort the figure. A few catalog entries ship without an
          upstream image and skip the block entirely. */}
      {exercise.image_path && (
        <div className="mt-3 w-full overflow-hidden rounded-md border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={exercise.image_path}
            alt={`${exercise.label} reference`}
            className="h-auto w-full object-contain"
            loading="lazy"
          />
        </div>
      )}

      <ul className="mt-2 ml-4 list-disc space-y-0.5 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        {exercise.key_points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
        <button
          type="button"
          onClick={() => onMark('selected')}
          className={
            state === 'selected'
              ? 'rounded-sm bg-emerald-600 px-2 py-0.5 font-semibold text-white'
              : 'rounded-sm border border-emerald-600 px-2 py-0.5 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
          }
        >
          {state === 'selected' ? '✓ Preferred' : 'Prefer this'}
        </button>
        <button
          type="button"
          onClick={() => onMark('excluded')}
          className={
            state === 'excluded'
              ? 'rounded-sm bg-red-600 px-2 py-0.5 font-semibold text-white'
              : 'rounded-sm border border-red-500 px-2 py-0.5 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'
          }
        >
          {state === 'excluded' ? '✕ Excluded' : 'Exclude'}
        </button>
      </div>
    </li>
  );
}

