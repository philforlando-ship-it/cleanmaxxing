// Style assessments service. Mirrors lib/hair/service.ts shape so the
// Pattern A framework's CRUD pattern stays recognizable across topics.

import type { SupabaseClient } from '@supabase/supabase-js';
import { getUserProfile } from '@/lib/profile/service';
import type {
  ArmLength,
  Build,
  ClosetAuditSelections,
  FrameDensity,
  LegLength,
  ShoulderWidth,
  SkinUndertone,
  StyleAssessment,
  StyleAssessmentInput,
  StyleReportInputModifiers,
} from './types';
import { deriveFrameEstimate } from './types';

export async function getStyleAssessment(
  supabase: SupabaseClient,
  userId: string,
): Promise<StyleAssessment | null> {
  const { data, error } = await supabase
    .from('style_assessments')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToAssessment(data);
}

export async function hasStyleAssessment(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ hasAssessment: boolean; hasReport: boolean }> {
  const { data, error } = await supabase
    .from('style_assessments')
    .select('user_id, report_generated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { hasAssessment: false, hasReport: false };
  return {
    hasAssessment: true,
    hasReport: data.report_generated_at !== null,
  };
}

// Richer state used by the /today style tile and /plan/style page.
// Bundles the assessment row + staleness reasons (computed against
// the user's current profile + age) so the UI has everything it
// needs in one fetch.
export type StyleTodayCardState =
  | { kind: 'no_assessment' }
  | { kind: 'no_report' }
  | { kind: 'stage_1_pending' }
  | { kind: 'stage_2_pending' }
  | { kind: 'stage_3_pending' }
  | { kind: 'all_done'; staleness: StyleStalenessReason[] };

export async function getStyleTodayCardState(
  supabase: SupabaseClient,
  userId: string,
): Promise<StyleTodayCardState> {
  const assessment = await getStyleAssessment(supabase, userId);
  if (!assessment) return { kind: 'no_assessment' };
  if (!assessment.report_text) return { kind: 'no_report' };

  if (!assessment.stage_1_completed_at) return { kind: 'stage_1_pending' };
  if (!assessment.stage_2_completed_at) return { kind: 'stage_2_pending' };
  if (!assessment.stage_3_acknowledged_at) return { kind: 'stage_3_pending' };

  // All stages done — check for modifier drift.
  const profile = await getUserProfile(supabase, userId);
  const { data: userRow } = await supabase
    .from('users')
    .select('age')
    .eq('id', userId)
    .maybeSingle();
  const age = (userRow as { age: number | null } | null)?.age ?? null;

  const staleness = isStyleReportStale(assessment.report_input_modifiers, {
    bf_pct_self_estimate: profile.bf_pct_self_estimate,
    budget_tier: profile.budget_tier,
    current_interventions: profile.current_interventions,
    age,
  });

  return { kind: 'all_done', staleness };
}

export async function saveStyleAssessment(
  supabase: SupabaseClient,
  userId: string,
  input: StyleAssessmentInput,
): Promise<StyleAssessment> {
  // Migration 0093 (2026-05-09) — derive the legacy frame_estimate
  // from the v2 granular fields server-side. Downstream consumers
  // (cut-menu density, foundation-pieces, prompt rules branched on
  // frame_estimate) keep working unchanged.
  const frame_estimate = deriveFrameEstimate(input.shoulder_width, input.build);

  const row = {
    user_id: userId,
    shoulder_width: input.shoulder_width,
    arm_length: input.arm_length,
    leg_length: input.leg_length,
    build: input.build,
    frame_density: input.frame_density,
    skin_undertone: input.skin_undertone,
    eye_color: input.eye_color,
    frame_estimate,
    current_archetype: input.current_archetype,
    target_archetype: input.target_archetype,
    closet_state: input.closet_state,
    style_goal_text: input.style_goal_text,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('style_assessments')
    .upsert(row, { onConflict: 'user_id' })
    .select('*')
    .single();
  if (error) throw error;
  return rowToAssessment(data);
}

export async function saveStyleReport(
  supabase: SupabaseClient,
  userId: string,
  args: {
    report_text: string;
    report_model: string;
    report_input_modifiers: StyleReportInputModifiers;
  },
): Promise<void> {
  const { error } = await supabase
    .from('style_assessments')
    .update({
      report_text: args.report_text,
      report_generated_at: new Date().toISOString(),
      report_model: args.report_model,
      report_input_modifiers: args.report_input_modifiers,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

// ===== Stage 1 — closet audit =====

export async function saveStyleStage1Audit(
  supabase: SupabaseClient,
  userId: string,
  args: {
    chip_selections: ClosetAuditSelections;
    audit_text: string;
  },
): Promise<void> {
  // 2026-05-09 — re-running the audit clears stage_1_completed_at so
  // the user reads the new audit text in State 2 and re-acknowledges.
  // Stage 2 + Stage 3 progress is preserved (they have their own
  // completed_at fields). The "Edit closet audit" affordance on the
  // stage-1 card depends on this reset.
  const { error } = await supabase
    .from('style_assessments')
    .update({
      stage_1_chip_selections: args.chip_selections,
      stage_1_audit_text: args.audit_text,
      stage_1_generated_at: new Date().toISOString(),
      stage_1_completed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function completeStyleStage1(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('style_assessments')
    .update({
      stage_1_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

// ===== Stage 2 — foundation pieces =====

export async function toggleFoundationPiece(
  supabase: SupabaseClient,
  userId: string,
  args: { piece_slug: string; acquired: boolean },
): Promise<{ pieces_acquired: string[] }> {
  const { data: row, error: fetchErr } = await supabase
    .from('style_assessments')
    .select('stage_2_pieces_acquired')
    .eq('user_id', userId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!row) throw new Error('No style assessment row to update.');

  const current = (row.stage_2_pieces_acquired as string[] | null) ?? [];
  const next = args.acquired
    ? Array.from(new Set([...current, args.piece_slug]))
    : current.filter((s) => s !== args.piece_slug);

  const { error } = await supabase
    .from('style_assessments')
    .update({
      stage_2_pieces_acquired: next,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
  return { pieces_acquired: next };
}

export async function completeStyleStage2(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('style_assessments')
    .update({
      stage_2_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

// ===== Stage 3 — fit calibration =====

export async function acknowledgeStyleStage3(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from('style_assessments')
    .update({
      stage_3_acknowledged_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
  if (error) throw error;
}

// ===== Cross-journey staleness =====

// Bucket age into bands so a one-year tick doesn't mark the report
// stale. The 45+ band activates the Style Past 45 register; the 35-44
// band tilts the early calibration warning. Crossing either boundary
// counts as a meaningful change.
type AgeBand = 'under_35' | '35_to_44' | '45_plus' | 'unknown';
function ageBand(age: number | null | undefined): AgeBand {
  if (age == null) return 'unknown';
  if (age >= 45) return '45_plus';
  if (age >= 35) return '35_to_44';
  return 'under_35';
}

// Style v2 Phase 4 (2026-05-09) — bucket bf_pct_self_estimate into
// silhouette-relevant tiers so the staleness check fires the
// SPECIFIC bf-drift signal (not just any bf_pct change) when the
// body has drifted enough that silhouette / archetype-feasibility
// rules would actually change. The five enum bands collapse onto
// four silhouette tiers per POV 12's framework (lean / athletic /
// soft / heavy).
type BfSilhouetteTier =
  | 'lean'
  | 'athletic'
  | 'soft'
  | 'heavy'
  | 'unknown';
function bfSilhouetteTier(
  bf_pct: string | null | undefined,
): BfSilhouetteTier {
  if (!bf_pct) return 'unknown';
  switch (bf_pct) {
    case 'under_12':
    case '12_to_15':
      return 'lean';
    case '15_to_20':
      return 'athletic';
    case '20_to_25':
      return 'soft';
    case 'over_25':
      return 'heavy';
    default:
      return 'unknown';
  }
}

export type StyleStalenessReason =
  | 'bf_pct_changed'
  | 'bf_drift_silhouette'
  | 'budget_tier_changed'
  | 'interventions_changed'
  | 'age_band_changed';

// Compares a generated report's snapshotted input_modifiers against
// the current profile + age. Returns the list of reasons the report
// is considered stale. Empty array means fresh.
//
// Used in two places: the /today style tile (surfaces a refresh
// prompt) and the /plan/style page (renders a banner above the
// report). Pure function — no DB calls — so callers fetch profile +
// age once and pass them in.
export function isStyleReportStale(
  modifiers: StyleReportInputModifiers | null,
  current: {
    bf_pct_self_estimate: string | null;
    budget_tier: string | null;
    current_interventions: string[];
    age: number | null;
  },
): StyleStalenessReason[] {
  if (!modifiers) return [];
  const reasons: StyleStalenessReason[] = [];

  if (modifiers.bf_pct_self_estimate !== current.bf_pct_self_estimate) {
    reasons.push('bf_pct_changed');
    // Phase 4 — fire the silhouette-specific drift reason when the
    // bf change is big enough to cross a silhouette tier (lean →
    // athletic → soft → heavy). This is the signal that POV 12's
    // silhouette rules + the Phase 2b archetype-feasibility tier
    // would actually recommend differently. A one-band move within
    // the same tier (e.g., 'under_12' ↔ '12_to_15') keeps the
    // generic bf_pct_changed only.
    const prevTier = bfSilhouetteTier(modifiers.bf_pct_self_estimate);
    const nowTier = bfSilhouetteTier(current.bf_pct_self_estimate);
    if (
      prevTier !== nowTier &&
      prevTier !== 'unknown' &&
      nowTier !== 'unknown'
    ) {
      reasons.push('bf_drift_silhouette');
    }
  }
  if (modifiers.budget_tier !== current.budget_tier) {
    reasons.push('budget_tier_changed');
  }

  const prev = [...modifiers.current_interventions].sort().join(',');
  const now = [...current.current_interventions].sort().join(',');
  if (prev !== now) reasons.push('interventions_changed');

  if (ageBand(modifiers.age) !== ageBand(current.age)) {
    reasons.push('age_band_changed');
  }

  return reasons;
}

function rowToAssessment(row: unknown): StyleAssessment {
  const r = row as Record<string, unknown>;
  return {
    user_id: r.user_id as string,
    shoulder_width: (r.shoulder_width as ShoulderWidth | null) ?? null,
    arm_length: (r.arm_length as ArmLength | null) ?? null,
    leg_length: (r.leg_length as LegLength | null) ?? null,
    build: (r.build as Build | null) ?? null,
    frame_density: (r.frame_density as FrameDensity | null) ?? null,
    skin_undertone: (r.skin_undertone as SkinUndertone | null) ?? null,
    eye_color: (r.eye_color as StyleAssessment['eye_color']) ?? null,
    frame_estimate: r.frame_estimate as StyleAssessment['frame_estimate'],
    current_archetype:
      r.current_archetype as StyleAssessment['current_archetype'],
    target_archetype:
      r.target_archetype as StyleAssessment['target_archetype'],
    closet_state: r.closet_state as StyleAssessment['closet_state'],
    style_goal_text: (r.style_goal_text as string | null) ?? null,
    report_text: (r.report_text as string | null) ?? null,
    report_generated_at:
      (r.report_generated_at as string | null) ?? null,
    report_model: (r.report_model as string | null) ?? null,
    report_input_modifiers:
      (r.report_input_modifiers as StyleReportInputModifiers | null) ?? null,
    stage_1_chip_selections:
      (r.stage_1_chip_selections as ClosetAuditSelections | null) ?? null,
    stage_1_audit_text: (r.stage_1_audit_text as string | null) ?? null,
    stage_1_generated_at:
      (r.stage_1_generated_at as string | null) ?? null,
    stage_1_completed_at:
      (r.stage_1_completed_at as string | null) ?? null,
    stage_2_pieces_acquired:
      (r.stage_2_pieces_acquired as string[] | null) ?? [],
    stage_2_completed_at:
      (r.stage_2_completed_at as string | null) ?? null,
    stage_3_acknowledged_at:
      (r.stage_3_acknowledged_at as string | null) ?? null,
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  };
}
