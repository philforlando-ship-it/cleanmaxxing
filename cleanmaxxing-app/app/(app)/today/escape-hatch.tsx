// Area 4 of the /today redesign — the escape hatch.
//
// Two subtle text links at the bottom of /today for users who want
// to do something other than the day's primary action. Intentionally
// quiet: no buttons, no CTAs, no prominent styling. The primary
// action up top should compete for attention; this exists, but does
// not promote.
//
// Per the design constraint: exactly two options, no more. Adding a
// third (Settings, Library, etc.) re-opens the dashboard problem
// the redesign is built to fix.
//
// "Browse journeys" used to point at /goals/library — repointed to
// /system on May 8 once the journey-first model retired the goals-
// picker era. /system surfaces every journey alongside the
// Cleanmaxxing framework, which is the closer fit to "show me what
// I haven't picked up yet."

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
        href="/mister-p"
        className="underline decoration-dotted underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        Ask Mister P
      </Link>
    </nav>
  );
}
