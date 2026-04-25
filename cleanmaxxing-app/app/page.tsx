import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cleanmaxxing — structured, honest self-improvement for men',
  description:
    'Clean, structured, brand-trustworthy self-improvement for men who want to look and feel better — without the radioactive parts of looksmaxxing culture.',
  openGraph: {
    title: 'Cleanmaxxing',
    description:
      'Structured, honest self-improvement for men who want to look and feel better.',
    type: 'website',
  },
};

const PATHS = [
  {
    number: '01',
    title: 'Therapy and internal work',
    body: 'Addressing root causes, narratives, and nervous-system regulation. Often the deepest route, and often the one people skip. Real, and sometimes the most important.',
    note: 'Not what we do.',
  },
  {
    number: '02',
    title: 'Relationships and social investment',
    body: 'Deepening friendships, romantic connection, and community. Most men underinvest here and most men feel the cost. Slow, compounding, hard to measure, high return.',
    note: 'Not what we do.',
  },
  {
    number: '03',
    title: 'Purpose and accomplishment',
    body: 'Work, craft, skill development, meaningful contribution. The quiet engine behind most durable self-confidence. Takes years. Worth it.',
    note: 'Not what we do.',
  },
  {
    number: '04',
    title: 'Physical attributes',
    body: 'Body, skin, hair, style, grooming, posture. The fastest measurable progress of the four — six months versus years — process-based, safe, and honest about its limits.',
    note: 'This is what Cleanmaxxing is for.',
    own: true,
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
          Look and feel better. Without the radioactive parts of the category.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Structured, honest self-improvement for men. A guided plan built
          from a 100–200k+ word corpus, a direct chat assistant that
          won&rsquo;t sell you anything, and a framework that sequences what
          to work on — in what order — based on where you actually are.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/signup"
            className="rounded-full bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Start the 14-day free trial
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            Log in →
          </Link>
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          No credit card required. 14 days free, then $9.99/month or $79/year.
        </p>
      </section>

      {/* Four paths */}
      <section className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div className="mx-auto w-full max-w-6xl px-6 py-24">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Ways to build self-confidence
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
            Cleanmaxxing is one route. It is not the only one.
          </h2>
          <p className="mt-5 max-w-2xl font-serif text-[17px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Most products in this category frame themselves as <em>the</em> way
            to become a better version of yourself. We decline to do that.
            Research and lived experience both point to four paths that
            actually move the needle on how men feel about themselves. We own
            one of them explicitly, acknowledge the other three as real, and
            don&rsquo;t pretend that appearance is the whole identity.
          </p>

          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PATHS.map((path) => (
              <li
                key={path.number}
                className={
                  path.own
                    ? 'flex flex-col rounded-2xl border-2 border-zinc-900 bg-white p-6 shadow-md dark:border-zinc-100 dark:bg-zinc-900'
                    : 'flex flex-col rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/40'
                }
              >
                <span className="font-mono text-xs text-zinc-500">
                  {path.number}
                </span>
                <h3 className="mt-3 text-lg font-semibold leading-snug text-zinc-900 dark:text-zinc-100">
                  {path.title}
                </h3>
                <p className="mt-3 flex-1 font-serif text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                  {path.body}
                </p>
                <div
                  className={
                    path.own
                      ? 'mt-5 text-[11px] font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100'
                      : 'mt-5 text-[11px] uppercase tracking-wider text-zinc-500'
                  }
                >
                  {path.note}
                </div>
              </li>
            ))}
          </ul>

          <p className="mt-10 max-w-2xl text-sm italic leading-relaxed text-zinc-600 dark:text-zinc-400">
            The intellectual honesty is itself the moat. It&rsquo;s what
            separates us from every competitor who treats appearance as the
            whole identity.
          </p>
        </div>
      </section>

      {/* What we own */}
      <section className="mx-auto w-full max-w-3xl px-6 py-24">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          What Cleanmaxxing actually does
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
              An onboarding conversation — not a form — produces three
              starter goals matched to your age, focus areas, and where
              you&rsquo;re actually starting from. Ranked by how much they
              actually move the needle, not by what sounds impressive.
            </dd>
          </div>

          <div>
            <dt className="text-sm font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Mister P, the assistant
            </dt>
            <dd className="mt-3 font-serif text-[16px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              Direct, a little dry, willing to tell you something isn&rsquo;t
              worth your time. Grounded in a 100–200k+ word corpus and cites
              the source on every answer. Won&rsquo;t sell you supplements, vendor
              links, or cycle protocols. Sometimes the honest answer is
              &ldquo;this one isn&rsquo;t worth your attention — focus on
              something else.&rdquo;
            </dd>
          </div>

          <div>
            <dt className="text-sm font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Daily check-ins, weekly reflection
            </dt>
            <dd className="mt-3 font-serif text-[16px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              Ten seconds a day on your goals. Sixty seconds on Sunday on
              how the week actually went — across four dimensions, not one
              global self-worth score. The chart tracks the trend. No
              streaks. No fire emojis. No global rating.
            </dd>
          </div>

          <div>
            <dt className="text-sm font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Step away when you need to
            </dt>
            <dd className="mt-3 font-serif text-[16px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              One tap pauses tracking without losing your goals or progress.
              Taking a break is a legitimate choice, sometimes the correct
              one, and we say so. Most products in this category hide this.
              We don&rsquo;t.
            </dd>
          </div>
        </dl>
      </section>

      {/* Brand lines — not medical, no hierarchy */}
      <section className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div className="mx-auto w-full max-w-3xl px-6 py-24">
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
                ladder. No &ldquo;alpha,&rdquo; no &ldquo;high-value,&rdquo;
                no tier lists. We don&rsquo;t subscribe to the worldview the
                term came from.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Read first — essays demonstrating the brand's posture */}
      <section className="mx-auto w-full max-w-5xl px-6 py-24">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Read first
        </div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Two essays. The same posture.
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Is Clav right?
            </h3>
            <p className="mt-3 flex-1 font-serif text-[16px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              A critical read of one of the most prominent voices in the
              category. What holds up, what&rsquo;s partially right, and
              what&rsquo;s wrong. This is the kind of second opinion our
              members come for.
            </p>
            <Link
              href="/is-clav-right"
              className="mt-6 inline-flex items-center text-sm font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
            >
              Read the full breakdown &rarr;
            </Link>
          </div>
          <div className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Tom Brady&rsquo;s face did more for his brand than six rings.
            </h3>
            <p className="mt-3 flex-1 font-serif text-[16px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              A case study in the halo effect. How appearance counteracted
              the reasons people had to dislike Brady &mdash; and what
              Burrow and Dart show about the same pattern in the next
              generation.
            </p>
            <Link
              href="/tom-brady-face"
              className="mt-6 inline-flex items-center text-sm font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
            >
              Read the essay &rarr;
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
              Log in →
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
              href="/is-clav-right"
              className="hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Is Clav right?
            </Link>
            <Link
              href="/tom-brady-face"
              className="hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              The Brady essay
            </Link>
          </div>
          <div className="mt-4">© Cleanmaxxing. 18+ only.</div>
        </div>
      </footer>
    </main>
  );
}
