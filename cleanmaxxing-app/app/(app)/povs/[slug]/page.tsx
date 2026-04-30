// POV reader page. Renders the full POV markdown for a given slug.
// Auth-gated (lives under the (app) group). Shows a small header linking
// the POV to any of the user's active goals that source from it.

import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { createClient } from '@/lib/supabase/server';
import { povFor } from '@/lib/content/pov';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PovPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const pov = await povFor(slug);
  if (!pov) notFound();

  // Surface any of the user's active goals that trace back to this POV, so
  // the reader knows "this is the backing doc for the X goal I'm running."
  const { data: connectedGoalsRaw } = await supabase
    .from('goals')
    .select('id, title')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .eq('source_slug', slug);
  const connectedGoals = connectedGoalsRaw ?? [];

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/today"
        className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Back to Today
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {pov.title}
        </h1>
        {connectedGoals.length > 0 && (
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            Backing doc for your active{' '}
            {connectedGoals.length === 1 ? 'goal' : 'goals'}:{' '}
            {connectedGoals.map((g, i) => (
              <span key={g.id}>
                <span className="text-zinc-700 dark:text-zinc-300">{g.title}</span>
                {i < connectedGoals.length - 1 && ', '}
              </span>
            ))}
          </p>
        )}
      </header>

      <article className="mt-8">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="mt-12 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="mt-10 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="mt-8 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="mt-4 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                {children}
              </p>
            ),
            strong: ({ children }) => (
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                {children}
              </strong>
            ),
            em: ({ children }) => (
              <em className="italic text-zinc-700 dark:text-zinc-300">{children}</em>
            ),
            ul: ({ children }) => (
              <ul className="mt-4 ml-5 list-disc space-y-1.5 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="mt-4 ml-5 list-decimal space-y-1.5 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                {children}
              </ol>
            ),
            li: ({ children }) => <li className="pl-1">{children}</li>,
            hr: () => <hr className="my-10 border-zinc-200 dark:border-zinc-800" />,
            blockquote: ({ children }) => (
              <blockquote className="mt-5 border-l-2 border-zinc-300 pl-4 text-zinc-700 italic dark:border-zinc-700 dark:text-zinc-300">
                {children}
              </blockquote>
            ),
            // GFM tables. Wrap in an overflow container so wide
            // comparison tables don't blow out narrow screens.
            table: ({ children }) => (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="border-b-2 border-zinc-300 dark:border-zinc-700">
                {children}
              </thead>
            ),
            tbody: ({ children }) => (
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {children}
              </tbody>
            ),
            tr: ({ children }) => <tr>{children}</tr>,
            th: ({ children }) => (
              <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-3 py-3 align-top text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200">
                {children}
              </td>
            ),
          }}
        >
          {pov.body}
        </ReactMarkdown>
      </article>

      <footer className="mt-16 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <Link
          href="/today"
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          ← Back to Today
        </Link>
      </footer>
    </main>
  );
}
