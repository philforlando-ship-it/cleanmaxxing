import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { listPovSlugs } from '@/lib/content/pov';
import { LibraryBrowser } from './library-browser';

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const availableSlugs = listPovSlugs();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Goal library</h1>
        </div>
        <a
          href="/goals"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Back to Goals
        </a>
      </div>
      <p className="mt-3 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
        Build from the bottom up. Foundation first, then high impact, then
        refinement. Polish is last &mdash; easy to over-invest in before the
        real work is done. Tap any tier label to see what it means.
      </p>
      <LibraryBrowser availableSlugs={availableSlugs} />
    </main>
  );
}
