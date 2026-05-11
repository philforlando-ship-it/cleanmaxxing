// /plan/peptides — Pattern D surface for GH secretagogue protocols
// (sermorelin / CJC-1295 + ipamorelin / tesamorelin).
//
// State machine driven by interventions table rows of type 'peptide':
//   1. No peptide row at all                   → Considering view
//   2. ≥1 active (on_protocol or paused)       → On Protocol view
//      (tab exposes Off-ramp pre-stop reading)
//   3. All peptide rows status='off'           → Off-ramp view
//      (already-off mode — history visible, end button hidden)
//
// Backwards-compat: if user has 'peptide' in user_profile.current_interventions
// without a rich intervention row yet, the On Protocol view shows the
// "capture details" prompt and Considering is reachable at
// /plan/peptides?phase=considering.
//
// No screening gate. TRT has a hard medical eligibility gate because
// the under-25 case is unambiguous; peptides are advanced-tools
// territory but don't have the same single-axis eligibility cliff.
// The Considering content itself does the gatekeeping via the
// foundations-test section.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import {
  listEventsForInterventions,
  listInterventions,
} from '@/lib/interventions/service';
import type { InterventionEvent } from '@/lib/interventions/types';
import { getUserProfile } from '@/lib/profile/service';
import { PEPTIDES_TOPIC } from '@/lib/pattern-d/topics/peptides';
import { ConsideringSection } from '@/components/pattern-d/considering-section';
import { OnProtocolSection } from '@/components/pattern-d/on-protocol-section';
import { OffRampSection } from '@/components/pattern-d/off-ramp-section';

const PEPTIDES_API_BASE = '/api/plan/pattern-d/peptides';

type Props = {
  searchParams: Promise<{ phase?: string }>;
};

export default async function PeptidesPlanPage({ searchParams }: Props) {
  const params = await searchParams;
  const explicitPhase = params.phase;

  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const [allInterventions, profile] = await Promise.all([
    listInterventions(supabase, user.id),
    getUserProfile(supabase, user.id),
  ]);

  const peptideRows = allInterventions.filter((i) => i.type === 'peptide');
  const activeRows = peptideRows.filter(
    (i) => i.status === 'on_protocol' || i.status === 'paused',
  );
  const offRows = peptideRows.filter((i) => i.status === 'off');

  const idsToHydrate = [...activeRows, ...offRows].map((i) => i.id);
  const eventMap = await listEventsForInterventions(supabase, user.id, idsToHydrate);
  const eventsByInterventionId: Record<string, InterventionEvent[]> = {};
  for (const id of idsToHydrate) {
    eventsByInterventionId[id] = eventMap.get(id) ?? [];
  }

  let phase: 'considering' | 'on_protocol' | 'off_ramp';
  if (activeRows.length > 0) {
    phase = explicitPhase === 'off_ramp' ? 'off_ramp' : 'on_protocol';
  } else if (offRows.length > 0 && peptideRows.length === offRows.length) {
    phase = 'off_ramp';
  } else if (
    profile.current_interventions.includes('peptide') &&
    activeRows.length === 0
  ) {
    phase = explicitPhase === 'considering' ? 'considering' : 'on_protocol';
  } else {
    phase = explicitPhase === 'on_protocol' ? 'on_protocol' : 'considering';
  }

  const onLegacyOnly =
    profile.current_interventions.includes('peptide') && activeRows.length === 0;

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
          {PEPTIDES_TOPIC.title}
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          A guided surface for the three phases of a GH-secretagogue protocol —
          considering it, running it with the single-compound discipline this
          category actually requires, and the (usually uneventful) exit if you
          come off.{' '}
          <Link
            href={`/povs/${PEPTIDES_TOPIC.povSlug}`}
            className="underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Read the full POV
          </Link>{' '}
          for the unfiltered source material.
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
          content={PEPTIDES_TOPIC.considering}
          prescriberOptions={PEPTIDES_TOPIC.startFormPrescriberStatuses}
          topicShortName={PEPTIDES_TOPIC.shortName}
          apiBasePath={PEPTIDES_API_BASE}
        />
      )}

      {phase === 'on_protocol' && (
        <OnProtocolSection
          content={PEPTIDES_TOPIC.onProtocol}
          prescriberOptions={PEPTIDES_TOPIC.startFormPrescriberStatuses}
          activeInterventions={activeRows}
          eventsByInterventionId={eventsByInterventionId}
          onLegacyOnly={onLegacyOnly}
          topicShortName={PEPTIDES_TOPIC.shortName}
          topicLowerName="peptide"
          apiBasePath={PEPTIDES_API_BASE}
          legacyStartButtonLabel={PEPTIDES_TOPIC.considering.startProtocolButtonLabel}
        />
      )}

      {phase === 'off_ramp' && (
        <OffRampSection
          content={PEPTIDES_TOPIC.offRamp}
          interventions={[...activeRows, ...offRows]}
          alreadyOff={
            peptideRows.length > 0 && activeRows.length === 0 && offRows.length > 0
          }
          topicShortName={PEPTIDES_TOPIC.shortName}
          topicLowerName="peptide"
          topicPagePath="/plan/peptides"
          endsWithCopy="Mister P's prompt context returns to non-peptide framing for nutrition, strength, sleep, and other journeys from that point."
          apiBasePath={PEPTIDES_API_BASE}
        />
      )}
    </main>
  );
}

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
            href={`/plan/peptides?phase=${tab.phase}`}
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
