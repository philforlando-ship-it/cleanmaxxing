/**
 * Stripe customer portal session creator.
 *
 * POST returns { url } pointing to Stripe's hosted portal where the user
 * can update payment method, view invoices, change plan, and cancel.
 *
 * The `stripe_customer_id` is read from the authenticated user's profile
 * (never trusted from the client). Users without a customer id haven't
 * paid yet — they get 400 rather than a portal session for a stranger.
 *
 * Prereq: in Stripe Dashboard → Settings → Billing → Customer Portal, the
 * portal must be configured (allowed plans, cancellation policy, etc.)
 * before this endpoint can succeed. Stripe returns a clear error otherwise.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe/server';

export const runtime = 'nodejs';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: 'Billing is not configured in this environment.' },
      { status: 503 }
    );
  }

  const { data: profile } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  const customerId = profile?.stripe_customer_id as string | null | undefined;
  if (!customerId) {
    return NextResponse.json(
      { error: 'No Stripe customer on file. Subscribe first.' },
      { status: 400 }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings/billing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
