'use client';

// Connect / disconnect card for MyFitnessPal credential storage.
//
// Unlike the wearable card (which redirects to Junction's hosted
// OAuth flow), this card collects credentials directly. MFP has no
// public OAuth, so the trade-off is: we hold a password, the user
// gets nutrition sync. Slice 1 only stores the ciphertext — the
// actual scrape happens in Slice 2, so Last synced never updates
// yet. The card still surfaces connection state cleanly.
//
// Auth-failed state (set by Slice 2's sync job when MFP returns 401)
// renders the same form as not-connected with a small "Login failed
// — re-enter credentials" hint above it. Re-submit upserts and
// flips status back to 'active'.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Props = {
  connected: boolean;
  username: string | null;
  status: 'active' | 'auth_failed' | 'disabled' | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
  mfpConfigured: boolean;
  isPremium: boolean;
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

export function MfpIntegrationCard({
  connected,
  username,
  status,
  connectedAt,
  lastSyncedAt,
  mfpConfigured,
  isPremium,
}: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [mfpUsername, setMfpUsername] = useState('');
  const [mfpPassword, setMfpPassword] = useState('');
  const [submitting, startSubmit] = useTransition();
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [disconnecting, startDisconnect] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const authFailed = connected && status === 'auth_failed';

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startSubmit(async () => {
      try {
        const res = await fetch('/api/mfp/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mfp_username: mfpUsername,
            mfp_password: mfpPassword,
          }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        if (!res.ok) {
          setError(body.message ?? body.error ?? 'Could not save credentials.');
          return;
        }
        setMfpUsername('');
        setMfpPassword('');
        setShowForm(false);
        router.refresh();
      } catch {
        setError('Network error. Try again in a moment.');
      }
    });
  }

  function onDisconnect() {
    setError(null);
    startDisconnect(async () => {
      try {
        const res = await fetch('/api/mfp/disconnect', { method: 'POST' });
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

  const showConnectForm = (!connected || authFailed) && showForm && isPremium && mfpConfigured;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium">MyFitnessPal sync</h2>
        <span className="text-xs uppercase tracking-wider text-zinc-500">
          {connected ? (authFailed ? 'Re-auth needed' : 'Connected') : 'Not connected'}
        </span>
      </div>

      {!connected && (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Pull your daily calories and macros from MyFitnessPal into
          your nutrition plan automatically. Your password is encrypted
          before it touches the database; we only use it to sync your
          totals, and you can disconnect any time.
        </p>
      )}

      {connected && !authFailed && (
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Connected as <span className="font-medium">{username}</span>
          {connectedAt && <> {timeAgo(connectedAt)}.</>}{' '}
          Last synced {timeAgo(lastSyncedAt)}.
        </p>
      )}

      {authFailed && (
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
          Login to MyFitnessPal is failing for{' '}
          <span className="font-medium">{username}</span>. Re-enter your
          password to resume sync. (Did you recently change it?)
        </p>
      )}

      {!mfpConfigured && !connected && (
        <p className="mt-3 text-xs text-zinc-500">
          MyFitnessPal sync is not yet enabled on this server. Once
          configured, the Connect button will appear here.
        </p>
      )}

      {!connected && mfpConfigured && !isPremium && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            Pro
          </span>
          <Link
            href="/pricing"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Upgrade to sync MyFitnessPal &rarr;
          </Link>
        </div>
      )}

      {(!connected || authFailed) && mfpConfigured && isPremium && !showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {authFailed ? 'Re-enter credentials' : 'Connect MyFitnessPal'}
        </button>
      )}

      {showConnectForm && (
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <label className="block text-xs text-zinc-600 dark:text-zinc-400">
            MyFitnessPal email or username
            <input
              type="text"
              autoComplete="username"
              required
              value={mfpUsername}
              onChange={(e) => setMfpUsername(e.target.value)}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <label className="block text-xs text-zinc-600 dark:text-zinc-400">
            MyFitnessPal password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={mfpPassword}
              onChange={(e) => setMfpPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Stored encrypted (AES-256-GCM) on our server. Only used to
            pull your daily totals; never displayed back or shared.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {submitting ? 'Saving…' : 'Save credentials'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setMfpUsername('');
                setMfpPassword('');
                setError(null);
              }}
              disabled={submitting}
              className="text-xs text-zinc-500 underline dark:text-zinc-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {connected && !confirmingDisconnect && (
        <button
          type="button"
          onClick={() => setConfirmingDisconnect(true)}
          className="mt-4 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Disconnect
        </button>
      )}

      {connected && confirmingDisconnect && (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          <span className="text-zinc-700 dark:text-zinc-300">
            Sure? Credentials are deleted; sync stops immediately.
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

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
