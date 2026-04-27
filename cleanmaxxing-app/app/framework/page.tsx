import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Cleanmaxxing Framework \u2014 Cleanmaxxing',
  description:
    'Five layers, base to apex. The order most men get wrong, and the one Cleanmaxxing is built around.',
  openGraph: {
    title: 'The Cleanmaxxing Framework',
    description:
      'Five layers, base to apex. The order most men get wrong.',
    type: 'article',
  },
};

type Layer = {
  n: number;
  name: string;
  blurb: string;
  // Width as percentage of the available pyramid container. Steps from
  // narrow at the apex to wide at the base.
  widthPct: number;
};

// Ordered apex \u2192 base so it renders top-down in the column. Layer 1 is
// the foundation; Layer 5 is what people actually experience when they
// meet you.
const LAYERS: Layer[] = [
  {
    n: 5,
    name: 'Perception & Identity',
    blurb: 'Presence, coherence, whether the look reads as real.',
    widthPct: 36,
  },
  {
    n: 4,
    name: 'Behavioral Aesthetics',
    blurb: 'Posture, movement, voice, eye contact, expression.',
    widthPct: 50,
  },
  {
    n: 3,
    name: 'Grooming & Refinement',
    blurb: 'Eyebrows, teeth, body hair, scent, micro-details.',
    widthPct: 65,
  },
  {
    n: 2,
    name: 'Structural Framing',
    blurb: 'Hair strategy, facial hair, style, color, tanning.',
    widthPct: 80,
  },
  {
    n: 1,
    name: 'Biological Foundation',
    blurb: 'Body composition, skin, hair, hormones, sleep, nutrition.',
    widthPct: 95,
  },
];

// Tone sequence light \u2192 dark and dark \u2192 light. Apex is muted, base is
// weighty \u2014 the visual weight tracks the conceptual weight.
const TONES: Array<{ bg: string; text: string; border: string }> = [
  // Apex (Layer 5)
  {
    bg: 'bg-zinc-100 dark:bg-zinc-900',
    text: 'text-zinc-900 dark:text-zinc-100',
    border: 'border-zinc-300 dark:border-zinc-700',
  },
  // Layer 4
  {
    bg: 'bg-zinc-300 dark:bg-zinc-700',
    text: 'text-zinc-900 dark:text-zinc-100',
    border: 'border-zinc-400 dark:border-zinc-600',
  },
  // Layer 3
  {
    bg: 'bg-zinc-500 dark:bg-zinc-500',
    text: 'text-white',
    border: 'border-zinc-500',
  },
  // Layer 2
  {
    bg: 'bg-zinc-700 dark:bg-zinc-300',
    text: 'text-white dark:text-zinc-900',
    border: 'border-zinc-700 dark:border-zinc-400',
  },
  // Base (Layer 1)
  {
    bg: 'bg-zinc-900 dark:bg-zinc-100',
    text: 'text-white dark:text-zinc-900',
    border: 'border-zinc-900 dark:border-zinc-200',
  },
];

export default function FrameworkPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <Link
        href="/"
        className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        &larr; Cleanmaxxing
      </Link>

      <header className="mt-8">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
          The Framework
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-100">
          Five layers, base to apex.
        </h1>
        <p className="mt-5 max-w-xl font-serif text-[17px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          Most men work on layer two or three and ignore the others. The
          system below is the order Cleanmaxxing is built around &mdash;
          foundation first, polish last, and never the other way around.
        </p>
      </header>

      <section className="mt-14 flex flex-col items-stretch">
        {LAYERS.map((layer, i) => {
          const tone = TONES[i];
          return (
            <div
              key={layer.n}
              className="mx-auto w-full"
              style={{ maxWidth: `${layer.widthPct}%` }}
            >
              <div
                className={`flex items-center gap-5 border ${tone.bg} ${tone.text} ${tone.border} px-6 py-5 sm:px-8 sm:py-6`}
              >
                <span className="shrink-0 font-mono text-xs tracking-widest opacity-70">
                  L{layer.n}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-semibold tracking-tight sm:text-lg">
                    {layer.name}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed opacity-90 sm:text-sm">
                    {layer.blurb}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-16 max-w-xl">
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Why ordering matters
        </h2>
        <p className="mt-4 font-serif text-[17px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          Polish on a weak foundation reads as polish on a weak foundation.
          A man with great hair, great clothes, and great grooming who is
          ten pounds overweight, sleep-deprived, and visibly anxious will
          underperform a leaner man with worse clothes. The base does most
          of the work; the apex makes the work land.
        </p>
        <p className="mt-5 font-serif text-[17px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          The mistake the looksmaxxing internet makes is starting at layer
          two and running upward. The mistake most self-improvement
          content makes is stopping at layer one. The whole stack is the
          point.
        </p>
      </section>

      <section className="mt-20 border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          The full breakdown is in the app.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          Each layer expands into specific variables, the order they
          should be addressed in, and how the priorities shift with age.
          Mister P answers questions against the same framework. The full
          POV doc and the rest of the corpus live inside Cleanmaxxing.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/signup"
            className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
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
      </section>

      <footer className="mt-16 text-center text-xs text-zinc-500">
        &copy; Cleanmaxxing
      </footer>
    </main>
  );
}
