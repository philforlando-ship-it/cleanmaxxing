// Pure helper: build a lookup of "last weight used" per exercise from
// the user's recent workout_logs. Used by the /log workout card's
// "Insert from plan" dropdown so picking an exercise from the plan
// also pre-fills the weight field with whatever the user did last
// time.
//
// Match strategy is deliberately strict: case-insensitive exact match
// on the lift name. Catalog labels written through the dropdown are
// stable, so a user who picked "Flat Dumbbell Bench Press" from the
// dropdown last week will get a hit when they pick the same item
// again. Free-text entries that don't exactly match are ignored —
// fuzzy matching is a v2 concern (typos / abbreviations / "DB Bench"
// vs "Dumbbell Bench Press" are real but the cleanup work isn't
// worth v1).
//
// Strict-match also avoids the wrong-suggestion footgun: a fuzzy
// match that suggests last week's bench-press weight for a barbell
// row would actively mislead.

import type { WorkoutLog } from './service';

export type RecentWeightLookup = Map<string, number>;

const EMPTY: RecentWeightLookup = new Map();

export function buildRecentWeightLookup(
  recent: WorkoutLog[],
): RecentWeightLookup {
  if (!recent || recent.length === 0) return EMPTY;

  // recent comes in oldest-first per the workout/service contract.
  // Walk newest-first so the first weight we record per name is the
  // most recent. Strength sessions only — cardio/mobility/other
  // don't carry weight in any meaningful way.
  const lookup: RecentWeightLookup = new Map();
  const newestFirst = [...recent].reverse();
  for (const session of newestFirst) {
    if (session.type !== 'strength') continue;
    for (const lift of session.lifts) {
      if (
        !lift.name ||
        lift.weight_lbs == null ||
        !Number.isFinite(lift.weight_lbs) ||
        lift.weight_lbs <= 0
      ) {
        continue;
      }
      const key = lift.name.trim().toLowerCase();
      if (!key) continue;
      // First write wins (most recent). Skip if we already saw this.
      if (lookup.has(key)) continue;
      lookup.set(key, lift.weight_lbs);
    }
  }
  return lookup;
}
