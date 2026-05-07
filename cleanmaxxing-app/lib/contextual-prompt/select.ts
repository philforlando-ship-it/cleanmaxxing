// Orchestrator for the Area 2 contextual prompt selector. Same
// pattern as lib/today/primary-action-picker — gather state in
// one parallel fetch, run pure detectors in priority order,
// return the first match or null.
//
// Returns ZERO or ONE prompt. Per the design constraint: an
// empty Area 2 is better than filler.
//
// Priority order (commit):
//   1. skipped_check_ins  (most urgent — disengagement signal)
//   2. process_adherence_declining  (slow-burn signal — Phase F replacement for the legacy confidence-declining detector)
//   3. glp1_hydration  (modifier-driven, gentle reminder)
//   4. sleep_variance_high  (recovery context for active lifters)

import type { SupabaseClient } from '@supabase/supabase-js';
import { getProtocolRollup } from '@/lib/interventions/service';
import { getWeeklyReflectionState } from '@/lib/weekly-reflection/service';
import type { PrimaryActionKind } from '@/lib/today/types';
import {
  detectGlp1Active,
  detectProcessAdherenceDeclining,
  detectSkippedCheckIns,
  detectSleepVarianceHigh,
} from './prompts';
import {
  copyGlp1Hydration,
  copyProcessAdherenceDeclining,
  copySkippedCheckIns,
  copySleepVarianceHigh,
} from './copy';
import {
  PRIMARY_ACTION_INCOMPATIBILITIES,
  type ContextualPrompt,
  type ContextualPromptKind,
} from './types';

export async function selectContextualPrompt(
  supabase: SupabaseClient,
  userId: string,
  primaryActionKind: PrimaryActionKind,
  todayAppDay: string,
): Promise<ContextualPrompt | null> {
  // Skip Area 2 entirely when the user is stepped away — they've
  // explicitly opted out of nudges.
  if (primaryActionKind === 'stepped_away') return null;

  const sevenDaysAgoIso = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .slice(0, 10);

  const [
    { data: latestCheckIn },
    reflectionState,
    glp1Rollup,
    { data: sleepRows },
  ] = await Promise.all([
    supabase
      .from('check_ins')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    getWeeklyReflectionState(supabase, userId),
    getProtocolRollup(supabase, userId, 'glp1'),
    supabase
      .from('sleep_logs')
      .select('total_hours')
      .eq('user_id', userId)
      .gte('on_date', sevenDaysAgoIso)
      .order('on_date', { ascending: false })
      .limit(7),
  ]);

  // ===== Bucket 1 — skipped_check_ins =====
  if (canFire('skipped_check_ins', primaryActionKind)) {
    const result = detectSkippedCheckIns({
      latestCheckInDate:
        (latestCheckIn as { date: string } | null)?.date ?? null,
      todayAppDay,
    });
    if (result.fires) {
      return copySkippedCheckIns(result.daysSince);
    }
  }

  // ===== Bucket 2 — process_adherence_declining (Phase F) =====
  if (canFire('process_adherence_declining', primaryActionKind)) {
    const result = detectProcessAdherenceDeclining(reflectionState.history);
    if (result.fires) {
      return copyProcessAdherenceDeclining({
        weeksDeclining: result.weeksDeclining,
        decliningJourneysCount: result.decliningJourneys.length,
      });
    }
  }

  // ===== Bucket 3 — glp1_hydration =====
  if (canFire('glp1_hydration', primaryActionKind)) {
    const result = detectGlp1Active({
      hasActiveGlp1: glp1Rollup === 'on_protocol',
    });
    if (result.fires) {
      return copyGlp1Hydration();
    }
  }

  // ===== Bucket 4 — sleep_variance_high =====
  if (canFire('sleep_variance_high', primaryActionKind)) {
    const totalHours = ((sleepRows ?? []) as Array<{
      total_hours: number | null;
    }>)
      .map((r) => r.total_hours)
      .filter((h): h is number => h != null);
    const result = detectSleepVarianceHigh({ recentTotalHours: totalHours });
    if (result.fires) {
      return copySleepVarianceHigh(result.sdHours);
    }
  }

  return null;
}

function canFire(
  kind: ContextualPromptKind,
  primaryActionKind: PrimaryActionKind,
): boolean {
  return !PRIMARY_ACTION_INCOMPATIBILITIES[kind].includes(primaryActionKind);
}
