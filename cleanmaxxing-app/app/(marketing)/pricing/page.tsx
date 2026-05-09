// /pricing — public Free vs Premium comparison.
//
// Server component: checks auth + current premium status so the CTA
// section adapts (anonymous → sign up; logged-in free → plan picker;
// logged-in premium → manage-billing link). The comparison content
// itself is static — the truth source for what's gated is the
// requirePremium calls in the API routes (facial analysis, hair
// try-on, hair photo AI, beard try-on). Keep this page in sync when
// new gates land or come off.

import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getPremiumStatus } from '@/lib/billing/is-premium';
import { BillingPlanPicker } from '@/app/(app)/settings/billing/billing-plan-picker';

export const metadata: Metadata = {
  title: 'Pricing — Cleanmaxxing',
  description:
    "Most of the app is free. A few AI-heavy features unlock with premium. Here's the honest breakdown.",
};

type FeatureRow = {
  label: string;
  description?: string;
  free: boolean;
  premium: boolean;
};

type FeatureGroup = {
  heading: string;
  rows: FeatureRow[];
};

const GROUPS: FeatureGroup[] = [
  {
    heading: 'Journeys',
    rows: [
      {
        label: 'All 10 structured plans',
        description:
          'Hair, body composition, strength, cardio, sleep, skincare, style, facial hair, GLP-1, TRT. Full assessment + personalized report on each.',
        free: true,
        premium: true,
      },
      {
        label: 'Plan re-evaluation',
        description:
          'Update your assessment any time. The report regenerates against your current state.',
        free: true,
        premium: true,
      },
      {
        label: 'Stage-gated progression',
        description:
          'Each journey moves through stages — cut → density action → product → daily habit → monitoring → maintenance.',
        free: true,
        premium: true,
      },
    ],
  },
  {
    heading: 'Daily use',
    rows: [
      {
        label: 'Daily check-ins on /today',
        description:
          'Ten-second tiles for the habits each journey is tracking. Modifier-aware.',
        free: true,
        premium: true,
      },
      {
        label: 'Weekly reflection',
        description:
          'Sunday process-and-outcome review across every active journey.',
        free: true,
        premium: true,
      },
      {
        label: 'Milestone tracking',
        description:
          'Body fat brackets, weight thresholds, sleep consistency, RHR trained band, GLP-1 anniversaries — fired automatically.',
        free: true,
        premium: true,
      },
    ],
  },
  {
    heading: 'Mister P',
    rows: [
      {
        label: 'Chat with the full content library',
        description:
          'Grounded in 100,000+ words of authored evidence. Knows your assessments, photos, and journey state.',
        free: true,
        premium: true,
      },
      {
        label: 'Photo-aware conversation',
        description:
          'Sees your baseline face photo and your latest hair anchor photo when relevant.',
        free: true,
        premium: true,
      },
    ],
  },
  {
    heading: 'Wearable integration',
    rows: [
      {
        label: 'Connect any major wearable',
        description:
          'Fitbit, Whoop, Oura, Garmin, Withings, Strava, and more via Junction. Sleep, steps, intensity minutes, active calories, RHR, HRV, and VO2max all flow in. Apple Watch / Apple Health needs a native iOS bridge that this web app doesn\'t have yet.',
        free: true,
        premium: true,
      },
      {
        label: 'Wearable-aware coaching',
        description:
          'Your reports and Mister P read passive recovery signals (HRV trend, RHR trained-band, VO2max progression) alongside the self-report.',
        free: true,
        premium: true,
      },
    ],
  },
  {
    heading: 'AI vision features',
    rows: [
      {
        label: 'AI facial analysis',
        description:
          "Your facial structure analyzed by a vision model. Identifies what's working, what's not, and which interventions would move the needle most.",
        free: false,
        premium: true,
      },
      {
        label: 'Hair cut try-on',
        description:
          "Preview yourself in any of the 22 cut families — caesar, high-taper crop, slick-back undercut, classic sweep-back, etc. — before you commit at the barber.",
        free: false,
        premium: true,
      },
      {
        label: 'Hair photo trend analysis',
        description:
          'Upload progress photos at 30/90/180-day cadence. AI compares hairline, crown density, overall density, and texture across sessions.',
        free: false,
        premium: true,
      },
      {
        label: 'Beard style try-on',
        description:
          'Preview yourself with different facial-hair shapes — verdi, full short, stubble, anchor, etc. — at your current density. No regret-shaving required.',
        free: false,
        premium: true,
      },
    ],
  },
];

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const premium = user ? await getPremiumStatus(user.id) : null;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-20 sm:py-24">
      {/* Hero */}
      <section className="max-w-3xl">
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-100">
          Most of the app is free.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          A few AI-heavy features unlock with premium. Everything else —
          all 10 journeys, daily check-ins, weekly reflection, Mister P
          chat against the full evidence library, wearable integration —
          is on the free plan. No expiration, no payment required to use
          it.
        </p>
      </section>

      {/* Comparison */}
      <section className="mt-16">
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {/* Header row — sticky-ish column titles */}
          <div className="grid grid-cols-[1fr_120px_120px] gap-4 border-b border-zinc-200 bg-zinc-50 px-6 py-4 sm:grid-cols-[1fr_140px_140px] sm:px-8 dark:border-zinc-800 dark:bg-zinc-950/60">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Feature
            </div>
            <div className="text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Free
            </div>
            <div className="text-center text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Premium
            </div>
          </div>

          {GROUPS.map((group) => (
            <div key={group.heading}>
              <div className="border-b border-zinc-200 bg-zinc-50/50 px-6 py-3 sm:px-8 dark:border-zinc-800 dark:bg-zinc-950/30">
                <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {group.heading}
                </h2>
              </div>
              {group.rows.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[1fr_120px_120px] items-start gap-4 border-b border-zinc-100 px-6 py-5 last:border-b-0 sm:grid-cols-[1fr_140px_140px] sm:px-8 dark:border-zinc-800/60"
                >
                  <div>
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {row.label}
                    </div>
                    {row.description && (
                      <div className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        {row.description}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center pt-0.5">
                    <Mark on={row.free} />
                  </div>
                  <div className="flex justify-center pt-0.5">
                    <Mark on={row.premium} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* CTA — adapts to auth + premium state */}
      <section className="mt-16">
        {!user && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Start free. Decide later.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Sign up to use the free plan — all 10 journeys, daily
              check-ins, weekly reflection, Mister P chat, and wearable
              integration. Premium is available from the billing page
              whenever you want the AI vision features.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Sign up free
              </Link>
              <Link
                href="/login"
                className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              >
                Log in &rarr;
              </Link>
            </div>
          </div>
        )}

        {user && premium?.isPremium && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              You&rsquo;re on premium.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              All AI vision features are unlocked. Manage your payment
              method, invoices, plan, or cancellation through the billing
              page.
            </p>
            <div className="mt-6">
              <Link
                href="/settings/billing"
                className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Manage billing
              </Link>
            </div>
          </div>
        )}

        {user && !premium?.isPremium && (
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Upgrade to premium.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Cancel anytime from the billing page. Your free plan
              keeps working either way — premium adds the AI vision
              features on top, it doesn&rsquo;t replace anything.
            </p>
            <div className="mt-8">
              <BillingPlanPicker />
            </div>
          </div>
        )}
      </section>

      {/* Footer notes */}
      <section className="mt-16 grid gap-6 border-t border-zinc-200 pt-10 text-sm text-zinc-600 sm:grid-cols-3 dark:border-zinc-800 dark:text-zinc-400">
        <div>
          <div className="font-medium text-zinc-900 dark:text-zinc-100">
            No expiring trial.
          </div>
          <p className="mt-1 leading-relaxed">
            The free plan has no end date. The system compounds over
            months — most of the real change shows up at month three and
            beyond, which is when most apps would have already pushed
            you to pay.
          </p>
        </div>
        <div>
          <div className="font-medium text-zinc-900 dark:text-zinc-100">
            Cancel anytime.
          </div>
          <p className="mt-1 leading-relaxed">
            Premium is month-to-month or annual. Cancellation is one
            click in the Stripe portal. Your free plan continues
            unaffected.
          </p>
        </div>
        <div>
          <div className="font-medium text-zinc-900 dark:text-zinc-100">
            Your data, your control.
          </div>
          <p className="mt-1 leading-relaxed">
            Photos, assessments, logs, and wearable data stay encrypted
            in your account. You can export or delete from settings at
            any time.
          </p>
        </div>
      </section>
    </main>
  );
}

function Mark({ on }: { on: boolean }) {
  if (on) {
    return (
      <svg
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-label="Included"
        className="h-5 w-5 text-zinc-900 dark:text-zinc-100"
      >
        <path
          fillRule="evenodd"
          d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.55a1 1 0 0 1-1.42.001L3.29 9.755a1 1 0 1 1 1.42-1.41l3.79 3.81 6.79-6.84a1 1 0 0 1 1.414-.024Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
  return (
    <span
      aria-label="Not included"
      className="block h-px w-3.5 bg-zinc-300 dark:bg-zinc-700"
    />
  );
}
