import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { StepAwayCard } from './step-away-card';
import { PushNotificationsSection } from './push-notifications-section';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('subscription_status, tracking_paused_at')
    .eq('id', user.id)
    .maybeSingle();

  const status = (profile?.subscription_status as string | null) ?? 'trial';
  const paused = Boolean(profile?.tracking_paused_at);

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

      <div className="mt-10 space-y-4">
        <Link
          href="/settings/billing"
          className="block rounded-xl border border-zinc-200 bg-white p-6 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/50"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-medium">Billing</h2>
            <span className="text-xs uppercase tracking-wider text-zinc-500">
              {status}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Manage your subscription, plan, and payment method.
          </p>
        </Link>

        <StepAwayCard initialPaused={paused} />

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <PushNotificationsSection />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-medium">Account</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Signed in as {user.email}
          </p>
          <form action="/api/auth/signout" method="post" className="mt-4">
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
