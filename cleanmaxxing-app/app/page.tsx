// / — primary homepage. Horizontal-coach positioning, 18–55 audience,
// leads on the cross-journey architecture and the points that separate
// Cleanmaxxing from the vertical-specialist stack (Hims / Whoop /
// Levels / MacroFactor). Replaces the earlier loss-aversion "the
// window closed" homepage, which now lives at /for-the-window as a
// segmented variant for paid acquisition into the 30s–40s body
// anxiety funnel.
//
// Copy pass 2026-05-12: removed the 10-journey list duplication
// between hero + first horizontal card; merged the two adherence-
// honesty cards under "Voice posture" into one; renamed the
// "Voice posture" / "Tools, shipped" eyebrows to plain English;
// pulled the 18–55 specificity card into its own section; tightened
// the $80–90 hedge in pricing to the actual $90; cut the duplicate
// "Start free" CTA from the final section and the "bad fit" coda
// from the Fit section; added screenshot slots on the tools cards
// (no visible placeholder when src is null).
//
// Second pass same day: retired the entire "horizontal approach"
// section. Its two cards (depth-per-journey + cross-journey
// dependency awareness) were either implicit in the hero's chip row
// + coordination sentence or a direct restatement of the problem
// section's vertical-app failure examples (training→protein,
// sleep→strength). Removing it lets the page flow problem → 18–55
// → how-we-coach → tools without doubling the abstract thesis.
//
// Static server component — no auth gating. CTAs point at /signup
// for anonymous flow; logged-in users following the link still land
// on signup but the auth layer redirects them through to the app.

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cleanmaxxing — one coach across ten journeys',
  description:
    'Hair, style, body composition, strength, cardio, sleep, skincare, facial hair, facial structure, presentation. One coordinated plan, not ten apps that don’t talk to each other.',
  openGraph: {
    title: 'Cleanmaxxing — one coach across ten journeys',
    description:
      'The horizontal coach for men 18–55 who’ve tried the vertical apps. Ten coordinated journeys, honest content on GLP-1 / TRT / peptides, wearable-aware coaching. $9.99/mo.',
    type: 'website',
  },
};

// The 10 journeys as chips below the hero h1. Same vocabulary as
// JOURNEY_LABEL in lib/today/journeys.ts but flat strings here — the
// homepage is the only place this rendered enumeration lives, so a
// local array keeps the dependency direction clean (marketing should
// not import app code).
const JOURNEY_CHIPS: ReadonlyArray<string> = [
  'Hair',
  'Style',
  'Body comp',
  'Strength',
  'Cardio',
  'Sleep',
  'Skincare',
  'Facial hair',
  'Facial structure',
  'Presentation',
];

// The "horizontal approach" section was retired 2026-05-12 — both
// of its cards were restating ideas the hero, problem section,
// and pricing footnote already carried. The "depth-per-journey"
// claim is implicit in the chip row + coordination sentence in
// the hero; the cross-journey examples are the inverse of the
// problem section's vertical-app failure list. Audience + How we
// coach + What's built today now carry the page from the problem
// section straight through to pricing.

// 18–55 specificity points pulled out of the horizontal cards into
// their own section. The bullets are the differentiator — list them
// concretely instead of burying them in prose.
const AGE_RANGE_SPECIFICITY: ReadonlyArray<string> = [
  'Age-cohort cut imagery so the haircut recommendations match what works on a 45-year-old, not a 25-year-old model.',
  'Age-50+ protein floor adjustments built into the nutrition plan.',
  'A cardio tier-flip at 35+ — cardio moves from refinement to core priority once the cardiovascular cost of aging starts to bite.',
  'Balding-friendly cut recommendations with mature-cohort photos for users on the thinning-or-shaved track.',
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
    title: 'Adherence honesty, not streak shaming.',
    body: 'Weekly check-ins ask "did you do the process?" not "are you happy with your results?" — effort gets decoupled from genetics and timing. And when adherence drops, the system fires a recovery card with a four-step restart instead of guilt copy. Speed of restart, not streak length.',
  },
];

// `screenshot` is reserved for product imagery. Leave null until the
// asset lands at /public/marketing/<slug>.png; FeatureCard skips the
// image block when the field is null so the page degrades cleanly.
// When you add images: pick a single visual per card that's load-
// bearing for the claim (cut-family grid for photos, chat preview for
// Mister P, an in-app prescription delta for the wearable card).
const TOOLS: ReadonlyArray<Feature> = [
  {
    title: 'Wearable signals that change your plan.',
    body: 'HRV trend, resting heart rate trained-band, VO2max progression — read by the report prompts and used to shift what we recommend. Whoop gives you a number. We give you a different plan.',
    screenshot: null, // TODO: a "before / after the HRV trend dropped" prescription-delta preview
    screenshotAlt: 'Cleanmaxxing strength plan adjusting after HRV trend declines',
  },
  {
    title: 'Mister P remembers where you are.',
    body: 'The chat assistant knows your assessments, your active stages, what you’ve tried, what’s stuck. Continuous personalization instead of ChatGPT’s fresh-conversation amnesia. Reachable from anywhere in the app via Ctrl+K.',
    screenshot: null, // TODO: a Mister P chat preview showing the journey-state block in action
    screenshotAlt: 'Mister P chat referencing the user’s active strength stage',
  },
  {
    title: 'AI photo analysis shipped, not promised.',
    body: 'Hair photo capture with cut-family visualization — see yourself in four to six density-appropriate styles before you commit. Facial-hair density-by-area mapping. Body baseline plus 30 / 90 / 180-day progress photos with self-comparison framing. All live today.',
    screenshot: null, // TODO: the cut-family visualization grid (highest-differentiation visual on the page)
    screenshotAlt: 'Cut-family visualization grid in Cleanmaxxing',
  },
];

type Feature = {
  title: string;
  body: string;
  screenshot?: string | null;
  screenshotAlt?: string;
};

function FeatureCard({ feature }: { feature: Feature }) {
  return (
    <li className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      {feature.screenshot && (
        <img
          src={feature.screenshot}
          alt={feature.screenshotAlt ?? ''}
          className="mb-5 aspect-video w-full rounded-lg object-cover"
        />
      )}
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
            src="/cleanmaxxing-logo3.png"
            alt="Cleanmaxxing"
            className="h-12 w-auto max-w-full sm:h-16 dark:invert"
          />
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-emerald-700 sm:text-6xl dark:text-emerald-400">
          One coach across ten journeys.
        </h1>
        {/* Chips render the 10-journey list as discrete elements so
            the eye grabs them, freeing the body sentence to focus on
            the coordination claim. */}
        <ul className="mt-8 flex flex-wrap justify-center gap-2 sm:justify-start">
          {JOURNEY_CHIPS.map((label) => (
            <li
              key={label}
              className="inline-flex items-center rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {label}
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Cleanmaxxing reads what&rsquo;s happening across each of them
          and coordinates the plan so they reinforce each other instead
          of competing for your time.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4 sm:justify-start">
          <Link
            href="/signup"
            className="rounded-full bg-emerald-600 px-6 py-3 text-sm font-medium text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400"
          >
            Start your 14-day Pro trial
          </Link>
          <Link
            href="/signup"
            className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Start free
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            See the plan comparison &rarr;
          </Link>
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          No card either way. The free plan keeps three journeys forever; the
          14-day trial unlocks all ten plus advanced protocols.
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
              dashboards that don&rsquo;t talk, four bills that hit $90 a
              month combined, and four narrow recommendations that quietly
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

      {/* Built for 18 to 55 — own section so the specificity bullets
          carry their own weight. This is the page's strongest
          segmentation moment; burying it as one card of three was
          undervaluing it. */}
      <section className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div className="mx-auto w-full max-w-3xl px-6 py-24">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Audience
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
            Built for 18 to 55, not just 25-year-olds.
          </h2>
          <p className="mt-6 font-serif text-[18px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Most men&rsquo;s-improvement apps quietly assume a lean
            25-year-old with no joint issues and full hair. We don&rsquo;t.
            The older end of the audience is served, not patronized:
          </p>
          <ul className="mt-6 space-y-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            {AGE_RANGE_SPECIFICITY.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How we coach — renamed from "Voice posture" (internal
          jargon). Now 3 cards instead of 4 — the prior
          process-vs-outcome + off-track-recovery pair merged into a
          single adherence-honesty card. */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          How we coach
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
          Coaching that respects you.
        </h2>
        <ul className="mt-12 grid gap-5 lg:grid-cols-3">
          {COACHING.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </ul>
      </section>

      {/* What's built today — renamed from "Tools, shipped" (which
          read as inside-joke). Cards now support an optional
          screenshot via the `screenshot` field on TOOLS entries —
          null today; populate when assets land. */}
      <section className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            What&rsquo;s built today
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
            Tools that actually work.
          </h2>
          <ul className="mt-12 grid gap-5 lg:grid-cols-3">
            {TOOLS.map((f) => (
              <FeatureCard key={f.title} feature={f} />
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing teaser — $80–90 hedge replaced with $90; "four
          narrow slices" bridged back to the cross-journey claim. */}
      <section className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div className="mx-auto w-full max-w-3xl px-6 py-24">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            Pricing
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
            <span className="text-emerald-700 dark:text-emerald-400">
              $9.99 a month.
            </span>{' '}
            One app. All ten journeys.
          </h2>
          <p className="mt-6 font-serif text-[18px] leading-relaxed text-zinc-800 dark:text-zinc-200">
            The vertical-specialist stack &mdash; Hims plus Whoop plus Levels
            plus MacroFactor &mdash; runs $90 a month for four narrow slices
            that don&rsquo;t talk to each other. We&rsquo;re one app, one
            price, all ten journeys.
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

      {/* Who Cleanmaxxing is for — bad-fit coda removed. The page
          already has four explicit shots at the wrong audience; the
          "Men 18 to 55 who…" bullets are a cleaner closer. */}
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
      </section>

      {/* Final CTA — duplicate "Start free" removed; trial + log-in
          link only. The hero already gave free-tier picker its
          moment. */}
      <section className="border-t border-emerald-800 bg-emerald-900 dark:border-emerald-900 dark:bg-emerald-950">
        <div className="mx-auto w-full max-w-3xl px-6 py-24 text-center sm:text-left">
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Start with three journeys free.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-emerald-100 dark:text-emerald-200">
            Or take the 14-day Pro trial to see all ten coordinated at once.
            No card required either way.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4 sm:justify-start">
            <Link
              href="/signup"
              className="rounded-full bg-white px-6 py-3 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
            >
              Start your 14-day Pro trial
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-emerald-200 hover:text-white dark:text-emerald-300 dark:hover:text-white"
            >
              Already have an account? Log in &rarr;
            </Link>
          </div>
          <p className="mt-10 text-sm text-emerald-200/80 dark:text-emerald-300/80">
            Questions? Email{' '}
            <a
              href="mailto:support@cleanmaxxing.com"
              className="underline underline-offset-2 hover:text-white"
            >
              support@cleanmaxxing.com
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
