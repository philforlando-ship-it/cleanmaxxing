// /plan/trt — Pattern D surface for testosterone replacement therapy.
//
// State machine driven by the user's interventions table rows of type
// 'trt':
//   1. No trt row at all                      → Considering view
//   2. ≥1 active (on_protocol or paused)      → On Protocol view
//      (page exposes a tab to flip to Off-ramp pre-stop reading)
//   3. All trt rows status='off'              → Off-ramp view
//      (already-off mode — history visible, end button hidden)
//
// Backwards-compat: if the user has 'trt' in user_profile.current_interventions
// but no rich intervention row yet, the On Protocol view shows the
// "capture details" prompt and the Considering surface is also
// reachable via the same /plan/trt?phase=considering URL.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import {
  listEventsForInterventions,
  listInterventions,
} from '@/lib/interventions/service';
import type { InterventionEvent } from '@/lib/interventions/types';
import { getUserProfile } from '@/lib/profile/service';
import { TRT_TOPIC } from '@/lib/pattern-d/topics/trt';
import { ConsideringSection } from '@/components/pattern-d/considering-section';
import { OnProtocolSection } from '@/components/pattern-d/on-protocol-section';
import { OffRampSection } from '@/components/pattern-d/off-ramp-section';
import { TrtScreeningGate } from './screening-gate';

const TRT_API_BASE = '/api/plan/pattern-d/trt';
const TRT_SCREENING_KEY = 'trt_screening_v1';

type Props = {
  searchParams: Promise<{ phase?: string }>;
};

export default async function TrtPlanPage({ searchParams }: Props) {
  const params = await searchParams;
  const explicitPhase = params.phase;

  const user = await getUser();
  if (!user) redirect('/login');
  const supabase = await createClient();

  const [allInterventions, profile, { data: screeningRow }] = await Promise.all([
    listInterventions(supabase, user.id),
    getUserProfile(supabase, user.id),
    supabase
      .from('survey_responses')
      .select('response_value')
      .eq('user_id', user.id)
      .eq('question_key', TRT_SCREENING_KEY)
      .maybeSingle(),
  ]);
  const hasCompletedScreening = screeningRow?.response_value != null;

  const trtRows = allInterventions.filter((i) => i.type === 'trt');
  const activeRows = trtRows.filter(
    (i) => i.status === 'on_protocol' || i.status === 'paused',
  );
  const offRows = trtRows.filter((i) => i.status === 'off');

  const idsToHydrate = [...activeRows, ...offRows].map((i) => i.id);
  const eventMap = await listEventsForInterventions(supabase, user.id, idsToHydrate);
  const eventsByInterventionId: Record<string, InterventionEvent[]> = {};
  for (const id of idsToHydrate) {
    eventsByInterventionId[id] = eventMap.get(id) ?? [];
  }

  let phase: 'considering' | 'on_protocol' | 'off_ramp';
  if (activeRows.length > 0) {
    phase = explicitPhase === 'off_ramp' ? 'off_ramp' : 'on_protocol';
  } else if (offRows.length > 0 && trtRows.length === offRows.length) {
    phase = 'off_ramp';
  } else if (
    profile.current_interventions.includes('trt') &&
    activeRows.length === 0
  ) {
    phase = explicitPhase === 'considering' ? 'considering' : 'on_protocol';
  } else {
    phase = explicitPhase === 'on_protocol' ? 'on_protocol' : 'considering';
  }

  const onLegacyOnly =
    profile.current_interventions.includes('trt') && activeRows.length === 0;

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
          {TRT_TOPIC.title}
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          A guided surface for the three phases of TRT — considering it, running
          the protocol with the monitoring discipline it requires, and the
          structured exit if you ever come off.{' '}
          <Link
            href={`/povs/${TRT_TOPIC.povSlug}`}
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

      {phase === 'considering' && !hasCompletedScreening && (
        <TrtScreeningGate />
      )}

      {phase === 'considering' && hasCompletedScreening && (
        <ConsideringSection
          content={TRT_TOPIC.considering}
          prescriberOptions={TRT_TOPIC.startFormPrescriberStatuses}
          topicShortName={TRT_TOPIC.shortName}
          apiBasePath={TRT_API_BASE}
        />
      )}

      {phase === 'on_protocol' && (
        <OnProtocolSection
          content={TRT_TOPIC.onProtocol}
          prescriberOptions={TRT_TOPIC.startFormPrescriberStatuses}
          activeInterventions={activeRows}
          eventsByInterventionId={eventsByInterventionId}
          onLegacyOnly={onLegacyOnly}
          topicShortName={TRT_TOPIC.shortName}
          topicLowerName="TRT"
          apiBasePath={TRT_API_BASE}
          legacyStartButtonLabel={TRT_TOPIC.considering.startProtocolButtonLabel}
        />
      )}

      {phase === 'off_ramp' && (
        <OffRampSection
          content={TRT_TOPIC.offRamp}
          interventions={[...activeRows, ...offRows]}
          alreadyOff={
            trtRows.length > 0 && activeRows.length === 0 && offRows.length > 0
          }
          topicShortName={TRT_TOPIC.shortName}
          topicLowerName="TRT"
          topicPagePath="/plan/trt"
          endsWithCopy="Mister P's prompt context returns to non-TRT framing for nutrition, strength, and other journeys from that point."
          apiBasePath={TRT_API_BASE}
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
            href={`/plan/trt?phase=${tab.phase}`}
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
