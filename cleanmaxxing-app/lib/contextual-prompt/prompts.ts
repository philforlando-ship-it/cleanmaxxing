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

// =====================
// skipped_check_ins
// =====================

// Fires when the user has gone 4+ consecutive days without a
// check_in row. The detector returns the day count when firing
// so the copy can say "4 days" or "10 days" specifically.
export function detectSkippedCheckIns(args: {
  // ISO date (YYYY-MM-DD) of the most recent check_in. Null if
  // the user has never checked in.
  latestCheckInDate: string | null;
  // Today's app-day in the user's timezone, also YYYY-MM-DD.
  todayAppDay: string;
}): { fires: boolean; daysSince: number } {
  if (!args.latestCheckInDate) {
    // User has never checked in — don't fire here. The
    // first-conversation / onboarding surfaces handle the cold-start
    // case; this prompt is for active users who are slipping.
    return { fires: false, daysSince: 0 };
  }
  const today = new Date(`${args.todayAppDay}T00:00:00Z`).getTime();
  const last = new Date(`${args.latestCheckInDate}T00:00:00Z`).getTime();
  if (Number.isNaN(today) || Number.isNaN(last)) {
    return { fires: false, daysSince: 0 };
  }
  const daysSince = Math.floor((today - last) / DAYS_MS);
  return { fires: daysSince >= 4, daysSince };
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
