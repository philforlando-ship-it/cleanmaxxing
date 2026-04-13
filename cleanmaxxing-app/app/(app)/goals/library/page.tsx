import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LibraryBrowser } from './library-browser';

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Goal library</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Add any of these to your active goals.
          </p>
        </div>
        <a
          href="/goals"
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Back to Goals
        </a>
      </div>
      <LibraryBrowser />
    </main>
  );
}
