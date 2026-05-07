'use client';

// Generic Pattern D On Protocol section. Renders the authored guidance
// + the rich intervention card(s) — editable details, timeline, event
// logging.
//
// Backwards-compat: if the user is on this topic per the legacy
// `current_interventions[]` array but has no rich intervention row
// yet, the section degrades to a "capture the details" prompt that
// links into the start-protocol flow on the Considering surface.
//
// Lifted from app/(app)/plan/glp1/on-protocol-section.tsx during the
// TRT buildout. Per-topic strings + API path are passed in via props.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { OnProtocolContent } from '@/lib/pattern-d/shell-types';
import {
  EVENT_SEVERITY_LABEL,
  EVENT_TYPE_LABEL,
  INTERVENTION_TYPE_LABEL,
  PRESCRIBER_STATUS_LABEL,
  type EventSeverity,
  type EventType,
  type Intervention,
  type InterventionEvent,
  type PrescriberStatus,
} from '@/lib/interventions/types';

type Props = {
  content: OnProtocolContent;
  prescriberOptions: PrescriberStatus[];
  activeInterventions: Intervention[];
  eventsByInterventionId: Record<string, InterventionEvent[]>;
  onLegacyOnly: boolean;
  /** Topic short name shown in the section heading (e.g. "GLP-1"). */
  topicShortName: string;
  /** Slug for the topic — used in copy strings only ("on a {topic}"). */
  topicLowerName: string;
  /** API base path for this topic, no trailing slash. */
  apiBasePath: string;
  /** Considering-button copy used in the legacy-only fallback message. */
  legacyStartButtonLabel: string;
};

export function OnProtocolSection({
  content,
  prescriberOptions,
  activeInterventions,
  eventsByInterventionId,
  onLegacyOnly,
  topicShortName,
  topicLowerName,
  apiBasePath,
  legacyStartButtonLabel,
}: Props) {
  const router = useRouter();
  const onChange = () => router.refresh();

  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          {topicShortName} — On protocol
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
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Your protocol
        </h3>

        {onLegacyOnly && activeInterventions.length === 0 ? (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            We have you flagged as on {topicLowerName} from your profile, but
            no tracked protocol details on this surface yet. Capture them so
            the side-effect log and prescriber-prep summary can do real
            work — open the Considering view and use “{legacyStartButtonLabel}”
            to add the row.
          </p>
        ) : activeInterventions.length === 0 ? (
          <p className="mt-3 text-[13px] text-zinc-600 dark:text-zinc-400">
            No active {topicLowerName} protocols on file.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {activeInterventions.map((intervention) => (
              <InterventionCard
                key={intervention.id}
                intervention={intervention}
                events={eventsByInterventionId[intervention.id] ?? []}
                prescriberOptions={prescriberOptions}
                apiBasePath={apiBasePath}
                onChange={onChange}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function InterventionCard({
  intervention,
  events,
  prescriberOptions,
  apiBasePath,
  onChange,
}: {
  intervention: Intervention;
  events: InterventionEvent[];
  prescriberOptions: PrescriberStatus[];
  apiBasePath: string;
  onChange: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const lastDoseChange = events.find((e) => e.event_type === 'dose_change');

  if (editing) {
    return (
      <EditInterventionForm
        intervention={intervention}
        prescriberOptions={prescriberOptions}
        apiBasePath={apiBasePath}
        onCancel={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          onChange();
        }}
      />
    );
  }

  return (
    <article className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {INTERVENTION_TYPE_LABEL[intervention.type]}
        </h4>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Edit
        </button>
      </div>

      <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
        <DetailRow label="Started">
          {intervention.started_at
            ? new Date(intervention.started_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '—'}
        </DetailRow>
        <DetailRow label="Prescriber">
          {intervention.prescriber_status
            ? PRESCRIBER_STATUS_LABEL[intervention.prescriber_status]
            : '—'}
        </DetailRow>
        <DetailRow label="Dose">
          {intervention.dose ?? '—'}
          {lastDoseChange && (
            <span className="block text-[11px] text-zinc-500 dark:text-zinc-400">
              Last changed{' '}
              {new Date(lastDoseChange.event_at).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </DetailRow>
        <DetailRow label="Frequency">{intervention.frequency ?? '—'}</DetailRow>
        {intervention.titration_schedule && (
          <div className="sm:col-span-2">
            <dt className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Titration
            </dt>
            <dd className="text-zinc-800 dark:text-zinc-200">
              {intervention.titration_schedule}
            </dd>
          </div>
        )}
      </dl>

      {intervention.notes && (
        <p className="mt-3 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          {intervention.notes}
        </p>
      )}

      <Timeline
        interventionId={intervention.id}
        events={events}
        apiBasePath={apiBasePath}
        onChange={onChange}
      />
    </article>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </dt>
      <dd className="text-zinc-800 dark:text-zinc-200">{children}</dd>
    </div>
  );
}

function EditInterventionForm({
  intervention,
  prescriberOptions,
  apiBasePath,
  onCancel,
  onSaved,
}: {
  intervention: Intervention;
  prescriberOptions: PrescriberStatus[];
  apiBasePath: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dose, setDose] = useState(intervention.dose ?? '');
  const [frequency, setFrequency] = useState(intervention.frequency ?? '');
  const [titration, setTitration] = useState(
    intervention.titration_schedule ?? '',
  );
  const [prescriberStatus, setPrescriberStatus] = useState<PrescriberStatus | ''>(
    intervention.prescriber_status ?? '',
  );
  const [notes, setNotes] = useState(intervention.notes ?? '');

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `${apiBasePath}/intervention/${intervention.id}`,
          {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              dose: dose.trim() || null,
              frequency: frequency.trim() || null,
              titration_schedule: titration.trim() || null,
              prescriber_status: prescriberStatus || null,
              notes: notes.trim() || null,
            }),
          },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
          };
          throw new Error(
            body.message ?? body.error ?? `Request failed (${res.status})`,
          );
        }
        onSaved();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <article className="space-y-3 rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        Edit {INTERVENTION_TYPE_LABEL[intervention.type]}
      </h4>

      <Field label="Dose">
        <input
          type="text"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          maxLength={200}
          disabled={pending}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <Field label="Frequency">
        <input
          type="text"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          maxLength={200}
          disabled={pending}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <Field label="Titration schedule">
        <input
          type="text"
          value={titration}
          onChange={(e) => setTitration(e.target.value)}
          maxLength={500}
          disabled={pending}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <Field label="Prescriber status">
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

      <Field label="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          rows={2}
          disabled={pending}
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
          {pending ? 'Saving…' : 'Save'}
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
    </article>
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

function Timeline({
  interventionId,
  events,
  apiBasePath,
  onChange,
}: {
  interventionId: string;
  events: InterventionEvent[];
  apiBasePath: string;
  onChange: () => void;
}) {
  const [logging, setLogging] = useState(false);
  const unresolved = events.filter(
    (e) => !(e.event_type === 'side_effect' && e.resolved_at !== null),
  );
  const resolvedCount = events.length - unresolved.length;

  return (
    <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <div className="flex items-baseline justify-between gap-3">
        <h5 className="text-[13px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Timeline
        </h5>
        {!logging && (
          <button
            type="button"
            onClick={() => setLogging(true)}
            className="text-xs text-zinc-700 underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            + Log event
          </button>
        )}
      </div>

      {logging && (
        <div className="mt-3">
          <LogEventForm
            interventionId={interventionId}
            apiBasePath={apiBasePath}
            onCancel={() => setLogging(false)}
            onLogged={() => {
              setLogging(false);
              onChange();
            }}
          />
        </div>
      )}

      {unresolved.length === 0 ? (
        <p className="mt-3 text-[12px] text-zinc-500 dark:text-zinc-400">
          {resolvedCount > 0
            ? `${resolvedCount} resolved side effect${resolvedCount === 1 ? '' : 's'} on file. Nothing active right now.`
            : 'No events logged yet. Log a side effect, lab result, dose change, or note as it comes up.'}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {unresolved.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              apiBasePath={apiBasePath}
              onChange={onChange}
            />
          ))}
        </ul>
      )}

      {resolvedCount > 0 && unresolved.length > 0 && (
        <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          {resolvedCount} resolved side effect{resolvedCount === 1 ? '' : 's'}{' '}
          hidden from this view.
        </p>
      )}
    </div>
  );
}

function LogEventForm({
  interventionId,
  apiBasePath,
  onCancel,
  onLogged,
}: {
  interventionId: string;
  apiBasePath: string;
  onCancel: () => void;
  onLogged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [eventType, setEventType] = useState<EventType>('side_effect');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [severity, setSeverity] = useState<EventSeverity | ''>('');

  function submit() {
    setError(null);
    if (title.trim().length === 0) {
      setError('Add a short title.');
      return;
    }
    if (eventType === 'side_effect' && !severity) {
      setError('Pick a severity for the side effect.');
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch(
          `${apiBasePath}/intervention/${interventionId}/event`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              event_type: eventType,
              title: title.trim(),
              body: body.trim() || null,
              severity: eventType === 'side_effect' ? severity || null : null,
            }),
          },
        );
        if (!res.ok) {
          const r = (await res.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
          };
          throw new Error(
            r.message ?? r.error ?? `Request failed (${res.status})`,
          );
        }
        onLogged();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="space-y-3 rounded-md border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
      <Field label="Event type">
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value as EventType)}
          disabled={pending}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {(['side_effect', 'lab_result', 'dose_change', 'check_in', 'note'] as EventType[]).map(
            (t) => (
              <option key={t} value={t}>
                {EVENT_TYPE_LABEL[t]}
              </option>
            ),
          )}
        </select>
      </Field>

      {eventType === 'side_effect' && (
        <Field label="Severity">
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as EventSeverity | '')}
            disabled={pending}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">— pick one —</option>
            {(['mild', 'moderate', 'concerning'] as EventSeverity[]).map((s) => (
              <option key={s} value={s}>
                {EVENT_SEVERITY_LABEL[s]}
                {s === 'concerning' && ' (talk to prescriber soon)'}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Title">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          disabled={pending}
          placeholder="e.g. fatigue at trough / mood dip late in cycle"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </Field>

      <Field label="Details (optional)">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={2}
          disabled={pending}
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
          {pending ? 'Logging…' : 'Log'}
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

const EVENT_TYPE_BADGE_CLASS: Record<EventType, string> = {
  side_effect: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  lab_result: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
  note: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
  dose_change: 'bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
  check_in: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
};

const SEVERITY_BADGE_CLASS: Record<EventSeverity, string> = {
  mild: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300',
  moderate: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  concerning: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
};

function EventRow({
  event,
  apiBasePath,
  onChange,
}: {
  event: InterventionEvent;
  apiBasePath: string;
  onChange: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function callEndpoint(path: string, method: 'POST' | 'DELETE') {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(path, { method });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
          };
          throw new Error(
            body.message ?? body.error ?? `Request failed (${res.status})`,
          );
        }
        onChange();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <li className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
      <div className="flex flex-wrap items-baseline gap-2">
        <span
          className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${EVENT_TYPE_BADGE_CLASS[event.event_type]}`}
        >
          {EVENT_TYPE_LABEL[event.event_type]}
        </span>
        {event.severity && (
          <span
            className={`rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${SEVERITY_BADGE_CLASS[event.severity]}`}
          >
            {EVENT_SEVERITY_LABEL[event.severity]}
          </span>
        )}
        <span className="ml-auto text-[11px] text-zinc-500 dark:text-zinc-400">
          {new Date(event.event_at).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      </div>

      <p className="mt-1.5 text-[14px] font-medium text-zinc-900 dark:text-zinc-100">
        {event.title}
      </p>
      {event.body && (
        <p className="mt-1 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          {event.body}
        </p>
      )}

      {event.event_type === 'side_effect' && event.severity === 'concerning' && (
        <p className="mt-2 rounded-sm border border-red-200 bg-red-50 px-2 py-1 text-[12px] text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          This is a “talk to your prescriber soon” kind of side effect, not a
          “wait and see” one. Don&rsquo;t sit on it.
        </p>
      )}

      {error && (
        <p className="mt-2 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
        {event.event_type === 'side_effect' && !event.resolved_at && (
          <button
            type="button"
            onClick={() =>
              callEndpoint(
                `${apiBasePath}/event/${event.id}/resolve`,
                'POST',
              )
            }
            disabled={pending}
            className="text-zinc-600 underline decoration-dotted underline-offset-2 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Mark resolved
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            callEndpoint(`${apiBasePath}/event/${event.id}`, 'DELETE')
          }
          disabled={pending}
          className="text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
