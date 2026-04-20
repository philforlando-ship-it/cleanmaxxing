// Per-POV "this week's focus" card. Server component.
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

type ActiveGoal = {
  id: string;
  title: string;
  source_slug: string | null;
  created_at: string;
  baseline_stage: string | null;
};

type Props = {
  goals: ActiveGoal[];
};

type Entry = {
  slug: string;
  // Earliest-accepted goal in the group drives the week computation and
  // is the link target for "Open goal →". Goals sharing a POV share the
  // walkthrough progression by design; baseline-stage editing happens on
  // the goal detail page, not here.
  anchorGoalId: string;
  goalTitles: string[];
  state: OnrampState;
};

export function WeeklyFocusCard({ goals }: Props) {
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
      goalTitles: group.map((g) => g.title),
      state,
    });
  }

  if (withOnramp.length === 0) return null;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium">This week&rsquo;s focus</h2>
        <span className="text-xs text-zinc-500">
          {withOnramp.length} {withOnramp.length === 1 ? 'walkthrough' : 'walkthroughs'}
        </span>
      </div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Guidance per domain, based on when you first engaged with it. One concrete focus per week, not a full protocol.
      </p>

      <ul className="mt-5 space-y-4">
        {withOnramp.map((entry) => (
          <li
            key={entry.slug}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {entry.goalTitles[0]}
                {entry.goalTitles.length > 1 && (
                  <span className="ml-2 text-xs font-normal text-zinc-500">
                    +{entry.goalTitles.length - 1} more
                  </span>
                )}
              </h3>
              {entry.state.kind === 'active' ? (
                <span className="shrink-0 text-xs text-zinc-500">
                  Week {entry.state.week}
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
                <p className="mt-1 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {entry.state.block.detail}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {entry.state.graduation}
              </p>
            )}
            {entry.goalTitles.length > 1 && (
              <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                Also applies to: {entry.goalTitles.slice(1).join(', ')}
              </p>
            )}
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
