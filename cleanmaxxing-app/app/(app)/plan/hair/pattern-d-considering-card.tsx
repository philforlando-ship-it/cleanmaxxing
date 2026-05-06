'use client';

// Pattern D Considering + On Protocol surface. Renders inside /plan/hair
// when stage_2_path === 'treat'. Two main rendering paths:
//
//   Considering view: user hasn't started treatment yet. Shows the
//     authored educational content. "Start protocol" CTA expands an
//     inline form to capture initial protocol details.
//
//   On Protocol view: user has at least one active hair-loss
//     intervention (finasteride or minoxidil at status='on_protocol').
//     Shows each intervention with editable protocol details. Side-
//     effect log, labs cadence, and off-ramp transitions are deferred
//     to follow-up scope.
//
// Backwards-compat: the legacy isOnProtocol check (treatmentStartedAt
// OR profile fin/min) is still honored. Users with only legacy
// signals see a simpler version of the On Protocol view (without the
// intervention cards) until they re-engage and create rows.

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  PATTERN_D_CONSIDERING_INTRO,
  PATTERN_D_CONSIDERING_SECTIONS,
  PATTERN_D_ON_PROTOCOL_PLACEHOLDER_INTRO,
  PATTERN_D_ON_PROTOCOL_PLACEHOLDER_NOTES,
} from '@/lib/hair/pattern-d-considering-content';
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

type StartType = 'finasteride' | 'minoxidil';

type Props = {
  treatmentStartedAt: string | null;
  currentInterventions: string[];
  /** Active hair-loss interventions (status='on_protocol' or 'paused',
   *  filtered to type ∈ {finasteride, minoxidil}). When ≥1, the On
   *  Protocol view renders rich intervention cards. */
  activeHairInterventions: Intervention[];
  /** Events for each intervention, keyed by intervention id. Empty
   *  array (or missing key) when an intervention has no events yet. */
  eventsByInterventionId: Record<string, InterventionEvent[]>;
};

export function PatternDConsideringCard({
  treatmentStartedAt,
  currentInterventions,
  activeHairInterventions,
  eventsByInterventionId,
}: Props) {
  const router = useRouter();

  const onFinOrMin =
    currentInterventions.includes('finasteride') ||
    currentInterventions.includes('minoxidil');
  const hasActiveInterventions = activeHairInterventions.length > 0;
  const isOnProtocol =
    hasActiveInterventions || treatmentStartedAt !== null || onFinOrMin;

  if (isOnProtocol) {
    return (
      <OnProtocolView
        activeInterventions={activeHairInterventions}
        eventsByInterventionId={eventsByInterventionId}
        onChange={() => router.refresh()}
      />
    );
  }

  return <ConsideringView onChange={() => router.refresh()} />;
}

// ===========================================================
// Considering view (educational content + start-protocol form)
// ===========================================================

function ConsideringView({ onChange }: { onChange: () => void }) {
  const [showStartForm, setShowStartForm] = useState(false);
  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Hair-loss treatment — Considering
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Pattern D
        </span>
      </div>

      <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        {PATTERN_D_CONSIDERING_INTRO}
      </p>

      {PATTERN_D_CONSIDERING_SECTIONS.map((section) => (
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
            onCancel={() => setShowStartForm(false)}
            onStarted={() => {
              setShowStartForm(false);
              onChange();
            }}
          />
        ) : (
          <>
            <p className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
              Once you’ve actually started treatment (filled the prescription,
              on the daily routine), mark it here. The protocol details get
              tracked properly from there.
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowStartForm(true)}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                I’ve started treatment
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function StartProtocolForm({
  onCancel,
  onStarted,
}: {
  onCancel: () => void;
  onStarted: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [types, setTypes] = useState<Set<StartType>>(new Set());
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState('');
  const [prescriberStatus, setPrescriberStatus] =
    useState<PrescriberStatus | ''>('');
  const [notes, setNotes] = useState('');

  function toggleType(t: StartType) {
    const next = new Set(types);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    setTypes(next);
  }

  function submit() {
    setError(null);
    if (types.size === 0) {
      setError('Pick at least one treatment.');
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch('/api/plan/hair/pattern-d/start-protocol', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            types: Array.from(types),
            dose: dose.trim() || null,
            frequency: frequency.trim() || null,
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
        What did you start?
      </h3>
      <p className="text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
        All fields except the treatment selection are optional. You can fill
        in details later — start by checking what’s on your protocol.
      </p>

      <div className="space-y-2">
        {(['finasteride', 'minoxidil'] as const).map((t) => {
          const checked = types.has(t);
          return (
            <label
              key={t}
              className={
                checked
                  ? 'flex cursor-pointer items-center gap-3 rounded-md border border-zinc-900 bg-zinc-50 px-3 py-2 dark:border-zinc-100 dark:bg-zinc-800'
                  : 'flex cursor-pointer items-center gap-3 rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
              }
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleType(t)}
                disabled={pending}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700"
              />
              <span className="text-sm text-zinc-900 dark:text-zinc-100">
                {INTERVENTION_TYPE_LABEL[t]}
              </span>
            </label>
          );
        })}
      </div>

      <div>
        <label
          htmlFor="protocol-dose"
          className="block text-xs text-zinc-600 dark:text-zinc-400"
        >
          Dose (optional)
        </label>
        <input
          id="protocol-dose"
          type="text"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          maxLength={200}
          disabled={pending}
          placeholder="e.g. 1mg oral / 5% topical"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label
          htmlFor="protocol-frequency"
          className="block text-xs text-zinc-600 dark:text-zinc-400"
        >
          Frequency (optional)
        </label>
        <input
          id="protocol-frequency"
          type="text"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value)}
          maxLength={200}
          disabled={pending}
          placeholder="e.g. once daily / twice daily"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label
          htmlFor="protocol-prescriber"
          className="block text-xs text-zinc-600 dark:text-zinc-400"
        >
          Prescriber status (optional)
        </label>
        <select
          id="protocol-prescriber"
          value={prescriberStatus}
          onChange={(e) =>
            setPrescriberStatus(e.target.value as PrescriberStatus | '')
          }
          disabled={pending}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">— pick one —</option>
          <option value="prescribed">Prescribed by a doctor</option>
          <option value="over_the_counter">Over the counter</option>
          <option value="no_prescription">No prescription</option>
          <option value="unknown">Not sure</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="protocol-notes"
          className="block text-xs text-zinc-600 dark:text-zinc-400"
        >
          Notes (optional)
        </label>
        <textarea
          id="protocol-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          rows={2}
          disabled={pending}
          placeholder="Anything you want to remember about this protocol"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

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

// ===========================================================
// On Protocol view (active interventions OR legacy placeholder)
// ===========================================================

function OnProtocolView({
  activeInterventions,
  eventsByInterventionId = {},
  onChange,
}: {
  activeInterventions: Intervention[];
  eventsByInterventionId?: Record<string, InterventionEvent[]>;
  onChange: () => void;
}) {
  return (
    <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
          Hair-loss treatment — On protocol
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Pattern D
        </span>
      </div>

      {activeInterventions.length === 0 ? (
        // Legacy fallback: user has signals indicating on-protocol but
        // no rich intervention rows yet. Show the original placeholder
        // copy + a note that they can capture details if they want.
        <>
          <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            {PATTERN_D_ON_PROTOCOL_PLACEHOLDER_INTRO}
          </p>
          <ul className="mt-4 ml-5 list-disc space-y-1.5 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            {PATTERN_D_ON_PROTOCOL_PLACEHOLDER_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
            Tracked protocols below. Edit any of the details inline as your
            dose / frequency / prescriber relationship changes. Side-effect
            log + lab tracking are on the way.
          </p>
          <div className="mt-5 space-y-4">
            {activeInterventions.map((intervention) => (
              <InterventionCard
                key={intervention.id}
                intervention={intervention}
                events={eventsByInterventionId[intervention.id] ?? []}
                onChange={onChange}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function InterventionCard({
  intervention,
  events,
  onChange,
}: {
  intervention: Intervention;
  events: InterventionEvent[];
  onChange: () => void;
}) {
  const [editing, setEditing] = useState(false);

  // Most recent dose change drives the "Last changed" subtitle on the
  // Dose row. events arrives sorted event_at desc from the service.
  const lastDoseChange = events.find((e) => e.event_type === 'dose_change');

  if (editing) {
    return (
      <EditInterventionForm
        intervention={intervention}
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
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {INTERVENTION_TYPE_LABEL[intervention.type]}
        </h3>
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
        onChange={onChange}
      />

      <PrescriberVisitSummary intervention={intervention} events={events} />
    </article>
  );
}

// ===========================================================
// Timeline (events list + log-event form)
// ===========================================================

function Timeline({
  interventionId,
  events,
  onChange,
}: {
  interventionId: string;
  events: InterventionEvent[];
  onChange: () => void;
}) {
  const [logging, setLogging] = useState(false);

  // Hide resolved side effects from the default view but show count.
  const unresolved = events.filter(
    (e) => !(e.event_type === 'side_effect' && e.resolved_at !== null),
  );
  const resolvedCount = events.length - unresolved.length;

  return (
    <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-[13px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Timeline
        </h4>
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
            <EventRow key={event.id} event={event} onChange={onChange} />
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
  onChange,
}: {
  event: InterventionEvent;
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

  function resolve() {
    callEndpoint(
      `/api/plan/hair/pattern-d/event/${event.id}/resolve`,
      'POST',
    );
  }
  function remove() {
    callEndpoint(`/api/plan/hair/pattern-d/event/${event.id}`, 'DELETE');
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
          This is a "talk to your prescriber soon" kind of side effect, not a
          "wait and see" one. Don&rsquo;t sit on it.
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
            onClick={resolve}
            disabled={pending}
            className="text-zinc-600 underline decoration-dotted underline-offset-2 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Mark resolved
          </button>
        )}
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

// ===========================================================
// Prescriber visit summary (derived view over events)
// ===========================================================

// Window in days for "recent" labs and dose changes. The pre-visit
// conversation usually centers on what's happened since the last
// check-in; 90 days is the typical interval the prompt + content
// recommends for fin/min users.
const PRESCRIBER_SUMMARY_WINDOW_DAYS = 90;

const SEVERITY_RANK: Record<EventSeverity, number> = {
  concerning: 0,
  moderate: 1,
  mild: 2,
};

function PrescriberVisitSummary({
  intervention,
  events,
}: {
  intervention: Intervention;
  events: InterventionEvent[];
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-zinc-700 underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
        >
          Prescriber visit summary →
        </button>
      </div>
    );
  }

  const windowStart =
    Date.now() - PRESCRIBER_SUMMARY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const inWindow = (e: InterventionEvent) =>
    new Date(e.event_at).getTime() >= windowStart;

  const activeSideEffects = events
    .filter((e) => e.event_type === 'side_effect' && e.resolved_at === null)
    .sort(
      (a, b) =>
        (a.severity ? SEVERITY_RANK[a.severity] : 99) -
        (b.severity ? SEVERITY_RANK[b.severity] : 99),
    );
  const recentLabs = events.filter(
    (e) => e.event_type === 'lab_result' && inWindow(e),
  );
  const recentDoseChanges = events.filter(
    (e) => e.event_type === 'dose_change' && inWindow(e),
  );
  const recentNotes = events.filter(
    (e) => e.event_type === 'note' && inWindow(e),
  );

  return (
    <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-[13px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Prescriber visit summary
        </h4>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Close
        </button>
      </div>

      <p className="mt-2 text-[12px] text-zinc-500 dark:text-zinc-400">
        A read-off summary for your next visit. Cmd/Ctrl-P prints just this
        page if you want a copy.
      </p>

      <div className="mt-3 rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950/40">
        <SummarySection title="Current protocol">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-[13px] sm:grid-cols-2">
            <DetailRow label="Substance">
              {INTERVENTION_TYPE_LABEL[intervention.type]}
            </DetailRow>
            <DetailRow label="Started">
              {intervention.started_at
                ? new Date(intervention.started_at).toLocaleDateString(
                    undefined,
                    { year: 'numeric', month: 'short', day: 'numeric' },
                  )
                : '—'}
            </DetailRow>
            <DetailRow label="Dose">{intervention.dose ?? '—'}</DetailRow>
            <DetailRow label="Frequency">
              {intervention.frequency ?? '—'}
            </DetailRow>
            <DetailRow label="Prescriber">
              {intervention.prescriber_status
                ? PRESCRIBER_STATUS_LABEL[intervention.prescriber_status]
                : '—'}
            </DetailRow>
          </dl>
          {intervention.titration_schedule && (
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              <span className="font-semibold">Titration:</span>{' '}
              {intervention.titration_schedule}
            </p>
          )}
        </SummarySection>

        <SummarySection title="Active side effects">
          {activeSideEffects.length === 0 ? (
            <SummaryEmpty>None logged.</SummaryEmpty>
          ) : (
            <ul className="space-y-1.5 text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-200">
              {activeSideEffects.map((e) => (
                <li key={e.id}>
                  <span className="font-semibold">
                    {e.severity ? EVENT_SEVERITY_LABEL[e.severity] : 'Unknown'}
                    :
                  </span>{' '}
                  {e.title}
                  {e.body ? <> — {e.body}</> : null}{' '}
                  <span className="text-zinc-500 dark:text-zinc-400">
                    (since{' '}
                    {new Date(e.event_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                    )
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SummarySection>

        <SummarySection
          title={`Recent labs (last ${PRESCRIBER_SUMMARY_WINDOW_DAYS} days)`}
        >
          {recentLabs.length === 0 ? (
            <SummaryEmpty>None logged.</SummaryEmpty>
          ) : (
            <SummaryEventList events={recentLabs} />
          )}
        </SummarySection>

        <SummarySection
          title={`Recent dose changes (last ${PRESCRIBER_SUMMARY_WINDOW_DAYS} days)`}
        >
          {recentDoseChanges.length === 0 ? (
            <SummaryEmpty>No changes.</SummaryEmpty>
          ) : (
            <SummaryEventList events={recentDoseChanges} />
          )}
        </SummarySection>

        <SummarySection title="Notes to bring up">
          {recentNotes.length === 0 ? (
            <SummaryEmpty>
              Add a Note from the timeline above to surface a question here.
            </SummaryEmpty>
          ) : (
            <SummaryEventList events={recentNotes} />
          )}
        </SummarySection>
      </div>
    </div>
  );
}

function SummarySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-4 first:mt-0">
      <h5 className="text-[12px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {title}
      </h5>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function SummaryEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13px] text-zinc-600 dark:text-zinc-400">{children}</p>
  );
}

function SummaryEventList({ events }: { events: InterventionEvent[] }) {
  return (
    <ul className="space-y-1.5 text-[13px] leading-relaxed text-zinc-800 dark:text-zinc-200">
      {events.map((e) => (
        <li key={e.id}>
          <span className="font-semibold">{e.title}</span>
          {e.body ? <> — {e.body}</> : null}{' '}
          <span className="text-zinc-500 dark:text-zinc-400">
            (
            {new Date(e.event_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
            )
          </span>
        </li>
      ))}
    </ul>
  );
}

function LogEventForm({
  interventionId,
  onCancel,
  onLogged,
}: {
  interventionId: string;
  onCancel: () => void;
  onLogged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [eventType, setEventType] = useState<EventType>('side_effect');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [severity, setSeverity] = useState<EventSeverity | ''>('');
  // YYYY-MM-DD for the date input. Default to today.
  const [eventDate, setEventDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  function submit() {
    setError(null);
    if (title.trim().length === 0) {
      setError('Title required.');
      return;
    }
    startTransition(async () => {
      try {
        // Date input gives us YYYY-MM-DD; convert to ISO at noon UTC
        // so the date displays as the user picked it across timezones.
        const eventAt = `${eventDate}T12:00:00.000Z`;
        const res = await fetch(
          `/api/plan/hair/pattern-d/intervention/${interventionId}/event`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              event_type: eventType,
              title: title.trim(),
              body: body.trim() || null,
              event_at: eventAt,
              severity:
                eventType === 'side_effect' ? severity || null : null,
            }),
          },
        );
        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
          };
          throw new Error(
            errBody.message ??
              errBody.error ??
              `Request failed (${res.status})`,
          );
        }
        onLogged();
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  return (
    <div className="rounded-md border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950/40">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Type
          </label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value as EventType)}
            disabled={pending}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-[13px] dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="side_effect">Side effect</option>
            <option value="lab_result">Lab result</option>
            <option value="dose_change">Dose change</option>
            <option value="note">Note</option>
            <option value="check_in">Check-in</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Date
          </label>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            disabled={pending}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-[13px] dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      {eventType === 'side_effect' && (
        <div className="mt-3">
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Severity
          </label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as EventSeverity | '')}
            disabled={pending}
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-[13px] dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">— pick one —</option>
            <option value="mild">Mild — noticeable but not interfering</option>
            <option value="moderate">Moderate — affecting daily life</option>
            <option value="concerning">
              Concerning — talk to a prescriber soon
            </option>
          </select>
        </div>
      )}

      <div className="mt-3">
        <label className="block text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          disabled={pending}
          placeholder={
            eventType === 'side_effect'
              ? 'e.g. Reduced libido'
              : eventType === 'lab_result'
                ? 'e.g. Quarterly hormone panel'
                : eventType === 'dose_change'
                  ? 'e.g. Bumped to 1mg daily'
                  : 'Short label'
          }
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-[13px] dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="mt-3">
        <label className="block text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Notes (optional)
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          rows={2}
          disabled={pending}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-[13px] dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {error && (
        <p className="mt-2 text-[12px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-3.5 py-1.5 text-[12px] font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Saving…' : 'Log event'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="text-[11px] text-zinc-500 underline decoration-dotted underline-offset-2 hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Cancel
        </button>
      </div>
    </div>
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
  onCancel,
  onSaved,
}: {
  intervention: Intervention;
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
  const [notes, setNotes] = useState(intervention.notes ?? '');
  const [prescriberStatus, setPrescriberStatus] = useState<
    PrescriberStatus | ''
  >(intervention.prescriber_status ?? '');

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/plan/hair/pattern-d/intervention/${intervention.id}`,
          {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              dose: dose.trim() || null,
              frequency: frequency.trim() || null,
              titration_schedule: titration.trim() || null,
              notes: notes.trim() || null,
              prescriber_status: prescriberStatus || null,
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
    <article className="rounded-lg border border-zinc-300 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        Edit {INTERVENTION_TYPE_LABEL[intervention.type]}
      </h3>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs text-zinc-600 dark:text-zinc-400">
            Dose
          </label>
          <input
            type="text"
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            maxLength={200}
            disabled={pending}
            placeholder="e.g. 1mg oral"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-600 dark:text-zinc-400">
            Frequency
          </label>
          <input
            type="text"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            maxLength={200}
            disabled={pending}
            placeholder="e.g. once daily"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="block text-xs text-zinc-600 dark:text-zinc-400">
          Titration schedule
        </label>
        <input
          type="text"
          value={titration}
          onChange={(e) => setTitration(e.target.value)}
          maxLength={500}
          disabled={pending}
          placeholder="e.g. ramping to 2.5% over 4 weeks"
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="mt-3">
        <label className="block text-xs text-zinc-600 dark:text-zinc-400">
          Prescriber status
        </label>
        <select
          value={prescriberStatus}
          onChange={(e) =>
            setPrescriberStatus(e.target.value as PrescriberStatus | '')
          }
          disabled={pending}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">— pick one —</option>
          <option value="prescribed">Prescribed by a doctor</option>
          <option value="over_the_counter">Over the counter</option>
          <option value="no_prescription">No prescription</option>
          <option value="unknown">Not sure</option>
        </select>
      </div>

      <div className="mt-3">
        <label className="block text-xs text-zinc-600 dark:text-zinc-400">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          rows={2}
          disabled={pending}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? 'Saving…' : 'Save changes'}
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
