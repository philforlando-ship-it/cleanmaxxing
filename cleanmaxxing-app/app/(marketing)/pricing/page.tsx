// /pricing — public Free vs Pro comparison.
//
// Server component: checks auth + current premium status so the CTA
// section adapts (anonymous → sign up; logged-in free → plan picker;
// logged-in premium → manage-billing link).
//
// IMPORTANT — this page is FORWARD-LOOKING (2026-05-10 rewrite).
// The matrix below reflects the INTENDED Free vs Pro split, which
// is ahead of the actual enforcement. Several gates named here
// (3-journey cap, 10-chat-queries-per-month cap, wearable Pro gate,
// cross-journey Pro gate, photo-aware chat Pro gate) are not yet
// implemented in the API routes / chat path / journey picker. The
// page is the spec; the code catches up. When a gate ships, no
// change is needed here unless the limit value moves.
//
// Already-gated today (truth source = requirePremium calls in API
// routes): facial analysis, hair cut try-on, hair photo trend
// analysis, beard try-on.

import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getPremiumStatus } from '@/lib/billing/is-premium';
import { BillingPlanPicker } from '@/app/(app)/settings/billing/billing-plan-picker';

export const metadata: Metadata = {
  title: 'Pricing — Cleanmaxxing',
  description:
    'Three journeys free. Ten on Pro. The cross-journey logic is Pro only.',
};

// FeatureValue is either a boolean (rendered as check / dash) or a
// string (rendered verbatim — e.g., "3 of your choice", "10/month",
// "Basic"). String form is used for limit-based or tier-quality rows
// where check/dash would lose information.
type FeatureValue = boolean | string;

type FeatureRow = {
  label: string;
  description?: string;
  free: FeatureValue;
  premium: FeatureValue;
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
        label: 'Active journeys',
        description:
          'Hair, body composition, strength, cardio, sleep, skincare, style, facial hair, GLP-1, TRT. Full assessment + personalized report on each.',
        free: '3 of your choice',
        premium: 'All 10',
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
          'Free covers weight thresholds and sleep consistency. Pro adds RHR trained-band, VO2max progression, body-fat brackets, and protocol anniversaries.',
        free: 'Basic',
        premium: 'Full',
      },
    ],
  },
  {
    heading: 'Mister P chat',
    rows: [
      {
        label: 'Chat with the full content library',
        description:
          'Grounded in 100,000+ words of authored evidence. Free covers a casual user’s monthly use; Pro is unlimited for power use.',
        free: '10 queries / month',
        premium: 'Unlimited',
      },
      {
        label: 'Photo-aware chat',
        description:
          'Mister P sees your baseline face, recent progress, hair photos, and fit photos when answering. Pro only — vision tokens are an inference cost driver.',
        free: false,
        premium: true,
      },
      {
        label: 'Cross-journey awareness in answers',
        description:
          'Free Mister P answers each question in isolation. Pro Mister P reads how your strength, cardio, nutrition, sleep, and recovery interact — and answers from the whole picture.',
        free: 'Limited',
        premium: 'Full',
      },
    ],
  },
  {
    heading: 'Wearable integration',
    rows: [
      {
        label: 'Connect any major wearable',
        description:
          'Fitbit, Whoop, Oura, Garmin, Withings, Strava, and more via Junction. Sleep, steps, intensity minutes, active calories, RHR, HRV, and VO2max all flow in. Apple Watch / Apple Health needs a native iOS bridge that this web app doesn’t have yet.',
        free: false,
        premium: true,
      },
      {
        label: 'Wearable-aware coaching',
        description:
          'Your reports read passive recovery signals (HRV trend, RHR trained-band, VO2max progression) alongside self-report.',
        free: false,
        premium: true,
      },
    ],
  },
  {
    heading: 'Cross-journey orchestration',
    rows: [
      {
        label: 'Strength ↔ cardio recovery balance',
        description:
          'Lifting volume up → cardio dose adjusts. High cardio output → strength recovery accommodates. Both share recovery; Pro models the trade-off.',
        free: false,
        premium: true,
      },
      {
        label: 'Nutrition ↔ strength + cardio',
        description:
          'Caloric deficit warning when strength volume is high. Protein floor scales with lifting load. Cardio output influences calorie targets.',
        free: false,
        premium: true,
      },
      {
        label: 'Hair ↔ facial-hair coordination',
        description:
          'Cut recommendation factors current beard. Beard recommendation factors hair density, balding pattern, head shape, graying. Each plan reads the other.',
        free: false,
        premium: true,
      },
      {
        label: 'Sleep ↔ training fatigue signal',
        description:
          'Bidirectional. Sleep deficit downweights tomorrow’s training intensity. Heavy training week tightens sleep recommendations.',
        free: false,
        premium: true,
      },
      {
        label: 'Activity-change recalibration',
        description:
          'When weekly reflection shows your real activity has shifted, every active plan re-evaluates against the new baseline — not just the journey you flagged.',
        free: false,
        premium: true,
      },
      {
        label: 'Cross-journey signals on /today',
        description:
          'When two of your journeys interact in a way worth naming — cardio on top of a cut, cardio fatigue downweighting strength, activity change making nutrition stale — /today surfaces it as a contextual prompt. Free sees the cardio-cut signal as a teaser; Pro sees the full set.',
        free: '1 signal (cardio + cut)',
        premium: 'Full set',
      },
    ],
  },
  {
    heading: 'AI vision features',
    rows: [
      {
        label: 'AI facial analysis',
        description:
          'Your facial structure analyzed by a vision model. Identifies what’s working, what’s not, and which interventions would move the needle most.',
        free: false,
        premium: true,
      },
      {
        label: 'Hair cut try-on',
        description:
          'Preview yourself in any of the 22 cut families — caesar, high-taper crop, slick-back undercut, classic sweep-back, etc. — before you commit at the barber.',
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
          Three journeys free. Ten on Pro.
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          The cross-journey logic — the part that makes this not just an
          LLM wrapper — is Pro only. Free is enough to know if the
          system works for you. Pro is the system.
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
              Pro
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
                    <FeatureCell value={row.free} />
                  </div>
                  <div className="flex justify-center pt-0.5">
                    <FeatureCell value={row.premium} emphasized />
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
              Sign up and pick three journeys to start. Daily check-ins,
              weekly reflection, and 10 Mister P queries a month are on
              the free plan. Pro unlocks the other seven journeys, the
              cross-journey logic, wearable integration, photo-aware
              chat, unlimited Mister P, and the AI vision features.
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
              You&rsquo;re on Pro.
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
              Upgrade to Pro.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              All ten journeys, the cross-journey logic, wearable
              integration, photo-aware Mister P, unlimited chat, and
              the AI vision features. Cancel anytime from the billing
              page; your three free journeys stay yours either way.
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
            The free plan has no end date. Your three journeys stay
            yours; check-ins, weekly reflection, and 10 Mister P
            queries a month renew indefinitely. Pro is when you want
            the rest of the system.
          </p>
        </div>
        <div>
          <div className="font-medium text-zinc-900 dark:text-zinc-100">
            Cancel anytime.
          </div>
          <p className="mt-1 leading-relaxed">
            Pro is month-to-month or annual. Cancellation is one
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

// Renders a feature-matrix cell. Booleans collapse to a check (true)
// or a thin dash (false). Strings render verbatim — used for limit-
// based rows ("3 of your choice", "10 / month") and tier-quality rows
// ("Basic", "Limited"). The `emphasized` flag bumps text weight on
// the Pro column so the "All 10" / "Unlimited" reads as the headline.
function FeatureCell({
  value,
  emphasized = false,
}: {
  value: FeatureValue;
  emphasized?: boolean;
}) {
  if (value === true) {
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
  if (value === false) {
    return (
      <span
        aria-label="Not included"
        className="block h-px w-3.5 bg-zinc-300 dark:bg-zinc-700"
      />
    );
  }
  return (
    <span
      className={
        emphasized
          ? 'text-center text-xs font-semibold text-zinc-900 dark:text-zinc-100'
          : 'text-center text-xs text-zinc-600 dark:text-zinc-400'
      }
    >
      {value}
    </span>
  );
}
