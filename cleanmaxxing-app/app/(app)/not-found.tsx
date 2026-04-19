// Fallback for bad URLs or notFound() calls within the (app) group.
// Keeps the user inside the authenticated chrome — the app-nav layout
// still renders around this page, so they can navigate away without
// being kicked to a generic 404.

import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Nothing here</h1>
      <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        That page doesn&rsquo;t exist, or the thing you were looking for has been
        removed or renamed. No harm done.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/today"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Back to Today
        </Link>
        <Link
          href="/goals"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Goals
        </Link>
      </div>
    </main>
  );
}
