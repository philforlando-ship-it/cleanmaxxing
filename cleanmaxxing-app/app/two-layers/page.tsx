import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Appearance Is Two Things at Once \u2014 Cleanmaxxing',
  description:
    'Why most men over 30 hit a wall doing pure-visual appearance work. The two layers of captivation \u2014 the visual, and what the visual reveals about a man\u2019s discipline applied over decades. The second layer is the one that compounds with age.',
  openGraph: {
    title: 'Appearance Is Two Things at Once. Most Men Optimize for One.',
    description:
      'The two layers of captivation \u2014 the visual, and what it reveals about how a man has lived. The second layer is the one that compounds with age.',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Appearance Is Two Things at Once. Most Men Optimize for One.',
    description:
      'The two layers of captivation, by Cleanmaxxing.',
  },
};

async function loadArticle(): Promise<string> {
  const filePath = path.join(
    process.cwd(),
    'content',
    'marketing',
    'two-layers.md',
  );
  return readFile(filePath, 'utf8');
}

export default async function TwoLayersPage() {
  const markdown = await loadArticle();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 md:py-24">
      <Link
        href="/"
        className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        &larr; Cleanmaxxing
      </Link>

      <article className="mt-8">
        <ReactMarkdown
          components={{
            h1: ({ children }) => (
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-100">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="mt-16 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="mt-10 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="mt-5 font-serif text-[17px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                {children}
              </p>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                {children}
              </strong>
            ),
            em: ({ children }) => (
              <em className="italic text-zinc-700 dark:text-zinc-300">
                {children}
              </em>
            ),
          }}
        >
          {markdown}
        </ReactMarkdown>
      </article>

      <section className="mt-20 rounded-2xl border border-zinc-200 bg-zinc-50 p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          The product built around the second layer.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          Cleanmaxxing is built for the man who wants both layers and is
          willing to do the work that compounds. A guided plan built from a
          100&ndash;200k+ word corpus. A direct chat assistant that knows your
          goals, your check-in history, and your reflection notes. No
          single-event hacks; no quick-fix marketing. Process over outcome,
          because that&rsquo;s how the second layer actually gets built.
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
