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

type Props = {
  history: WeeklyReflection[];
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

export function ConfidenceTrendChart({ history }: Props) {
  if (history.length === 0) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium">Weekly confidence</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Your first weekly reflection will start the chart. Four dimensions on a 1&ndash;10 scale, averaged into a single trend over time.
        </p>
      </section>
    );
  }

  const data = history.map((r) => ({
    week: r.week_start.slice(5), // MM-DD
    confidence: Number(averageConfidence(r).toFixed(2)),
  }));

  const latest = data[data.length - 1].confidence;
  const previous = data.length >= 2 ? data[data.length - 2].confidence : null;
  const delta = previous !== null ? Number((latest - previous).toFixed(1)) : null;
  const ctx = contextFor(latest);

  const deltaColor =
    delta === null || delta === 0
      ? 'text-zinc-500'
      : delta > 0
        ? 'text-emerald-700 dark:text-emerald-400'
        : 'text-amber-700 dark:text-amber-400';
  const deltaArrow = delta === null ? '' : delta > 0 ? '↑' : delta < 0 ? '↓' : '→';

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-lg font-medium">Weekly confidence</h2>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-5xl font-semibold tabular-nums leading-none text-zinc-900 dark:text-zinc-100">
            {formatScore(latest)}
          </div>
          <div className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {ctx.label}
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
        className="mt-6 h-52 w-full"
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
              dot={{ r: 3, strokeWidth: 0, fill: ACCENT }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: ACCENT }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
