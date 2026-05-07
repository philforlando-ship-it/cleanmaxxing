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

import type { ContextualPrompt } from './types';

export function copySkippedCheckIns(daysSince: number): ContextualPrompt {
  if (daysSince >= 14) {
    return {
      kind: 'skipped_check_ins',
      title: 'Two weeks since the last check-in.',
      body: 'No judgment. Sometimes the answer is "the plan needs to change," sometimes it\'s "life is doing other things right now." Worth naming which one it is.',
    };
  }
  if (daysSince >= 7) {
    return {
      kind: 'skipped_check_ins',
      title: 'A week without a check-in.',
      body: 'The check-in is a one-tap thing — when it slips for a week, it\'s usually less about willpower and more about something pulling attention. What\'s going on?',
    };
  }
  return {
    kind: 'skipped_check_ins',
    title: `${daysSince} days since your last check-in.`,
    body: 'Not a problem yet — daily logging is meant to bend, not break. Worth noticing if it stretches longer.',
  };
}

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

export function copyGlp1Hydration(): ContextualPrompt {
  return {
    kind: 'glp1_hydration',
    title: 'On a GLP-1 — water count.',
    body: 'Slowed gastric emptying makes it easy to drink less. Aim for steady fluid throughout the day, not a big load at meals. Quiet reminder.',
  };
}

export function copySleepVarianceHigh(sdHours: number): ContextualPrompt {
  return {
    kind: 'sleep_variance_high',
    title: 'Sleep variance is up this week.',
    body: `Standard deviation around ${sdHours.toFixed(1)} hours over the last seven nights. The strength prescription assumes recovery — go easier on heavy days while sleep finds its baseline.`,
  };
}
