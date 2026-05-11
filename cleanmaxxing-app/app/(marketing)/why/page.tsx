// /why — broader "horizontal coach" positioning page for the 18–55
// audience. Sits alongside the segmented homepage at /, which keys
// on 30s–40s specifically. This page leads on the cross-journey
// architecture and the ten things that separate Cleanmaxxing from
// the vertical-specialist stack.
//
// Static server component — no auth gating. CTAs point at /signup
// for anonymous flow; logged-in users following the link still land
// on signup but the auth layer redirects them through to the app.

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Why Cleanmaxxing — one coach across eight journeys',
  description:
    'Hair, style, body composition, strength, cardio, sleep, skincare, facial hair. One coordinated plan, not eight apps that don’t talk to each other.',
  openGraph: {
    title: 'Why Cleanmaxxing — one coach across eight journeys',
    description:
      'The horizontal coach for men 18–55 who’ve tried the vertical apps. Pattern A journeys + Pattern D for Rx-class compounds + wearable-aware coaching, $9.99/mo.',
    type: 'website',
  },
};

const HORIZONTAL = [
  {
    title: 'One coach, eight journeys.',
    body: 'Hair, style, body composition, strength, cardio, sleep, skincare, facial hair. Each with a full assessment, a personalized report, and a structured stage-gated plan you work through over months. All coordinated by one system that sees the whole picture.',
  },
  {
    title: 'Cross-journey dependency awareness.',
    body: 'When your training volume changes, your nutrition plan adjusts. When your sleep slips, your strength prescription adapts. When you add cardio, your fatigue budget recalibrates. ChatGPT can’t do this — it has no memory. The vertical apps can’t — they only see their slice.',
  },
  {
    title: 'Built for 18 to 55, not just 25-year-olds.',
    body: 'Most men’s-improvement apps quietly assume a lean 25-year-old with no joint issues and full hair. Cleanmaxxing has age-cohort cut imagery, age-50+ protein adjustments, a cardio tier-flip at 35+, and balding-friendly cut recommendations with mature-cohort photos. The older end of the audience is served, not patronized.',
  },
];

const COACHING = [
  {
    title: 'Self-acceptance built into the voice.',
    body: 'We never tell men they need to fix themselves. The work is framed as additive — building from where you are, not correcting what’s wrong with you. Different trust profile than the manosphere-adjacent alternatives. Different regulatory posture than the "you have low T, buy our pills" funnels.',
  },
  {
    title: 'GLP-1, TRT, and peptides — handled honestly.',
    body: 'Three-phase guidance: Considering, On Protocol, and Off-Ramp. Nobody else does the Off-Ramp work; it’s the hardest phase and the one where users actually need help, and most apps just abandon you there.',
  },
  {
    title: 'Process-vs-outcome reflection.',
    body: 'Weekly check-ins ask "did you do the process?" not "are you happy with your results?" That decouples effort from genetics and timing — which is what compounds, and what most check-in systems get backwards.',
  },
  {
    title: 'Off-track recovery, not streak shaming.',
    body: 'When adherence drops, the system fires a recovery card with a four-step restart protocol and the identity move framed as "speed of restart, not streak length." Most apps either shame you (Duolingo-style guilt) or go silent at the exact moment you’d otherwise quit. We help you come back.',
  },
];

const TOOLS = [
  {
    title: 'Wearable signals that change your plan.',
    body: 'HRV trend, resting heart rate trained-band, VO2max progression — read by the report prompts and used to shift what we recommend. Whoop gives you a number. We give you a different plan.',
  },
  {
    title: 'Mister P remembers where you are.',
    body: 'The chat assistant knows your assessments, your active stages, what you’ve tried, what’s stuck. Continuous personalization instead of ChatGPT’s fresh-conversation amnesia. Reachable from anywhere in the app via Ctrl+K.',
  },
  {
    title: 'AI photo analysis shipped, not promised.',
    body: 'Hair photo capture with cut-family visualization — see yourself in four to six density-appropriate styles before you commit. Facial-hair density-by-area mapping. Body baseline plus 30 / 90 / 180-day progress photos with self-comparison framing. Real features, wired into the journeys today.',
  },
];

type Feature = (typeof HORIZONTAL)[number];

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <li className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="text-lg font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
        {feature.title}
      </h3>
      <p className="mt-3 flex-1 font-serif text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        {feature.body}
      </p>
    </li>
  );
}

export default function WhyCleanmaxxingPage() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="mx-auto w-full max-w-3xl px-6 py-24 text-center sm:py-32 sm:text-left">
        <div className="mb-10 flex justify-center">
          <img
            src="/cleanmaxxing-logo2.png"
            alt="Cleanmaxxing"
            className="h-24 w-auto mix-blend-multiply dark:invert dark:mix-blend-screen"
          />
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 sm:text-6xl dark:text-zinc-100">
          One coach across eight journeys.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Hair, style, body composition, strength, cardio, sleep, skincare,
          facial hair. Cleanmaxxing reads what&rsquo;s happening in all of them
          and coordinates the plan so they reinforce each other instead of
          competing for your time.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4 sm:justify-start">
          <Link
            href="/signup"
            className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
          >
            Start your 14-day trial
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            See the plan comparison &rarr;
          </Link>
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          No card. Three journeys free if you&rsquo;d rather not commit.
        </p>
      </section>

      {/* The problem with vertical specialists */}
      <section className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div className="mx-auto w-full max-w-3xl px-6 py-24">
          <div className="space-y-5 font-serif text-[18px] leading-relaxed text-zinc-800 dark:text-zinc-200">
            <p className="not-italic font-sans text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              The problem
            </p>
            <p className="text-2xl font-semibold not-italic tracking-tight text-zinc-900 dark:text-zinc-100">
              Every men&rsquo;s improvement app solves one thing.
            </p>
            <ul className="not-italic font-sans space-y-1 text-[15px] text-zinc-700 dark:text-zinc-300">
              <li className="flex items-baseline justify-between gap-4 border-b border-zinc-200 py-2 dark:border-zinc-800">
                <span>Hims wants to own your hair.</span>
                <span className="font-mono text-xs text-zinc-500">~$30/mo</span>
              </li>
              <li className="flex items-baseline justify-between gap-4 border-b border-zinc-200 py-2 dark:border-zinc-800">
                <span>Whoop wants to own your recovery.</span>
                <span className="font-mono text-xs text-zinc-500">~$30/mo</span>
              </li>
              <li className="flex items-baseline justify-between gap-4 border-b border-zinc-200 py-2 dark:border-zinc-800">
                <span>Levels wants to own your glucose.</span>
                <span className="font-mono text-xs text-zinc-500">~$20/mo</span>
              </li>
              <li className="flex items-baseline justify-between gap-4 py-2">
                <span>MacroFactor wants to own your food.</span>
                <span className="font-mono text-xs text-zinc-500">~$10/mo</span>
              </li>
            </ul>
            <p>
              None of them know the others exist. So you end up with four
              dashboards that don&rsquo;t talk, four bills that hit $80&ndash;90
              a month combined, and four narrow recommendations that quietly
              contradict each other when you try to stack them.
            </p>
            <p>
              When you start training harder, no one tells you to adjust your
              protein. When your sleep slips for two weeks, your strength plan
              doesn&rsquo;t notice. When you start a GLP-1, none of your other
              apps adapt.
            </p>
            <p className="not-italic font-semibold text-zinc-900 dark:text-zinc-100">
              That&rsquo;s what we built Cleanmaxxing to fix.
            </p>
          </div>
        </div>
      </section>

      {/* The horizontal approach */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          One coach
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
          The horizontal approach.
        </h2>
        <ul className="mt-12 grid gap-5 lg:grid-cols-3">
          {HORIZONTAL.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </ul>
      </section>

      {/* Coaching that respects you */}
      <section className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Voice posture
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
            Coaching that respects you.
          </h2>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2">
            {COACHING.map((f) => (
              <FeatureCard key={f.title} feature={f} />
            ))}
          </ul>
        </div>
      </section>

      {/* Tools that actually work */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          Tools, shipped
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
          Tools that actually work.
        </h2>
        <ul className="mt-12 grid gap-5 lg:grid-cols-3">
          {TOOLS.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </ul>
      </section>

      {/* Pricing teaser */}
      <section className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div className="mx-auto w-full max-w-3xl px-6 py-24">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Pricing
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
            <span className="text-emerald-700 dark:text-emerald-400">
              $9.99 a month.
            </span>{' '}
            One app. All eight journeys.
          </h2>
          <p className="mt-6 font-serif text-[18px] leading-relaxed text-zinc-800 dark:text-zinc-200">
            The vertical-specialist stack &mdash; Hims plus Whoop plus Levels
            plus MacroFactor &mdash; runs $80&ndash;90 a month for four narrow
            slices. We&rsquo;re one app, one price, all eight journeys.
          </p>
          <p className="mt-4 font-serif text-[18px] leading-relaxed text-zinc-800 dark:text-zinc-200">
            Three journeys are free forever if you&rsquo;d rather not commit.
            The 14-day trial of the full Pro tier requires no card.
          </p>
          <div className="mt-10">
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-white dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              See the full plan comparison &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Who Cleanmaxxing is for */}
      <section className="mx-auto w-full max-w-3xl px-6 py-24">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          Fit
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
          Who Cleanmaxxing is for.
        </h2>
        <p className="mt-6 font-serif text-[18px] leading-relaxed text-zinc-800 dark:text-zinc-200">
          Men 18 to 55 who:
        </p>
        <ul className="mt-4 space-y-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          <li className="flex gap-3">
            <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
            <span>
              Are already doing some of the work and want it coordinated
              instead of fragmented across four apps.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
            <span>
              Want substance over slogans and useful plans over dashboards.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
            <span>
              Are willing to use the tools &mdash; assessments, logs, photos
              &mdash; rather than wait for AI to read their mind.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
            <span>
              Want honest content on Rx-class compounds without a pharma sales
              funnel.
            </span>
          </li>
        </ul>

        <p className="mt-10 font-serif text-[18px] leading-relaxed text-zinc-800 dark:text-zinc-200">
          A bad fit for anyone looking for shortcuts, anyone who wants to be
          told they&rsquo;re already perfect, or anyone who needs a streak
          counter to stay motivated.
        </p>
      </section>

      {/* Final CTA */}
      <section className="border-t border-emerald-800 bg-emerald-900 dark:border-emerald-900 dark:bg-emerald-950">
        <div className="mx-auto w-full max-w-3xl px-6 py-24 text-center sm:text-left">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Start with three journeys free.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-emerald-100 dark:text-emerald-200">
            Or take the 14-day Pro trial to see all eight coordinated at once.
            No card required to start.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4 sm:justify-start">
            <Link
              href="/signup"
              className="rounded-full bg-white px-6 py-3 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
            >
              Start your trial
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-emerald-200 hover:text-white dark:text-emerald-300 dark:hover:text-white"
            >
              Already have an account? Log in &rarr;
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
