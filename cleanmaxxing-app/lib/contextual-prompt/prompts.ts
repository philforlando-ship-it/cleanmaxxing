// Pure detector functions for the Area 2 contextual prompt
// selector. Each takes gathered state and returns whether the
// prompt should fire — plus any condition values needed for
// severity-aware copy. No I/O. The orchestrator in select.ts
// handles the data fetch.

import type { WeeklyReflection } from '@/lib/weekly-reflection/service';
import { hasV2Data } from '@/lib/weekly-reflection/service';
import type {
  JourneyTopic,
  ProcessAdherenceTier,
} from '@/lib/weekly-reflection/types';

const DAYS_MS = 24 * 60 * 60 * 1000;

// detectSkippedCheckIns retired in Tier 3 cleanup (2026-05-10) —
// the underlying check_ins table dropped alongside the goals system.

// =====================
// nutrition_off_track
// =====================

// Behavior-anchored single-journey signal — fires when the user
// established a nutrition plan, proved engagement (logged at least a
// few days at some point), and has since drifted: either the log has
// gone quiet over the last 7 days or they're still logging but
// missing the protein target on most days.
//
// Distinct from process_adherence_declining (cross-journey tier slip
// over 3+ reflections). This one runs off actual nutrition_logs
// rows, so it picks up the "wheels came off" case before three
// weekly reflections have accumulated. Two sub-shapes drive
// different copy:
//   - 'silence'         → log went quiet (<3 logged days in 7)
//   - 'missing_targets' → still logging, hit ratio < 40%
//
// Won't fire for:
//   - users without a nutrition plan (no baseline to be "off" from)
//   - plans younger than 14 days (no honest off-track read this early)
//   - users who never logged ≥3 days lifetime (no engagement baseline
//     — "off-track" assumes "on-track existed first")
const OFF_TRACK_MIN_PLAN_AGE_DAYS = 14;
const OFF_TRACK_MIN_LIFETIME_LOGS = 3;
const OFF_TRACK_SILENCE_MAX_LOGGED = 3; // <3 logs in last 7 days
const OFF_TRACK_HIT_RATIO_FLOOR = 0.4;  // ratio below this fires

export type NutritionOffTrackShape = 'silence' | 'missing_targets';

export function detectNutritionOffTrack(args: {
  hasNutritionPlan: boolean;
  planAgeDays: number;
  lifetimeLogsCount: number; // capped at whatever the caller fetched
  hitLast7: number;
  loggedLast7: number;
}): { fires: boolean; shape: NutritionOffTrackShape } {
  if (!args.hasNutritionPlan) return { fires: false, shape: 'silence' };
  if (args.planAgeDays < OFF_TRACK_MIN_PLAN_AGE_DAYS) {
    return { fires: false, shape: 'silence' };
  }
  if (args.lifetimeLogsCount < OFF_TRACK_MIN_LIFETIME_LOGS) {
    return { fires: false, shape: 'silence' };
  }
  if (args.loggedLast7 < OFF_TRACK_SILENCE_MAX_LOGGED) {
    return { fires: true, shape: 'silence' };
  }
  const ratio = args.hitLast7 / args.loggedLast7;
  if (ratio < OFF_TRACK_HIT_RATIO_FLOOR) {
    return { fires: true, shape: 'missing_targets' };
  }
  return { fires: false, shape: 'silence' };
}

// =====================
// process_adherence_declining (replaces confidence_declining in Phase F)
// =====================

// Phase F: replaces the legacy confidence-declining detector.
// Composite signal — fires when ≥50% of the user's active
// journeys show a downward tier shift in the most recent
// reflection compared to the prior reflection, AND that pattern
// holds for 3+ consecutive reflections.
//
// "Tier shift" treats the tiers as ordinal: most_days(2) >
// some_days(1) > few_or_none(0). A decrease in the numeric
// value counts as a decline.
//
// Requires at least 4 v2 reflection rows in history (the prior
// 3 windows give us "3+ consecutive"). The copy uses the count
// of declining-windows and the count of journeys that declined.
const TIER_VALUE: Record<ProcessAdherenceTier, number> = {
  most_days: 2,
  some_days: 1,
  few_or_none: 0,
};

export function detectProcessAdherenceDeclining(
  history: WeeklyReflection[],
): {
  fires: boolean;
  weeksDeclining: number;
  decliningJourneys: JourneyTopic[];
} {
  const v2Sorted = [...history]
    .filter(hasV2Data)
    .sort((a, b) => b.week_start.localeCompare(a.week_start));

  if (v2Sorted.length < 4) {
    return { fires: false, weeksDeclining: 0, decliningJourneys: [] };
  }

  let weeksDeclining = 0;
  const decliningJourneys = new Set<JourneyTopic>();

  for (let i = 0; i < v2Sorted.length - 1; i++) {
    const newer = v2Sorted[i].process_adherence ?? {};
    const older = v2Sorted[i + 1].process_adherence ?? {};
    const newerKeys = Object.keys(newer) as JourneyTopic[];
    if (newerKeys.length === 0) break;

    let declinedCount = 0;
    const localDeclined: JourneyTopic[] = [];
    for (const k of newerKeys) {
      const olderTier = older[k];
      const newerTier = newer[k];
      if (!olderTier || !newerTier) continue;
      if (TIER_VALUE[newerTier] < TIER_VALUE[olderTier]) {
        declinedCount += 1;
        localDeclined.push(k);
      }
    }
    const ratio = declinedCount / newerKeys.length;
    if (ratio >= 0.5) {
      weeksDeclining += 1;
      for (const k of localDeclined) decliningJourneys.add(k);
    } else {
      break; // first non-declining window ends the streak
    }
  }

  return {
    fires: weeksDeclining >= 3,
    weeksDeclining,
    decliningJourneys: Array.from(decliningJourneys),
  };
}

// =====================
// cross_journey_dependency (I1)
// =====================

// Three behavioral signals that make the platform's cross-journey
// architecture visible to the user. Currently all three are *invisible*
// in prod — they live inside plan-generation prompts but never surface
// as a discrete "X is affecting Y" callout. Free users see one as a
// teaser; Pro users see all three.
//
// Shape mapping:
//   cardio_cut_conflict           — cardio + lose_fat goal
//   fatigue_softens_strength      — recent struggling-fatigue from cardio
//                                   while strength plan is active
//   activity_change_nutrition_stale — recent activity_change ≠ no_change
//                                     while nutrition plan exists

import type {
  ActivityChange,
  FatigueLevel,
  FatigueSource,
} from '@/lib/weekly-reflection/types';
import type { CardioDaysPerWeek } from '@/lib/cardio/types';
import type { GoalDirection } from '@/lib/nutrition/types';

export function detectCardioCutConflict(args: {
  hasNutritionPlan: boolean;
  nutritionGoalDirection: GoalDirection | null;
  hasCardioPlan: boolean;
  cardioDaysPerWeek: CardioDaysPerWeek | null;
}): { fires: boolean } {
  if (!args.hasNutritionPlan || !args.hasCardioPlan) return { fires: false };
  if (args.nutritionGoalDirection !== 'lose_fat') return { fires: false };
  if (
    args.cardioDaysPerWeek == null ||
    args.cardioDaysPerWeek === '0_days'
  ) {
    return { fires: false };
  }
  return { fires: true };
}

export function detectFatigueStrugglingSoftensStrength(args: {
  hasStrengthPlan: boolean;
  fatigueLevel: FatigueLevel | null;
  fatigueSource: FatigueSource | null;
}): { fires: boolean } {
  if (!args.hasStrengthPlan) return { fires: false };
  if (args.fatigueLevel !== 'struggling') return { fires: false };
  if (args.fatigueSource !== 'cardio') return { fires: false };
  return { fires: true };
}

export function detectActivityChangeNutritionStale(args: {
  hasNutritionPlan: boolean;
  // Most recent reflection's activity_change. Null when no v2
  // reflection in the staleness window (2 weeks).
  recentActivityChange: ActivityChange | null;
}): { fires: boolean; direction: 'increased' | 'decreased' } {
  if (!args.hasNutritionPlan) {
    return { fires: false, direction: 'increased' };
  }
  if (
    args.recentActivityChange !== 'increased' &&
    args.recentActivityChange !== 'decreased'
  ) {
    return { fires: false, direction: 'increased' };
  }
  return { fires: true, direction: args.recentActivityChange };
}

// =====================
// glp1_hydration
// =====================

// Fires when the user has at least one GLP-1 intervention with
// status 'on_protocol' or 'paused'. Pure check on the rollup —
// the orchestrator does the filter.
export function detectGlp1Active(args: {
  hasActiveGlp1: boolean;
}): { fires: boolean } {
  return { fires: args.hasActiveGlp1 };
}

// =====================
// sleep_deficit_7d (C1 from the May 7 brain dump)
// =====================

// 7-day rolling average under 6.5h with at least 5 logged nights.
// More urgent than sleep_variance_high — variance is recovery
// noise, deficit is the floor failing. Severity tiers:
//   severe: avg < 5.5h (red flag — strength + cardio recovery is
//                       compromised, hunger / cravings spike)
//   mild:   avg < 6.5h (recovery is being short-changed but not
//                       collapsing)
//
// 6.5h is the threshold POV 42 anchors as "below this, downstream
// effects start showing up reliably." 5.5h is where the deficit
// turns into a substrate-level limit on every other journey.
export function detectSleepDeficit7d(args: {
  recentTotalHours: number[];
}): { fires: boolean; avgHours: number; severity: 'mild' | 'severe' } {
  if (args.recentTotalHours.length < 5) {
    return { fires: false, avgHours: 0, severity: 'mild' };
  }
  const avg =
    args.recentTotalHours.reduce((s, x) => s + x, 0) /
    args.recentTotalHours.length;
  const severity = avg < 5.5 ? 'severe' : 'mild';
  return { fires: avg < 6.5, avgHours: avg, severity };
}

// =====================
// sleep_variance_high
// =====================

// Computes population standard deviation of total_hours across
// the provided sleep_log rows. Fires when SD > 1.5 hours over
// last 7 nights with at least 5 rows present.
export function detectSleepVarianceHigh(args: {
  recentTotalHours: number[];
}): { fires: boolean; sdHours: number } {
  if (args.recentTotalHours.length < 5) {
    return { fires: false, sdHours: 0 };
  }
  const mean =
    args.recentTotalHours.reduce((s, x) => s + x, 0) /
    args.recentTotalHours.length;
  const variance =
    args.recentTotalHours.reduce((s, x) => s + (x - mean) ** 2, 0) /
    args.recentTotalHours.length;
  const sd = Math.sqrt(variance);
  return { fires: sd > 1.5, sdHours: sd };
}

// =====================
// journey_drift_detected (Slice 3 of maintenance reflection)
// =====================

// Surfaces a /today card for any journey whose journey_states.phase
// is 'drifting'. One detector handles the union — drift signals are
// per-journey (body comp 5lb above range, strength 21d gap, cardio
// 21d gap, style bf-tier crossed) but the surface treatment is the
// same: name the journey, point at /plan/[slug], no shame framing.
//
// When multiple journeys are drifting, prefer the one with the most
// recent entered_at — the freshest drift signal is the most likely
// to still be actionable. The copy is templated per-slug so the
// /today card knows which journey to name.

import type { JourneySlug } from '@/lib/journey-state/compute';

export type DriftingJourneyRow = {
  journey_slug: JourneySlug;
  entered_at: string;
  source: string | null;
};

export function detectJourneyDriftDetected(args: {
  driftingJourneys: DriftingJourneyRow[];
}): { fires: boolean; primary: DriftingJourneyRow | null } {
  if (args.driftingJourneys.length === 0) {
    return { fires: false, primary: null };
  }
  const sorted = [...args.driftingJourneys].sort((a, b) =>
    b.entered_at.localeCompare(a.entered_at),
  );
  return { fires: true, primary: sorted[0] };
}
