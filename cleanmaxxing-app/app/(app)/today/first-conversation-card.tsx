'use client';

// Scripted first-conversation with Mister P. Renders only on the
// /today screen for users who finished onboarding but haven't yet
// completed this exchange. Two open-ended questions in a chat-
// styled UI so the surface itself demonstrates what Mister P
// looks like before the user thinks to open his chat. The
// answers feed his user-state block on every subsequent turn —
// "tell me what you've tried that didn't stick" is signal he
// would never get from the structured onboarding survey.
//
// Visual style mirrors the regular Mister P chat card so the
// user recognizes the pattern when they get to /today's chat
// surface later.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  FIRST_CONVO_KEYS,
  type FirstConvoState,
} from '@/lib/first-convo/service';

type Question = {
  key: typeof FIRST_CONVO_KEYS.blockers | typeof FIRST_CONVO_KEYS.triedBefore;
  text: string;
  placeholder: string;
};

const QUESTIONS: Question[] = [
  {
    key: FIRST_CONVO_KEYS.blockers,
    text: "Hey. Two quick questions before you get going — your answers shape how I respond when you ask me things later. First: what's been getting in the way of looking and feeling how you'd like? Time, money, energy, knowledge, motivation — whatever the real thing is.",
    placeholder: 'A sentence or two — no need to polish it.',
  },
  {
    key: FIRST_CONVO_KEYS.triedBefore,
    text: "Got it. Last one: what have you tried before that didn't stick? I'd rather skip recommending stuff that's already let you down.",
    placeholder: 'Anything — a diet, a routine, a supplement, a habit.',
  },
];

const FAREWELL =
  "Got it. That'll change what I tell you when you ask me things — go open the chat whenever you have a question.";

type Bubble =
  | { who: 'mister-p'; text: string }
  | { who: 'user'; text: string };

type Props = {
  initial: FirstConvoState;
};

export function FirstConversationCard({ initial }: Props) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({
    [FIRST_CONVO_KEYS.blockers]: initial.answers.blockers,
    [FIRST_CONVO_KEYS.triedBefore]: initial.answers.triedBefore,
  });
  const [input, setInput] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showFarewell, setShowFarewell] = useState(false);

  const currentIndex = QUESTIONS.findIndex((q) => !answers[q.key]);
  const isComplete = currentIndex === -1;
  const current = currentIndex >= 0 ? QUESTIONS[currentIndex] : null;

  // Build the running transcript of bubbles. Past Q/A pairs render
  // as Mister P bubble + user bubble; the current question (if
  // any) renders as the trailing Mister P bubble above the input.
  const transcript: Bubble[] = [];
  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];
    const a = answers[q.key];
    if (a) {
      transcript.push({ who: 'mister-p', text: q.text });
      transcript.push({ who: 'user', text: a });
    } else if (i === currentIndex) {
      transcript.push({ who: 'mister-p', text: q.text });
      break;
    }
  }
  if (isComplete && showFarewell) {
    transcript.push({ who: 'mister-p', text: FAREWELL });
  }

  function submit() {
    if (!current) return;
    const trimmed = input.trim();
    if (trimmed === '') return;
    setError(null);

    const isLast = currentIndex === QUESTIONS.length - 1;

    startTransition(async () => {
      try {
        const res = await fetch('/api/first-convo', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            key: current.key,
            value: trimmed,
            completed: isLast,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Save failed (${res.status})`);
        }
        setAnswers((prev) => ({ ...prev, [current.key]: trimmed }));
        setInput('');
        if (isLast) {
          // Show farewell briefly before the parent re-render
          // unmounts the card via the completion gate.
          setShowFarewell(true);
          setTimeout(() => router.refresh(), 1200);
        }
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-4">
        {transcript.map((b, i) => {
          if (b.who === 'user') {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {b.text}
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
                {b.text}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!isComplete && current && (
        <form
          className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={current.placeholder}
            disabled={pending}
            maxLength={1000}
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={pending || input.trim() === ''}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {pending
              ? 'Saving…'
              : currentIndex === QUESTIONS.length - 1
                ? 'Done'
                : 'Next'}
          </button>
        </form>
      )}
    </section>
  );
}
