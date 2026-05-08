'use client';

// 3-question screening gate that sits in front of the TRT Considering
// content. Same shape as the GLP-1 screening gate (shipped 2026-05-08)
// but tuned for the TRT decision space — symptoms vs. labs vs.
// aesthetic motivation, lab status, and time horizon.
//
// TRT is meaningfully higher-stakes than GLP-1: the commitment is
// effectively lifelong once HPTA suppression sets in, fertility
// implications are real, and a real lab + prescriber relationship is
// non-negotiable. The gate's tone reflects that — slightly more
// serious than the GLP-1 framing.
//
// Persistence: writes to survey_responses with question_key
// 'trt_screening_v1'. Once submitted, the gate doesn't render again
// — the Considering section shows unconditionally.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type Reason =
  | 'symptoms_low_t'
  | 'lab_confirmed_low'
  | 'aesthetic_performance'
  | 'curiosity'
  | 'other';

type LabStatus =
  | 'recent_low_confirmed'
  | 'recent_normal_range'
  | 'older_results'
  | 'no_labs_yet'
  | 'not_sure';

type Horizon =
  | 'next_3_months'
  | 'next_year'
  | 'exploring'
  | 'unsure';

const REASON_OPTIONS: ReadonlyArray<{ value: Reason; label: string }> = [
  {
    value: 'symptoms_low_t',
    label:
      'Symptoms — fatigue, low libido, low motivation, brain fog, etc.',
  },
  {
    value: 'lab_confirmed_low',
    label: 'Lab-confirmed low testosterone',
  },
  {
    value: 'aesthetic_performance',
    label: 'Aesthetic / performance — muscle, recovery, body composition',
  },
  {
    value: 'curiosity',
    label: 'Curiosity — reading what it actually does and what it costs',
  },
  { value: 'other', label: 'Something else' },
];

const LAB_OPTIONS: ReadonlyArray<{ value: LabStatus; label: string }> = [
  {
    value: 'recent_low_confirmed',
    label:
      'Recent labs (within 12 months) confirm low total or free testosterone',
  },
  {
    value: 'recent_normal_range',
    label: 'Recent labs came back in the normal range',
  },
  {
    value: 'older_results',
    label: 'I have older results but nothing recent',
  },
  { value: 'no_labs_yet', label: 'No labs done yet' },
  { value: 'not_sure', label: 'Not sure / can’t remember' },
];

const HORIZON_OPTIONS: ReadonlyArray<{ value: Horizon; label: string }> = [
  { value: 'next_3_months', label: 'Within the next 3 months' },
  { value: 'next_year', label: 'Within the next year' },
  { value: 'exploring', label: 'Exploring — no timeline yet' },
  { value: 'unsure', label: 'Unsure if this is for me' },
];

export function TrtScreeningGate() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState<Reason | null>(null);
  const [labStatus, setLabStatus] = useState<LabStatus | null>(null);
  const [horizon, setHorizon] = useState<Horizon | null>(null);

  function submit() {
    setError(null);
    if (!reason || !labStatus || !horizon) {
      return setError('Pick an option for each question.');
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/trt/screening', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            reason,
            lab_status: labStatus,
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
          TRT is a longer-term decision than most things in this app —
          the commitment is effectively lifelong once your body
          downregulates its own production. Answer these so the page
          can be honest about what fits your situation rather than
          dumping everything at once.
        </p>
      </header>

      <Question
        label="What’s drawing you to TRT?"
        options={REASON_OPTIONS}
        value={reason}
        onChange={setReason}
        disabled={pending}
      />
      <Question
        label="What do your labs look like?"
        options={LAB_OPTIONS}
        value={labStatus}
        onChange={setLabStatus}
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
