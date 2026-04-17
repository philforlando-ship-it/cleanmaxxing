/**
 * Stripe webhook handler.
 *
 * Receives signed events from Stripe and mirrors subscription state onto
 * public.users.subscription_status + stripe_customer_id. The schema only
 * allows 'trial' | 'active' | 'canceled' | 'past_due', so Stripe's richer
 * statuses are collapsed into those buckets.
 *
 * Raw body is read via `req.text()` — required for signature verification.
 * Next.js route handlers do not parse the body, so this is the raw bytes
 * as the signature was computed over.
 *
 * Writes use the Supabase service-role client because webhook requests
 * carry no user session, and public.users has RLS on `auth.uid() = id`.
 */
import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';
import { createServiceClient } from '@/lib/supabase/server';

// Node runtime is required: stripe.webhooks.constructEvent uses Node crypto.
export const runtime = 'nodejs';

type AppStatus = 'trial' | 'active' | 'canceled' | 'past_due';

function mapSubscriptionStatus(s: Stripe.Subscription.Status): AppStatus {
  switch (s) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
    case 'paused':
      return 'canceled';
    default:
      return 'canceled';
  }
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    // Misconfigured — 500 so Stripe retries until env is fixed.
    return NextResponse.json(
      { error: 'Stripe webhook not configured' },
      { status: 500 }
    );
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid signature: ${(err as Error).message}` },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (!userId) break;
        await supabase
          .from('users')
          .update({
            subscription_status: 'active',
            stripe_customer_id:
              typeof session.customer === 'string' ? session.customer : null,
          })
          .eq('id', userId);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (!userId) break;
        const status: AppStatus =
          event.type === 'customer.subscription.deleted'
            ? 'canceled'
            : mapSubscriptionStatus(sub.status);
        await supabase
          .from('users')
          .update({
            subscription_status: status,
            stripe_customer_id:
              typeof sub.customer === 'string' ? sub.customer : null,
          })
          .eq('id', userId);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : null;
        if (!customerId) break;
        await supabase
          .from('users')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_customer_id', customerId);
        break;
      }
      default:
        // Ignore unhandled events — Stripe only needs a 2xx.
        break;
    }
  } catch (err) {
    // DB-side failures: 500 so Stripe retries.
    return NextResponse.json(
      { error: `Handler error: ${(err as Error).message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
