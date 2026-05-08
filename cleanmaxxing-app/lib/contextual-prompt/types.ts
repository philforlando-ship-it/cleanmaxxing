// Types for /today's Area 2 contextual prompt (Phase E of the
// /today redesign). Single prompt at a time. Returns null when
// nothing useful surfaces — empty Area 2 is better than filler.

import type { PrimaryActionKind } from '@/lib/today/types';

export type ContextualPromptKind =
  | 'skipped_check_ins'
  | 'process_adherence_declining'
  | 'glp1_hydration'
  | 'sleep_deficit_7d'
  | 'sleep_variance_high';

export type ContextualPrompt = {
  kind: ContextualPromptKind;
  title: string;
  body: string;
  // No CTA. Area 2 is a *prompt* — the user reflects or doesn't.
  // Future enhancement could add an optional href here, but Phase
  // E ships without one.
};

// Each prompt declares which primary-action kinds it should NOT
// fire alongside. When Area 1 already surfaces a related concern,
// Area 2 stays quiet to keep /today calm.
export const PRIMARY_ACTION_INCOMPATIBILITIES: Record<
  ContextualPromptKind,
  ReadonlyArray<PrimaryActionKind>
> = {
  // Both communicate "engagement is off" — let Area 1's
  // circuit-breaker do the heavy lifting; don't double up.
  skipped_check_ins: ['stepped_away', 'circuit_breaker'],
  process_adherence_declining: ['stepped_away', 'circuit_breaker'],
  // Modifier nudges coexist freely with most Area 1 actions —
  // they're informational, not judgmental. Suppress only when
  // stepped away (the user has explicitly opted out).
  glp1_hydration: ['stepped_away'],
  sleep_deficit_7d: ['stepped_away'],
  sleep_variance_high: ['stepped_away'],
};
