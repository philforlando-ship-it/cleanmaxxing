/**
 * Rewardful client helpers.
 *
 * `getRewardfulReferral()` reads the active referral ID from the global
 * Rewardful object the script loader injects. Safe to call from any
 * client component — returns null when the script hasn't loaded, when
 * Rewardful is disabled (no env key), or when there's no active referral.
 */

type RewardfulGlobal = {
  referral?: string;
};

declare global {
  interface Window {
    Rewardful?: RewardfulGlobal;
  }
}

export function getRewardfulReferral(): string | null {
  if (typeof window === 'undefined') return null;
  const ref = window.Rewardful?.referral;
  return typeof ref === 'string' && ref.length > 0 ? ref : null;
}
