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
//   3. sleep_deficit_7d  (substrate-level — affects every other journey; C1 from May 7 brain dump)
//   4. glp1_hydration  (modifier-driven, gentle reminder)
//   5. sleep_variance_high  (recovery context for active lifters)

import type { SupabaseClient } from '@supabase/supabase-js';
import { getProtocolRollup } from '@/lib/interventions/service';
import { getWeeklyReflectionState } from '@/lib/weekly-reflection/service';
import type { PrimaryActionKind } from '@/lib/today/types';
import { getSleepAssessment } from '@/lib/sleep/service';
import {
  detectGlp1Active,
  detectProcessAdherenceDeclining,
  detectSkippedCheckIns,
  detectSleepDeficit7d,
  detectSleepVarianceHigh,
} from './prompts';
import {
  copyGlp1Hydration,
  copyProcessAdherenceDeclining,
  copySkippedCheckIns,
  copySleepDeficit7d,
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
    sleepAssessment,
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
    // Pulled so the sleep_deficit_7d copy can hint at the user's
    // primary blocker. Null when the user hasn't completed the
    // sleep assessment — the prompt still fires, just without the
    // blocker-specific tail.
    getSleepAssessment(supabase, userId),
  ]);

  const recentSleepHours = ((sleepRows ?? []) as Array<{
    total_hours: number | null;
  }>)
    .map((r) => r.total_hours)
    .filter((h): h is number => h != null);

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

  // ===== Bucket 3 — sleep_deficit_7d (C1) =====
  // Sleep deficit is substrate-level: it caps strength recovery,
  // hunger control, mood. Fires above glp1_hydration and
  // sleep_variance_high because the floor failing matters more than
  // either modifier reminder or recovery noise.
  if (canFire('sleep_deficit_7d', primaryActionKind)) {
    const result = detectSleepDeficit7d({
      recentTotalHours: recentSleepHours,
    });
    if (result.fires) {
      // First entry in biggest_blockers is the primary; copy uses
      // it for the inline blocker hint. Null when no assessment.
      const primaryBlocker =
        sleepAssessment?.biggest_blockers?.[0] ?? null;
      return copySleepDeficit7d({
        avgHours: result.avgHours,
        severity: result.severity,
        primaryBlocker,
      });
    }
  }

  // ===== Bucket 4 — glp1_hydration =====
  if (canFire('glp1_hydration', primaryActionKind)) {
    const result = detectGlp1Active({
      hasActiveGlp1: glp1Rollup === 'on_protocol',
    });
    if (result.fires) {
      return copyGlp1Hydration();
    }
  }

  // ===== Bucket 5 — sleep_variance_high =====
  if (canFire('sleep_variance_high', primaryActionKind)) {
    const result = detectSleepVarianceHigh({
      recentTotalHours: recentSleepHours,
    });
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
