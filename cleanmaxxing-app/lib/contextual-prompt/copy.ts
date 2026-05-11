// Authored copy for each contextual prompt. Severity-aware where
// the condition has a meaningful intensity (skipped 4 days vs. 14
// days reads differently). Phase E ships no cooldown / dismiss
// mechanism, so condition-aware copy is the surface's variety
// instead.
//
// Voice posture (carries from H1/H2 framing decision):
// - No cohort comparison.
// - No streak-shaming. "You broke a streak" framing is banned.
// - No moralizing. The prompt observes; it doesn't lecture.
// - Mister P's voice: dry, curious, willing to be wrong.

import type { SleepBiggestBlocker } from '@/lib/sleep/types';
import { BLOCKER_HINT } from '@/lib/sleep/blocker-hints';
import type { NutritionOffTrackShape } from './prompts';
import type { ContextualPrompt } from './types';

// copySkippedCheckIns retired in Tier 3 cleanup (2026-05-10) — the
// detector it backed reads from the dropped check_ins table.

// Phase F replacement for the legacy copyConfidenceDeclining.
// Composite signal: most of the user's active journeys have shown
// process-adherence decline for 3+ consecutive weeks. The copy
// names the count of journeys but doesn't list them by name —
// the surface is observation, not finger-pointing.
export function copyProcessAdherenceDeclining(args: {
  weeksDeclining: number;
  decliningJourneysCount: number;
}): ContextualPrompt {
  const journeysStr =
    args.decliningJourneysCount === 1
      ? 'one journey'
      : `${args.decliningJourneysCount} journeys`;
  if (args.weeksDeclining >= 5) {
    return {
      kind: 'process_adherence_declining',
      title: `Process adherence has been declining for ${args.weeksDeclining} weeks.`,
      body: `${journeysStr.charAt(0).toUpperCase() + journeysStr.slice(1)} have been trending toward fewer days week over week. The right move isn\'t pushing harder — it\'s asking which one matters most this month and pruning the rest.`,
    };
  }
  return {
    kind: 'process_adherence_declining',
    title: 'Process adherence has slipped 3 weeks running.',
    body: `${journeysStr.charAt(0).toUpperCase() + journeysStr.slice(1)} have moved down a tier each of the last three reflections. Worth naming what\'s pulling attention away — sometimes the answer is "the plan needs to change," sometimes it\'s "life is doing other things right now."`,
  };
}

// Non-judgmental restart framing. The voice rule here is sharper
// than the others — this is the moment the user is most likely to
// churn, and shaming them out the door is the easiest mistake. No
// "you fell off," no "get back on the wagon" — just observation +
// the smallest next step. The on-page card (NutritionOffTrackCard)
// carries the longer tactical content; this prompt is the doorbell.
export function copyNutritionOffTrack(
  shape: NutritionOffTrackShape,
): ContextualPrompt {
  if (shape === 'silence') {
    return {
      kind: 'nutrition_off_track',
      title: 'The nutrition log has been quiet.',
      body: 'Not a verdict on the plan — most users hit a quiet stretch in the first few months. The trend over 90 days is what moves the needle, not any one week. Worth a one-tap log today to see where you are.',
    };
  }
  return {
    kind: 'nutrition_off_track',
    title: 'Hitting protein has been hard this week.',
    body: 'A run of misses usually means the plan needs a small tweak, not more discipline — wrong protein source for your schedule, the prep window collapsed, or a hidden constraint shifted. Worth one specific adjustment, not a reset.',
  };
}

// Cross-journey dependency copy. Three shapes, one kind. Voice
// posture matches the rest of the contextual prompts: observational,
// names mechanism, no CTA. The "this signal exists" framing is the
// teaser for free users — the ContextualPromptCard adds the optional
// /pricing hint when isPremium=false.

export function copyCardioCutConflict(): ContextualPrompt {
  return {
    kind: 'cross_journey_dependency',
    cross_journey_shape: 'cardio_cut_conflict',
    title: 'Cardio on top of a cut is a tightrope, not a free lever.',
    body: 'Your cardio prescription is adding burn on top of an existing nutrition deficit. The deficit is now deeper than the nutrition plan was tuned for — easier to over-do than to add cleanly. Either revisit nutrition with the new activity layer, or hold steady and let energy + training quality drive the next adjustment.',
  };
}

export function copyFatigueSoftensStrength(): ContextualPrompt {
  return {
    kind: 'cross_journey_dependency',
    cross_journey_shape: 'fatigue_softens_strength',
    title: 'Cardio fatigue is downweighting your strength plan.',
    body: 'You reported struggling-level fatigue from cardio in this week\'s reflection. Strength is reading that signal — the prescription softens automatically until the cardio load eases or recovery catches up. Not a setback; the plan is trading short-term volume for sustainable progress on both sides.',
  };
}

export function copyActivityChangeNutritionStale(
  direction: 'increased' | 'decreased',
): ContextualPrompt {
  const directionPhrase =
    direction === 'increased'
      ? 'increased meaningfully'
      : 'decreased meaningfully';
  const implication =
    direction === 'increased'
      ? 'A plan tuned for lower activity will run a deeper effective deficit than intended — energy and hunger will tell you first.'
      : 'A plan tuned for higher activity will run a softer deficit than intended — the rate will quietly slow.';
  return {
    kind: 'cross_journey_dependency',
    cross_journey_shape: 'activity_change_nutrition_stale',
    title: `Your activity ${directionPhrase} — the nutrition plan was tuned for the old level.`,
    body: `${implication} Worth a re-eval at /plan/nutrition when the new activity pattern has settled into a steady week or two — not at the first shift.`,
  };
}

export function copyGlp1Hydration(): ContextualPrompt {
  return {
    kind: 'glp1_hydration',
    title: 'On a GLP-1 — water count.',
    body: 'Slowed gastric emptying makes it easy to drink less. Aim for steady fluid throughout the day, not a big load at meals. Quiet reminder.',
  };
}

export function copySleepDeficit7d(args: {
  avgHours: number;
  severity: 'mild' | 'severe';
  primaryBlocker: SleepBiggestBlocker | null;
}): ContextualPrompt {
  const avgStr = args.avgHours.toFixed(1);
  const blockerHint = args.primaryBlocker
    ? ` ${BLOCKER_HINT[args.primaryBlocker]}`
    : '';
  if (args.severity === 'severe') {
    return {
      kind: 'sleep_deficit_7d',
      title: `Last seven nights averaged ${avgStr} hours — that's the floor.`,
      body: `Below 5.5 isn't recovery debt, it's a substrate-level limit on everything else — strength, hunger control, mood. Most of what you're working on stalls until this moves.${blockerHint}`,
    };
  }
  return {
    kind: 'sleep_deficit_7d',
    title: `Last seven nights averaged ${avgStr} hours.`,
    body: `Under 6.5 is where downstream effects start showing — recovery between strength sessions, cravings on the cut, irritability without an obvious cause. Worth one specific move this week, not a sleep overhaul.${blockerHint}`,
  };
}

export function copySleepVarianceHigh(sdHours: number): ContextualPrompt {
  return {
    kind: 'sleep_variance_high',
    title: 'Sleep variance is up this week.',
    body: `Standard deviation around ${sdHours.toFixed(1)} hours over the last seven nights. The strength prescription assumes recovery — go easier on heavy days while sleep finds its baseline.`,
  };
}

// Journey drift (Slice 3 of maintenance reflection). Per-slug copy
// because the right framing differs — strength drift is about
// re-entry dose, body comp drift is about scale-vs-defended-range
// honesty, style drift is about silhouette tier crossing. Voice
// rules: drift is expected, climb-back not restart, no shame.

import type { JourneySlug } from '@/lib/journey-state/compute';

const DRIFT_COPY: Record<JourneySlug, { title: string; body: string }> = {
  hair: {
    title: 'Hair plan drift detected.',
    body: 'Something in the routine has shifted enough that the plan reads stale. Worth a quick review — the climb back is small.',
  },
  style: {
    title: 'Your silhouette tier has changed — closet is drifting.',
    body: 'Body fat crossed a tier the plan was built around. The pieces still work, but the cuts and proportions read differently now. Re-run style when you have a few minutes.',
  },
  body_composition: {
    title: 'Weight has been above your defended range for 3+ weeks.',
    body: 'Drift is expected. The right move is sized to the gap — small habits return for 2–4 lb, a mini-cut for 6–10, a full re-eval for 10+. You are not restarting.',
  },
  strength: {
    title: 'Three weeks since your last strength session.',
    body: 'The platform you built doesn\'t disappear in three weeks, but the cadence does. Re-entry is half-volume for one to two weeks before chasing where you left off.',
  },
  cardio: {
    title: 'Three weeks since your last cardio session.',
    body: 'The aerobic floor compresses faster than strength does. Re-enter at 50% volume for one to two weeks — Zone 2 only — before the higher-intensity work returns.',
  },
  sleep: {
    title: 'Sleep rhythm has drifted from baseline.',
    body: 'The timing window slipped. One week of strict adherence to your anchor wake time pulls the rest back into line — bed time follows the wake time, not the other way around.',
  },
  skincare: {
    title: 'Skincare plan is reading stale.',
    body: 'Something in skin context shifted (season, stress, new product). Most drift here is subtractive — return to baseline first, then re-introduce.',
  },
  facial_hair: {
    title: 'Facial hair upkeep cadence has slipped.',
    body: 'A trim + edge cleanup resets most of this. Return to your cadence the next session — do not double up to compensate.',
  },
};

export function copyJourneyDriftDetected(
  slug: JourneySlug,
): ContextualPrompt {
  const copy = DRIFT_COPY[slug];
  return {
    kind: 'journey_drift_detected',
    title: copy.title,
    body: copy.body,
  };
}
