import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cleanmaxxing — the no-bullshit appearance playbook for men over 30',
  description:
    'Looking your best matters more after 30, not less. Cleanmaxxing is the structured, evidence-based appearance playbook for men in the years that count. Real evidence, process over hype.',
  openGraph: {
    title: 'Cleanmaxxing — for men over 30',
    description:
      'The no-bullshit appearance playbook for men in the years that count.',
    type: 'website',
  },
};

const PILLARS = [
  {
    number: '01',
    title: 'Built for adult men',
    body: 'Most looksmaxxing content is written for 22-year-olds with all the time in the world. Cleanmaxxing is for men who have a job, a partner, kids, a mortgage, and about twenty minutes a day. The evidence is the same. The conversation is different.',
  },
  {
    number: '02',
    title: 'Process beats performance',
    body: 'You are not training for a photo shoot. You are playing a twenty-year game. Our goals are weekly habits: protein, sleep, training consistency, skincare basics, posture. Not before-and-after stunts.',
  },
  {
    number: '03',
    title: 'Honest about what works',
    body: 'We tell you when supplements are a waste. When influencers are wrong. When the right answer is "this one isn\u2019t worth fixing." Sometimes the most useful thing we can say is to stop.',
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="mx-auto w-full max-w-3xl px-6 py-24 sm:py-32">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Cleanmaxxing
        </div>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-6xl dark:text-zinc-100">
          Looking your best matters more after 30, not less.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Cleanmaxxing is the no-bullshit appearance playbook for men in the
          years that count. Real evidence. Process over hype.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/signup"
            className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Start your 14-day trial
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            Log in &rarr;
          </Link>
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          No credit card required. 14 days free, then $9.99/month or $79/year.
        </p>
      </section>

      {/* Sub-hero — "the window closed" */}
      <section className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div className="mx-auto w-full max-w-3xl px-6 py-24">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            What changed
          </div>
          <div className="mt-6 space-y-5 font-serif text-[18px] leading-relaxed text-zinc-800 dark:text-zinc-200">
            <p>
              You used to be able to skip a workout for two months and bounce
              back. You used to be able to ignore your skin. You used to be
              able to wear whatever your mom bought you and look fine in
              photos.
            </p>
            <p className="text-2xl font-semibold not-italic tracking-tight text-zinc-900 dark:text-zinc-100">
              That window closed.
            </p>
            <p>
              The good news: most of what actually moves the needle in your
              30s and 40s is unsexy, evidence-based, and time-efficient. The
              bad news: nobody&rsquo;s been telling you that. Cleanmaxxing
              is the structured guide you wish you&rsquo;d had a decade ago.
            </p>
          </div>
        </div>
      </section>

      {/* Three pillars */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          What Cleanmaxxing is
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
          What makes this different.
        </h2>

        <ul className="mt-12 grid gap-5 lg:grid-cols-3">
          {PILLARS.map((pillar) => (
            <li
              key={pillar.number}
              className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="font-mono text-xs text-zinc-500">
                {pillar.number}
              </span>
              <h3 className="mt-3 text-lg font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
                {pillar.title}
              </h3>
              <p className="mt-3 flex-1 font-serif text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                {pillar.body}
              </p>
            </li>
          ))}
        </ul>

        <blockquote className="mt-14 border-l-2 border-zinc-300 pl-6 font-serif text-[17px] italic leading-relaxed text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
          There are four levers that actually move how a man feels about
          himself: therapy, relationships, purpose, and physical attributes.
          Cleanmaxxing owns the fourth. It&rsquo;s the one that produces
          measurable progress in months rather than years. The other three
          matter, often more, and we&rsquo;re not trying to compete with them.
        </blockquote>
      </section>

      {/* What we own — product features */}
      <section className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div className="mx-auto w-full max-w-3xl px-6 py-24">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            What you actually get
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
            A structured plan, a direct assistant, a weekly rhythm.
          </h2>

          <dl className="mt-12 space-y-10">
            <div>
              <dt className="text-sm font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                A guided starter plan
              </dt>
              <dd className="mt-3 font-serif text-[16px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                An onboarding conversation, not a form, produces three
                starter goals matched to your age, focus areas, and where
                you&rsquo;re actually starting from. They&rsquo;re ranked by
                what moves the needle for a man in his 30s or 40s, rather
                than what sounds impressive.
              </dd>
            </div>

            <div>
              <dt className="text-sm font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Mister P, the assistant
              </dt>
              <dd className="mt-3 font-serif text-[16px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                Direct, a little dry, willing to tell you something
                isn&rsquo;t worth your time. He&rsquo;s grounded in a
                100&ndash;200k+ word corpus and he sees your goals, your
                check-in history, and your reflection notes. The answer
                you get is calibrated to where you actually are. He
                won&rsquo;t sell you supplements, vendor links, or cycle
                protocols.
              </dd>
            </div>

            <div>
              <dt className="text-sm font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Daily check-ins, weekly reflection
              </dt>
              <dd className="mt-3 font-serif text-[16px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                Ten seconds a day on your goals. About a minute on Sunday
                on how the week went, across four dimensions rather than
                one global self-worth score. The chart tracks the trend.
                No streaks, no fire emojis, no global rating.
              </dd>
            </div>

            <div>
              <dt className="text-sm font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                Step away when you need to
              </dt>
              <dd className="mt-3 font-serif text-[16px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                One tap pauses tracking without losing your goals or
                progress. Taking a break is a legitimate choice, sometimes
                the right one, and we say so. Most products in this
                category hide that option. We surface it.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Brand lines — not medical, no hierarchy */}
      <section className="mx-auto w-full max-w-3xl px-6 py-24">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Two things we want to be clear about
        </div>
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Not medical.
            </h3>
            <p className="mt-3 font-serif text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              Cleanmaxxing is not a medical or therapeutic service. We
              don&rsquo;t diagnose, we don&rsquo;t interpret labs, and we
              don&rsquo;t advise on treatment. When a clinical question
              comes up, we say so and point you to a physician.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Not a hierarchy of worth.
            </h3>
            <p className="mt-3 font-serif text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              There&rsquo;s nothing wrong with wanting to look and feel
              better. There&rsquo;s everything wrong with attaching your
              worth as a person to where you rank on an attractiveness
              ladder.
            </p>
          </div>
        </div>
      </section>

      {/* Read first — articles demonstrating the brand's posture */}
      <section className="border-t border-zinc-200 bg-zinc-50 mx-auto w-full max-w-6xl px-6 py-24 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Read first
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Three articles. The same posture.
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Appearance is two things at once.
            </h3>
            <p className="mt-3 flex-1 font-serif text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              The visual layer everyone optimizes for, and the second
              layer almost no one names. Why most men over 30 hit a wall
              doing pure-visual work, and what compounds with age instead.
            </p>
            <Link
              href="/two-layers"
              className="mt-6 inline-flex items-center text-sm font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
            >
              Read the article &rarr;
            </Link>
          </div>
          <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Tom Brady&rsquo;s face did more for his brand than six rings.
            </h3>
            <p className="mt-3 flex-1 font-serif text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              A case study in the halo effect. How appearance counteracted
              the reasons people had to dislike Brady, and what Burrow and
              Dart show about the same pattern in the next generation.
            </p>
            <Link
              href="/tom-brady-face"
              className="mt-6 inline-flex items-center text-sm font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
            >
              Read the article &rarr;
            </Link>
          </div>
          <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Is Clav right?
            </h3>
            <p className="mt-3 flex-1 font-serif text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              A critical read of one of the most prominent voices in the
              category. What holds up, what&rsquo;s partially right, and
              what&rsquo;s wrong. The kind of second opinion this audience
              came here for.
            </p>
            <Link
              href="/is-clav-right"
              className="mt-6 inline-flex items-center text-sm font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
            >
              Read the full breakdown &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto w-full max-w-3xl px-6 py-24 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
            Start where you actually are.
          </h2>
          <p className="mt-5 mx-auto max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Fourteen days free. Ten seconds a day to check in. No credit card
            to start. Keep the parts that work, walk away if they don&rsquo;t.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Start the free trial
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
            >
              Log in &rarr;
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto w-full max-w-3xl px-6 py-10 text-center text-xs text-zinc-500">
          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link
              href="/mister-p"
              className="hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Who is Mister P?
            </Link>
            <Link
              href="/two-layers"
              className="hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Two layers
            </Link>
            <Link
              href="/tom-brady-face"
              className="hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              The Brady article
            </Link>
            <Link
              href="/is-clav-right"
              className="hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Is Clav right?
            </Link>
          </div>
          <div className="mt-4">&copy; Cleanmaxxing. 18+ only.</div>
        </div>
      </footer>
    </main>
  );
}
