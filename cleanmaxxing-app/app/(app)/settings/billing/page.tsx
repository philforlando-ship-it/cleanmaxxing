import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BillingPlanPicker } from './billing-plan-picker';
import { BillingPortalButton } from './billing-portal-button';

type Props = {
  searchParams: Promise<{ billing?: string }>;
};

// Helper pulled out of the component so the impure Date.now() call is
// isolated to a single, explicit location rather than mid-render.
function computeTrialDaysLeft(
  createdAt: Date | null,
  status: string,
): number | null {
  if (!createdAt || status !== 'trial') return null;
  const end = new Date(createdAt);
  end.setDate(end.getDate() + 14);
  const msLeft = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}

export default async function BillingPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('subscription_status, created_at')
    .eq('id', user.id)
    .maybeSingle();

  const status = (profile?.subscription_status as string | null) ?? 'trial';
  const createdAt = profile?.created_at
    ? new Date(profile.created_at as string)
    : null;

  // Trial end = created_at + 14 days. Used to show "X days left" on the
  // trial status card. Null when we can't compute.
  //
  // This is a server component that runs once per request, so capturing
  // "now" here is stable per-render and the purity lint warning doesn't
  // reflect real instability. The calculation is pulled out of an IIFE
  // to make the capture point explicit for future maintainers.
  const trialDaysLeft = computeTrialDaysLeft(createdAt, status);

  const params = await searchParams;
  const billingFlag = params.billing;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/settings"
        className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Settings
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Billing</h1>

      {billingFlag === 'success' && (
        <div className="mt-6 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          Thanks. Your subscription is active.
        </div>
      )}
      {billingFlag === 'cancelled' && (
        <div className="mt-6 rounded-xl border border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          Checkout cancelled. No charge was made. You can come back any time.
        </div>
      )}

      {/* Status card */}
      <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-medium">Current plan</h2>
          <span className="text-xs uppercase tracking-wider text-zinc-500">
            {status}
          </span>
        </div>
        {status === 'trial' && trialDaysLeft !== null && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            You&rsquo;re on the 14-day free trial.{' '}
            {trialDaysLeft > 0
              ? `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left.`
              : 'Your trial has ended.'}
          </p>
        )}
        {status === 'active' && (
          <>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Your subscription is active. Manage your payment method,
              invoices, plan, and cancellation through the Stripe portal.
            </p>
            <BillingPortalButton />
          </>
        )}
        {status === 'canceled' && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Your subscription is cancelled. Pick a plan below to reactivate.
          </p>
        )}
      </section>

      {/* Plan picker — only show when the user isn't already active */}
      {status !== 'active' && (
        <section className="mt-6">
          <BillingPlanPicker />
        </section>
      )}

      <p className="mt-10 text-xs text-zinc-500">
        Questions about billing? Contact support. Cancel anytime. No refunds
        on partial months.
      </p>
    </main>
  );
}
