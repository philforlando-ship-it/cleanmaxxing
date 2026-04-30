'use client';

// Goal-scoped Mister P chat panel. Lives on the goal detail page and
// threads goal_id through to /api/mister-p/ask, so every turn lands
// in this goal's persistent thread (carried forward across sessions
// until the user clicks Clear). Initial messages are hydrated
// server-side by the goal page and passed in as a prop.
//
// Diverges from /today's MisterPChatCard in three ways:
//   1. Hydrates from server history on mount (visible continuity).
//   2. Sends goal_id with every ask request (per-thread context).
//   3. Clear hits /api/mister-p/clear (server delete) with a
//      confirmation step, not just a local-state reset.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { renderAnswerText } from '@/lib/mister-p/render-answer';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type Props = {
  goalId: string;
  initialMessages: ChatMessage[];
};

export function GoalMisterPChat({ goalId, initialMessages }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const streamingRef = useRef(false);

  // Auto-scroll to bottom as new tokens arrive or messages are added.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendQuestion = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || streamingRef.current) return;

      setError(null);
      setInput('');
      setStreaming(true);
      streamingRef.current = true;

      setMessages((prev) => [
        ...prev,
        { role: 'user', content: trimmed },
        { role: 'assistant', content: '' },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch('/api/mister-p/ask', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ question: trimmed, goal_id: goalId }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const next = prev.slice();
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              next[next.length - 1] = { ...last, content: last.content + chunk };
            }
            return next;
          });
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message);
          setMessages((prev) => {
            const next = prev.slice();
            const last = next[next.length - 1];
            if (last && last.role === 'assistant' && last.content === '') {
              next.pop();
            }
            return next;
          });
        }
      } finally {
        setStreaming(false);
        streamingRef.current = false;
        abortRef.current = null;
      }
    },
    [goalId],
  );

  function send() {
    sendQuestion(input);
  }

  function stop() {
    abortRef.current?.abort();
  }

  async function clearThread() {
    if (clearing || streaming) return;
    setClearing(true);
    setError(null);
    try {
      const res = await fetch('/api/mister-p/clear', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ goal_id: goalId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Clear failed (${res.status})`);
      }
      setMessages([]);
      setConfirmingClear(false);
      // Invalidate the router cache so a navigation back to /today
      // or to another goal re-runs the server hydration and doesn't
      // show the just-cleared messages from a stale RSC.
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setClearing(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium">Conversation about this goal</h2>
        {messages.length > 0 && !confirmingClear && (
          <button
            type="button"
            onClick={() => setConfirmingClear(true)}
            disabled={streaming || clearing}
            className="text-xs text-zinc-500 hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Clear
          </button>
        )}
      </div>

      {confirmingClear && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-amber-900 dark:text-amber-200">
            Permanently delete this thread? Cannot be undone.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={clearThread}
              disabled={clearing}
              className="rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {clearing ? 'Clearing…' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              disabled={clearing}
              className="text-xs text-zinc-600 underline dark:text-zinc-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {messages.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Ask Mister P about this goal. The thread is saved across sessions
          until you clear it.
        </p>
      ) : (
        <div
          ref={scrollRef}
          className="mt-4 max-h-96 space-y-4 overflow-y-auto rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          {messages.map((m, i) => {
            if (m.role === 'user') {
              return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
                    {m.content}
                  </div>
                </div>
              );
            }
            return (
              <div
                key={i}
                className="border-l-2 border-zinc-300 pl-4 dark:border-zinc-700"
              >
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Mister P
                </div>
                <div className="mt-1 whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-zinc-900 dark:text-zinc-100">
                  {renderAnswerText(m.content)}
                  {streaming && i === messages.length - 1 && (
                    <span className="ml-1 inline-block h-4 w-[2px] animate-pulse bg-zinc-400 align-middle" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <form
        className="mt-4 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Mister P about this goal..."
          disabled={streaming}
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        {streaming ? (
          <button
            type="button"
            onClick={stop}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Send
          </button>
        )}
      </form>
    </section>
  );
}
