'use client';

// Persistent top nav for the (app) group. Client component because it
// reads the current pathname for active-route highlighting and hides
// itself on onboarding routes (which should stay a focused, single-task
// flow without dashboard chrome).

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { CleanmaxxingWordmark } from '@/components/cm-logo';
import { MisterPLauncher } from '@/components/mister-p-launcher';
import type { ChatMessage } from '@/app/(app)/today/mister-p-chat-card';

type Props = {
  userEmail: string;
  // Server-resolved admin flag (lib/admin/is-admin.ts uses
  // ADMIN_EMAILS env var — server-only). Layout computes once and
  // passes through so the nav can show /admin/cost without leaking
  // the allowlist to the client bundle.
  isAdmin?: boolean;
  // Server-hydrated general Mister P thread. Passed through to the
  // ambient launcher so opening the modal from anywhere shows
  // recent history without a client fetch.
  initialGeneralThread: ChatMessage[];
};

const LINKS: Array<{ href: string; label: string; matchPrefix: string }> = [
  { href: '/today', label: 'Today', matchPrefix: '/today' },
  // /reflection consolidates Pattern C surfaces (weekly letter,
  // weekly reflection, monthly checkpoint, quarterly survey, the
  // Coming-up cadence strip, self-acceptance nudges).
  // /log retired in Slice 3 of the daily-check-in reframe
  // (2026-05-11) — sleep / workout / nutrition logging moved
  // inline on /today behind the DailyBasicsSection disclosure.
  { href: '/reflection', label: 'Reflection', matchPrefix: '/reflection' },
  { href: '/photos', label: 'Photos', matchPrefix: '/photos' },
  { href: '/profile', label: 'Profile', matchPrefix: '/profile' },
  { href: '/system', label: 'The System', matchPrefix: '/system' },
  { href: '/settings', label: 'Settings', matchPrefix: '/settings' },
  // /goals + /goals/library + /povs + /other-info nav links retired
  // through May 2026 — the journey-first model replaced the goals-
  // picker era. The /goals routes themselves were deleted 2026-05-10
  // (Sub-ship A) after the legacy-user wipe. POV docs and Articles
  // still resolve at their old URLs; they just no longer appear in
  // chrome.
];

const ADMIN_LINKS: Array<{ href: string; label: string; matchPrefix: string }> = [
  { href: '/admin/cost', label: 'Cost', matchPrefix: '/admin/cost' },
];

// isActive uses matchPrefix (not exact match) so e.g. /plan/hair/photos
// still highlights "Today" (or its parent surface) via the longest-
// matching prefix. Kept as a generic ordering helper since several
// surfaces resolve to the same chrome.
function resolveActive(
  pathname: string,
  links: ReadonlyArray<{ matchPrefix: string }>,
): string | null {
  // Longest matchPrefix wins so a nested route picks the most specific
  // entry from the catalog.
  const sorted = [...links].sort(
    (a, b) => b.matchPrefix.length - a.matchPrefix.length,
  );
  for (const link of sorted) {
    if (pathname === link.matchPrefix || pathname.startsWith(`${link.matchPrefix}/`)) {
      return link.matchPrefix;
    }
  }
  return null;
}

export function AppNav({
  userEmail,
  isAdmin = false,
  initialGeneralThread,
}: Props) {
  const pathname = usePathname() ?? '';

  // Hide the nav on onboarding flows and the POV reader. Those are
  // focused surfaces where the dashboard chrome would be a distraction
  // rather than a help. /povs/[slug] has its own back link to /today.
  if (pathname.startsWith('/onboarding')) return null;
  if (pathname.startsWith('/povs/')) return null;

  const visibleLinks = isAdmin ? [...LINKS, ...ADMIN_LINKS] : LINKS;
  const active = resolveActive(pathname, visibleLinks);

  return (
    <nav className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-1 overflow-x-auto">
          <Link
            href="/today"
            aria-label="Cleanmaxxing"
            className="mr-3 inline-flex shrink-0 items-center"
          >
            <CleanmaxxingWordmark size="sm" />
          </Link>
          {visibleLinks.map((link) => {
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
          <MisterPLauncher initialGeneralThread={initialGeneralThread} />
          <span
            className="hidden max-w-[12rem] truncate text-xs text-zinc-500 sm:inline"
            title={userEmail}
          >
            {userEmail}
          </span>
          <ThemeToggle />
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
