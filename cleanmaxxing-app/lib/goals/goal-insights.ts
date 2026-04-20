// Monthly checkpoint goal-alignment insights.
//
// For each of the user's active goals, correlate:
//   (a) how long the goal has been active,
//   (b) what its onramp says the typical payoff timeline is, and
//   (c) whether the confidence dimension the goal is supposed to move
//       has actually moved over that window.
//
// Produces a single short insight string per goal. The output is
// suggestive rather than diagnostic — four confidence dimensions
// can't disambiguate which of several same-dimension goals is driving
// a trend, so copy names the correlation without overclaiming
// causation.

import {
  dimensionFor,
  dimensionLabel,
  type ConfidenceDimension,
} from '@/lib/goals/confidence-mapping';
import { onrampFor } from '@/lib/content/onramp';
import { averageConfidence } from '@/lib/weekly-reflection/service';

export type ReflectionRow = {
  week_start: string;
  social_confidence: number;
  work_confidence: number;
  physical_confidence: number;
  appearance_confidence: number;
};

export type GoalForInsight = {
  id: string;
  title: string;
  source_slug: string | null;
  created_at: string;
};

export type GoalInsight = {
  goalId: string;
  goalTitle: string;
  weeksActive: number;
  dimension: ConfidenceDimension;
  copy: string;
};

// Minimum data we need to draw a meaningful comparison. Below these
// thresholds we don't emit an insight at all — the signal would be
// noise rather than useful information.
const MIN_WEEKS_ACTIVE = 4;
const MIN_REFLECTIONS = 4;
const MAX_INSIGHTS = 5;

// Dimension-trend classification. Half a point on a 1-10 scale is
// enough to call a direction without being oversensitive to single-
// week noise.
const TREND_THRESHOLD = 0.5;

// Parse a range string like "1-4", "5", or "7+" and return the largest
// finite week it covers, or null for open-ended ranges.
function maxFiniteWeek(range: string): number | null {
  const m = range.match(/^(\d+)(?:-(\d+)|(\+))?$/);
  if (!m) return null;
  if (m[3]) return null; // "N+"
  if (m[2]) return Number(m[2]);
  return Number(m[1]);
}

// Typical timeline to graduation, in weeks, derived from the onramp.
// Returns null when the last block is open-ended or when no onramp
// exists for this slug — in those cases we can't say when the user
// should expect to be "past the walkthrough."
function typicalTimelineWeeks(slug: string): number | null {
  const onramp = onrampFor(slug);
  if (!onramp) return null;
  let maxWeek = 0;
  for (let i = 0; i < onramp.weeks.length; i++) {
    const finite = maxFiniteWeek(onramp.weeks[i].range);
    if (finite === null) {
      // Open-ended block — only counts as unbounded if it's the last
      // block. If open-ended appears mid-sequence (shouldn't in our
      // authored set, but defensively), treat it as unbounded.
      if (i === onramp.weeks.length - 1) return null;
      continue;
    }
    if (finite > maxWeek) maxWeek = finite;
  }
  return maxWeek > 0 ? maxWeek : null;
}

function weeksBetween(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / (7 * 86_400_000));
}

// Find the reflection closest to (and not earlier than) the goal's
// acceptance date. This gives us the starting dimension value for
// the window we're measuring.
function nearestReflectionOnOrAfter(
  reflections: ReflectionRow[],
  since: Date,
): ReflectionRow | null {
  const sinceTime = since.getTime();
  for (const r of reflections) {
    if (new Date(r.week_start).getTime() >= sinceTime) return r;
  }
  return null;
}

function dimensionValue(r: ReflectionRow, d: ConfidenceDimension): number {
  return r[d];
}

export function buildGoalInsights(
  goals: GoalForInsight[],
  reflections: ReflectionRow[],
  now: Date = new Date(),
): GoalInsight[] {
  if (reflections.length < MIN_REFLECTIONS) return [];

  // Sort reflections oldest → newest so nearestReflectionOnOrAfter
  // returns the earliest qualifying entry.
  const sorted = [...reflections].sort(
    (a, b) =>
      new Date(a.week_start).getTime() - new Date(b.week_start).getTime(),
  );
  const latest = sorted[sorted.length - 1];

  const insights: GoalInsight[] = [];
  for (const goal of goals) {
    if (!goal.source_slug) continue;
    const dimension = dimensionFor(goal.source_slug);
    if (!dimension) continue;

    const acceptedAt = new Date(goal.created_at);
    const weeksActive = weeksBetween(acceptedAt, now);
    if (weeksActive < MIN_WEEKS_ACTIVE) continue;

    const startReflection = nearestReflectionOnOrAfter(sorted, acceptedAt);
    if (!startReflection) continue;
    // Needs at least one later reflection to compute a trend.
    if (startReflection === latest) continue;

    const startValue = dimensionValue(startReflection, dimension);
    const latestValue = dimensionValue(latest, dimension);
    const delta = Number((latestValue - startValue).toFixed(1));

    const trend: 'up' | 'flat' | 'down' =
      delta >= TREND_THRESHOLD ? 'up' : delta <= -TREND_THRESHOLD ? 'down' : 'flat';

    const timeline = typicalTimelineWeeks(goal.source_slug);
    const copy = renderCopy({
      title: goal.title,
      weeksActive,
      timeline,
      dimension,
      trend,
      delta,
      // Average confidence over the window — a single number the copy
      // can reference alongside the dimension-specific view.
      overallStart: Number(averageConfidence(startReflection).toFixed(1)),
      overallLatest: Number(averageConfidence(latest).toFixed(1)),
    });

    insights.push({
      goalId: goal.id,
      goalTitle: goal.title,
      weeksActive,
      dimension,
      copy,
    });
  }

  // Longest-running first. Users want to see their mature goals
  // analyzed before their brand-new ones.
  insights.sort((a, b) => b.weeksActive - a.weeksActive);
  return insights.slice(0, MAX_INSIGHTS);
}

type CopyInput = {
  title: string;
  weeksActive: number;
  timeline: number | null;
  dimension: ConfidenceDimension;
  trend: 'up' | 'flat' | 'down';
  delta: number;
  overallStart: number;
  overallLatest: number;
};

// Render the insight string. Output is one sentence, specific, and
// names the correlation without claiming causation — the four-dim
// reflection can't isolate which same-dimension goal is driving a
// trend.
function renderCopy(input: CopyInput): string {
  const { title, weeksActive, timeline, dimension, trend, delta } = input;
  const dimName = dimensionLabel(dimension);
  const pastWindow = timeline !== null && weeksActive > timeline;
  const wellInside = timeline !== null && weeksActive < timeline / 2;

  if (wellInside && trend === 'flat') {
    return `"${title}" is ${weeksActive} weeks in; the POV expects the payoff window to run about ${timeline} weeks. Your ${dimName} confidence is flat over that span — still inside the expected timeline, keep going.`;
  }

  if (wellInside && trend === 'up') {
    const sign = delta > 0 ? '+' : '';
    return `"${title}" is ${weeksActive} weeks in and your ${dimName} confidence is up ${sign}${delta} since you started — inside the typical window, trending the right direction.`;
  }

  if (wellInside && trend === 'down') {
    return `"${title}" is ${weeksActive} weeks in and your ${dimName} confidence has dropped. Too early to conclude the goal isn't working — dimension trends can move for reasons outside this goal — but worth noticing.`;
  }

  if (pastWindow && trend === 'up') {
    const sign = delta > 0 ? '+' : '';
    return `"${title}" is past the typical ${timeline}-week window (${weeksActive} weeks active) with ${dimName} confidence up ${sign}${delta}. The goal has done what it was supposed to — consider marking it complete or pivoting to the next layer.`;
  }

  if (pastWindow && trend === 'flat') {
    return `"${title}" is past the typical ${timeline}-week window (${weeksActive} weeks active) and your ${dimName} confidence hasn't moved. Either the execution needs tightening or this goal has stopped returning — worth an honest audit.`;
  }

  if (pastWindow && trend === 'down') {
    return `"${title}" is past the typical ${timeline}-week window and your ${dimName} confidence has dropped. Something is working against this goal — check execution first, but this is a reasonable point to consider abandoning if the audit doesn't turn up a fix.`;
  }

  // Open-ended timeline (null) — the POV doesn't define graduation.
  // Copy leans on weeks-active + trend without the window framing.
  if (timeline === null) {
    if (trend === 'up') {
      const sign = delta > 0 ? '+' : '';
      return `"${title}" is ${weeksActive} weeks in with ${dimName} confidence up ${sign}${delta}. Open-ended walkthrough — keep running it while the trend holds.`;
    }
    if (trend === 'down') {
      return `"${title}" is ${weeksActive} weeks in and ${dimName} confidence is down. This one has no fixed graduation — worth an honest audit of whether to continue.`;
    }
    return `"${title}" is ${weeksActive} weeks in with ${dimName} confidence flat. Open-ended walkthrough — not a red flag yet, but track whether something starts moving.`;
  }

  // Default — inside expected window, not wellInside (half-to-full range)
  if (trend === 'up') {
    const sign = delta > 0 ? '+' : '';
    return `"${title}" is ${weeksActive} weeks in, inside the typical ${timeline}-week window, and ${dimName} confidence is up ${sign}${delta}. On track.`;
  }
  if (trend === 'down') {
    return `"${title}" is ${weeksActive} weeks in and ${dimName} confidence has dropped. Inside the typical window still, so not yet a verdict — but a signal to audit execution.`;
  }
  return `"${title}" is ${weeksActive} weeks in, ${dimName} confidence flat, inside the typical ${timeline}-week window. Hold the line.`;
}
