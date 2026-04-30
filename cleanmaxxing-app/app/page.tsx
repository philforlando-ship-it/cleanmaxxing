import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cleanmaxxing — for men over 30',
  description:
    'Most of what actually moves the needle in your 30s and 40s is unsexy, evidence-based, and time-efficient. Nobody is laying it out for you. Cleanmaxxing does.',
  openGraph: {
    title: 'Cleanmaxxing — for men over 30',
    description:
      'A structured plan, a direct chat assistant, ten seconds a day. For the part of life where looking and feeling better starts mattering more, not less.',
    type: 'website',
  },
};

const PILLARS = [
  {
    number: '01',
    title: 'Built for limited evenings',
    body: 'The plan assumes you have a job, a partner, kids, and not a lot of weeknight bandwidth. Daily check-ins are ten seconds. The Sunday reflection is about a minute. Mister P is there when you have a question, not a homework assignment.',
  },
  {
    number: '02',
    title: 'Process + outcomes',
    body: 'Goals are weekly habits — protein, sleep, training, skincare, posture. The thing that compounds is consistency over years. That’s what the app tracks.',
  },
  {
    number: '03',
    title: 'Honest about what works',
    body: 'When a supplement isn’t worth the money, the app says so. When the right answer is "don’t bother fixing this," it says that too. Sometimes the most useful thing it can say is stop.',
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* Hero — "the window closed" framing leads, the description follows.
          Earlier versions buried this hook in slot 2; promoting it puts the
          strongest sentence on the page where it belongs and gives the
          reader an emotional reason to care before any feature copy. */}
      <section className="mx-auto w-full max-w-3xl px-6 py-24 sm:py-32">
        <p className="text-sm font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          For men over 30.
        </p>
        <h1 className="mt-5 text-5xl font-semibold tracking-tight text-zinc-900 sm:text-7xl dark:text-zinc-100">
          That window closed.
        </h1>
        <div className="mt-8 max-w-2xl space-y-5 font-serif text-[18px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          <p>
            You used to be able to skip a workout for two months and bounce
            back. Eat whatever was on the table. Sleep four hours and still
            look fine in photos.
          </p>
          <p>
            The good news: most of what actually moves the needle in your
            30s and 40s is unsexy, evidence-based, and time-efficient. The
            bad news: nobody is laying it out for you. Cleanmaxxing does.
          </p>
        </div>
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
            Log in &rarr;
          </Link>
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          No credit card required. 14 days free, then $9.99/month or $79/year.
        </p>
      </section>

      {/* What it is — short bridge that names the components without
          becoming a feature dump. The earlier "A structured plan, a
          direct assistant, a weekly rhythm" four-paragraph section was
          cut: redundant with the pillars below and the articles further
          down. Three sentences carry the load. */}
      <section className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div className="mx-auto w-full max-w-3xl px-6 py-20">
          <div className="space-y-5 font-serif text-[17px] leading-relaxed text-zinc-800 dark:text-zinc-200">
            <p>
              Cleanmaxxing is three things working together. A guided
              starter plan ranked for what actually moves the needle in
              your 30s and 40s, not what sounds impressive. Mister P, a
              direct chat assistant grounded in a 100&ndash;200k+ word
              corpus that knows your goals and your check-in history. And
              a weekly rhythm &mdash; ten seconds a day, sixty seconds on
              Sunday &mdash; that quietly builds the consistency the rest
              depends on.
            </p>
            <p>
              No supplement upsell. No vendor links. No streaks or fire
              emojis. When the honest answer is &ldquo;don&rsquo;t bother
              fixing this,&rdquo; the app says that too.
            </p>
          </div>
        </div>
      </section>

      {/* Three pillars */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
          What it&rsquo;s built around.
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

      {/* Brand lines — not medical, no hierarchy */}
      <section className="border-t border-zinc-200 mx-auto w-full max-w-3xl px-6 py-24 dark:border-zinc-800">
        <div className="grid gap-8 md:grid-cols-2">
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
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
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
              Tom Brady&rsquo;s face and physique did more for his brand than seven rings.
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
