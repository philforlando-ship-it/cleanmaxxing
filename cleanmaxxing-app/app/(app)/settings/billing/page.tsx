import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { BillingPlanPicker } from './billing-plan-picker';
import { BillingPortalButton } from './billing-portal-button';

type Props = {
  searchParams: Promise<{ billing?: string }>;
};

// 2026-05-09: dropped computeTrialDaysLeft + the "X days left" copy
// when we shipped the free-app reframe. The 'trial' status value in
// the DB is effectively a stable "free plan" marker — no expiration.
// Public /pricing page carries the full free-vs-premium comparison;
// this page is the upgrade + manage-billing surface for users who
// already arrived intent-to-act.

export default async function BillingPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('subscription_status')
    .eq('id', user.id)
    .maybeSingle();

  const status = (profile?.subscription_status as string | null) ?? 'trial';

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
        {status === 'trial' && (
          <>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              You&rsquo;re on the free plan. No payment required, no
              expiration. Premium adds AI vision features — facial
              analysis, hair cut try-on, hair photo trend analysis, and
              beard try-on — on top of everything you already have.
            </p>
            <Link
              href="/pricing"
              className="mt-3 inline-block text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              See full free vs premium comparison →
            </Link>
          </>
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
