'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function GrantForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  function submit(action: 'grant' | 'revoke') {
    if (!target.trim()) {
      setMessage({ kind: 'error', text: 'Enter an email or user UUID.' });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/admin/access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            target: target.trim(),
            reason: reason.trim() || undefined,
          }),
        });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          previousStatus?: string | null;
          userId?: string;
        };
        if (!res.ok) {
          setMessage({
            kind: 'error',
            text: body.error ?? `Request failed (${res.status})`,
          });
          return;
        }
        const verb = action === 'grant' ? 'Granted' : 'Revoked';
        setMessage({
          kind: 'success',
          text: `${verb} for ${target.trim()} (was: ${body.previousStatus ?? 'unknown'}).`,
        });
        setTarget('');
        setReason('');
        router.refresh();
      } catch (err) {
        setMessage({ kind: 'error', text: (err as Error).message });
      }
    });
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
        User (email or UUID)
      </label>
      <input
        type="text"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        disabled={pending}
        placeholder="user@example.com"
        className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />

      <label className="mt-4 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
        Reason{' '}
        <span className="text-xs font-normal text-zinc-500">
          (optional — shows up in the audit log)
        </span>
      </label>
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={pending}
        placeholder="Beta tester, comp for feedback, support escalation, etc."
        className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => submit('grant')}
          disabled={pending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? 'Working…' : 'Grant Pro'}
        </button>
        <button
          type="button"
          onClick={() => submit('revoke')}
          disabled={pending}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Revoke Pro
        </button>
      </div>

      {message && (
        <p
          className={`mt-4 text-sm ${
            message.kind === 'success'
              ? 'text-emerald-700 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
