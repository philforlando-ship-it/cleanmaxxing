'use client';

// Generic Pattern D Considering section. Renders authored educational
// content + the "I've started" CTA that opens the start-protocol form.
// State machine is owned by the page; this component renders one
// specific phase view.
//
// Lifted from app/(app)/plan/glp1/considering-section.tsx during the
// TRT buildout — the GLP-1 + TRT pages now both render this component
// with their topic-specific content + apiBasePath prop. Per-topic
// hardcoding (heading text, API path) is parameterized.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { ConsideringContent } from '@/lib/pattern-d/shell-types';
import {
  INTERVENTION_TYPE_LABEL,
  PRESCRIBER_STATUS_LABEL,
  type PrescriberStatus,
} from '@/lib/interventions/types';

type Props = {
  content: ConsideringContent;
  prescriberOptions: PrescriberStatus[];
  /** Topic short name shown in the section heading (e.g. "GLP-1"). */
  topicShortName: string;
  /** API base path for this topic, no trailing slash. e.g. "/api/plan/pattern-d/glp1". */
  apiBasePath: string;
};

export function ConsideringSection({
  content,
  prescriberOptions,
  topicShortName,
  apiBasePath,
}: Props) {
  const router = useRouter();
  const [showStartForm, setShowStartForm] = useState(false);

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          {topicShortName} — Considering
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Pattern D
        </span>
      </div>

      <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        {content.intro}
      </p>

      {content.sections.map((section) => (
        <div key={section.heading} className="mt-6">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {section.heading}
          </h3>
          {section.body.map((p, i) => (
            <p
              key={i}
              className="mt-2 text-[14px] leading-relaxed text-zinc-800 dark:text-zinc-200"
            >
              {p}
            </p>
          ))}
        </div>
      ))}

      <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        {showStartForm ? (
          <StartProtocolForm
            content={content}
            prescriberOptions={prescriberOptions}
            apiBasePath={apiBasePath}
            onCancel={() => setShowStartForm(false)}
            onStarted={() => {
              setShowStartForm(false);
              router.refresh();
            }}
          />
        ) : (
          <>
            <p className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
              {content.startProtocolPrompt}
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowStartForm(true)}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {content.startProtocolButtonLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function StartProtocolForm({
  content,
  prescriberOptions,
  apiBasePath,
  onCancel,
  onStarted,
}: {
  content: ConsideringContent;
  prescriberOptions: PrescriberStatus[];
  apiBasePath: string;
  onCancel: () => void;
  onStarted: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState('');
  const [titration, setTitration] = useState('');
  const [prescriberStatus, setPrescriberStatus] =
    useState<PrescriberStatus | ''>('');
  const [notes, setNotes] = useState('');

  // Today every Pattern D surface allows one type. The
  // allowedStartTypes shape supports multi-select so a future hair-meds
  // Pattern D can use the same form for fin + min — for now it's
  // hidden when there's only one choice.
  const singleType = content.allowedStartTypes.length === 1;
  const onlyType = content.allowedStartTypes[0];

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`${apiBasePath}/start-protocol`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            dose: dose.trim() || null,
            frequency: frequency.trim() || null,
            titration_schedule: titration.trim() || null,
            prescriber_status: prescriberStatus || null,
            notes: notes.trim() || null,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
          };
          throw new Error(
            body.message ?? body.error ?? `Request failed (${res.status})`,
          );
        }
        onStarted();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        Capture the protocol details
      </h3>
      <p className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
        All fields are optional. You can fill them in later — start by marking
        the protocol as live.
      </p>

      {singleType && (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          Type: <strong>{INTERVENTION_TYPE_LABEL[onlyType]}</strong>
        </p>
      )}

      <Field label="Dose (optional)">
        <input
          type="text"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          maxLength={200}
          disabled={pending}
          placeholder="e.g. testosterone cypionate 100mg / semaglutide 0.5mg"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <Field label="Frequency (optional)">
        <input
          type="text"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          maxLength={200}
          disabled={pending}
          placeholder="e.g. once weekly / twice weekly IM"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <Field label="Titration schedule (optional)">
        <input
          type="text"
          value={titration}
          onChange={(e) => setTitration(e.target.value)}
          maxLength={500}
          disabled={pending}
          placeholder="e.g. recheck labs at 8 weeks, adjust dose"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <Field label="Prescriber status (optional)">
        <select
          value={prescriberStatus}
          onChange={(e) =>
            setPrescriberStatus(e.target.value as PrescriberStatus | '')
          }
          disabled={pending}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">— pick one —</option>
          {prescriberOptions.map((opt) => (
            <option key={opt} value={opt}>
              {PRESCRIBER_STATUS_LABEL[opt]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Notes (optional)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          rows={2}
          disabled={pending}
          placeholder="Anything you want to remember about this protocol"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Saving…' : 'Mark started'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-600 dark:text-zinc-400">
        {label}
      </label>
      {children}
    </div>
  );
}
