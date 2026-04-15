import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  getCreator,
  allCreatorSlugs,
  type CreatorEntry,
} from '@/content/marketing/creators';

type Props = {
  params: Promise<{ creator: string }>;
};

// Statically generate a page per registered creator at build time. Any
// slug not in the registry falls through to notFound() at request time.
export function generateStaticParams() {
  return allCreatorSlugs().map((creator) => ({ creator }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { creator: slug } = await params;
  const creator = getCreator(slug);
  if (!creator) return { title: 'Cleanmaxxing' };
  return {
    title: `${creator.name} sent you — Cleanmaxxing`,
    description: `A structured, honest second opinion for men who want to look and feel better. Referred from ${creator.name}.`,
    openGraph: {
      title: `${creator.name} sent you — Cleanmaxxing`,
      description: `A structured, honest second opinion for men who want to look and feel better. Referred from ${creator.name}.`,
      type: 'website',
    },
  };
}

function toneIntro(creator: CreatorEntry): string {
  switch (creator.tone) {
    case 'direct':
      return `${creator.name} sent you. Here\u2019s what Cleanmaxxing actually is, fast:`;
    case 'analytical':
      return `${creator.name} sent you. Here\u2019s the structured read on what Cleanmaxxing is and where it fits next to their framework:`;
    case 'warm':
      return `${creator.name} sent you — and if you\u2019re here, there\u2019s probably something you\u2019ve been meaning to work on. Here\u2019s how Cleanmaxxing helps:`;
  }
}

export default async function CreatorLandingPage({ params }: Props) {
  const { creator: slug } = await params;
  const creator = getCreator(slug);
  if (!creator) notFound();

  // ?via= is Rewardful's default referral param — when the Rewardful
  // script is enabled it'll drop a cookie on hit, and that cookie
  // flows through to Stripe Checkout as client_reference_id. The fallback
  // localStorage handling in the signup page preserves attribution even
  // when Rewardful is disabled locally.
  const signupHref = `/signup?via=${encodeURIComponent(creator.slug)}`;

  return (
    <main className="flex flex-1 flex-col">
      {/* Hero */}
      <section className="mx-auto w-full max-w-3xl px-6 py-20 sm:py-28">
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
          Referred from {creator.handle}
        </div>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-100">
          {toneIntro(creator)}
        </h1>
        <p className="mt-6 max-w-2xl font-serif text-[17px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          {creator.hook}
        </p>
        <p className="mt-4 max-w-2xl font-serif text-[17px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          Cleanmaxxing is the structured, honest second opinion for the
          audience that already trusts them — a guided plan, a direct chat
          assistant grounded in a 100–200k+ word corpus, and a framework that
          sequences what to work on based on where you actually are.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href={signupHref}
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
          No credit card required. $1 first month for {creator.name}&rsquo;s
          audience, then $9.99/month or $79/year.
        </p>
      </section>

      {/* What's different */}
      <section className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/40">
        <div className="mx-auto w-full max-w-3xl px-6 py-20">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            What&rsquo;s different about Cleanmaxxing
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Three things most of the category won&rsquo;t tell you.
          </h2>

          <ol className="mt-10 space-y-8">
            <li>
              <div className="text-sm font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                1. It is not trying to be your whole identity.
              </div>
              <p className="mt-3 font-serif text-[16px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                There are four paths that actually move the needle on how men
                feel about themselves — therapy, relationships, purpose, and
                physical attributes. We own the fourth and acknowledge the
                other three as real. Most products in this space pretend
                appearance is the whole thing.
              </p>
            </li>
            <li>
              <div className="text-sm font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                2. Mister P will tell you when something isn&rsquo;t worth
                your time.
              </div>
              <p className="mt-3 font-serif text-[16px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                The chat assistant is grounded in a 100–200k+ word corpus and
                cites the source on every answer. He won&rsquo;t sell you
                supplements, vendor links, or cycle protocols. Sometimes the
                honest answer is &ldquo;this one isn&rsquo;t worth fixing —
                focus on something else.&rdquo;
              </p>
            </li>
            <li>
              <div className="text-sm font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                3. No hierarchy of worth. Not medical. No tier lists.
              </div>
              <p className="mt-3 font-serif text-[16px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                There&rsquo;s nothing wrong with wanting to look and feel
                better. There&rsquo;s everything wrong with attaching your
                worth to a ranking. No &ldquo;alpha,&rdquo; no
                &ldquo;high-value,&rdquo; no decile scoring. And we don&rsquo;t
                interpret medical data — that&rsquo;s a conversation for your
                doctor.
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* Clav page pointer — relevant for every creator since it's the
          top-of-funnel content asset */}
      <section className="mx-auto w-full max-w-3xl px-6 py-20">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Want the long version first?
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Read our breakdown of Clav&rsquo;s framework.
          </h2>
          <p className="mt-3 font-serif text-[16px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            If you want to see how Cleanmaxxing thinks before you sign up,
            this is the piece to read. What holds up, what&rsquo;s partially
            right, what&rsquo;s wrong — in our voice.
          </p>
          <Link
            href="/is-clav-right"
            className="mt-5 inline-flex items-center text-sm font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
          >
            Read the full breakdown →
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto w-full max-w-3xl px-6 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-100">
            Start where you actually are.
          </h2>
          <p className="mt-5 mx-auto max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Fourteen days free. Ten seconds a day to check in. No credit card
            to start. Keep the parts that work, walk away if they don&rsquo;t.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href={signupHref}
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
          © Cleanmaxxing. 18+ only.
        </div>
      </footer>
    </main>
  );
}
