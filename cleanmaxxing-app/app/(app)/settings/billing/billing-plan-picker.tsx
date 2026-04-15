'use client';

import { useState } from 'react';
import { getRewardfulReferral } from '@/lib/rewardful';

type Plan = 'monthly' | 'annual';

export function BillingPlanPicker() {
  const [loading, setLoading] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(plan: Plan) {
    setError(null);
    setLoading(plan);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          plan,
          rewardful_referral: getRewardfulReferral(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.url) {
        throw new Error(body.error ?? `Checkout failed (${res.status})`);
      }
      window.location.href = body.url as string;
    } catch (err) {
      setError((err as Error).message);
      setLoading(null);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-xs uppercase tracking-wider text-zinc-500">
          Monthly
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
            $9.99
          </span>
          <span className="text-sm text-zinc-500">/month</span>
        </div>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Flexible. Cancel anytime. Good if you&rsquo;re still deciding
          whether this is worth paying for long-term.
        </p>
        <button
          type="button"
          onClick={() => start('monthly')}
          disabled={loading !== null}
          className="mt-5 w-full rounded-full border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {loading === 'monthly' ? 'Starting checkout…' : 'Choose monthly'}
        </button>
      </div>

      <div className="relative rounded-xl border-2 border-zinc-900 bg-white p-6 shadow-sm dark:border-zinc-100 dark:bg-zinc-900">
        <div className="absolute -top-2.5 right-4 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white dark:bg-zinc-100 dark:text-zinc-900">
          Save 34%
        </div>
        <div className="text-xs uppercase tracking-wider text-zinc-500">
          Annual
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
            $79
          </span>
          <span className="text-sm text-zinc-500">/year</span>
        </div>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Commit to a year. The system compounds — most of the real change
          shows up in month three and beyond, not month one.
        </p>
        <button
          type="button"
          onClick={() => start('annual')}
          disabled={loading !== null}
          className="mt-5 w-full rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading === 'annual' ? 'Starting checkout…' : 'Choose annual'}
        </button>
      </div>

      {error && (
        <div className="sm:col-span-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}
