// Area 3 progress visual on /today. Originally Phase D of the redesign;
// the ProcessOutcomeChart it used to embed was removed 2026-05-11 —
// the same chart already renders on /reflection and the duplicate
// pulled past-week material onto an action-shaped page. What stays is
// the milestone fire surface: when ≥1 milestone fired in the last 7
// days, render the fire(s) here. Component returns null when none
// are active.
//
// Voice posture:
// - Absolute / self-comparison framing only (locked from H1/H2
//   decision). NEVER cohort.
// - No "Achievement unlocked" / confetti / emoji.
// - Multiple recent milestones stack vertically, most recent first.

import { copyForTriggerKey } from '@/lib/milestones/copy';
import type { MilestoneRow } from '@/lib/milestones/types';

type Props = {
  recentMilestones: MilestoneRow[];
};

export function ProgressVisual({ recentMilestones }: Props) {
  if (recentMilestones.length === 0) return null;

  return (
    <section className="space-y-3">
      {recentMilestones.map((m) => (
        <MilestoneFire key={m.id} milestone={m} />
      ))}
    </section>
  );
}

function MilestoneFire({ milestone }: { milestone: MilestoneRow }) {
  const copy = copyForTriggerKey(milestone.trigger_key);
  return (
    <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/30">
      <h2 className="text-base font-semibold text-emerald-900 dark:text-emerald-100">
        {copy.title}
      </h2>
      <p className="mt-2 text-[14px] leading-relaxed text-emerald-900/90 dark:text-emerald-100/90">
        {copy.body}
      </p>
      {copy.cta && (
        <p className="mt-3">
          <a
            href={copy.cta.href}
            className="text-[13px] font-medium text-emerald-800 underline decoration-dotted underline-offset-2 hover:text-emerald-950 dark:text-emerald-200 dark:hover:text-emerald-50"
          >
            {copy.cta.label}
          </a>
        </p>
      )}
      <p className="mt-3 text-[11px] uppercase tracking-wider text-emerald-700/70 dark:text-emerald-300/70">
        {new Date(milestone.triggered_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        })}
      </p>
    </article>
  );
}
