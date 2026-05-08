// /admin/cost — variable-cost dashboard.
//
// Auth: ADMIN_EMAILS env var allowlist (lib/admin/is-admin.ts). Non-
// admin authed users hit notFound() so the route doesn't even
// acknowledge it exists; unauthed redirects to /login.
//
// Data: cost_events table read via the service client (RLS denies
// authenticated reads otherwise). All math runs server-side; the
// page is a server component with no client state beyond the window
// toggle (Link-driven, no JS needed).
//
// What it shows:
//   1. Window selector (7 / 30 / 90 days), default 30
//   2. Totals: total events, total spend, distinct users
//   3. Spend by feature (which surfaces are expensive)
//   4. Spend by kind (which model / API is the cost driver)

import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin/is-admin';
import {
  formatCents,
  getCostByFeature,
  getCostByKind,
  getCostTotals,
  type CostWindow,
} from '@/lib/cost-events/summary';

const DEFAULT_WINDOW: CostWindow = 30;
const VALID_WINDOWS: CostWindow[] = [7, 30, 90];

type Props = {
  searchParams: Promise<{ window?: string }>;
};

export default async function CostDashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const requested = Number(params.window);
  const windowDays: CostWindow = (VALID_WINDOWS as number[]).includes(requested)
    ? (requested as CostWindow)
    : DEFAULT_WINDOW;

  const user = await getUser();
  if (!user) redirect('/login');
  if (!isAdmin(user.email)) notFound();

  const [totals, byFeature, byKind] = await Promise.all([
    getCostTotals(windowDays),
    getCostByFeature(windowDays),
    getCostByKind(windowDays),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Variable-cost dashboard
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Telemetry from <code className="text-xs">cost_events</code>.
            Estimates are snapshotted at log time using the rate table
            in <code className="text-xs">lib/cost-events/log.ts</code>.
          </p>
        </div>
        <WindowToggle current={windowDays} />
      </header>

      <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total spend" value={formatCents(totals.cents)} />
        <Stat label="Events" value={totals.events.toLocaleString()} />
        <Stat
          label="Distinct users"
          value={totals.distinct_users.toLocaleString()}
        />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">By feature</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Where is the spend going? <code className="text-xs">feature</code> is
          the optional context label passed when the event is logged
          (e.g. <code className="text-xs">hair_report</code>,{' '}
          <code className="text-xs">meal_plan_gen</code>).
        </p>
        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Feature</th>
                <th className="px-4 py-2">Events</th>
                <th className="px-4 py-2">Spend</th>
                <th className="px-4 py-2">Avg per event</th>
              </tr>
            </thead>
            <tbody>
              {byFeature.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-3 text-zinc-500 dark:text-zinc-400"
                    colSpan={4}
                  >
                    No events in this window.
                  </td>
                </tr>
              )}
              {byFeature.map((row) => (
                <tr
                  key={row.feature}
                  className="border-t border-zinc-200 dark:border-zinc-800"
                >
                  <td className="px-4 py-2 font-mono text-xs">{row.feature}</td>
                  <td className="px-4 py-2 tabular-nums">
                    {row.events.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 tabular-nums">
                    {formatCents(row.cents)}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-zinc-500">
                    {formatCents(Math.round(row.cents / row.events))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-medium">By kind</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Which model / API is driving spend. Token counts are summed
          across the window.
        </p>
        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-2">Kind</th>
                <th className="px-4 py-2">Events</th>
                <th className="px-4 py-2">Spend</th>
                <th className="px-4 py-2">Tokens in</th>
                <th className="px-4 py-2">Tokens out</th>
                <th className="px-4 py-2">Units</th>
              </tr>
            </thead>
            <tbody>
              {byKind.length === 0 && (
                <tr>
                  <td
                    className="px-4 py-3 text-zinc-500 dark:text-zinc-400"
                    colSpan={6}
                  >
                    No events in this window.
                  </td>
                </tr>
              )}
              {byKind.map((row) => (
                <tr
                  key={row.kind}
                  className="border-t border-zinc-200 dark:border-zinc-800"
                >
                  <td className="px-4 py-2 font-mono text-xs">{row.kind}</td>
                  <td className="px-4 py-2 tabular-nums">
                    {row.events.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 tabular-nums">
                    {formatCents(row.cents)}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-zinc-500">
                    {row.tokens_input.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-zinc-500">
                    {row.tokens_output.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-zinc-500">
                    {row.units.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-10 text-[11px] text-zinc-400 dark:text-zinc-500">
        Telemetry is best-effort and non-fatal — a failed write is
        swallowed silently to keep the user-facing path safe. The dashboard
        therefore lower-bounds actual spend.
      </p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function WindowToggle({ current }: { current: CostWindow }) {
  return (
    <nav className="flex gap-1 rounded-lg border border-zinc-200 p-1 text-xs dark:border-zinc-800">
      {VALID_WINDOWS.map((w) => {
        const active = w === current;
        return (
          <Link
            key={w}
            href={`/admin/cost?window=${w}`}
            className={
              active
                ? 'rounded bg-zinc-900 px-3 py-1 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'rounded px-3 py-1 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }
          >
            {w}d
          </Link>
        );
      })}
    </nav>
  );
}
