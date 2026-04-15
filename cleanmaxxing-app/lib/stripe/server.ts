/**
 * Stripe server helpers.
 *
 * `getStripe()` returns a configured Stripe client, or null when
 * STRIPE_SECRET_KEY is unset. Downstream callers are expected to degrade
 * gracefully (return a 503 or redirect to a "billing not configured" page)
 * rather than crash on missing env.
 */
import Stripe from 'stripe';

let cached: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  cached = new Stripe(key);
  return cached;
}

// Price IDs live in env so the same codebase runs against test and live
// Stripe projects without code changes. Spec §8: $9.99/month or $79/year.
export function getPriceIds() {
  return {
    monthly: process.env.STRIPE_PRICE_MONTHLY?.trim() || null,
    annual: process.env.STRIPE_PRICE_ANNUAL?.trim() || null,
  };
}
