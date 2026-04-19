// Root-level not-found. Catches bad URLs for unauthenticated visitors
// (authenticated users hit the (app) group's not-found.tsx instead,
// which keeps them inside the app chrome).

import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Nothing here</h1>
      <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        That page doesn&rsquo;t exist. It may have been renamed, removed, or
        never existed in the first place.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Home
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
