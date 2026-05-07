'use client';

// Buying-list / equipment-owned card on /plan/strength. Surfaces
// after the report when the assessment + report exist. Computes the
// gear union from the user's selected (or recommended-fallback)
// exercises, renders one checkbox per gear item, splits the view
// into "Already have" and "You'll need" groups based on
// equipment_owned state.
//
// First-render seeding: when equipment_owned is null on the
// assessment, the form pre-checks the equipment-access defaults
// (e.g., home_rack_bench seeds barbell + rack + bench + dumbbells +
// pull-up bar + mat as already-owned). Once the user clicks Save,
// the explicit set persists; the defaults stop applying on subsequent
// renders.

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  GEAR_BLURB,
  GEAR_LABEL,
  type GearItem,
} from '@/lib/strength/gear';

type Props = {
  // Gear items required by the user's plan, derived server-side
  // from selected_exercise_slugs (or recommended-fallback) ∩ catalog.
  // Stable order — already filtered through GEAR_ITEMS canonical order.
  required: GearItem[];
  // Initial owned set. Either the persisted equipment_owned column
  // (when non-null) or the equipment-access default seed (when null).
  initialOwned: GearItem[];
  // Whether the initial state was seeded vs. user-explicit. Drives
  // a small "this is a starting guess — confirm what you actually
  // have" hint on first render.
  isSeededDefault: boolean;
};

export function EquipmentListCard({
  required,
  initialOwned,
  isSeededDefault,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [owned, setOwned] = useState<Set<GearItem>>(
    () => new Set(initialOwned),
  );
  const [savedOnce, setSavedOnce] = useState(false);

  function toggle(item: GearItem) {
    setOwned((prev) => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item);
      else next.add(item);
      return next;
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/strength/equipment-owned', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            equipment_owned: Array.from(owned),
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Save failed (${res.status})`);
        }
        setSavedOnce(true);
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  const { haveItems, needItems } = useMemo(() => {
    const have: GearItem[] = [];
    const need: GearItem[] = [];
    for (const item of required) {
      if (owned.has(item)) have.push(item);
      else need.push(item);
    }
    return { haveItems: have, needItems: need };
  }, [required, owned]);

  if (required.length === 0) return null;

  return (
    <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <header>
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          What you’ll need
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          Gear required by your plan. Check off what you already have.
          What stays unchecked is your recommended-buy list.
          {isSeededDefault && !savedOnce && (
            <span className="mt-1 block text-[12px] text-zinc-500 dark:text-zinc-500">
              Pre-checked items are guesses based on your equipment access —
              correct anything that’s wrong, then save.
            </span>
          )}
        </p>
      </header>

      <ul className="mt-5 flex flex-col gap-2">
        {required.map((item) => {
          const checked = owned.has(item);
          return (
            <li key={item}>
              <label
                className={
                  checked
                    ? 'flex cursor-pointer items-start gap-3 rounded-md border border-zinc-900 bg-zinc-50 px-3 py-2.5 dark:border-zinc-100 dark:bg-zinc-800'
                    : 'flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 px-3 py-2.5 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
                }
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(item)}
                  disabled={pending}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700"
                />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {GEAR_LABEL[item]}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-zinc-500 dark:text-zinc-400">
                    {GEAR_BLURB[item]}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {needItems.length > 0 && savedOnce && (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {needItems.length === 1
            ? `One item to acquire: ${GEAR_LABEL[needItems[0]]}.`
            : `${needItems.length} items to acquire: ${needItems
                .map((i) => GEAR_LABEL[i])
                .join(', ')}.`}
        </p>
      )}

      {haveItems.length === required.length && savedOnce && (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          You have everything your plan requires. No purchases needed.
        </p>
      )}

      {error && (
        <p className="mt-3 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-5">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Saving…' : savedOnce ? 'Update' : 'Save'}
        </button>
      </div>
    </section>
  );
}
