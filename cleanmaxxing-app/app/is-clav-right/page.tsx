import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Is Clav Right? — Cleanmaxxing',
  description:
    'A critical, honest read of Clavicular\'s looksmaxxing framework. What holds up, what\'s partially right, and what\'s wrong — from Cleanmaxxing.',
  openGraph: {
    title: 'Is Clav Right? — Cleanmaxxing',
    description:
      'A critical, honest read of Clavicular\'s looksmaxxing framework. What holds up, what\'s partially right, and what\'s wrong.',
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Is Clav Right? — Cleanmaxxing',
    description:
      'A critical, honest read of Clavicular\'s looksmaxxing framework.',
  },
};

async function loadArticle(): Promise<string> {
  const filePath = path.join(
    process.cwd(),
    'content',
    'marketing',
    'is-clav-right.md'
  );
  return readFile(filePath, 'utf8');
}

export default async function IsClavRightPage() {
  const markdown = await loadArticle();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16 md:py-24">
      <Link
        href="/"
        className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Cleanmaxxing
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
          Cleanmaxxing is that framework.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          Structured, honest self-improvement for men who want to look and feel
          better — without the worst parts of looksmaxxing culture. A guided
          plan built from a 100–200k+ word corpus, with a direct chat
          assistant that won&rsquo;t sell you anything and won&rsquo;t pretend
          every problem has a product-shaped solution.
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
            Log in →
          </Link>
        </div>
      </section>

      <footer className="mt-16 text-center text-xs text-zinc-500">
        © Cleanmaxxing
      </footer>
    </main>
  );
}
