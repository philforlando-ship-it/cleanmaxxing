/**
 * Per-user journey-state snapshot for Mister P's prompt.
 *
 * The L1 audit + the strategic-notes Group A "detour" theme both point
 * at the same architectural gap: Mister P answers questions without
 * knowing which journeys the user is on or where they are in each.
 * That's why he can't handle "front raises are killing my shoulders"
 * (needs strength state) or "I started moisturizer and my face is
 * breaking out" (needs skincare state) without going generic.
 *
 * This module fetches a compact snapshot of every journey's
 * load-bearing state in parallel. Compact is intentional — F1 latency
 * is a real concern; we keep the block tight by extracting only the
 * fields the prompt actually branches on.
 *
 * Excluded from this snapshot (already covered elsewhere):
 *   - Sleep recent state (in user-state.ts via getSleepState)
 *   - Workout cadence (in user-state.ts via getWorkoutState)
 *   - Confidence trajectory (in user-state.ts)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type MisterPJourneyState = {
  hair: HairJourneySnapshot | null;
  style: StyleJourneySnapshot | null;
  nutrition: NutritionJourneySnapshot | null;
  strength: StrengthJourneySnapshot | null;
  cardio: CardioJourneySnapshot | null;
  skincare: SkincareJourneySnapshot | null;
  facial_hair: FacialHairJourneySnapshot | null;
  // Active Pattern D / pharmacological protocols. Each entry is a
  // single intervention with its current status. Empty when none.
  active_protocols: ProtocolSnapshot[];
  // Photo capture state across the user's lifecycle. Lets Mister P
  // answer "did I capture my 90d?" intelligently without guessing.
  photos: PhotoStateSnapshot;
};

type PhotoStateSnapshot = {
  // Face photos by milestone (boolean per slot).
  face_baseline: boolean;
  face_progress_30d: boolean;
  face_progress_90d: boolean;
  face_progress_180d: boolean;
  // Body photos — count rather than per-slot since the user may have
  // multiple angles per slot and the prompt mostly cares about
  // "any body photos at all" + "most recent."
  body_photos_count: number;
  body_most_recent_days_ago: number | null;
  // Hair Stage 5 sessions — completed sessions only (open sessions
  // are in-progress and shouldn't count as "captured").
  hair_completed_sessions: number;
  hair_last_session_days_ago: number | null;
};

type HairJourneySnapshot = {
  has_report: boolean;
  density_state: string | null;
  stage_2_path: string | null; // 'treat' | 'monitor' | 'transition' | null
  stage_4_active: boolean;
  stage_5_active: boolean;
  stage_5_days_since_last_session: number | null;
  // 2026-05-09 — expanded precision fields surfaced to chat so Mister P
  // can answer cut/style questions with the same precision the journey
  // generators use. All optional; absent rows pre-date migration 0099.
  balding_pattern: string | null;
  balding_severity: number | null;
  head_shape: string | null;
  head_size: string | null;
  graying_level: string | null;
};

type StyleJourneySnapshot = {
  has_report: boolean;
};

type NutritionJourneySnapshot = {
  has_report: boolean;
  goal_direction: string | null;
  goal_weight_lbs: number | null;
  realistic_target_weeks: number | null;
};

type StrengthJourneySnapshot = {
  has_report: boolean;
  primary_goal: string | null;
  bodyweight_preference: string | null;
  injury_constraints: string[];
  selected_exercises_count: number;
  // Sample of slugs the user picked, capped to keep the block compact.
  selected_exercises_sample: string[];
};

type CardioJourneySnapshot = {
  has_report: boolean;
  // Migration 0090 (2026-05-08) — modality_preference is now an array
  // (multi-select). Empty array = user hasn't filled it in.
  modality_preference: string[];
};

type SkincareJourneySnapshot = {
  has_report: boolean;
  baseline_established: boolean;
  retinoid_started: boolean;
  retinoid_started_days_ago: number | null;
};

type FacialHairJourneySnapshot = {
  has_report: boolean;
  growout_test_active: boolean;
  growout_test_started_days_ago: number | null;
  growout_test_completed: boolean;
  minoxidil_for_beard_started: boolean;
  minoxidil_for_beard_started_days_ago: number | null;
};

type ProtocolSnapshot = {
  type: string;
  status: string;
  started_at: string | null;
};

const MS_PER_DAY = 86_400_000;

function daysSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return null;
  return Math.floor((now.getTime() - ts) / MS_PER_DAY);
}

// Sample size for the strength selected-exercises preview. Five gives
// the prompt enough signal to identify the user's training style
// without ballooning the block.
const STRENGTH_SAMPLE_SIZE = 5;

export async function getMisterPJourneyState(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<MisterPJourneyState> {
  const [
    { data: hairRow },
    { data: styleRow },
    { data: nutritionRow },
    { data: strengthRow },
    { data: cardioRow },
    { data: skincareRow },
    { data: facialHairRow },
    { data: interventionRows },
  ] = await Promise.all([
    supabase
      .from('hair_assessments')
      .select(
        'density_state, stage_2_path, stage_4_started_at, stage_5_started_at, stage_5_last_session_at, report_text, balding_pattern, balding_severity, head_shape, head_size, graying_level',
      )
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('style_assessments')
      .select('report_text')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('nutrition_assessments')
      .select(
        'goal_direction, goal_weight_lbs, realistic_target_weeks, report_text',
      )
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('strength_assessments')
      .select(
        'primary_goal, bodyweight_preference, injury_constraints, selected_exercise_slugs, report_text',
      )
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('cardio_assessments')
      .select('modality_preference, report_text')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('skincare_assessments')
      .select(
        'baseline_established_at, retinoid_started_at, report_text',
      )
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('facial_hair_assessments')
      .select(
        'growout_test_started_at, growout_test_completed_at, minoxidil_for_beard_started_at, report_text',
      )
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('interventions')
      .select('type, status, started_at')
      .eq('user_id', userId)
      .in('status', ['considering', 'on_protocol', 'paused', 'off_ramp']),
  ]);

  // Photo state — separate parallel block since it touches different
  // tables. Three queries: face/body progress photos, hair completed
  // sessions, latest captured timestamps. All RLS-scoped to user.
  const [
    { data: progressPhotoRows },
    { data: hairSessionRows },
  ] = await Promise.all([
    supabase
      .from('progress_photos')
      .select('slot, category, captured_at')
      .eq('user_id', userId),
    supabase
      .from('hair_photo_sessions')
      .select('completed_at, captured_at')
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false }),
  ]);

  // Hair
  let hair: HairJourneySnapshot | null = null;
  if (hairRow) {
    const r = hairRow as {
      density_state: string | null;
      stage_2_path: string | null;
      stage_4_started_at: string | null;
      stage_5_started_at: string | null;
      stage_5_last_session_at: string | null;
      report_text: string | null;
      balding_pattern: string | null;
      balding_severity: number | null;
      head_shape: string | null;
      head_size: string | null;
      graying_level: string | null;
    };
    hair = {
      has_report: r.report_text !== null,
      density_state: r.density_state,
      stage_2_path: r.stage_2_path,
      stage_4_active: r.stage_4_started_at !== null,
      stage_5_active: r.stage_5_started_at !== null,
      stage_5_days_since_last_session: daysSince(r.stage_5_last_session_at, now),
      balding_pattern: r.balding_pattern,
      balding_severity: r.balding_severity,
      head_shape: r.head_shape,
      head_size: r.head_size,
      graying_level: r.graying_level,
    };
  }

  // Style
  let style: StyleJourneySnapshot | null = null;
  if (styleRow) {
    const r = styleRow as { report_text: string | null };
    style = { has_report: r.report_text !== null };
  }

  // Nutrition
  let nutrition: NutritionJourneySnapshot | null = null;
  if (nutritionRow) {
    const r = nutritionRow as {
      goal_direction: string | null;
      goal_weight_lbs: number | null;
      realistic_target_weeks: number | null;
      report_text: string | null;
    };
    nutrition = {
      has_report: r.report_text !== null,
      goal_direction: r.goal_direction,
      goal_weight_lbs: r.goal_weight_lbs,
      realistic_target_weeks: r.realistic_target_weeks,
    };
  }

  // Strength
  let strength: StrengthJourneySnapshot | null = null;
  if (strengthRow) {
    const r = strengthRow as {
      primary_goal: string | null;
      bodyweight_preference: string | null;
      injury_constraints: string[] | null;
      selected_exercise_slugs: string[] | null;
      report_text: string | null;
    };
    const selected = r.selected_exercise_slugs ?? [];
    strength = {
      has_report: r.report_text !== null,
      primary_goal: r.primary_goal,
      bodyweight_preference: r.bodyweight_preference,
      injury_constraints: r.injury_constraints ?? [],
      selected_exercises_count: selected.length,
      selected_exercises_sample: selected.slice(0, STRENGTH_SAMPLE_SIZE),
    };
  }

  // Cardio
  let cardio: CardioJourneySnapshot | null = null;
  if (cardioRow) {
    const r = cardioRow as {
      modality_preference: string[] | null;
      report_text: string | null;
    };
    cardio = {
      has_report: r.report_text !== null,
      modality_preference: r.modality_preference ?? [],
    };
  }

  // Skincare
  let skincare: SkincareJourneySnapshot | null = null;
  if (skincareRow) {
    const r = skincareRow as {
      baseline_established_at: string | null;
      retinoid_started_at: string | null;
      report_text: string | null;
    };
    skincare = {
      has_report: r.report_text !== null,
      baseline_established: r.baseline_established_at !== null,
      retinoid_started: r.retinoid_started_at !== null,
      retinoid_started_days_ago: daysSince(r.retinoid_started_at, now),
    };
  }

  // Facial hair
  let facial_hair: FacialHairJourneySnapshot | null = null;
  if (facialHairRow) {
    const r = facialHairRow as {
      growout_test_started_at: string | null;
      growout_test_completed_at: string | null;
      minoxidil_for_beard_started_at: string | null;
      report_text: string | null;
    };
    facial_hair = {
      has_report: r.report_text !== null,
      growout_test_active:
        r.growout_test_started_at !== null &&
        r.growout_test_completed_at === null,
      growout_test_started_days_ago: daysSince(
        r.growout_test_started_at,
        now,
      ),
      growout_test_completed: r.growout_test_completed_at !== null,
      minoxidil_for_beard_started: r.minoxidil_for_beard_started_at !== null,
      minoxidil_for_beard_started_days_ago: daysSince(
        r.minoxidil_for_beard_started_at,
        now,
      ),
    };
  }

  // Interventions
  const active_protocols: ProtocolSnapshot[] = (interventionRows ?? []).map(
    (row) => {
      const r = row as {
        type: string;
        status: string;
        started_at: string | null;
      };
      return {
        type: r.type,
        status: r.status,
        started_at: r.started_at,
      };
    },
  );

  // Photo state derivation
  const photoRows = (progressPhotoRows ?? []) as Array<{
    slot: string;
    category: string;
    captured_at: string;
  }>;
  const facePhotos = photoRows.filter((p) => p.category === 'face');
  const bodyPhotos = photoRows.filter((p) => p.category === 'body');
  const bodyMostRecent =
    bodyPhotos.length > 0
      ? bodyPhotos.reduce((acc, p) =>
          p.captured_at > acc.captured_at ? p : acc,
        ).captured_at
      : null;

  const hairSessions = (hairSessionRows ?? []) as Array<{
    completed_at: string | null;
  }>;
  const hairLastSessionAt =
    hairSessions.length > 0 ? hairSessions[0].completed_at : null;

  const photos: PhotoStateSnapshot = {
    face_baseline: facePhotos.some((p) => p.slot === 'baseline'),
    face_progress_30d: facePhotos.some((p) => p.slot === 'progress_30d'),
    face_progress_90d: facePhotos.some((p) => p.slot === 'progress_90d'),
    face_progress_180d: facePhotos.some((p) => p.slot === 'progress_180d'),
    body_photos_count: bodyPhotos.length,
    body_most_recent_days_ago: daysSince(bodyMostRecent, now),
    hair_completed_sessions: hairSessions.length,
    hair_last_session_days_ago: daysSince(hairLastSessionAt, now),
  };

  return {
    hair,
    style,
    nutrition,
    strength,
    cardio,
    skincare,
    facial_hair,
    active_protocols,
    photos,
  };
}
