// Per-POV "current focus" card. Server component.
//
// Reads the walkthrough JSON for each active goal whose source_slug has
// one authored (see content/povs/*.onramp.json and lib/content/onramp.ts).
// Goals are grouped by source_slug — one entry per POV, even if multiple
// goals point to it. The walkthrough is a property of the POV, not the
// goal, so rendering it twice for two strength-training goals is noise.
//
// Goals without a walkthrough are surfaced as a muted footer note — the
// absence is signal that the POV hasn't had its on-ramp structured yet.

import Link from 'next/link';
import { onrampFor, currentState, isBaselineStage } from '@/lib/content/onramp';
import type { BaselineStage, OnrampState } from '@/lib/content/onramp';
import { povExists } from '@/lib/content/pov';
import type { WeeklyCheckInSummary } from '@/lib/check-in/service';
import { AdjustBaseline } from './adjust-baseline';
import { AdjustTarget } from './adjust-target';
import { DismissPhaseButton } from './dismiss-phase-button';

type ActiveGoal = {
  id: string;
  title: string;
  source_slug: string | null;
  created_at: string;
  baseline_stage: string | null;
  target_date: string | null;
  last_phase_seen: string | null;
};

// Phase identifier for the user's current onramp position.
// Active phases use the block's range string ("1-4", "5-8");
// graduated walkthroughs use a sentinel. Stored verbatim in
// goals.last_phase_seen when the user dismisses an entry; the
// next time the goal crosses into a new range or graduates, the
// surface re-fires.
function phaseIdentifier(state: OnrampState): string {
  return state.kind === 'graduated' ? 'graduated' : state.block.range;
}

type Props = {
  goals: ActiveGoal[];
  // Rolling 7-day check-in summary, folded into this card's header so
  // the "what to focus on" surface and the "what got done this week"
  // surface read as one weekly narrative instead of two separate
  // strips. Pass null to suppress the count line entirely (e.g. when
  // the user has zero goals or possible == 0).
  weeklySummary: WeeklyCheckInSummary | null;
};

type Entry = {
  slug: string;
  // Earliest-accepted goal in the group drives the week computation and
  // is the link target for "Open goal →". Goals sharing a POV share the
  // walkthrough progression by design.
  anchorGoalId: string;
  // Stage that drove the week computation. Surfaced inline so the user
  // can see why they're at "Week N" (e.g. "Some experience" → week 5)
  // and adjust without leaving /today via the AdjustBaseline control
  // below.
  anchorStage: BaselineStage;
  // Anchor goal's target_date (if set) plus accepted_at, used to
  // compute "Week N of M" framing. Total weeks M is rounded from
  // (target - created) so a 56-day window reads as 8 weeks.
  anchorTargetDate: string | null;
  anchorCreatedAt: string;
  // Last phase the user dismissed via "Got it." Drives the
  // current-vs-seen check that gates entry visibility.
  anchorLastPhaseSeen: string | null;
  goalTitles: string[];
  state: OnrampState;
  currentPhase: string;
};

// Mirror of BASELINE_LABEL in adjust-baseline.tsx. Defined inline here
// so the server component can render the label in the heading without
// crossing the client/server boundary for a 4-key constant.
const STAGE_LABEL: Record<BaselineStage, string> = {
  new: 'Just starting',
  light: 'Some experience',
  partial: 'Mostly consistent',
  established: 'Already consistent',
};

export function WeeklyFocusCard({ goals, weeklySummary }: Props) {
  // Group goals by source_slug. Earliest-accepted goal in each group
  // drives the week computation — the walkthrough started when the user
  // first engaged with this POV. Subsequent goals from the same POV
  // join the existing walkthrough rather than restart it.
  const bySlug = new Map<string, ActiveGoal[]>();
  const withoutOnramp: ActiveGoal[] = [];

  for (const goal of goals) {
    const slug = goal.source_slug;
    if (!slug || !onrampFor(slug)) {
      withoutOnramp.push(goal);
      continue;
    }
    const existing = bySlug.get(slug);
    if (existing) existing.push(goal);
    else bySlug.set(slug, [goal]);
  }

  const withOnramp: Entry[] = [];
  for (const [slug, group] of bySlug) {
    const onramp = onrampFor(slug)!;
    const earliest = group.reduce((min, g) =>
      new Date(g.created_at) < new Date(min.created_at) ? g : min,
    );
    const anchorStage: BaselineStage = isBaselineStage(earliest.baseline_stage)
      ? earliest.baseline_stage
      : 'new';
    const state = currentState(onramp, new Date(earliest.created_at), anchorStage);
    withOnramp.push({
      slug,
      anchorGoalId: earliest.id,
      anchorStage,
      anchorTargetDate: earliest.target_date,
      anchorCreatedAt: earliest.created_at,
      anchorLastPhaseSeen: earliest.last_phase_seen,
      goalTitles: group.map((g) => g.title),
      state,
      currentPhase: phaseIdentifier(state),
    });
  }

  // Filter to entries whose current phase the user hasn't yet
  // dismissed. The whole card disappears when nobody has a new
  // phase to read — phase content cycles every 3-4 weeks on most
  // onramps, and the duplication problem (same content on /today
  // for weeks straight) is solved by hiding it once it's been
  // seen, not by squeezing it into another surface.
  const newPhaseEntries = withOnramp.filter(
    (e) => e.anchorLastPhaseSeen !== e.currentPhase,
  );

  // Helper: total weeks from goal accepted_at to target_date,
  // rounded. Returns null when there's no target.
  function totalWeeks(createdAt: string, target: string | null): number | null {
    if (!target) return null;
    const ms =
      new Date(`${target}T12:00:00`).getTime() - new Date(createdAt).getTime();
    if (!Number.isFinite(ms) || ms <= 0) return null;
    return Math.max(1, Math.round(ms / (7 * 86_400_000)));
  }

  if (newPhaseEntries.length === 0) return null;

  const summaryPct =
    weeklySummary && weeklySummary.possible > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round((weeklySummary.ticked / weeklySummary.possible) * 100),
          ),
        )
      : null;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-medium">Current focus</h2>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        New for this phase &mdash; tap &ldquo;Got it&rdquo; once you&rsquo;ve
        read it and the entry stays out of the way until you cross into the
        next phase.
      </p>

      {weeklySummary && weeklySummary.goalCount > 0 && weeklySummary.possible > 0 && summaryPct !== null && (
        <div className="mt-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            This week: {weeklySummary.ticked}/{weeklySummary.possible} boxes
            ticked across your goals.
          </p>
          <div
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={summaryPct}
            aria-label={`${weeklySummary.ticked} of ${weeklySummary.possible} boxes ticked, ${summaryPct} percent`}
          >
            <div
              className="h-full rounded-full bg-emerald-600 transition-all dark:bg-emerald-500"
              style={{ width: `${summaryPct}%` }}
            />
          </div>
        </div>
      )}

      <ul className="mt-5 space-y-4">
        {newPhaseEntries.map((entry, i) => (
          <li
            key={entry.slug}
            id={`focus-${entry.slug}`}
            className="scroll-mt-16 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                <span className="mr-1.5 font-mono text-xs font-normal text-zinc-500">
                  {String.fromCharCode(65 + i)}.
                </span>
                {entry.goalTitles[0]}
                {entry.goalTitles.length > 1 && (
                  <span className="ml-2 text-xs font-normal text-zinc-500">
                    +{entry.goalTitles.length - 1} more
                  </span>
                )}
              </h3>
              {entry.state.kind === 'active' ? (
                <span className="shrink-0 text-xs text-zinc-500">
                  {(() => {
                    const M = totalWeeks(
                      entry.anchorCreatedAt,
                      entry.anchorTargetDate,
                    );
                    return M !== null
                      ? `Week ${entry.state.week} of ${M}`
                      : `Week ${entry.state.week}`;
                  })()}
                  {entry.anchorStage !== 'new' && (
                    <>
                      {' · '}
                      <span className="text-zinc-400 dark:text-zinc-500">
                        {STAGE_LABEL[entry.anchorStage]}
                      </span>
                    </>
                  )}
                </span>
              ) : (
                <span className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  Walkthrough complete
                </span>
              )}
            </div>
            {entry.state.kind === 'active' ? (
              <>
                <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {entry.state.block.focus}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {entry.state.block.detail}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {entry.state.graduation}
              </p>
            )}
            {entry.goalTitles.length > 1 && (
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                Also applies to: {entry.goalTitles.slice(1).join(', ')}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
              <DismissPhaseButton
                goalId={entry.anchorGoalId}
                phase={entry.currentPhase}
              />
              {entry.state.kind === 'active' && (
                <>
                  <AdjustBaseline
                    goalId={entry.anchorGoalId}
                    currentStage={entry.anchorStage}
                  />
                  <AdjustTarget
                    goalId={entry.anchorGoalId}
                    currentTarget={entry.anchorTargetDate}
                  />
                </>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <Link
                href={`/goals/${entry.anchorGoalId}`}
                className="text-xs font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              >
                Open goal →
              </Link>
              {povExists(entry.slug) && (
                <Link
                  href={`/povs/${entry.slug}`}
                  className="text-xs text-zinc-600 underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  Read the full POV →
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>

      {withoutOnramp.length > 0 && (
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          {withoutOnramp.length === 1
            ? `1 of your goals doesn't have a weekly walkthrough yet.`
            : `${withoutOnramp.length} of your goals don't have a weekly walkthrough yet.`}
        </p>
      )}
    </section>
  );
}
