/**
 * Stripe Checkout session creator (spec §4 + §8).
 *
 * POST body: { plan: 'monthly' | 'annual', rewardful_referral?: string }
 *
 * Creates a hosted Checkout session for the authenticated user, passes
 * the Rewardful referral ID (if present) as `client_reference_id` so
 * Rewardful can reconcile the purchase with the referring affiliate via
 * its Stripe integration.
 *
 * Gated on STRIPE_SECRET_KEY + STRIPE_PRICE_MONTHLY/ANNUAL — returns 503
 * when any required config is missing so the rest of the app keeps
 * working in pre-launch environments.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getPriceIds, getStripe } from '@/lib/stripe/server';

const BodySchema = z.object({
  plan: z.enum(['monthly', 'annual']),
  rewardful_referral: z.string().max(128).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { plan, rewardful_referral } = parsed.data;

  const stripe = getStripe();
  const prices = getPriceIds();
  const priceId = plan === 'monthly' ? prices.monthly : prices.annual;
  if (!stripe || !priceId) {
    return NextResponse.json(
      { error: 'Billing is not configured in this environment.' },
      { status: 503 }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      // Rewardful reconciles the purchase via client_reference_id. Safe
      // to pass null — Stripe simply omits the field.
      ...(rewardful_referral
        ? { client_reference_id: rewardful_referral }
        : {}),
      // Carry the Supabase user id through to the webhook so we can
      // update subscription_status on checkout.session.completed.
      metadata: { user_id: user.id },
      subscription_data: {
        metadata: { user_id: user.id },
      },
      success_url: `${appUrl}/today?billing=success`,
      cancel_url: `${appUrl}/settings/billing?billing=cancelled`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
