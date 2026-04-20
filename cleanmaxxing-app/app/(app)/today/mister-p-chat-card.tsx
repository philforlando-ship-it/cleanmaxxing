'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export function MisterPChatCard() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const streamingRef = useRef(false);

  // Auto-scroll the conversation to the bottom as new tokens arrive.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const sendQuestion = useCallback(async (question: string) => {
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
        body: JSON.stringify({ question: trimmed }),
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
  }, []);

  // Listen for "ask mister p about X" events from sibling cards.
  // Scroll the card into view, then kick off the send. streamingRef guards
  // against rapid repeat clicks while a previous request is in flight.
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<{ question?: string }>).detail;
      if (!detail?.question) return;
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      sendQuestion(detail.question);
    }
    window.addEventListener('mister-p:prefill', handler);
    return () => window.removeEventListener('mister-p:prefill', handler);
  }, [sendQuestion]);

  function send() {
    sendQuestion(input);
  }

  function stop() {
    abortRef.current?.abort();
  }

  function reset() {
    if (streaming) return;
    setMessages([]);
    setError(null);
  }

  return (
    <section
      ref={cardRef}
      className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-medium">Ask Mister P</h2>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={reset}
            disabled={streaming}
            className="text-xs text-zinc-500 hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Clear
          </button>
        )}
      </div>

      {messages.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Ask about anything Cleanmaxxing covers — training, skin, hair,
          supplements, sleep, style. Mister P answers from the full corpus
          in plain language.
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
              <div key={i} className="border-l-2 border-zinc-300 pl-4 dark:border-zinc-700">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  Mister P
                </div>
                <div className="mt-1 whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-zinc-900 dark:text-zinc-100">
                  {m.content}
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
          placeholder="Ask Mister P a question..."
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
