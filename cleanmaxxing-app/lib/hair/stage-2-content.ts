// Stage 2 decision-support content. Authored, not LLM-generated — Stage 2
// is the user's hard call (Treat / Monitor / Transition) and the framing
// for each branch needs to be consistent across users. The copy lives in
// Mister P's voice and is verified once rather than re-rolled per user.
//
// Cleanmaxxing does NOT prescribe medication. The Treat branch describes
// what a treatment-consideration plan looks like in the app and explicitly
// names the prescriber relationship as the user's responsibility.

import type {
  CurrentRoutine,
  CutFamily,
  DensityState,
  Stage2Path,
} from './types';

export type Stage2BranchCopy = {
  path: Stage2Path;
  headline: string;
  pitch: string;
  what_happens: string;
  commitment: string;
};

export const STAGE_2_BRANCHES: Record<Stage2Path, Stage2BranchCopy> = {
  treat: {
    path: 'treat',
    headline: 'Treat',
    pitch:
      'You’re showing real signs — recession, thinning, shedding, density loss. The next move isn’t white-knuckling it. It’s figuring out the treatment options properly.',
    what_happens:
      'Mister P will spin up a separate hair-loss treatment plan. That plan covers what fin and min actually do, the realistic outcomes, what to ask a doctor, and how to track whether it’s working. Cleanmaxxing does not prescribe — that part is between you and a physician.',
    commitment:
      'Two living plans on hair: this one for cut, products, and routine; the other for treatment specifics. They’ll talk to each other.',
  },
  monitor: {
    path: 'monitor',
    headline: 'Monitor',
    pitch:
      'You’re not on a treatment decision yet. Hold a stable cut, take baseline photos under the same lighting, check the hairline and crown every few months.',
    what_happens:
      'No new plan spawned. Stage 5 (when it ships) will set you up with a quarterly photo cadence and pattern-detection. Until then, you’re committing to "don’t make a decision in either direction yet."',
    commitment:
      'Pattern over months, not strands in the shower. Don’t turn every mirror into a scan.',
  },
  transition: {
    path: 'transition',
    headline: 'Transition',
    pitch:
      'Hair this thin is probably costing you more than it’s giving you. The next move isn’t giving up. It’s getting in front of it.',
    what_happens:
      'Future stages on this plan flip into bald-track framing — buzz cadence, scalp care, beard alignment, color and style. Done deliberately, this presentation outperforms thinning hair being anxiously preserved.',
    commitment:
      'You’re committing to a clean look as the goal, not a fallback. Half-measure transitions read worse than either direction done with intent.',
  },
};

// Modifier-aware suggestion. Returns a path the user is likely to be in
// already, or null if no modifier signal makes the call obvious. The UI
// uses this to surface a "Mister P thinks this is your path" callout —
// it does NOT auto-lock-in. The user still makes the call.
//
// Suggestion order matters — the first matching condition wins. The
// stronger / less ambiguous signals are checked first.
export type Stage2ModifierContext = {
  density_state: DensityState;
  current_interventions: string[];
  /** Stage 1's cut recommendation, when generated. bald_track / clean_shave
   *  picks are themselves a strong "this user is past styling" signal that
   *  reinforces the Transition suggestion. */
  cut_family?: CutFamily | null;
  /** User age from users.age. Used to weight the advanced_thinning
   *  decision: at 40+ the POV explicitly shifts from "recovery" to
   *  "aesthetic optimization," which means Transition is the
   *  framework's read for users with serious loss in that age band. */
  age?: number | null;
};

export function suggestStage2Path(
  ctx: Stage2ModifierContext,
): { path: Stage2Path; reason: string } | null {
  // Already shaved/buzzed — Transition is the path they're already on.
  if (ctx.density_state === 'shaved_or_buzzed') {
    return {
      path: 'transition',
      reason:
        'You’re already running the bald presentation. The Transition path locks the rest of the plan into that framing.',
    };
  }

  // Already on fin or min — they've already picked Treat in real life.
  // Lock-in here just makes the app aware of it.
  const onFinOrMin =
    ctx.current_interventions.includes('finasteride') ||
    ctx.current_interventions.includes('minoxidil');
  if (onFinOrMin) {
    return {
      path: 'treat',
      reason:
        'You’re already on hair-loss treatment. Picking Treat here links your hair plan to the treatment plan so they share modifiers.',
    };
  }

  // Stage 1 already pointed to a bald cut family. That's a Mister P
  // judgment that the user's situation supports the bald presentation
  // — Stage 2 should reinforce, not contradict.
  if (
    ctx.cut_family === 'bald_track' ||
    ctx.cut_family === 'clean_shave'
  ) {
    return {
      path: 'transition',
      reason:
        'Stage 1 already pointed you toward the bald presentation. The Transition path locks the rest of the plan into that framing rather than asking you to relitigate the call here.',
    };
  }

  // Advanced thinning + 40+ AND not on treatment: POV 08 §"Ages 40+
  // — aesthetic optimization, not recovery" is explicit that at this
  // stage and age, the strategy shifts from preserving regrowth to
  // optimizing the look. Surface that honestly.
  if (
    ctx.density_state === 'advanced_thinning' &&
    typeof ctx.age === 'number' &&
    ctx.age >= 40
  ) {
    return {
      path: 'transition',
      reason:
        'At this stage of loss + your age, treatment usually preserves what’s left rather than restoring what’s gone. Many men in this position pick Transition — the bald presentation done deliberately reads better than thin hair preserved past its useful life. (POV 08 §Three Questions, §Ages 40+.)',
    };
  }

  // Active loss in the early-intervention window: POV 08 says the
  // 20-29 cohort is "the most important decade for hair preservation"
  // and waiting 2-3 years after noticing loss can lose follicles
  // permanently. Surface Treat for users in that window.
  if (
    (ctx.density_state === 'crown_thinning' ||
      ctx.density_state === 'diffuse_thinning') &&
    typeof ctx.age === 'number' &&
    ctx.age <= 35
  ) {
    return {
      path: 'treat',
      reason:
        'Active loss now is the easiest to slow. The 20-35 window is when treatment has the most to preserve — waiting two or three years can lose follicles permanently. (POV 08 §Ages 20-29.)',
    };
  }

  // Everything else (mild loss, ambiguous mid-30s, etc.) — let the
  // user pick. Mister P doesn't have a strong opinion on these.
  return null;
}

// Helper: when the suggested path is `treat` because of existing fin/min,
// the Treat branch copy is misleading ("Cleanmaxxing does not prescribe"
// is true but the user already has a prescription). Surface a softened
// variant that acknowledges the existing treatment.
export function softenedTreatCopyFor(
  ctx: Stage2ModifierContext,
): Stage2BranchCopy | null {
  const onFinOrMin =
    ctx.current_interventions.includes('finasteride') ||
    ctx.current_interventions.includes('minoxidil');
  if (!onFinOrMin) return null;
  return {
    ...STAGE_2_BRANCHES.treat,
    pitch:
      'You’re already on treatment. The work here is consistency, photo tracking, and realistic timelines — not relitigating whether to start.',
    what_happens:
      'Mister P links this hair plan to your treatment plan so the modifiers (fin/min in your interventions) shape the rest of the stages going forward.',
  };
}

// Currently unused but keeps CurrentRoutine in the imports surface so
// future copy variants (e.g. "you cut every 2 weeks, that's incompatible
// with growing out hair to assess") have a hook.
export type _RoutineModifier = CurrentRoutine;
