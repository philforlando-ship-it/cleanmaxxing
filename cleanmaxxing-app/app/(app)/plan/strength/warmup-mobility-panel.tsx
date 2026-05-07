'use client';

// Warm-up + mobility panel on /plan/strength. Renders below the
// report and the existing exercise picker. Two collapsed sections:
//   1. Warm-up (dynamic, pre-lift) — universal flows + lift-specific
//      flows derived from the user's selected exercises' patterns
//   2. Mobility (static, post-lift) — all entries grouped by target area
//
// Voice posture: the section headers + helper copy explicitly name
// the dynamic-vs-static distinction so users understand WHEN to use
// each. Static stretching pre-lift is the most common user mistake;
// the framing here actively pushes against it.

import { useState } from 'react';
import {
  FLOW_TYPE_LABEL,
  TARGET_AREA_LABEL,
  WARMUP_EQUIPMENT_LABEL,
  type TargetArea,
  type WarmupMobilityExercise,
} from '@/lib/strength/warmup-mobility';

type Props = {
  universalWarmups: WarmupMobilityExercise[];
  liftSpecificWarmups: WarmupMobilityExercise[];
  staticMobility: WarmupMobilityExercise[];
};

export function WarmupMobilityPanel({
  universalWarmups,
  liftSpecificWarmups,
  staticMobility,
}: Props) {
  const [warmupOpen, setWarmupOpen] = useState(false);
  const [mobilityOpen, setMobilityOpen] = useState(false);

  // Group static mobility by primary target area for grouped render.
  const mobilityByArea = new Map<TargetArea, WarmupMobilityExercise[]>();
  for (const ex of staticMobility) {
    const primary = ex.targets_areas[0];
    if (!primary) continue;
    if (!mobilityByArea.has(primary)) mobilityByArea.set(primary, []);
    mobilityByArea.get(primary)!.push(ex);
  }

  return (
    <section className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <header>
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Warm-up &amp; mobility
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          Two distinct things, often confused. Dynamic warm-ups go
          BEFORE you lift — they prep tissues without sapping power.
          Static mobility (longer holds) goes AFTER, or in dedicated
          sessions. Static stretching pre-lift is shown by the
          research to reduce force production for 30–60 minutes.
          Don’t do that.
        </p>
      </header>

      {/* Dynamic warm-up section */}
      <div className="mt-5 border-t border-zinc-200 pt-5 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setWarmupOpen((v) => !v)}
          className="flex w-full items-baseline justify-between text-left"
        >
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {FLOW_TYPE_LABEL.dynamic_warmup} ·{' '}
            {universalWarmups.length + liftSpecificWarmups.length} moves
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {warmupOpen ? 'Hide' : 'Show'}
          </span>
        </button>
        {warmupOpen && (
          <>
            <p className="mt-3 text-[12px] text-zinc-500 dark:text-zinc-400">
              5–8 minutes total. Pick 3–5 from the universal list, plus
              1–2 lift-specific based on what you’re training.
            </p>

            <SubSection title="Universal — do before any session">
              <ExerciseList items={universalWarmups} />
            </SubSection>

            {liftSpecificWarmups.length > 0 && (
              <SubSection title="Lift-specific — pick what matches today">
                <ExerciseList items={liftSpecificWarmups} />
              </SubSection>
            )}
          </>
        )}
      </div>

      {/* Static mobility section */}
      <div className="mt-5 border-t border-zinc-200 pt-5 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setMobilityOpen((v) => !v)}
          className="flex w-full items-baseline justify-between text-left"
        >
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {FLOW_TYPE_LABEL.static_mobility} · {staticMobility.length} moves
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {mobilityOpen ? 'Hide' : 'Show'}
          </span>
        </button>
        {mobilityOpen && (
          <>
            <p className="mt-3 text-[12px] text-zinc-500 dark:text-zinc-400">
              Hold each for 45–90 seconds. Targets are paired with the
              tightness pattern they address — desk-job hip flexors,
              bench-press pec shortening, etc.
            </p>

            {[...mobilityByArea.entries()].map(([area, items]) => (
              <SubSection key={area} title={TARGET_AREA_LABEL[area]}>
                <ExerciseList items={items} />
              </SubSection>
            ))}
          </>
        )}
      </div>
    </section>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ExerciseList({ items }: { items: WarmupMobilityExercise[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((ex) => (
        <li
          key={ex.slug}
          className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950/40"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <span className="text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
              {ex.label}
            </span>
            <span className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {ex.duration_or_reps}
            </span>
          </div>
          <ul className="mt-1.5 ml-4 list-disc space-y-0.5 text-[12.5px] leading-snug text-zinc-700 dark:text-zinc-300">
            {ex.key_points.map((kp, i) => (
              <li key={i}>{kp}</li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            {WARMUP_EQUIPMENT_LABEL[ex.equipment]}
          </p>
        </li>
      ))}
    </ul>
  );
}
