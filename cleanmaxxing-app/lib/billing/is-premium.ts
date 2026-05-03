import 'server-only';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export type SubscriptionStatus = 'trial' | 'active' | 'canceled' | 'past_due';

export const TRIAL_DAYS = 14;

export type PremiumStatus = {
  isPremium: boolean;
  status: SubscriptionStatus | null;
  // Days remaining in the trial window. Null when the user is not on a
  // trial (e.g. active, canceled, past_due, unauthenticated).
  trialDaysLeft: number | null;
};

function computeTrialDaysLeft(createdAt: Date): number {
  const end = new Date(createdAt);
  end.setDate(end.getDate() + TRIAL_DAYS);
  const msLeft = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}

/**
 * Resolve the premium status for the current request's user (or for the
 * userId passed in). A user is considered premium when their subscription
 * is `active`, OR when they're still inside the 14-day `trial` window.
 *
 * Returns { isPremium: false, status: null } for unauthenticated callers
 * and for users whose row is missing.
 */
export async function getPremiumStatus(userId?: string): Promise<PremiumStatus> {
  const supabase = await createClient();

  let id = userId;
  if (!id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { isPremium: false, status: null, trialDaysLeft: null };
    id = user.id;
  }

  const { data: profile } = await supabase
    .from('users')
    .select('subscription_status, created_at')
    .eq('id', id)
    .maybeSingle();

  if (!profile) return { isPremium: false, status: null, trialDaysLeft: null };

  const status =
    (profile.subscription_status as SubscriptionStatus | null) ?? 'trial';
  const createdAt = profile.created_at
    ? new Date(profile.created_at as string)
    : null;

  if (status === 'active') {
    return { isPremium: true, status, trialDaysLeft: null };
  }

  if (status === 'trial' && createdAt) {
    const daysLeft = computeTrialDaysLeft(createdAt);
    return { isPremium: daysLeft > 0, status, trialDaysLeft: daysLeft };
  }

  return { isPremium: false, status, trialDaysLeft: null };
}

export async function isPremium(userId?: string): Promise<boolean> {
  return (await getPremiumStatus(userId)).isPremium;
}

type PremiumGuardSuccess = {
  ok: true;
  userId: string;
  status: PremiumStatus;
};

type PremiumGuardFailure = {
  ok: false;
  response: NextResponse;
};

/**
 * Route handler guard. Returns `{ ok: true, userId, status }` when the
 * caller is authenticated and premium-eligible. Otherwise returns
 * `{ ok: false, response }` where `response` is the appropriate
 * 401 / 402 NextResponse to return.
 *
 *   const auth = await requirePremium();
 *   if (!auth.ok) return auth.response;
 *   const { userId } = auth;
 */
export async function requirePremium(): Promise<
  PremiumGuardSuccess | PremiumGuardFailure
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'unauthenticated' },
        { status: 401 },
      ),
    };
  }

  const status = await getPremiumStatus(user.id);
  if (!status.isPremium) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'premium_required', status: status.status },
        { status: 402 },
      ),
    };
  }

  return { ok: true, userId: user.id, status };
}
