'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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

export function ConfidenceTrendChart({ history }: Props) {
  if (history.length === 0) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium">Weekly confidence</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Your first reflection will start the chart.
        </p>
      </section>
    );
  }

  const data = history.map((r) => ({
    week: r.week_start.slice(5), // MM-DD
    confidence: Number(averageConfidence(r).toFixed(2)),
  }));

  const latest = data[data.length - 1].confidence;
  const ctx = contextFor(latest);

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium">Weekly confidence</h2>
        <span className="text-xs text-zinc-500">
          {latest} · {ctx.label}
        </span>
      </div>

      <div className="mt-4 h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
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
            <Line
              type="monotone"
              dataKey="confidence"
              stroke="currentColor"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
