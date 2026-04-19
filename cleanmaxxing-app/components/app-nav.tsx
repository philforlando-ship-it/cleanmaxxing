'use client';

// Persistent top nav for the (app) group. Client component because it
// reads the current pathname for active-route highlighting and hides
// itself on onboarding routes (which should stay a focused, single-task
// flow without dashboard chrome).

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Props = {
  userEmail: string;
};

const LINKS: Array<{ href: string; label: string; matchPrefix: string }> = [
  { href: '/today', label: 'Today', matchPrefix: '/today' },
  { href: '/goals', label: 'Goals', matchPrefix: '/goals' },
  { href: '/goals/library', label: 'Library', matchPrefix: '/goals/library' },
  { href: '/povs', label: 'POVs', matchPrefix: '/povs' },
  { href: '/settings', label: 'Settings', matchPrefix: '/settings' },
];

// isActive uses matchPrefix (not exact match) so /goals/[id] still
// highlights "Goals". Library is listed after Goals and matches first
// via a more specific prefix, so /goals/library highlights Library
// rather than both — see the ordering logic below.
function resolveActive(pathname: string): string | null {
  // Longest matchPrefix wins, so /goals/library takes precedence over /goals.
  const sorted = [...LINKS].sort(
    (a, b) => b.matchPrefix.length - a.matchPrefix.length,
  );
  for (const link of sorted) {
    if (pathname === link.matchPrefix || pathname.startsWith(`${link.matchPrefix}/`)) {
      return link.matchPrefix;
    }
  }
  return null;
}

export function AppNav({ userEmail }: Props) {
  const pathname = usePathname() ?? '';

  // Hide the nav on onboarding flows and the POV reader. Those are
  // focused surfaces where the dashboard chrome would be a distraction
  // rather than a help. /povs/[slug] has its own back link to /today.
  if (pathname.startsWith('/onboarding')) return null;
  if (pathname.startsWith('/povs/')) return null;

  const active = resolveActive(pathname);

  return (
    <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-1 overflow-x-auto">
          <Link
            href="/today"
            className="mr-3 shrink-0 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
          >
            Cleanmaxxing
          </Link>
          {LINKS.map((link) => {
            const isActive = active === link.matchPrefix;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 rounded-md px-2.5 py-1 text-xs transition ${
                  isActive
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className="hidden max-w-[12rem] truncate text-xs text-zinc-500 sm:inline"
            title={userEmail}
          >
            {userEmail}
          </span>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
