'use client';

// Phase F process + outcome chart. Originally lived in
// app/(app)/today/ and rendered on both /today's Area 3 and
// /reflection. /today's instance was removed 2026-05-11 (see
// progress-visual.tsx for the residual marker); the file moved to
// /reflection/ on 2026-05-11 so it sits next to its only consumer.
//
// Shape A (per the user-confirmed design call): per-journey
// heatmap of weekly tier (most_days / some_days / few_or_none)
// over the last 12 weeks, plus two compact outcome trend lines
// (yes-rate on appearance comments + initiation, and physical-feel
// direction over time).
//
// Voice posture: this is a record of what HAPPENED, not how the
// user FELT. No score, no average, no trend line over a confidence
// number. The chart is honest about the v1/v2 cohabit period —
// weeks with only legacy v1 data render empty cells (no fallback
// to confidence numbers in this view).

import {
  hasV2Data,
  type WeeklyReflection,
} from '@/lib/weekly-reflection/service';
import {
  PROCESS_ADHERENCE_TIER_LABEL,
  type JourneyTopic,
  type ProcessAdherenceTier,
} from '@/lib/weekly-reflection/types';
import { JOURNEY_LABEL } from '@/lib/weekly-reflection/journey-questions';

type Props = {
  history: WeeklyReflection[];
};

const TIER_COLOR_CLASS: Record<ProcessAdherenceTier, string> = {
  most_days:
    'bg-emerald-500/80 dark:bg-emerald-500/70',
  some_days: 'bg-amber-400/80 dark:bg-amber-400/70',
  few_or_none: 'bg-zinc-400/70 dark:bg-zinc-500/60',
};

export function ProcessOutcomeChart({ history }: Props) {
  // Filter to v2 rows only — this chart doesn't surface v1
  // confidence data. Consumers wanting v1 history can render the
  // legacy ConfidenceTrendChart separately.
  const v2Rows = history.filter(hasV2Data);

  // Empty state retired 2026-05-11: a freshly-signed-up user has no
  // reflections, and the explanatory copy that lived here was just
  // noise on day 1. The chart materializes silently once the first
  // weekly reflection lands. No reflections → render nothing.
  if (v2Rows.length === 0) return null;

  // Identify which journey topics ever showed up. The heatmap
  // renders one row per topic that has at least one tier value
  // across the v2 history.
  const topics: JourneyTopic[] = [];
  for (const row of v2Rows) {
    if (!row.process_adherence) continue;
    for (const t of Object.keys(row.process_adherence) as JourneyTopic[]) {
      if (!topics.includes(t)) topics.push(t);
    }
  }

  return (
    <section className="space-y-5 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <header>
        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {v2Rows.length === 1
            ? 'What’s happened over the last week'
            : `What’s happened over the last ${v2Rows.length} weeks`}
        </h3>
        <p className="mt-1 text-[12px] text-zinc-500 dark:text-zinc-400">
          Process adherence per journey + outcome observations.
        </p>
      </header>

      {/* Per-journey adherence heatmap */}
      {topics.length > 0 && (
        <div className="space-y-2">
          {topics.map((topic) => (
            <JourneyHeatRow key={topic} topic={topic} rows={v2Rows} />
          ))}
          <Legend />
        </div>
      )}

      {/* Outcome observation summary line */}
      <OutcomeSummary rows={v2Rows} />
    </section>
  );
}

function JourneyHeatRow({
  topic,
  rows,
}: {
  topic: JourneyTopic;
  rows: WeeklyReflection[];
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-20 shrink-0 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
        {JOURNEY_LABEL[topic]}
      </div>
      <div className="flex flex-1 gap-1">
        {rows.map((row) => {
          const tier = row.process_adherence?.[topic];
          const color = tier
            ? TIER_COLOR_CLASS[tier]
            : 'bg-zinc-200 dark:bg-zinc-800';
          const title = tier
            ? `${row.week_start}: ${PROCESS_ADHERENCE_TIER_LABEL[tier]}`
            : `${row.week_start}: not active that week`;
          return (
            <div
              key={row.week_start}
              title={title}
              className={`h-6 flex-1 min-w-[14px] rounded-sm ${color}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-2 flex items-center gap-4 pl-23 text-[10px] text-zinc-500 dark:text-zinc-400">
      <LegendDot color={TIER_COLOR_CLASS.most_days} label="Most days" />
      <LegendDot color={TIER_COLOR_CLASS.some_days} label="Some days" />
      <LegendDot color={TIER_COLOR_CLASS.few_or_none} label="Few or none" />
      <LegendDot color="bg-zinc-200 dark:bg-zinc-800" label="Inactive" />
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`h-3 w-3 rounded-sm ${color}`} />
      <span>{label}</span>
    </div>
  );
}

function OutcomeSummary({ rows }: { rows: WeeklyReflection[] }) {
  const total = rows.length;
  if (total === 0) return null;

  const appearanceYes = rows.filter(
    (r) => r.outcome_appearance_comment === true,
  ).length;
  const initiatedYes = rows.filter(
    (r) => r.outcome_initiated === 'yes',
  ).length;

  const physicalCounts: Record<string, number> = {
    better: 0,
    same: 0,
    worse: 0,
    mixed: 0,
  };
  for (const r of rows) {
    if (r.outcome_physical_feel) {
      physicalCounts[r.outcome_physical_feel] += 1;
    }
  }

  return (
    <div className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Outcome observations · last {total} weeks
      </p>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
        <SummaryRow
          label="Weeks someone commented on appearance"
          value={`${appearanceYes} of ${total}`}
        />
        <SummaryRow
          label="Weeks you initiated something new"
          value={`${initiatedYes} of ${total}`}
        />
        <SummaryRow
          label="Physical felt better"
          value={`${physicalCounts.better} of ${total}`}
        />
        <SummaryRow
          label="Physical felt worse"
          value={`${physicalCounts.worse} of ${total}`}
        />
      </dl>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="text-zinc-800 dark:text-zinc-200">{value}</dd>
    </div>
  );
}
