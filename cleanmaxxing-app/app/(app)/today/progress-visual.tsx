// Phase D of the /today redesign — Area 3 progress visual.
//
// Two states:
//   - Default: confidence trend chart (last 90 days). Quiet, no
//     header decoration.
//   - Milestone-active: when ≥1 milestone fired in the last 7 days,
//     render the milestone fire(s) ABOVE the chart. Chart still
//     visible below — less jarring than a full surface swap.
//
// The weekly-check-in counter ("X of Y days") retired with the
// goals system on 2026-05-10 (Tier 3) — it was always derived from
// goal_check_ins, which no longer exists.
//
// Voice posture:
// - Absolute / self-comparison framing only (locked from H1/H2
//   decision). NEVER cohort.
// - No "Achievement unlocked" / confetti / emoji.
// - Multiple recent milestones stack vertically, most recent first.

import { ProcessOutcomeChart } from './process-outcome-chart';
import type { WeeklyReflection } from '@/lib/weekly-reflection/service';
import { copyForTriggerKey } from '@/lib/milestones/copy';
import type { MilestoneRow } from '@/lib/milestones/types';

type Props = {
  recentMilestones: MilestoneRow[];
  confidenceHistory: WeeklyReflection[];
};

export function ProgressVisual({
  recentMilestones,
  confidenceHistory,
}: Props) {
  // Show nothing at all when there's no history AND no recent
  // milestones — first-day users haven't earned an Area 3 yet.
  if (
    confidenceHistory.length === 0 &&
    recentMilestones.length === 0
  ) {
    return null;
  }

  return (
    <section className="space-y-4">
      {recentMilestones.length > 0 && (
        <div className="space-y-3">
          {recentMilestones.map((m) => (
            <MilestoneFire key={m.id} milestone={m} />
          ))}
        </div>
      )}

      {confidenceHistory.length > 0 && (
        <ProcessOutcomeChart history={confidenceHistory} />
      )}
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
