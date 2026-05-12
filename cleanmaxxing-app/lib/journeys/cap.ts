// Free vs Pro journey-count cap. The marketing page (/pricing) is the
// spec — "Sign up and pick three journeys to start. Pro unlocks the
// other seven journeys." — and this helper is the shared enforcement
// point so the picker UIs, server validators, and the Mister P
// journey-state filter all agree on the number.
//
// 2026-05-11: callers now pass `status === 'active'` rather than the
// generic `isPremium` flag from `getPremiumStatus`. Trial users
// (premium-treated for other gates) ALSO see the 3-journey cap —
// this aligns the in-product behavior with the /pricing pitch, which
// states the 3-journey limit at sign-up. Only paying subscribers
// (subscription_status === 'active') get the 10 ceiling. Existing
// focus_areas rows above the post-trial cap are not pruned; the
// next quarterly survey is the natural trim point.

export const JOURNEY_CAP_FREE = 3;
export const JOURNEY_CAP_PRO = 10;

export function journeyCapFor(isActiveSubscriber: boolean): number {
  return isActiveSubscriber ? JOURNEY_CAP_PRO : JOURNEY_CAP_FREE;
}
