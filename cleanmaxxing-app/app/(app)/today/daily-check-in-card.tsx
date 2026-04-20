'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { TodayCheckInState } from '@/lib/check-in/service';

type Props = {
  initialState: TodayCheckInState;
};

export function DailyCheckInCard({ initialState }: Props) {
  const router = useRouter();
  const [state, setState] = useState<TodayCheckInState>(initialState);
  const [draft, setDraft] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialState.goals.map((g) => [g.goal_id, g.completed]))
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const alreadyCheckedIn = state.check_in_id !== null;
  const hasGoals = state.goals.length > 0;

  function toggle(goalId: string) {
    setDraft((prev) => ({ ...prev, [goalId]: !prev[goalId] }));
  }

  function askMisterPAbout(goalTitle: string) {
    const question = `Tell me more about the goal "${goalTitle}" — what it means and how to approach it.`;
    window.dispatchEvent(
      new CustomEvent('mister-p:prefill', { detail: { question } })
    );
  }

  function save() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/check-in', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            goals: state.goals.map((g) => ({
              goal_id: g.goal_id,
              completed: Boolean(draft[g.goal_id]),
            })),
          }),
        });
        if (!res.ok) throw new Error(`Save failed (${res.status})`);
        const next = (await res.json()) as TodayCheckInState;
        setState(next);
        setDraft(
          Object.fromEntries(next.goals.map((g) => [g.goal_id, g.completed]))
        );
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  function undo() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/check-in', { method: 'DELETE' });
        if (!res.ok) throw new Error(`Undo failed (${res.status})`);
        const next = (await res.json()) as TodayCheckInState;
        setState(next);
        setDraft(
          Object.fromEntries(next.goals.map((g) => [g.goal_id, g.completed]))
        );
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  if (!hasGoals) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium">Daily check-in</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          No active goals yet. Head to the library to pick some.
        </p>
        <Link
          href="/goals/library"
          className="mt-4 inline-block rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Browse goals
        </Link>
      </section>
    );
  }

  const completedCount = state.goals.filter((g) => g.completed).length;

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium">Daily check-in</h2>
        {alreadyCheckedIn && (
          <span className="text-xs text-zinc-500">
            {completedCount}/{state.goals.length} done today
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Did you work on this today? Check the ones you moved forward on.
      </p>

      <ul className="mt-4 space-y-2">
        {state.goals.map((g) => {
          const checked = Boolean(draft[g.goal_id]);
          const hasDetail = Boolean(g.description || g.plain_language);
          return (
            <li
              key={g.goal_id}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800"
            >
              <label className="flex cursor-pointer items-start gap-3 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(g.goal_id)}
                  disabled={pending}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-500 dark:border-zinc-600"
                />
                <span
                  className={
                    checked
                      ? 'flex-1 text-sm text-zinc-500 line-through'
                      : 'flex-1 text-sm text-zinc-900 dark:text-zinc-100'
                  }
                >
                  {g.title}
                </span>
              </label>
              {hasDetail && (
                <details className="group border-t border-zinc-200 px-3 py-2 dark:border-zinc-800">
                  <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                    What is this?
                  </summary>
                  <div className="mt-2 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                    {g.plain_language && <p>{g.plain_language}</p>}
                    {g.description && g.description !== g.plain_language && (
                      <p className="text-zinc-600 dark:text-zinc-400">
                        {g.description}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => askMisterPAbout(g.title)}
                      className="mt-1 inline-flex items-center rounded-md border border-zinc-300 px-2.5 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      Ask Mister P about this
                    </button>
                  </div>
                </details>
              )}
            </li>
          );
        })}
      </ul>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {alreadyCheckedIn ? 'Update' : 'Save check-in'}
        </button>
        {alreadyCheckedIn && (
          <button
            type="button"
            onClick={undo}
            disabled={pending}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Clear today
          </button>
        )}
      </div>
    </section>
  );
}
