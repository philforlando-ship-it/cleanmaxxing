// Default sets/reps suggestions for the workout log "Insert from plan"
// affordance. Lightweight heuristics by movement pattern — not a full
// program prescription, just sensible starting values so the user
// isn't typing 3 / 8 / 8 every time.
//
// User can always edit. The whole point is to remove the typing
// friction, not to hand-cuff their actual session to these numbers.
//
// Source rationale: standard hypertrophy/strength rep ranges from POV
// 19. Compound primary movements 5–8 reps; isolation 10–12; carries
// 30–60s timed (we render reps as the seconds count for those).

import type { StrengthExercise } from './types';

type LogDefault = {
  sets: number;
  reps: number;
};

// Compound multi-joint movements get 3×6 (lower-rep strength bias).
const COMPOUND_PATTERNS = new Set<string>([
  'squat',
  'hinge',
  'lunge',
  'horizontal_push',
  'vertical_push',
  'horizontal_pull',
  'vertical_pull',
]);

// Single-joint isolation gets 3×10 (hypertrophy rep range).
const ISOLATION_PATTERNS = new Set<string>([
  'shoulder_isolation',
  'arm_isolation',
  'leg_isolation',
  'calf',
]);

export function defaultSetsRepsFor(exercise: StrengthExercise): LogDefault {
  const pattern = exercise.movement_pattern;
  if (COMPOUND_PATTERNS.has(pattern)) {
    return { sets: 3, reps: 6 };
  }
  if (ISOLATION_PATTERNS.has(pattern)) {
    return { sets: 3, reps: 10 };
  }
  if (pattern === 'core') {
    // Core is split between rep-counted (sit-up family) and time-held
    // (plank family). Pick the rep default; time-held users will
    // overwrite to whatever seconds they did. 3×12 is a reasonable
    // anchor for either case.
    return { sets: 3, reps: 12 };
  }
  // Fallback — generic hypertrophy.
  return { sets: 3, reps: 8 };
}
