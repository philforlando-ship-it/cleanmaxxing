'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import {
  averageConfidence,
  type WeeklyReflection,
} from '@/lib/weekly-reflection/service';
import { contextFor } from '@/lib/confidence/context';

type PendingPoint = {
  // MM-DD week label for the preview point. Must match the label shape
  // used for real history entries so the x-axis stays consistent.
  week: string;
  confidence: number;
};

type Props = {
  history: WeeklyReflection[];
  // Optional ghost point appended (or replacing the last entry if it
  // matches `week`) so the reflection form can preview where the
  // current draft would land while the user slides. When present,
  // the final point is drawn with a dashed stroke.
  pendingPoint?: PendingPoint | null;
  compact?: boolean;
};

// Strip a trailing ".0" so "6.0" displays as "6" but "6.5" stays "6.5".
function formatScore(n: number): string {
  return n.toFixed(1).replace(/\.0$/, '');
}

function formatDelta(delta: number): string {
  if (delta === 0) return 'no change from last week';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${formatScore(delta)} from last week`;
}

// Emerald-600 for the accent. Explicit hex so the gradient doesn't
// inherit whatever currentColor happens to resolve to.
const ACCENT = '#059669';

export function ConfidenceTrendChart({
  history,
  pendingPoint = null,
  compact = false,
}: Props) {
  if (history.length === 0 && !pendingPoint) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium">Weekly confidence</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Your first weekly reflection will start the chart. Four dimensions on a 1&ndash;10 scale, averaged into a single trend over time.
        </p>
      </section>
    );
  }

  const baseData = history.map((r) => ({
    week: r.week_start.slice(5), // MM-DD
    confidence: Number(averageConfidence(r).toFixed(2)),
    pending: false,
  }));

  // Splice the pending point in — replacing a same-week entry if one
  // exists (the user is editing this week's reflection, so the saved
  // value for this week should be overwritten in the preview) or
  // appending if the current week hasn't been saved yet.
  let data = baseData;
  if (pendingPoint) {
    const lastIdx = baseData.findIndex((d) => d.week === pendingPoint.week);
    const entry = {
      week: pendingPoint.week,
      confidence: Number(pendingPoint.confidence.toFixed(2)),
      pending: true,
    };
    if (lastIdx >= 0) {
      data = baseData.map((d, i) => (i === lastIdx ? entry : d));
    } else {
      data = [...baseData, entry];
    }
  }

  const latest = data[data.length - 1].confidence;
  const previous = data.length >= 2 ? data[data.length - 2].confidence : null;
  const delta = previous !== null ? Number((latest - previous).toFixed(1)) : null;
  const ctx = contextFor(latest);

  // Sparse variant: with one reflection, the area chart is a single dot
  // which reads as awkward rather than informative. Show just the hero
  // value with a nudge to return next week. Two data points onward gets
  // the full chart since there's a real trend to draw.
  if (data.length === 1) {
    const onlyPoint = data[0];
    const sparseHint = onlyPoint.pending
      ? 'Slide the dimensions below to see this week\u2019s preview.'
      : 'Your first reflection is in. One more next week and the trend line starts drawing itself.';
    return (
      <section className={compact ? '' : 'rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900'}>
        {!compact && <h2 className="text-lg font-medium">Weekly confidence</h2>}
        <div className={compact ? 'flex items-end gap-4' : 'mt-4 flex items-end gap-5'}>
          <div>
            <div className={compact ? 'text-3xl font-semibold tabular-nums leading-none text-zinc-900 dark:text-zinc-100' : 'text-5xl font-semibold tabular-nums leading-none text-zinc-900 dark:text-zinc-100'}>
              {formatScore(latest)}
            </div>
            <div className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {ctx.label}
              {onlyPoint.pending && (
                <span className="ml-1 text-xs font-normal text-zinc-500">
                  &middot; preview
                </span>
              )}
            </div>
          </div>
        </div>
        <p className={compact ? 'mt-3 text-xs text-zinc-500 dark:text-zinc-400' : 'mt-5 text-xs text-zinc-500 dark:text-zinc-400'}>
          {sparseHint}
        </p>
      </section>
    );
  }

  const deltaColor =
    delta === null || delta === 0
      ? 'text-zinc-500'
      : delta > 0
        ? 'text-emerald-700 dark:text-emerald-400'
        : 'text-amber-700 dark:text-amber-400';
  const deltaArrow = delta === null ? '' : delta > 0 ? '↑' : delta < 0 ? '↓' : '→';

  const lastIsPending = data[data.length - 1].pending;

  return (
    <section className={compact ? '' : 'rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900'}>
      {!compact && <h2 className="text-lg font-medium">Weekly confidence</h2>}

      <div className={compact ? 'flex items-end justify-between gap-4' : 'mt-4 flex items-end justify-between gap-4'}>
        <div>
          <div className={compact ? 'text-3xl font-semibold tabular-nums leading-none text-zinc-900 dark:text-zinc-100' : 'text-5xl font-semibold tabular-nums leading-none text-zinc-900 dark:text-zinc-100'}>
            {formatScore(latest)}
          </div>
          <div className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {ctx.label}
            {lastIsPending && (
              <span className="ml-1 text-xs font-normal text-zinc-500">
                &middot; preview
              </span>
            )}
          </div>
        </div>
        {delta !== null && (
          <div className={`text-xs font-medium ${deltaColor}`}>
            <span className="mr-1" aria-hidden="true">
              {deltaArrow}
            </span>
            {formatDelta(delta)}
          </div>
        )}
      </div>

      <div
        className={compact ? 'mt-4 h-36 w-full' : 'mt-6 h-52 w-full'}
        role="img"
        aria-label={`Confidence trend over ${data.length} weekly reflection${data.length === 1 ? '' : 's'}, currently ${formatScore(latest)} (${ctx.label}).`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -24 }}>
            <defs>
              <linearGradient id="confidence-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT} stopOpacity={0.45} />
                <stop offset="100%" stopColor={ACCENT} stopOpacity={0.03} />
              </linearGradient>
            </defs>

            {/* Zone bands — subtle semantic shading so the 1-10 scale
                reads with direction, not just as raw numbers. Opacity
                low enough to stay out of the way of the line. */}
            <ReferenceArea y1={1} y2={4} fill="#ef4444" fillOpacity={0.05} strokeOpacity={0} />
            <ReferenceArea y1={7} y2={10} fill="#10b981" fillOpacity={0.06} strokeOpacity={0} />

            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: 'currentColor' }}
              stroke="currentColor"
              strokeOpacity={0.3}
            />
            <YAxis
              domain={[1, 10]}
              ticks={[1, 3, 5, 7, 10]}
              tick={{ fontSize: 11, fill: 'currentColor' }}
              stroke="currentColor"
              strokeOpacity={0.3}
            />
            <ReferenceLine
              y={5}
              stroke="currentColor"
              strokeDasharray="3 3"
              strokeOpacity={0.3}
              label={{
                value: 'Neutral',
                fontSize: 10,
                fill: 'currentColor',
                fillOpacity: 0.6,
                position: 'insideTopRight',
              }}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid rgb(228 228 231)',
              }}
              formatter={(value) => {
                const n = typeof value === 'number' ? value : Number(value);
                return [`${n} · ${contextFor(n).label}`, 'Confidence'];
              }}
            />
            <Area
              type="monotone"
              dataKey="confidence"
              stroke={ACCENT}
              strokeWidth={2.5}
              fill="url(#confidence-gradient)"
              dot={(props) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { cx, cy, payload, index } = props as any;
                if (payload?.pending) {
                  return (
                    <circle
                      key={`dot-${index}`}
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill="#fff"
                      stroke={ACCENT}
                      strokeWidth={2}
                      strokeDasharray="2 2"
                    />
                  );
                }
                return (
                  <circle
                    key={`dot-${index}`}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill={ACCENT}
                    strokeWidth={0}
                  />
                );
              }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: ACCENT }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
