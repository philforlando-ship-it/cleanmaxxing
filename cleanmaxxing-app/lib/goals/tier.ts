/**
 * Shared labels + one-line explainers for goal priority tiers.
 *
 * Tier labels were previously duplicated across three components; consolidated
 * here so adding a new tier or rewording an explainer is a single edit.
 */

export type TierKey =
  | 'tier-1'
  | 'tier-2'
  | 'tier-3'
  | 'tier-4'
  | 'tier-5'
  | 'conditional-tier-1';

const LABELS: Record<TierKey, string> = {
  'tier-1': 'Foundation',
  'tier-2': 'High impact',
  'tier-3': 'Refinement',
  'tier-4': 'Top performers',
  'tier-5': 'Polish',
  'conditional-tier-1': 'Situational',
};

const EXPLAINERS: Record<TierKey, string> = {
  'tier-1':
    'Foundational. Highest leverage — do these first. Most of the real change comes from here.',
  'tier-2':
    'High leverage once the basics are in. Meaningful returns with moderate effort.',
  'tier-3':
    'Worth doing once the foundation is solid. Noticeable, not dominant.',
  'tier-4':
    'What the people who look the best end up adding. Only worth it after the first three tiers are handled.',
  'tier-5':
    'Polish. Marginal gains. Last in the priority order — easy to over-invest in.',
  'conditional-tier-1':
    'Situational. High impact if it applies to you, irrelevant otherwise.',
};

// Display order when grouping goals by tier. Foundation first, refinement +
// polish last. Situational (conditional) floats to the bottom because it's a
// special case rather than a step in the linear hierarchy.
export const TIER_ORDER: TierKey[] = [
  'tier-1',
  'tier-2',
  'tier-3',
  'tier-4',
  'tier-5',
  'conditional-tier-1',
];

function isKnownTier(tier: string): tier is TierKey {
  return tier in LABELS;
}

export function tierRank(tier: string | null | undefined): number {
  if (!tier || !isKnownTier(tier)) return 999;
  return TIER_ORDER.indexOf(tier);
}

export function tierLabel(tier: string | null | undefined): string {
  if (!tier) return '';
  return isKnownTier(tier) ? LABELS[tier] : tier;
}

export function tierExplainer(tier: string | null | undefined): string | null {
  if (!tier || !isKnownTier(tier)) return null;
  return EXPLAINERS[tier];
}
