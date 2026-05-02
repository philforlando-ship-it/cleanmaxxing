/**
 * Goal Fit Score — per-template recommendation bucket computed at
 * library load time. Surfaced as a badge on each card so the
 * library reads as a prescription rather than a menu.
 *
 * Buckets:
 *   recommended-now   — high impact, matches the user's baseline.
 *   useful-later      — good goal, wrong timing (foundation not in).
 *   situational       — only relevant if a specific issue applies.
 *   not-recommended   — distraction or too advanced for this user now.
 *
 * The brand position is "foundation first" — this scoring formalizes it.
 * A user with zero tier-1 active goals trying to add a tier-4 mobility
 * goal sees "useful later" because that order produces worse outcomes.
 *
 * Inputs are deliberately simple: tier of the candidate, tier
 * distribution of the user's already-active goals, and (for the
 * conditional / self-acceptance categories) whether the user's focus
 * areas or risk patterns make the goal currently relevant.
 *
 * Self-acceptance goals are gated by risk patterns rather than tier
 * because they're a corrective surface, not a foundation surface.
 */

export type FitBucket =
  | 'recommended-now'
  | 'useful-later'
  | 'situational'
  | 'not-recommended';

export type FitContext = {
  // Already-active goals' tier strings (e.g. 'tier-1', 'conditional-tier-1').
  activeTiers: string[];
  // POV slugs the user marked as focus areas at onboarding. Drives
  // the conditional-tier-1 routing — if the user's focus areas match
  // the conditional goal's category, it's relevant; otherwise it's
  // strictly situational.
  focusSlugs: Set<string>;
  // True when the self-acceptance risk detector has fired (5+ goals,
  // mostly polish/refinement without foundation, recent circuit
  // breaker, etc.). Surfaces self-acceptance goals as
  // recommended-now rather than situational.
  selfAcceptanceTriggered: boolean;
};

export type FitInput = {
  tier: string | null;
  domain: string | null;
  source_slug: string;
};

const FOUNDATION_THRESHOLD_FOR_REFINEMENT = 2;
const FOUNDATION_THRESHOLD_FOR_ADVANCED = 3;

export function computeFitBucket(
  template: FitInput,
  ctx: FitContext,
): FitBucket {
  const tier = template.tier ?? 'tier-3';

  // Self-acceptance: corrective surface, not a foundation step.
  // Recommended only when the risk detector says the user is in a
  // state where it would actually help. Otherwise situational so it
  // remains visible in the library but doesn't draw attention.
  if (template.domain === 'self-acceptance') {
    return ctx.selfAcceptanceTriggered ? 'recommended-now' : 'situational';
  }

  // Conditional tier 1 (acne, hair-loss). Strictly situational unless
  // the user's focus areas already pointed at this category.
  if (tier === 'conditional-tier-1') {
    return ctx.focusSlugs.has(template.source_slug) ? 'recommended-now' : 'situational';
  }

  const activeFoundationCount = ctx.activeTiers.filter((t) => t === 'tier-1').length;
  const activeFoundationOrHighImpact = ctx.activeTiers.filter(
    (t) => t === 'tier-1' || t === 'tier-2',
  ).length;

  if (tier === 'tier-1' || tier === 'tier-2') {
    return 'recommended-now';
  }

  if (tier === 'tier-3') {
    return activeFoundationCount >= FOUNDATION_THRESHOLD_FOR_REFINEMENT
      ? 'recommended-now'
      : 'useful-later';
  }

  // tier-4 (Advanced layer) and tier-5 (Polish): require a real
  // foundation under them before we recommend.
  if (tier === 'tier-4' || tier === 'tier-5') {
    if (activeFoundationOrHighImpact >= FOUNDATION_THRESHOLD_FOR_ADVANCED) {
      return 'recommended-now';
    }
    if (activeFoundationOrHighImpact >= 1) return 'useful-later';
    return 'not-recommended';
  }

  return 'recommended-now';
}

export const FIT_BUCKET_LABEL: Record<FitBucket, string> = {
  'recommended-now': 'Recommended now',
  'useful-later': 'Useful later',
  'situational': 'Situational',
  'not-recommended': 'Not yet',
};

export const FIT_BUCKET_EXPLAINER: Record<FitBucket, string> = {
  'recommended-now':
    'High impact for where you are right now. Worth starting.',
  'useful-later':
    'Good goal, wrong timing. Build the foundation under it first.',
  'situational':
    'Only worth adding if this specific issue applies to you.',
  'not-recommended':
    'Likely a distraction at your current stage. Foundation first.',
};
