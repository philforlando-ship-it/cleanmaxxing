'use client';

// Interactive food library panel. Curated catalog grouped by macro
// role with "pick X to Y" guidance per category. Free-form
// constraints text on top. Each food has include/exclude toggles.
// Saves preferences without LLM call. Triggers meal plan
// regeneration via the meal plan panel's button (separate concern).

import Image from 'next/image';
import { useMemo, useRef, useState, useTransition } from 'react';
import {
  FOOD_CATEGORY_LABEL,
  FOOD_CATEGORY_PICK_RANGE,
  FOODS,
  type Food,
  type FoodCategory,
} from '@/lib/nutrition/types';

const CATEGORY_ORDER: FoodCategory[] = [
  'protein',
  'complex_carb',
  'fruit',
  'veggie',
  'fat',
  'snack',
];

type Props = {
  initialPreferences: string[];
  initialExclusions: string[];
  initialFilterText: string | null;
};

type FoodStateMap = Map<string, 'preferred' | 'excluded' | 'neutral'>;

export function FoodLibraryPanel({
  initialPreferences,
  initialExclusions,
  initialFilterText,
}: Props) {
  const [open, setOpen] = useState(false);

  const [stateMap, setStateMap] = useState<FoodStateMap>(() => {
    const m = new Map<string, 'preferred' | 'excluded' | 'neutral'>();
    for (const slug of initialPreferences) m.set(slug, 'preferred');
    for (const slug of initialExclusions) m.set(slug, 'excluded');
    return m;
  });
  const [filterText, setFilterText] = useState(initialFilterText ?? '');

  const initialPreferencesRef = useRef(new Set(initialPreferences));
  const initialExclusionsRef = useRef(new Set(initialExclusions));
  const initialFilterTextRef = useRef(initialFilterText ?? '');

  const dirty = useMemo(() => {
    const pref = new Set<string>();
    const excl = new Set<string>();
    for (const [slug, st] of stateMap) {
      if (st === 'preferred') pref.add(slug);
      if (st === 'excluded') excl.add(slug);
    }
    if (pref.size !== initialPreferencesRef.current.size) return true;
    for (const s of pref)
      if (!initialPreferencesRef.current.has(s)) return true;
    if (excl.size !== initialExclusionsRef.current.size) return true;
    for (const s of excl)
      if (!initialExclusionsRef.current.has(s)) return true;
    if (filterText !== initialFilterTextRef.current) return true;
    return false;
  }, [stateMap, filterText]);

  const [savingPrefs, startSavingPrefs] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<FoodCategory, Food[]>();
    for (const f of FOODS) {
      const list = map.get(f.category) ?? [];
      list.push(f);
      map.set(f.category, list);
    }
    return map;
  }, []);

  // Per-category counts for the "X of Y picked" hint.
  const categoryPickedCount = useMemo(() => {
    const counts = new Map<FoodCategory, number>();
    for (const cat of CATEGORY_ORDER) counts.set(cat, 0);
    for (const food of FOODS) {
      if (stateMap.get(food.slug) === 'preferred') {
        counts.set(food.category, (counts.get(food.category) ?? 0) + 1);
      }
    }
    return counts;
  }, [stateMap]);

  function setFoodState(slug: string, next: 'preferred' | 'excluded') {
    setStateMap((prev) => {
      const m = new Map(prev);
      const current = m.get(slug) ?? 'neutral';
      m.set(slug, current === next ? 'neutral' : next);
      return m;
    });
  }

  function savePreferences() {
    setError(null);
    setSavedHint(null);
    const preferences: string[] = [];
    const exclusions: string[] = [];
    for (const [slug, st] of stateMap) {
      if (st === 'preferred') preferences.push(slug);
      if (st === 'excluded') exclusions.push(slug);
    }
    const payload = {
      food_preferences: preferences,
      food_exclusions: exclusions,
      food_filter_text: filterText.trim() || null,
    };
    startSavingPrefs(async () => {
      try {
        const res = await fetch('/api/plan/nutrition/food-preferences', {
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
        initialPreferencesRef.current = new Set(preferences);
        initialExclusionsRef.current = new Set(exclusions);
        initialFilterTextRef.current = filterText;
        setSavedHint(
          'Saved. Generate a meal plan below to use these picks, or update them anytime.',
        );
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  if (!open) {
    const totalPreferred = Array.from(stateMap.values()).filter(
      (s) => s === 'preferred',
    ).length;
    const totalExcluded = Array.from(stateMap.values()).filter(
      (s) => s === 'excluded',
    ).length;
    return (
      <section className="mt-8 rounded-xl border border-zinc-200 bg-white px-5 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Food library — pick what you actually eat
          </span>
          <span className="text-[11px] uppercase tracking-wider text-zinc-500">
            {totalPreferred} preferred · {totalExcluded} excluded
          </span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          Pick 4–6 proteins, 3–4 carbs, 3–4 fruits, 5–7 veggies, 3–4 fats,
          and 4–6 snacks you actually like. Mister P builds the meal plan
          around your selections — exclusions are honored as hard
          constraints.
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
          Food library
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
        Click a food to mark it preferred (used in your meal plan) or
        excluded (never used). Click again to clear. Suggested picks per
        category are guidance, not enforcement.
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
          placeholder="e.g. no dairy, lactose intolerant, hate mushrooms, kosher"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-[13px] dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
          Free-form text passed to Mister P alongside the picks above.
        </p>
      </div>

      <div className="mt-6 space-y-7">
        {CATEGORY_ORDER.map((category) => {
          const list = grouped.get(category);
          if (!list || list.length === 0) return null;
          const range = FOOD_CATEGORY_PICK_RANGE[category];
          const picked = categoryPickedCount.get(category) ?? 0;
          return (
            <div key={category}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="text-[12px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {FOOD_CATEGORY_LABEL[category]}{' '}
                  <span className="font-normal lowercase text-zinc-400 dark:text-zinc-500">
                    pick {range.min}–{range.max}
                  </span>
                </h4>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {picked} picked
                </span>
              </div>
              <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {list.map((food) => (
                  <FoodChip
                    key={food.slug}
                    food={food}
                    state={stateMap.get(food.slug) ?? 'neutral'}
                    onMark={(next) => setFoodState(food.slug, next)}
                  />
                ))}
              </ul>
            </div>
          );
        })}
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
          disabled={savingPrefs || !dirty}
          className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {savingPrefs ? 'Saving…' : 'Save picks'}
        </button>
        {dirty && !savingPrefs && (
          <span className="text-[11px] text-amber-700 dark:text-amber-400">
            Unsaved picks — save before generating a new meal plan.
          </span>
        )}
      </div>
    </section>
  );
}

function FoodChip({
  food,
  state,
  onMark,
}: {
  food: Food;
  state: 'preferred' | 'excluded' | 'neutral';
  onMark: (next: 'preferred' | 'excluded') => void;
}) {
  const containerClass =
    state === 'preferred'
      ? 'flex flex-col gap-2 rounded-md border-2 border-emerald-500 bg-emerald-50 p-2 dark:border-emerald-500 dark:bg-emerald-950/30'
      : state === 'excluded'
        ? 'flex flex-col gap-2 rounded-md border-2 border-red-400 bg-red-50 p-2 opacity-70 dark:border-red-500 dark:bg-red-950/30'
        : 'flex flex-col gap-2 rounded-md border border-zinc-200 p-2 dark:border-zinc-800';

  return (
    <li className={containerClass}>
      {/* Image — generated by scripts/generate-food-images.ts. Falls
          back gracefully if the image isn't generated yet (next/image
          shows alt text + the bg color shows through). */}
      <FoodImage slug={food.slug} label={food.label} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] leading-tight text-zinc-900 dark:text-zinc-100">
          {food.label}
        </span>
        <div className="flex shrink-0 items-center gap-1 text-[10px]">
          <button
            type="button"
            onClick={() => onMark('preferred')}
            aria-label={`Prefer ${food.label}`}
            className={
              state === 'preferred'
                ? 'rounded-sm bg-emerald-600 px-1.5 py-0.5 font-semibold text-white'
                : 'rounded-sm border border-emerald-600 px-1.5 py-0.5 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40'
            }
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => onMark('excluded')}
            aria-label={`Exclude ${food.label}`}
            className={
              state === 'excluded'
                ? 'rounded-sm bg-red-600 px-1.5 py-0.5 font-semibold text-white'
                : 'rounded-sm border border-red-500 px-1.5 py-0.5 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40'
            }
          >
            ✕
          </button>
        </div>
      </div>
    </li>
  );
}

// Per-food image. Hides itself on load error so the chip degrades to
// label + toggles when the image hasn't been generated yet — useful in
// dev and during incremental catalog growth.
function FoodImage({ slug, label }: { slug: string; label: string }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800">
      <Image
        src={`/images/foods/${slug}.png`}
        alt={label}
        fill
        sizes="(max-width: 640px) 50vw, 25vw"
        className="object-cover"
        onError={() => setHidden(true)}
      />
    </div>
  );
}
