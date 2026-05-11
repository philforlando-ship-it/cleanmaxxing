// /admin/access — Pro access grants admin UI.
//
// Auth: ADMIN_EMAILS env allowlist (same gate as /admin/cost). Non-
// admins hit notFound() so the route doesn't even acknowledge it
// exists; unauthed redirects to /login.
//
// What it does:
//   1. Grant Pro to a user by email or UUID, without charging them
//      (bypasses Stripe — sets subscription_status='active' and
//      records audit fields on public.users).
//   2. Revoke Pro for a user (sets status='canceled', records who and
//      when).
//   3. Shows the 25 most recent grants for visibility.

import { notFound, redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin/is-admin';
import { listRecentGrants } from '@/lib/admin/grant-pro';
import { GrantForm } from './grant-form';

export default async function AdminAccessPage() {
  const user = await getUser();
  if (!user) redirect('/login');
  if (!isAdmin(user.email)) notFound();

  const recent = await listRecentGrants();

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Pro access</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Grant Pro access to a user without changing their pricing.
          Bypasses Stripe — sets <code className="text-xs">subscription_status=&apos;active&apos;</code>{' '}
          and records who granted it, when, and why.
        </p>
      </header>

      <section className="mt-8">
        <GrantForm />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Recent grants</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Last 25, most recent first. A row with{' '}
          <code className="text-xs">revoked_at</code> set is no longer
          granted.
        </p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">User</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Granted</th>
                <th className="px-4 py-2">By</th>
                <th className="px-4 py-2">Reason</th>
                <th className="px-4 py-2">Revoked</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-3 text-zinc-500 dark:text-zinc-400"
                    colSpan={6}
                  >
                    No grants yet.
                  </td>
                </tr>
              )}
              {recent.map((row) => (
                <tr
                  key={row.userId}
                  className="border-t border-zinc-200 dark:border-zinc-800"
                >
                  <td className="px-4 py-2">
                    <span className="block">
                      {row.email ?? (
                        <span className="text-zinc-500">(no email)</span>
                      )}
                    </span>
                    <span className="block font-mono text-[10px] text-zinc-400">
                      {row.userId}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge
                      status={row.subscriptionStatus}
                      revoked={row.revokedAt !== null}
                    />
                  </td>
                  <td className="px-4 py-2 text-xs tabular-nums">
                    {formatTimestamp(row.grantedAt)}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {row.grantedByEmail ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {row.grantReason ?? (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs tabular-nums">
                    {row.revokedAt ? (
                      <>
                        <span className="block">
                          {formatTimestamp(row.revokedAt)}
                        </span>
                        <span className="block text-zinc-500">
                          by {row.revokedByEmail ?? '—'}
                        </span>
                      </>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function StatusBadge({
  status,
  revoked,
}: {
  status: string | null;
  revoked: boolean;
}) {
  const label = revoked
    ? 'revoked'
    : status === 'active'
      ? 'pro'
      : (status ?? 'unknown');
  const className = revoked
    ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
    : status === 'active'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${className}`}
    >
      {label}
    </span>
  );
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
