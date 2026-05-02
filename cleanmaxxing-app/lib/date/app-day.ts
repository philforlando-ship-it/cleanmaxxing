// App-day helpers. The product treats a calendar day as rolling
// over at 3am in the user's IANA timezone, not at midnight
// server-local. So 02:55 EST Tuesday is still the Monday app-day;
// 03:00 EST Tuesday flips to Tuesday. This matches how users feel
// "what day did I log this on" — a 1am check-in belongs to
// yesterday's effort, not tomorrow's blank slate.
//
// Algorithm (subtract-then-format): subtract DAY_ROLLOVER_HOUR
// hours from `now`, then format the shifted instant in the target
// timezone using 'en-CA' (which produces YYYY-MM-DD natively).
// Same Intl.DateTimeFormat pattern as lib/push/service.ts:99
// (localHourFor) — single style for tz-aware date math across
// the codebase.
//
// Isomorphic: imported from server components, route handlers,
// and 'use client' files alike. No Node-only APIs.

export const DAY_ROLLOVER_HOUR = 3;

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

function fallbackLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Return the YYYY-MM-DD app-day for `now` in `timezone`.
 * Falls back to server-local YYYY-MM-DD on invalid IANA strings,
 * matching the tolerant philosophy of localHourFor.
 */
export function appDayFor(timezone: string, now: Date = new Date()): string {
  const shifted = new Date(now.getTime() - DAY_ROLLOVER_HOUR * MS_PER_HOUR);
  try {
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: timezone,
    }).format(shifted);
  } catch {
    return fallbackLocalDate(shifted);
  }
}

/**
 * Return the YYYY-MM-DD app-day immediately before today's app-day.
 * Used by the sleep card for "last night."
 *
 * The 24-hour subtraction happens BEFORE the rollover shift inside
 * appDayFor. This ordering is what protects DST transitions: an
 * extra hour during fall-back doesn't push us into a third day.
 */
export function previousAppDayFor(
  timezone: string,
  now: Date = new Date(),
): string {
  return appDayFor(timezone, new Date(now.getTime() - MS_PER_DAY));
}

/**
 * Calendar-day distance (signed) between two YYYY-MM-DD app-day
 * strings. Both are parsed as midnight UTC so the subtraction is
 * exact and independent of any timezone — which is the point: the
 * caller has already committed to "what app-day" each side is.
 *
 *   daysBetweenAppDays('2026-04-30', '2026-05-02') === 2
 *   daysBetweenAppDays('2026-05-02', '2026-04-30') === -2
 */
export function daysBetweenAppDays(from: string, to: string): number {
  const a = Date.UTC(
    Number(from.slice(0, 4)),
    Number(from.slice(5, 7)) - 1,
    Number(from.slice(8, 10)),
  );
  const b = Date.UTC(
    Number(to.slice(0, 4)),
    Number(to.slice(5, 7)) - 1,
    Number(to.slice(8, 10)),
  );
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * Add `days` to a YYYY-MM-DD app-day string and return the result.
 * Useful for computing rolling windows ("six days before today's
 * app-day"). Operates on the UTC midnight interpretation so the
 * arithmetic is timezone-agnostic.
 */
export function addDaysToAppDay(day: string, days: number): string {
  const ms = Date.UTC(
    Number(day.slice(0, 4)),
    Number(day.slice(5, 7)) - 1,
    Number(day.slice(8, 10)),
  );
  const next = new Date(ms + days * MS_PER_DAY);
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, '0');
  const d = String(next.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
