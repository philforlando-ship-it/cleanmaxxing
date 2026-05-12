import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { StepAwayCard } from './step-away-card';
import { PushNotificationsSection } from './push-notifications-section';
import { HealthIntegrationCard } from './health-integration-card';
import { getPremiumStatus } from '@/lib/billing/is-premium';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, premium] = await Promise.all([
    supabase
      .from('users')
      .select('subscription_status, tracking_paused_at')
      .eq('id', user.id)
      .maybeSingle(),
    getPremiumStatus(user.id),
  ]);

  const status = (profile?.subscription_status as string | null) ?? 'trial';
  const paused = Boolean(profile?.tracking_paused_at);

  // Wearable integration state. Junction aggregates Whoop / Oura /
  // Fitbit / Garmin / Strava / Withings via a single OAuth widget;
  // health_integrations stores at most one row per user (current
  // connection). Apple Health is intentionally not wired — it needs
  // a native iOS bridge this web app doesn't have. The most-recent
  // row gives us the active provider; .limit(1) is defensive against
  // future multi-provider support.
  const { data: healthRow } = await supabase
    .from('health_integrations')
    .select('provider, connected_at, last_synced_at')
    .eq('user_id', user.id)
    .order('connected_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const healthConnected = Boolean(healthRow);
  const healthProvider = (healthRow?.provider as string | null) ?? null;
  const healthConnectedAt = (healthRow?.connected_at as string | null) ?? null;
  const healthLastSyncedAt =
    (healthRow?.last_synced_at as string | null) ?? null;
  const vitalConfigured = Boolean(
    process.env.VITAL_API_KEY && process.env.VITAL_ENVIRONMENT,
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

      <div className="mt-10 space-y-4">
        {/* Direct top-level link to the Free vs Pro comparison page.
            Previously buried two clicks deep (Settings → Billing →
            "See comparison" link inside). Free users need to see the
            full split easily; Pro users still benefit from the
            reference. Sits above Billing because the upgrade pitch is
            more relevant to most settings visits than payment-method
            management. */}
        <Link
          href="/pricing"
          className="block rounded-xl border border-zinc-200 bg-white p-6 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/50"
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-medium">Plans &amp; pricing</h2>
            <span className="text-xs text-zinc-500">Free vs Pro &rarr;</span>
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Compare what&rsquo;s on the free plan against what Pro
            unlocks — all ten core journeys plus advanced protocols
            (GLP-1, TRT, peptides), cross-journey logic, wearable
            integration, photo-aware Mister P, and the AI vision
            features.
          </p>
        </Link>

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

        <HealthIntegrationCard
          connected={healthConnected}
          provider={healthProvider}
          connectedAt={healthConnectedAt}
          lastSyncedAt={healthLastSyncedAt}
          vitalConfigured={vitalConfigured}
          isPremium={premium.isPremium}
        />

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
