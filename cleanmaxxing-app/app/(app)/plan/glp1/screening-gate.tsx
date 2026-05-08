'use client';

// 3-question screening gate that sits in front of the GLP-1 Considering
// content dump. Beta tester feedback (May 8): the bare info dump is too
// dense on land — gating behind a quick screening surfaces the
// answers as user signal AND slows the read-through enough to be
// purposeful rather than overwhelming.
//
// Persistence: writes to survey_responses with question_key
// 'glp1_screening_v1'. Same convention as monthly_checkpoint_dismissed_at
// and focus_areas. Once submitted, the gate doesn't render again on
// future visits — the Considering section is shown unconditionally.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Reason =
  | 'weight_loss'
  | 'metabolic_concern'
  | 'recommendation'
  | 'curiosity'
  | 'other';

type PrescriberStatus =
  | 'started_evaluation'
  | 'considering_evaluation'
  | 'not_yet'
  | 'no_intent_yet';

type Horizon =
  | 'immediately'
  | 'next_3_months'
  | 'exploring'
  | 'unsure';

const REASON_OPTIONS: ReadonlyArray<{ value: Reason; label: string }> = [
  { value: 'weight_loss', label: 'Weight loss is the goal' },
  {
    value: 'metabolic_concern',
    label: 'A metabolic concern (diabetes risk, A1C, etc.)',
  },
  { value: 'recommendation', label: 'Someone I trust recommended it' },
  { value: 'curiosity', label: 'Curiosity — reading what it actually does' },
  { value: 'other', label: 'Something else' },
];

const PRESCRIBER_OPTIONS: ReadonlyArray<{
  value: PrescriberStatus;
  label: string;
}> = [
  { value: 'started_evaluation', label: 'Yes — actively evaluating with one' },
  {
    value: 'considering_evaluation',
    label: 'Considering it but haven’t booked',
  },
  { value: 'not_yet', label: 'Not yet — researching first' },
  { value: 'no_intent_yet', label: 'Not at this stage' },
];

const HORIZON_OPTIONS: ReadonlyArray<{ value: Horizon; label: string }> = [
  { value: 'immediately', label: 'Within the next month' },
  { value: 'next_3_months', label: 'Within the next 3 months' },
  { value: 'exploring', label: 'Exploring — no timeline yet' },
  { value: 'unsure', label: 'Unsure if this is for me' },
];

export function Glp1ScreeningGate() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<Reason | null>(null);
  const [prescriber, setPrescriber] = useState<PrescriberStatus | null>(null);
  const [horizon, setHorizon] = useState<Horizon | null>(null);

  function submit() {
    setError(null);
    if (!reason || !prescriber || !horizon) {
      return setError('Pick an option for each question.');
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/glp1/screening', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            reason,
            prescriber_status: prescriber,
            horizon,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? 'Save failed');
        }
        router.refresh();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <section className="mt-8 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <header>
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Three quick questions before the read-through.
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
          The Considering section runs long on purpose. Answer these so
          the page can be honest about what fits your situation rather
          than dumping everything at once.
        </p>
      </header>

      <Question
        label="What’s drawing you to GLP-1s right now?"
        options={REASON_OPTIONS}
        value={reason}
        onChange={setReason}
        disabled={pending}
      />
      <Question
        label="Have you talked with a prescriber yet?"
        options={PRESCRIBER_OPTIONS}
        value={prescriber}
        onChange={setPrescriber}
        disabled={pending}
      />
      <Question
        label="What’s your time horizon?"
        options={HORIZON_OPTIONS}
        value={horizon}
        onChange={setHorizon}
        disabled={pending}
      />

      {error && (
        <p className="mt-4 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="mt-6 rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? 'Saving…' : 'Show me the read-through'}
      </button>
    </section>
  );
}

function Question<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T | null;
  onChange: (next: T) => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-6">
      <p className="text-[14px] font-medium text-zinc-800 dark:text-zinc-200">
        {label}
      </p>
      <div className="mt-2 flex flex-col gap-2">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              disabled={disabled}
              className={
                active
                  ? 'rounded-md border border-zinc-900 bg-zinc-900 px-3 py-2 text-left text-sm font-medium text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'rounded-md border border-zinc-300 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
