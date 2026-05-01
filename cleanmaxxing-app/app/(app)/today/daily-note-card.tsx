'use client';

// Mister P's daily note + question, surfaced at the top of /today.
// Server-side picks the note via the rules-based selector and
// caches it for the day; this component renders the cached row
// and lets the user respond. Once responded, the question gets
// the answer below it and the input disappears for the rest of
// the day.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { DailyNoteRow } from '@/lib/daily-note/service';

type Props = {
  note: DailyNoteRow;
};

export function DailyNoteCard({ note }: Props) {
  const router = useRouter();
  const [response, setResponse] = useState<string | null>(note.response);
  const [draft, setDraft] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const trimmed = draft.trim();
    if (trimmed === '') return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/daily-note/respond', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ note_id: note.id, response: trimmed }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Save failed (${res.status})`);
        }
        setResponse(trimmed);
        setDraft('');
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      {/* Observation — Mister P's read on where the user is today. */}
      <div className="border-l-2 border-zinc-300 pl-4 dark:border-zinc-700">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Mister P
        </div>
        <p className="mt-1 whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-zinc-900 dark:text-zinc-100">
          {note.observation}
        </p>
      </div>

      {/* Question — separated from observation so the user reads
          one before the other instead of as a wall of text. */}
      <div className="mt-5 border-l-2 border-zinc-300 pl-4 dark:border-zinc-700">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Mister P
        </div>
        <p className="mt-1 font-serif text-[15px] leading-relaxed text-zinc-900 dark:text-zinc-100">
          {note.question}
        </p>
      </div>

      {response ? (
        <div className="mt-4 flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
            {response}
          </div>
        </div>
      ) : (
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="A sentence is enough."
            disabled={pending}
            maxLength={1000}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={pending || draft.trim() === ''}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending ? 'Saving…' : 'Send'}
          </button>
        </form>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </section>
  );
}
