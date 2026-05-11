'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

type Props = {
  isPremium: boolean;
  children: ReactNode;
  // One short sentence shown above the upgrade button when the user is
  // not premium. Defaults to a generic message; pass a feature-specific
  // line for better context (e.g. "AI photo reads are part of Premium.").
  cta?: string;
  // Where the upgrade button links. Defaults to /settings/billing.
  upgradeHref?: string;
};

/**
 * Wraps a piece of premium-only UI. Renders `children` when `isPremium`
 * is true, otherwise renders an inline upgrade card.
 *
 * The premium check itself is server-side — call `getPremiumStatus()`
 * from `@/lib/billing/is-premium` in a Server Component (or route) and
 * pass the boolean down as a prop. Client components must not read the
 * status directly.
 */
export function PremiumGate({
  isPremium,
  children,
  cta = 'This feature is part of Cleanmaxxing Pro.',
  upgradeHref = '/settings/billing',
}: Props) {
  if (isPremium) return <>{children}</>;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-700 dark:text-zinc-300">{cta}</p>
      <Link
        href={upgradeHref}
        className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        Upgrade to Pro
      </Link>
    </div>
  );
}
