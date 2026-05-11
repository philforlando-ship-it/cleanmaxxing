// Types for /today's Area 2 contextual prompt (Phase E of the
// /today redesign). Single prompt at a time. Returns null when
// nothing useful surfaces — empty Area 2 is better than filler.

import type { PrimaryActionKind } from '@/lib/today/types';

export type ContextualPromptKind =
  | 'nutrition_off_track'
  | 'process_adherence_declining'
  | 'cross_journey_dependency'
  | 'glp1_hydration'
  | 'sleep_deficit_7d'
  | 'sleep_variance_high';

// Discriminator for the cross_journey_dependency kind — one prompt
// kind, multiple underlying signals. Kept on ContextualPrompt so the
// renderer can apply per-shape styling and so the ceiling-hint
// footer for free users can know which shape it's labeling.
export type CrossJourneyDependencyShape =
  | 'cardio_cut_conflict'
  | 'fatigue_softens_strength'
  | 'activity_change_nutrition_stale';

export type ContextualPrompt = {
  kind: ContextualPromptKind;
  title: string;
  body: string;
  // No CTA. Area 2 is a *prompt* — the user reflects or doesn't.
  // Future enhancement could add an optional href here, but Phase
  // E ships without one.
  //
  // Only set when kind === 'cross_journey_dependency'. Lets the
  // ceiling-hint footer for free users label which signal they're
  // seeing as a teaser, and lets Pro users' multi-detector flow
  // expose which one fired.
  cross_journey_shape?: CrossJourneyDependencyShape;
};

// Each prompt declares which primary-action kinds it should NOT
// fire alongside. When Area 1 already surfaces a related concern,
// Area 2 stays quiet to keep /today calm.
export const PRIMARY_ACTION_INCOMPATIBILITIES: Record<
  ContextualPromptKind,
  ReadonlyArray<PrimaryActionKind>
> = {
  // Behavioral signal (actual nutrition_logs adherence). Suppressed
  // alongside the engagement-off signals like the other "you're
  // slipping" detectors.
  nutrition_off_track: ['stepped_away', 'circuit_breaker'],
  process_adherence_declining: ['stepped_away', 'circuit_breaker'],
  // Cross-journey dependency surfaces. Quietly informational so it
  // coexists with most primary actions — only suppressed when the
  // user has opted out (stepped_away) or hit the engagement
  // circuit-breaker.
  cross_journey_dependency: ['stepped_away', 'circuit_breaker'],
  // Modifier nudges coexist freely with most Area 1 actions —
  // they're informational, not judgmental. Suppress only when
  // stepped away (the user has explicitly opted out).
  glp1_hydration: ['stepped_away'],
  sleep_deficit_7d: ['stepped_away'],
  sleep_variance_high: ['stepped_away'],
};
