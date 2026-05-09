'use client';

// Cardio mobility panel. Distinct from /plan/strength's panel because
// cardio doesn't need pre-session dynamic warm-ups — the modality
// itself (5 min easy spin / jog / row) self-warms. The lift-flavored
// dynamic flows (cat-cow, leg swings to squat, inchworm to push-up)
// are not load-bearing here and bury the post-cardio mobility holds
// that ARE relevant.
//
// What this panel surfaces:
//   - One paragraph naming the "modality is its own warm-up" rule
//   - Static mobility holds filtered to cardio-relevant areas:
//     calves (gastroc + soleus — runners), IT band (cyclists +
//     runners), hamstrings (cyclists + rowers), hip flexor (everyone
//     who sits), glutes / piriformis, ankle, lumbar spine.
//
// Pre-cardio static stretching is the same don't-do-this as pre-lift,
// per the cardio prompt. The dose-after-session framing is in the
// section copy.

import { useState } from 'react';
import {
  TARGET_AREA_LABEL,
  WARMUP_EQUIPMENT_LABEL,
  type TargetArea,
  type WarmupMobilityExercise,
} from '@/lib/strength/warmup-mobility';

type Props = {
  staticMobility: WarmupMobilityExercise[];
};

export function CardioMobilityPanel({ staticMobility }: Props) {
  const [open, setOpen] = useState(false);

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
          Warm-up &amp; mobility for cardio
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          Different from the lifting playbook. Cardio modalities
          self-warm — 5 minutes easy at the modality (easy spin, easy
          jog, 200m easy row) is the warm-up. You don&rsquo;t need a
          separate dynamic block before cardio the way you do before
          lifting. Static stretching pre-cardio has the same
          force-blunting effect as pre-lift; skip it.
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          The post-cardio holds below address the chronic tightness
          patterns cardio actually accumulates: tight calves and ankles
          for runners, IT band and hip flexors for cyclists, lumbar
          and hamstrings for rowers.
        </p>
      </header>

      <div className="mt-5 border-t border-zinc-200 pt-5 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-baseline justify-between text-left"
        >
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Post-cardio mobility · {staticMobility.length} moves
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {open ? 'Hide' : 'Show'}
          </span>
        </button>
        {open && (
          <>
            <p className="mt-3 text-[12px] text-zinc-500 dark:text-zinc-400">
              Hold each for 45–90 seconds. Pick the 2–3 that match the
              modality you ran today.
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
