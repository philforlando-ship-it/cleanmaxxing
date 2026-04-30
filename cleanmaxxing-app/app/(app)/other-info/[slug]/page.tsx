// In-app variants of the four marketing articles. Same content as the
// public /two-layers, /tom-brady-face, /is-clav-right, /mister-p
// routes, but rendered inside the (app) layout so the AppNav stays
// visible. CTAs are stripped — the reader is already a logged-in user.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type ArticleEntry = {
  file: string;
  stripHtmlComments?: boolean;
};

const ARTICLES: Record<string, ArticleEntry> = {
  'two-layers': { file: 'two-layers.md' },
  'tom-brady-face': { file: 'tom-brady-face.md' },
  'is-clav-right': { file: 'is-clav-right.md' },
  // Mister P background carries unpublished authoring notes inside HTML
  // comments — strip them before render, matching the public /mister-p
  // page.
  'mister-p': { file: 'mister-p-background.md', stripHtmlComments: true },
};

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function OtherInfoArticlePage({ params }: Props) {
  const { slug } = await params;
  const entry = ARTICLES[slug];
  if (!entry) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const filePath = path.join(
    process.cwd(),
    'content',
    'marketing',
    entry.file,
  );
  const raw = await readFile(filePath, 'utf8');
  const content = entry.stripHtmlComments
    ? raw.replace(/<!--[\s\S]*?-->/g, '').trim()
    : raw;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/other-info"
        className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Other Info
      </Link>

      <article className="mt-6">
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
          {content}
        </ReactMarkdown>
      </article>
    </main>
  );
}
