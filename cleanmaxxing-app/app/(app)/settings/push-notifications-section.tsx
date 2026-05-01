'use client';

// Push-notification toggle on /settings. Permission is requested
// only when the user clicks "Get reminders" — never on page load.
// A denied permission is permanently denied for that browser, so
// the ask has to be deliberate.
//
// Subscribes via PushManager + posts the subscription to
// /api/push/subscribe (which upserts on user_id + endpoint).
// Unsubscribing revokes both client-side (the PushSubscription)
// and server-side (deletes the row).

import { useEffect, useState } from 'react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

type Status = 'unsupported' | 'denied' | 'subscribed' | 'idle' | 'loading';

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const padded = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function PushNotificationsSection() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      setStatus('unsupported');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    // Reflect existing subscription state.
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStatus(sub ? 'subscribed' : 'idle'))
      .catch(() => setStatus('idle'));
  }, []);

  async function enable() {
    if (!VAPID_PUBLIC_KEY) {
      setError(
        'Push isn’t configured for this environment. Try again later.',
      );
      return;
    }
    setError(null);
    setStatus('loading');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'idle');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // The TS lib types use a stricter ArrayBuffer than the
          // runtime accepts; the cast lines up with what the
          // browser actually expects (a BufferSource).
          applicationServerKey: urlBase64ToUint8Array(
            VAPID_PUBLIC_KEY,
          ) as unknown as BufferSource,
        }));

      const json = sub.toJSON();
      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          timezone,
        }),
      });
      if (!res.ok) {
        throw new Error(`Subscribe failed (${res.status})`);
      }
      setStatus('subscribed');
    } catch (err) {
      setError((err as Error).message);
      setStatus('idle');
    }
  }

  async function disable() {
    setError(null);
    setStatus('loading');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      }
      setStatus('idle');
    } catch (err) {
      setError((err as Error).message);
      setStatus('subscribed');
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">
        Reminders
      </h2>
      <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
        One push at 8 PM your local time for the daily check-in, and one
        Sunday morning for the weekly reflection. Nothing else, no streak
        nags, no marketing.
      </p>

      <div className="mt-4">
        {status === 'unsupported' && (
          <p className="text-sm text-zinc-500">
            This browser doesn&rsquo;t support web push. On iPhone, install
            Cleanmaxxing to your home screen first &mdash; iOS only allows
            push for installed PWAs.
          </p>
        )}

        {status === 'denied' && (
          <p className="text-sm text-zinc-500">
            Notifications are blocked for this site in your browser
            settings. Re-enable them there if you change your mind.
          </p>
        )}

        {(status === 'idle' || status === 'loading') && (
          <button
            type="button"
            onClick={enable}
            disabled={status === 'loading'}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {status === 'loading' ? 'Working…' : 'Get reminders'}
          </button>
        )}

        {status === 'subscribed' && (
          <button
            type="button"
            onClick={disable}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Turn off reminders
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </section>
  );
}
