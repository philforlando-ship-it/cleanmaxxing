// Free vs Pro journey-count cap. The marketing page (/pricing) is the
// spec — "Three journeys free. Ten on Pro." — and this helper is the
// shared enforcement point so the picker UIs, server validators, and
// the Mister P journey-state filter all agree on the number.
//
// 14-day trial users are treated as premium by getPremiumStatus, so
// new sign-ups naturally pick up to 10 during their trial window and
// feel the cross-journey value before being asked to pay. After the
// trial, the cap drops to 3 for any new write; existing focus_areas
// rows above the cap are not pruned (the next quarterly survey is the
// natural enforcement point — the user has to trim to save).

export const JOURNEY_CAP_FREE = 3;
export const JOURNEY_CAP_PRO = 10;

export function journeyCapFor(isPremium: boolean): number {
  return isPremium ? JOURNEY_CAP_PRO : JOURNEY_CAP_FREE;
}
