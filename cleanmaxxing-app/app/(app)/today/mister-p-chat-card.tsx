'use client';

// /today's Mister P chat card. Multi-thread aware: the user can ask
// from the General thread (goal_id IS NULL) or any of their active
// goal threads via a picker above the input. All threads hydrate
// from server-loaded history on mount, so continuity is visible
// across surfaces — including the per-goal panel on /goals/[id],
// which writes into the same goal-scoped thread this card can read
// from.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { renderAnswerText } from '@/lib/mister-p/render-answer';
import { VoiceInputButton } from '@/components/voice-input-button';

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type GoalOption = {
  id: string;
  title: string;
};

// Sentinel key used in the threads map and as the picker's "no goal"
// value. UUIDs from the goals table can never collide with this.
const GENERAL_KEY = '__general__';

type Props = {
  goals: GoalOption[];
  // Threads keyed by GENERAL_KEY for the unscoped chat, or by a goal
  // UUID for goal-scoped chats. Threads omitted from the map default
  // to empty.
  initialThreads: Record<string, ChatMessage[]>;
};

export function MisterPChatCard({ goals, initialThreads }: Props) {
  const router = useRouter();
  const [selectedKey, setSelectedKey] = useState<string>(GENERAL_KEY);
  const [threads, setThreads] = useState<Record<string, ChatMessage[]>>(
    initialThreads,
  );
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const streamingRef = useRef(false);

  const messages = useMemo(
    () => threads[selectedKey] ?? [],
    [threads, selectedKey],
  );

  // Auto-scroll the conversation to the bottom as new tokens arrive
  // or thread switches.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Cancel confirmation state on thread switch — a half-open confirm
  // dialog from another thread shouldn't carry over.
  useEffect(() => {
    setConfirmingClear(false);
    setError(null);
  }, [selectedKey]);

  const setMessagesForThread = useCallback(
    (key: string, updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setThreads((all) => ({
        ...all,
        [key]: updater(all[key] ?? []),
      }));
    },
    [],
  );

  const sendQuestion = useCallback(
    async (question: string, threadKey?: string) => {
      const trimmed = question.trim();
      if (!trimmed || streamingRef.current) return;

      // Capture the thread we're sending into so a mid-stream switch
      // doesn't redirect the streaming tokens to a different thread's
      // visible state. The selectedKey state is allowed to change
      // freely — but token-append targets this snapshot. An explicit
      // threadKey override lets cross-card prefill events route into
      // a specific goal's thread regardless of the picker's current
      // selection.
      const targetKey = threadKey ?? selectedKey;
      const goalId = targetKey === GENERAL_KEY ? null : targetKey;

      setError(null);
      setInput('');
      setStreaming(true);
      streamingRef.current = true;

      setMessagesForThread(targetKey, (prev) => [
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
          setMessagesForThread(targetKey, (prev) => {
            const next = prev.slice();
            const last = next[next.length - 1];
            if (last && last.role === 'assistant') {
              next[next.length - 1] = {
                ...last,
                content: last.content + chunk,
              };
            }
            return next;
          });
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setError((err as Error).message);
          setMessagesForThread(targetKey, (prev) => {
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
    [selectedKey, setMessagesForThread],
  );

  // Listen for "ask mister p about X" events from sibling cards. When
  // the event carries a goalId for one of the user's active goals,
  // route the prefilled question into that goal's thread (and switch
  // the picker so the user sees where the answer is landing). Without
  // a goalId, fall back to the currently-selected thread.
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ question?: string; goalId?: string }>)
        .detail;
      if (!detail?.question) return;

      let targetKey = selectedKey;
      if (detail.goalId && goals.some((g) => g.id === detail.goalId)) {
        targetKey = detail.goalId;
        if (targetKey !== selectedKey) setSelectedKey(targetKey);
      }

      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      sendQuestion(detail.question, targetKey);
    }
    window.addEventListener('mister-p:prefill', handler);
    return () => window.removeEventListener('mister-p:prefill', handler);
  }, [sendQuestion, selectedKey, goals]);

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
      const goalId = selectedKey === GENERAL_KEY ? null : selectedKey;
      const res = await fetch('/api/mister-p/clear', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ goal_id: goalId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Clear failed (${res.status})`);
      }
      setMessagesForThread(selectedKey, () => []);
      setConfirmingClear(false);
      // Invalidate the router cache so a navigation back to /today
      // or over to /goals/[id] re-runs the server hydration and
      // doesn't show the just-cleared messages from a stale RSC.
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setClearing(false);
    }
  }

  const selectedLabel =
    selectedKey === GENERAL_KEY
      ? 'General'
      : goals.find((g) => g.id === selectedKey)?.title ?? 'Goal';

  return (
    <section
      ref={cardRef}
      className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium">Ask Mister P</h2>
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

      <div className="mt-3">
        <label
          htmlFor="mister-p-thread"
          className="block text-xs text-zinc-600 dark:text-zinc-400"
        >
          Asking about
        </label>
        <select
          id="mister-p-thread"
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          disabled={streaming || clearing}
          className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value={GENERAL_KEY}>General</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </div>

      {confirmingClear && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-amber-900 dark:text-amber-200">
            Permanently delete the {selectedLabel} thread? Cannot be undone.
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
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          {selectedKey === GENERAL_KEY
            ? 'Ask about anything Cleanmaxxing covers — training, skin, hair, supplements, sleep, style. Switch the thread above to keep a question scoped to a goal.'
            : 'Ask Mister P about this goal. The thread is saved across sessions until you clear it.'}
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
          placeholder={
            selectedKey === GENERAL_KEY
              ? 'Ask Mister P a question...'
              : `Ask about "${selectedLabel}"...`
          }
          disabled={streaming}
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <VoiceInputButton
          disabled={streaming}
          onTranscribed={(text) =>
            setInput((prev) => (prev ? `${prev} ${text}` : text))
          }
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
