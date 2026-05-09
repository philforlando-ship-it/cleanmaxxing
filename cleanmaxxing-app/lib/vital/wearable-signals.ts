// Wearable signal helpers shared across cardio / strength / nutrition
// report generators. These convert raw rows in sleep_logs +
// daily_activity into directional categorical signals the prompts can
// reason about without leaking absolute numbers (HRV especially —
// per-user baselines vary 2x and any cross-user comparison is noise).
//
// Two signals exposed today:
//
//   getHrvTrend — 7-day rolling avg vs 28-day baseline. 'declining'
//     when the recent avg is more than 10% below baseline; 'elevated'
//     when more than 10% above; 'stable' otherwise. Returns null when
//     fewer than 5 nights of HRV data in the recent 7 OR fewer than
//     10 nights in the 28-day baseline (insufficient data to call it).
//
//   getVo2MaxSignal — latest measured value (last 60 days), with a
//     directional trend vs the value from ~90 days prior when present.
//     VO2max changes slowly so we tolerate a wide trend window. Unlike
//     HRV the absolute number is appropriate to surface — it's a
//     single physiological quantity, not an HR-derived approximation.

import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

export type HrvTrend = 'declining' | 'stable' | 'elevated';

export type WearableHrvSignal = {
  trend: HrvTrend | null;
  // Rounded recent + baseline. Only surfaced internally — prompts
  // never cite the numbers, only the trend label.
  recent_avg_ms: number | null;
  baseline_avg_ms: number | null;
};

export async function getHrvTrend(
  supabase: SupabaseClient,
  userId: string,
): Promise<WearableHrvSignal> {
  const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data: rows, error } = await supabase
    .from('sleep_logs')
    .select('night_of, hrv_rmssd')
    .eq('user_id', userId)
    .gte('night_of', since);
  if (error || !rows) {
    return { trend: null, recent_avg_ms: null, baseline_avg_ms: null };
  }

  const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  let recentSum = 0;
  let recentCount = 0;
  let baselineSum = 0;
  let baselineCount = 0;

  for (const r of rows) {
    const v = (r as { hrv_rmssd: number | null }).hrv_rmssd;
    if (v == null) continue;
    const nightOf = (r as { night_of: string }).night_of;
    baselineSum += v;
    baselineCount++;
    if (nightOf >= recentCutoff) {
      recentSum += v;
      recentCount++;
    }
  }

  if (recentCount < 5 || baselineCount < 10) {
    return { trend: null, recent_avg_ms: null, baseline_avg_ms: null };
  }

  const recentAvg = recentSum / recentCount;
  const baselineAvg = baselineSum / baselineCount;
  let trend: HrvTrend = 'stable';
  if (recentAvg < baselineAvg * 0.9) trend = 'declining';
  else if (recentAvg > baselineAvg * 1.1) trend = 'elevated';

  return {
    trend,
    recent_avg_ms: Math.round(recentAvg),
    baseline_avg_ms: Math.round(baselineAvg),
  };
}

export type Vo2MaxTrend = 'improving' | 'stable' | 'declining';

export type Vo2MaxSignal = {
  // Most recent VO2max in mL/kg/min (one decimal). null when nothing
  // measured in the last 60 days — prompt branches on null vs number.
  latest_value: number | null;
  latest_date: string | null;
  // Directional trend vs the value ~90 days prior. null when no
  // 90-day-old comparison value exists or when no latest value.
  trend: Vo2MaxTrend | null;
};

export async function getVo2MaxSignal(
  supabase: SupabaseClient,
  userId: string,
): Promise<Vo2MaxSignal> {
  const since = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data: rows, error } = await supabase
    .from('daily_activity')
    .select('date, vo2_max')
    .eq('user_id', userId)
    .gte('date', since)
    .not('vo2_max', 'is', null)
    .order('date', { ascending: false });
  if (error || !rows || rows.length === 0) {
    return { latest_value: null, latest_date: null, trend: null };
  }

  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // Latest value — top of the descending list, but only if it's
  // within the freshness window. Stale measurements (last reading
  // 75 days ago) shouldn't drive prompt behavior.
  const latestRow = rows[0] as { date: string; vo2_max: number };
  if (latestRow.date < sixtyDaysAgo) {
    return { latest_value: null, latest_date: null, trend: null };
  }
  const latest_value = Math.round(latestRow.vo2_max * 10) / 10;
  const latest_date = latestRow.date;

  // 90-day comparison — find the row closest to 90 days before the
  // latest reading. Tolerance ±15 days to absorb the slow update
  // cadence (Fitbit sometimes goes 2-3 weeks between updates).
  const targetDate = new Date(latestRow.date);
  targetDate.setDate(targetDate.getDate() - 90);
  const targetIso = targetDate.toISOString().slice(0, 10);

  let bestRow: { date: string; vo2_max: number } | null = null;
  let bestDelta = Infinity;
  for (const r of rows) {
    const row = r as { date: string; vo2_max: number };
    const dDelta = Math.abs(
      (new Date(row.date).getTime() - new Date(targetIso).getTime()) /
        (24 * 60 * 60 * 1000),
    );
    if (dDelta < bestDelta && dDelta <= 15) {
      bestDelta = dDelta;
      bestRow = row;
    }
  }

  let trend: Vo2MaxTrend | null = null;
  if (bestRow) {
    const ratio = latestRow.vo2_max / bestRow.vo2_max;
    if (ratio > 1.05) trend = 'improving';
    else if (ratio < 0.95) trend = 'declining';
    else trend = 'stable';
  }

  return { latest_value, latest_date, trend };
}
