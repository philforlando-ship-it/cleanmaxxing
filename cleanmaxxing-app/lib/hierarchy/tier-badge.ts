/**
 * Shared labels + one-line explainers for the priority-tier badge.
 *
 * Distinct from `lib/hierarchy/tiers.ts` (which owns the /system
 * page's verbose framework view): this file is the compact label
 * vocabulary used by `components/tier-badge.tsx`, including the
 * `conditional-tier-1` variant that the framework view treats as a
 * sidebar case rather than a step in the linear hierarchy.
 *
 * Moved out of `lib/goals/` in Sub-ship B (2026-05-10) — the tier
 * concept is universal Cleanmaxxing framework, not goal-specific.
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
  'tier-4': 'Advanced layer',
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
    'After the basics. What people who look their best add once foundation, high-impact, and refinement are running on rails.',
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
