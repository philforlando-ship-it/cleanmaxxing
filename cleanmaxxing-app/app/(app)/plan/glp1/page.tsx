// /plan/glp1 — Pattern D surface for GLP-1 medications.
//
// State machine driven by the user's interventions table rows of type
// 'glp1':
//   1. No glp1 row at all                     → Considering view
//   2. ≥1 active (on_protocol or paused)      → On Protocol view
//      (page exposes a tab to flip to Off-ramp pre-stop reading)
//   3. All glp1 rows status='off'             → Off-ramp view
//      (already-off mode — history visible, end button hidden)
//
// Backwards-compat: if the user has 'glp1' in user_profile.current_interventions
// but no rich intervention row yet, the On Protocol view shows the
// "capture details" prompt and the Considering surface is also
// reachable via the same /plan/glp1?phase=considering URL.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import {
  listEventsForInterventions,
  listInterventions,
} from '@/lib/interventions/service';
import type { InterventionEvent } from '@/lib/interventions/types';
import { getUserProfile } from '@/lib/profile/service';
import { GLP1_TOPIC } from '@/lib/pattern-d/topics/glp1';
import { ConsideringSection } from '@/components/pattern-d/considering-section';
import { OnProtocolSection } from '@/components/pattern-d/on-protocol-section';
import { OffRampSection } from '@/components/pattern-d/off-ramp-section';

const GLP1_API_BASE = '/api/plan/pattern-d/glp1';

type Props = {
  searchParams: Promise<{ phase?: string }>;
};

export default async function Glp1PlanPage({ searchParams }: Props) {
  const params = await searchParams;
  const explicitPhase = params.phase;

  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const [allInterventions, profile] = await Promise.all([
    listInterventions(supabase, user.id),
    getUserProfile(supabase, user.id),
  ]);

  const glp1Rows = allInterventions.filter((i) => i.type === 'glp1');
  const activeRows = glp1Rows.filter(
    (i) => i.status === 'on_protocol' || i.status === 'paused',
  );
  const offRows = glp1Rows.filter((i) => i.status === 'off');

  // Hydrate events for active + off rows so the Off-ramp view can show
  // the prior history without an extra round-trip.
  const idsToHydrate = [...activeRows, ...offRows].map((i) => i.id);
  const eventMap = await listEventsForInterventions(supabase, user.id, idsToHydrate);
  const eventsByInterventionId: Record<string, InterventionEvent[]> = {};
  for (const id of idsToHydrate) {
    eventsByInterventionId[id] = eventMap.get(id) ?? [];
  }

  // Default phase derivation when ?phase= isn't pinned.
  let phase: 'considering' | 'on_protocol' | 'off_ramp';
  if (activeRows.length > 0) {
    phase = explicitPhase === 'off_ramp' ? 'off_ramp' : 'on_protocol';
  } else if (offRows.length > 0 && glp1Rows.length === offRows.length) {
    phase = 'off_ramp';
  } else if (
    profile.current_interventions.includes('glp1') &&
    activeRows.length === 0
  ) {
    // Legacy-only user — no rich rows but flagged as on glp1. Default
    // them to On Protocol with the legacy-only fallback copy in the
    // section. They can still hit ?phase=considering to read the
    // Considering surface.
    phase = explicitPhase === 'considering' ? 'considering' : 'on_protocol';
  } else {
    phase = explicitPhase === 'on_protocol' ? 'on_protocol' : 'considering';
  }

  const onLegacyOnly =
    profile.current_interventions.includes('glp1') && activeRows.length === 0;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/today"
        className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
      >
        ← Back to Today
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {GLP1_TOPIC.title}
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          A guided surface for the three phases of a GLP-1 cycle —
          considering it, running the protocol, stepping off without the
          rebound.{' '}
          <Link
            href={`/povs/${GLP1_TOPIC.povSlug}`}
            className="underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Read the full POV
          </Link>{' '}
          for the unfiltered version of the source material.
        </p>
      </header>

      {(activeRows.length > 0 || onLegacyOnly) && (
        <PhaseTabs
          activePhase={phase}
          showConsidering={false}
          showOffRamp={true}
        />
      )}

      {phase === 'considering' && (
        <ConsideringSection
          content={GLP1_TOPIC.considering}
          prescriberOptions={GLP1_TOPIC.startFormPrescriberStatuses}
          topicShortName={GLP1_TOPIC.shortName}
          apiBasePath={GLP1_API_BASE}
        />
      )}

      {phase === 'on_protocol' && (
        <OnProtocolSection
          content={GLP1_TOPIC.onProtocol}
          prescriberOptions={GLP1_TOPIC.startFormPrescriberStatuses}
          activeInterventions={activeRows}
          eventsByInterventionId={eventsByInterventionId}
          onLegacyOnly={onLegacyOnly}
          topicShortName={GLP1_TOPIC.shortName}
          topicLowerName="a GLP-1"
          apiBasePath={GLP1_API_BASE}
          legacyStartButtonLabel={GLP1_TOPIC.considering.startProtocolButtonLabel}
        />
      )}

      {phase === 'off_ramp' && (
        <OffRampSection
          content={GLP1_TOPIC.offRamp}
          interventions={[...activeRows, ...offRows]}
          alreadyOff={
            glp1Rows.length > 0 && activeRows.length === 0 && offRows.length > 0
          }
          topicShortName={GLP1_TOPIC.shortName}
          topicLowerName="GLP-1"
          topicPagePath="/plan/glp1"
          endsWithCopy="Your nutrition and strength plans return to their non-GLP-1 framing from that point."
          apiBasePath={GLP1_API_BASE}
        />
      )}
    </main>
  );
}

// Tab strip for switching between On Protocol and Off-ramp views once
// a protocol is active. Considering doesn't get a tab — it's the
// pre-protocol view, only reachable via direct URL once a protocol
// exists.
function PhaseTabs({
  activePhase,
  showConsidering,
  showOffRamp,
}: {
  activePhase: 'considering' | 'on_protocol' | 'off_ramp';
  showConsidering: boolean;
  showOffRamp: boolean;
}) {
  const tabs: { phase: typeof activePhase; label: string }[] = [];
  if (showConsidering) tabs.push({ phase: 'considering', label: 'Considering' });
  tabs.push({ phase: 'on_protocol', label: 'On protocol' });
  if (showOffRamp) tabs.push({ phase: 'off_ramp', label: 'Off-ramp' });

  return (
    <nav className="mt-6 flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
      {tabs.map((tab) => {
        const active = tab.phase === activePhase;
        return (
          <Link
            key={tab.phase}
            href={`/plan/glp1?phase=${tab.phase}`}
            className={
              active
                ? 'border-b-2 border-zinc-900 px-3 py-2 text-sm font-medium text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                : 'border-b-2 border-transparent px-3 py-2 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
