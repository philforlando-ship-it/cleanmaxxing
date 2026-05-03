'use client';

// Connect / disconnect card for the Vital-aggregated Apple Health
// integration. Server passes in the current connection state and
// whether Vital env vars are wired on the server; the card decides
// what to render and handles the click flows.
//
// Connect flow: POST /api/health/connect → server returns a Vital
// link URL → we redirect the user there (new tab). Vital handles
// Apple Health authorization and lands the user back on /settings.
// Webhooks then fill in sleep + activity over time.
//
// Disconnect flow: two-step confirm → POST /api/health/disconnect
// → router.refresh() so the card re-renders disconnected.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  connected: boolean;
  provider: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  vitalConfigured: boolean;
};

function timeAgo(iso: string | null): string {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const days = Math.floor(hr / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function HealthIntegrationCard({
  connected,
  provider,
  connectedAt,
  lastSyncedAt,
  vitalConfigured,
}: Props) {
  const router = useRouter();
  const [connecting, startConnect] = useTransition();
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [disconnecting, startDisconnect] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onConnect() {
    setError(null);
    startConnect(async () => {
      try {
        const res = await fetch('/api/health/connect', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ provider: 'apple_health' }),
        });
        const body = (await res.json()) as
          | { linkWebUrl?: string; error?: string; message?: string };
        if (!res.ok || !body.linkWebUrl) {
          setError(body.message ?? body.error ?? 'Could not start the connect flow.');
          return;
        }
        // Redirect the current tab — keeps the auth context simple.
        window.location.href = body.linkWebUrl;
      } catch {
        setError('Network error. Try again in a moment.');
      }
    });
  }

  function onDisconnect() {
    setError(null);
    startDisconnect(async () => {
      try {
        const res = await fetch('/api/health/disconnect', { method: 'POST' });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
          };
          setError(body.message ?? body.error ?? 'Disconnect failed.');
          return;
        }
        setConfirmingDisconnect(false);
        router.refresh();
      } catch {
        setError('Network error. Try again in a moment.');
      }
    });
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium">Apple Health</h2>
        <span className="text-xs uppercase tracking-wider text-zinc-500">
          {connected ? 'Connected' : 'Not connected'}
        </span>
      </div>

      {!connected && (
        <>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Auto-fills your nightly sleep log and adds passive daily-step
            tracking. Goes through Apple Health on your iPhone — no extra
            app to install on Cleanmaxxing&rsquo;s side.
          </p>
          {!vitalConfigured ? (
            <p className="mt-3 text-xs text-zinc-500">
              Apple Health sync is not yet enabled on this server. Once
              configured, the Connect button will appear here.
            </p>
          ) : (
            <button
              type="button"
              onClick={onConnect}
              disabled={connecting}
              className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {connecting ? 'Starting…' : 'Connect Apple Health'}
            </button>
          )}
        </>
      )}

      {connected && (
        <>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {provider === 'apple_health' ? 'Apple Health' : provider}
            {connectedAt && (
              <> connected {timeAgo(connectedAt)}.</>
            )}{' '}
            Last synced {timeAgo(lastSyncedAt)}.
          </p>
          {!confirmingDisconnect ? (
            <button
              type="button"
              onClick={() => setConfirmingDisconnect(true)}
              className="mt-4 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Disconnect
            </button>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
              <span className="text-zinc-700 dark:text-zinc-300">
                Sure? Existing logs stay; new data stops syncing.
              </span>
              <button
                type="button"
                onClick={onDisconnect}
                disabled={disconnecting}
                className="rounded-md bg-zinc-900 px-2.5 py-1 font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {disconnecting ? 'Disconnecting…' : 'Yes, disconnect'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDisconnect(false)}
                disabled={disconnecting}
                className="text-zinc-500 underline dark:text-zinc-400"
              >
                Cancel
              </button>
            </div>
          )}
        </>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
