// Server-side web push helpers. Wraps the `web-push` library with
// our VAPID config and our subscription record shape. Sending is
// best-effort: a failed push (expired subscription, browser
// uninstalled, etc.) returns a sentinel so the cron can prune the
// row instead of retrying forever.
//
// VAPID keys live in env vars:
//   - NEXT_PUBLIC_VAPID_PUBLIC_KEY (also exposed to the client so
//     the subscribe flow can pass it to PushManager.subscribe)
//   - VAPID_PRIVATE_KEY (server-only)
//   - VAPID_SUBJECT (mailto: or https: URL identifying the sender;
//     required by the spec, e.g. mailto:noreply@cleanmaxxing.com)
//
// Generate a key pair once with:
//   npx web-push generate-vapid-keys
// Both endpoints + the cron gracefully no-op if these are missing,
// so dev environments without VAPID keys configured still build.

import webpush from 'web-push';

export type StoredSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  timezone: string;
  reminder_hour: number;
  last_reminder_at: string | null;
};

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  // Tag prevents stacking — a second daily-check-in nudge replaces
  // the first rather than queueing two pills in the OS notification
  // tray.
  tag?: string;
};

let vapidConfigured = false;

function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

export type SendResult =
  | { ok: true }
  // Endpoint is gone — caller should delete the row.
  | { ok: false; gone: true }
  // Other failure — caller should leave the row alone, the next
  // cron pass will retry.
  | { ok: false; gone: false; error: string };

export async function sendPush(
  sub: Pick<StoredSubscription, 'endpoint' | 'p256dh' | 'auth'>,
  payload: PushPayload,
): Promise<SendResult> {
  if (!ensureVapid()) {
    return { ok: false, gone: false, error: 'vapid_not_configured' };
  }
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
    );
    return { ok: true };
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    // 404/410: subscription expired, the browser/user unsubscribed.
    // The endpoint will never come back; safe to delete.
    if (status === 404 || status === 410) {
      return { ok: false, gone: true };
    }
    return {
      ok: false,
      gone: false,
      error: (err as Error).message ?? 'unknown',
    };
  }
}

// Compute the hour-of-day in a given IANA timezone for `now`.
// Used by the cron to decide which subscriptions are due. Falls
// back to the server's local hour on any timezone parse error
// rather than skipping the user — better to send a slightly
// off-time nudge than to drop them entirely.
export function localHourFor(timezone: string, now: Date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    }).formatToParts(now);
    const hour = parts.find((p) => p.type === 'hour')?.value;
    if (hour) {
      const n = Number(hour);
      // Intl returns "24" for midnight in some locales; normalize to 0.
      return Number.isFinite(n) ? n % 24 : now.getHours();
    }
  } catch {
    // Invalid timezone string — fall through.
  }
  return now.getHours();
}

// Same approach for day-of-week (0 = Sunday).
export function localDayOfWeekFor(
  timezone: string,
  now: Date = new Date(),
): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: timezone,
    }).formatToParts(now);
    const wk = parts.find((p) => p.type === 'weekday')?.value;
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    if (wk && map[wk] !== undefined) return map[wk];
  } catch {
    // Fall through.
  }
  return now.getDay();
}
