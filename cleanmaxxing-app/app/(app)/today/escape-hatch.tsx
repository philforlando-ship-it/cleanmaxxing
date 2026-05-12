// Area 4 of the /today redesign — the escape hatch.
//
// Subtle text links at the bottom of /today for users who want to do
// something other than the day's primary action. Intentionally quiet:
// no buttons, no CTAs, no prominent styling. The primary action up
// top should compete for attention; this exists, but does not
// promote.
//
// Original design constraint was "exactly two options, no more"
// (anything more re-opens the dashboard problem the redesign is
// built to fix). The "Log the basics" link added 2026-05-10 was
// removed in Slice 3 of the daily-check-in reframe (2026-05-11)
// once /log retired and the log cards moved inline — the gap that
// the third link closed no longer exists. Back to the two-link cap.
//
// "Browse journeys" used to point at /goals/library — repointed to
// /system on May 8 once the journey-first model retired the goals-
// picker era. /system surfaces every journey alongside the
// Cleanmaxxing framework, which is the closer fit to "show me what
// I haven't picked up yet."
//
// "Ask Mister P" used to point at /mister-p (the marketing/about
// page) — confused users who expected to land in the chat. Repointed
// to /chat on 2026-05-11 when that focused chat surface shipped.

import Link from 'next/link';

export function EscapeHatch() {
  return (
    <nav className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
      <Link
        href="/system"
        className="underline decoration-dotted underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        Browse the system
      </Link>
      <Link
        href="/chat"
        className="underline decoration-dotted underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        Ask Mister P
      </Link>
    </nav>
  );
}
