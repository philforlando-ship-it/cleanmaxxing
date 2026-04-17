'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Question } from '@/lib/onboarding/types';

type Props = {
  step: number;
  question: Question;
  initialValue: string | null;
  initialDetail?: string | null;
  isLast: boolean;
};

const MOTIVATION_DETAIL_TRIGGER = 'something-specific-bothering-me';

export function QuestionForm({
  step,
  question,
  initialValue,
  initialDetail,
  isLast,
}: Props) {
  const router = useRouter();
  const [value, setValue] = useState<string>(() => {
    if (initialValue) return initialValue;
    if (question.type === 'slider') {
      const min = question.min ?? 1;
      const max = question.max ?? 10;
      return String(Math.floor((min + max) / 2));
    }
    return '';
  });
  const [multi, setMulti] = useState<string[]>(() => {
    if (question.type !== 'multi-choice' || !initialValue) return [];
    try {
      const parsed = JSON.parse(initialValue);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [detail, setDetail] = useState<string>(initialDetail ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const showDetailField =
    question.key === 'motivation_segment' &&
    value === MOTIVATION_DETAIL_TRIGGER;

  function effectiveValue(): string | null {
    if (question.type === 'multi-choice') {
      if (multi.length === 0) return null;
      return JSON.stringify(multi);
    }
    if (value.trim() === '') return null;
    return value.trim();
  }

  function validate(v: string | null): string | null {
    if (question.required && (v === null || v === '')) return 'Please answer before continuing.';
    if (question.type === 'number' && v !== null) {
      const n = Number(v);
      if (Number.isNaN(n)) return 'Enter a number.';
      if (question.min !== undefined && n < question.min) return `Minimum is ${question.min}.`;
      if (question.max !== undefined && n > question.max) return `Maximum is ${question.max}.`;
      if (question.key === 'age' && n < 18) return 'Cleanmaxxing is 18+ only.';
    }
    if (question.type === 'slider' && v !== null) {
      const n = Number(v);
      if (n < (question.min ?? 1) || n > (question.max ?? 10)) return 'Pick a value on the scale.';
    }
    if (question.type === 'multi-choice' && question.maxSelections && multi.length > question.maxSelections) {
      return `Pick up to ${question.maxSelections}.`;
    }
    return null;
  }

  async function submit(skip: boolean) {
    setError(null);
    const raw = skip ? null : effectiveValue();
    if (!skip) {
      const err = validate(raw);
      if (err) { setError(err); return; }
    } else if (question.required) {
      setError('This question is required.');
      return;
    }

    const res = await fetch('/api/onboarding/answer', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        question_key: question.key,
        response_value: raw,
        // Server ignores `detail` for any question other than motivation_segment.
        ...(question.key === 'motivation_segment'
          ? { detail: detail.trim() || null }
          : {}),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Something went wrong. Try again.');
      return;
    }

    startTransition(() => {
      if (isLast) {
        router.push('/onboarding/finalize');
      } else {
        router.push(`/onboarding/${step + 1}`);
      }
      router.refresh();
    });
  }

  function back() {
    if (step === 0) return;
    router.push(`/onboarding/${step - 1}`);
  }

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="text-2xl font-semibold leading-tight tracking-tight">
        {question.prompt}
      </h1>
      {question.helper && (
        <p className="mt-2 text-sm text-zinc-500">{question.helper}</p>
      )}

      <div className="mt-8 flex-1">
        {question.type === 'number' && (
          <input
            type="number"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            min={question.min}
            max={question.max}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-lg outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
            autoFocus
          />
        )}

        {question.type === 'text' && (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
            autoFocus
          />
        )}

        {question.type === 'choice' && question.options && (
          <div className="flex flex-col gap-2">
            {question.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue(opt.value)}
                className={`rounded-lg border px-4 py-3 text-left text-base transition ${
                  value === opt.value
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border-zinc-300 bg-white hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
            {showDetailField && (
              <div className="mt-3">
                <label className="mb-2 block text-sm text-zinc-600 dark:text-zinc-400">
                  What&rsquo;s the specific thing? Optional — helps us tailor
                  what we surface first.
                </label>
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="A few words is enough."
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-100"
                />
              </div>
            )}
          </div>
        )}

        {question.type === 'yes-no' && (
          <div className="flex flex-col gap-2">
            {[
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue(opt.value)}
                className={`rounded-lg border px-4 py-3 text-left text-base transition ${
                  value === opt.value
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                    : 'border-zinc-300 bg-white hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {question.type === 'multi-choice' && question.options && (
          <div className="flex flex-col gap-2">
            {question.options.map((opt) => {
              const checked = multi.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (checked) {
                      setMulti(multi.filter((v) => v !== opt.value));
                    } else {
                      if (question.maxSelections && multi.length >= question.maxSelections) return;
                      setMulti([...multi, opt.value]);
                    }
                  }}
                  className={`rounded-lg border px-4 py-3 text-left text-base transition ${
                    checked
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                      : 'border-zinc-300 bg-white hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
            {question.maxSelections && (
              <p className="mt-1 text-xs text-zinc-500">
                {multi.length} / {question.maxSelections} selected
              </p>
            )}
          </div>
        )}

        {question.type === 'slider' && (
          <div>
            <input
              type="range"
              min={question.min ?? 1}
              max={question.max ?? 10}
              step={1}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full"
            />
            <div className="mt-3 text-center text-4xl font-semibold tabular-nums">
              {value}
            </div>
            <div className="mt-1 flex justify-between text-xs text-zinc-500">
              <span>{question.min ?? 1}</span>
              <span>{question.max ?? 10}</span>
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          disabled={step === 0 || pending}
          className="rounded-lg px-4 py-2 text-sm text-zinc-600 disabled:opacity-40 dark:text-zinc-400"
        >
          Back
        </button>
        <div className="flex gap-2">
          {!question.required && (
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={pending}
              className="rounded-lg px-4 py-2 text-sm text-zinc-600 disabled:opacity-40 dark:text-zinc-400"
            >
              Skip
            </button>
          )}
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {isLast ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
