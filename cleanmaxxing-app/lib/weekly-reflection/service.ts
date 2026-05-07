/**
 * Weekly reflection service helpers.
 *
 * v1 (legacy, frozen as of Phase F May 2026): confidence tracked WEEKLY
 * across 3–4 contextual dimensions (social, work, physical, appearance).
 * Rows pre-Phase-F have these columns populated; rows from Phase F
 * onward leave them null.
 *
 * v2 (Phase F): process adherence per active journey + outcome
 * observations + directional flag + free-text reflection. See
 * lib/weekly-reflection/types.ts for the v2 type set.
 *
 * One reflection per user per week, keyed by week_start (the Monday
 * of that week). Same row carries both v1 and v2 columns; consumers
 * branch via hasV1Data / hasV2Data helpers.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  DirectionalFlag,
  FreeTextPromptKey,
  JourneyTopic,
  OutcomeInitiated,
  OutcomePhysicalFeel,
  ProcessAdherence,
  WeeklyReflectionV2Input,
  ActiveJourney,
} from './types';
import { JOURNEY_QUESTIONS } from './journey-questions';

export type ReflectionDimensions = {
  social_confidence: number;
  work_confidence: number;
  physical_confidence: number;
  appearance_confidence: number;
};

export type WeeklyReflection = {
  week_start: string;
  // V1 (legacy, nullable on post-Phase-F rows)
  social_confidence: number | null;
  work_confidence: number | null;
  physical_confidence: number | null;
  appearance_confidence: number | null;
  // Free-text answer — used by both v1 and v2; v2's prompt_used
  // tells you which question the notes correspond to.
  notes: string | null;
  // V2 columns (nullable on legacy rows)
  process_adherence: ProcessAdherence | null;
  outcome_appearance_comment: boolean | null;
  outcome_appearance_comment_text: string | null;
  outcome_initiated: OutcomeInitiated | null;
  outcome_physical_feel: OutcomePhysicalFeel | null;
  directional_flag: DirectionalFlag | null;
  prompt_used: FreeTextPromptKey | null;
  created_at: string | null;
};

// Branching helpers for chart and prompt code that needs to know
// which version of a row it's looking at.
export function hasV1Data(r: WeeklyReflection): boolean {
  return (
    r.social_confidence != null ||
    r.work_confidence != null ||
    r.physical_confidence != null ||
    r.appearance_confidence != null
  );
}

export function hasV2Data(r: WeeklyReflection): boolean {
  return (
    r.process_adherence != null ||
    r.outcome_appearance_comment != null ||
    r.outcome_initiated != null ||
    r.outcome_physical_feel != null ||
    r.directional_flag != null
  );
}

export type WeeklyReflectionState = {
  week_start: string;
  current: WeeklyReflection | null;
  history: WeeklyReflection[];
};

/**
 * Return the Monday (ISO week start) of the week containing `now`, as a
 * YYYY-MM-DD string in the server's local timezone. The reflection lands
 * on Sunday per spec; anchoring `week_start` to Monday means "this week"
 * unambiguously refers to the 7 days ending on the coming Sunday.
 */
export function weekStartString(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // Shift back to Monday. Sunday (0) → back 6 days; otherwise back (day - 1).
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Legacy: average of the four v1 dimensions. Returns NaN if any
 * dimension is null (which is the post-Phase-F freeze case for new
 * rows). Callers that want a single summary number for new-format
 * rows should compute over the v2 process-adherence shape instead
 * (see ProcessOutcomeChart for an example).
 *
 * Kept as an exported helper because the chart still consumes it
 * for legacy weeks (cohabit period). Once all v1 data is retired
 * this can be deleted.
 */
export function averageConfidence(
  r: WeeklyReflection | ReflectionDimensions,
): number {
  const s = r.social_confidence;
  const w = r.work_confidence;
  const p = r.physical_confidence;
  const a = r.appearance_confidence;
  if (s == null || w == null || p == null || a == null) return NaN;
  return (s + w + p + a) / 4;
}

function mapRow(row: Record<string, unknown>): WeeklyReflection {
  return {
    week_start: row.week_start as string,
    social_confidence: (row.social_confidence as number | null) ?? null,
    work_confidence: (row.work_confidence as number | null) ?? null,
    physical_confidence: (row.physical_confidence as number | null) ?? null,
    appearance_confidence:
      (row.appearance_confidence as number | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    process_adherence:
      (row.process_adherence as ProcessAdherence | null) ?? null,
    outcome_appearance_comment:
      (row.outcome_appearance_comment as boolean | null) ?? null,
    outcome_appearance_comment_text:
      (row.outcome_appearance_comment_text as string | null) ?? null,
    outcome_initiated:
      (row.outcome_initiated as OutcomeInitiated | null) ?? null,
    outcome_physical_feel:
      (row.outcome_physical_feel as OutcomePhysicalFeel | null) ?? null,
    directional_flag: (row.directional_flag as DirectionalFlag | null) ?? null,
    prompt_used: (row.prompt_used as FreeTextPromptKey | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
  };
}

/**
 * Load the user's current-week reflection (if any) and the last 12
 * weeks of history. Returns rows with both v1 and v2 columns
 * populated (or null where a column doesn't apply to that row's
 * version).
 */
export async function getWeeklyReflectionState(
  supabase: SupabaseClient,
  userId: string,
  weekStart: string = weekStartString()
): Promise<WeeklyReflectionState> {
  const { data, error } = await supabase
    .from('weekly_reflections')
    .select(
      `week_start,
       social_confidence, work_confidence, physical_confidence, appearance_confidence,
       notes, created_at,
       process_adherence,
       outcome_appearance_comment, outcome_appearance_comment_text,
       outcome_initiated, outcome_physical_feel,
       directional_flag, prompt_used`,
    )
    .eq('user_id', userId)
    .order('week_start', { ascending: false })
    .limit(12);

  if (error) throw error;

  const rows = (data ?? []).map(mapRow);
  const current = rows.find((r) => r.week_start === weekStart) ?? null;
  // History is rendered left→right (oldest first) so reverse the desc query.
  const history = rows.slice().reverse();

  return { week_start: weekStart, current, history };
}

/**
 * Phase F save path — writes v2 columns only. The legacy
 * saveWeeklyReflection (v1 confidence dims) was retired with this
 * release; new submissions never write v1 columns. Old data stays
 * intact via the cohabit migration.
 */
export async function saveWeeklyReflectionV2(
  supabase: SupabaseClient,
  userId: string,
  input: WeeklyReflectionV2Input,
  weekStart: string = weekStartString(),
): Promise<WeeklyReflectionState> {
  const { error } = await supabase
    .from('weekly_reflections')
    .upsert(
      {
        user_id: userId,
        week_start: weekStart,
        process_adherence: input.process_adherence,
        outcome_appearance_comment: input.outcome_appearance_comment,
        outcome_appearance_comment_text: input.outcome_appearance_comment_text,
        outcome_initiated: input.outcome_initiated,
        outcome_physical_feel: input.outcome_physical_feel,
        directional_flag: input.directional_flag,
        prompt_used: input.prompt_used,
        notes: input.notes,
      },
      { onConflict: 'user_id,week_start' },
    );

  if (error) throw error;

  return getWeeklyReflectionState(supabase, userId, weekStart);
}

/**
 * Returns the journeys the user has actively engaged with at
 * reflection time. Used by the WeeklyReflectionCard form to gate
 * which process-adherence questions render.
 *
 * Active = focus area selected AND completed assessment with
 * report (Pattern A), OR active intervention row (Pattern D).
 *
 * The list maps each active journey to its question copy so the
 * form just renders what comes back.
 */
export async function getActiveJourneysForReflection(
  supabase: SupabaseClient,
  userId: string,
): Promise<ActiveJourney[]> {
  // Pull all the assessment-existence checks + interventions in
  // parallel. Each Pattern A topic that has a completed report
  // counts; each active Pattern D protocol counts.
  const [
    { data: focusRow },
    { data: hairRow },
    { data: styleRow },
    { data: facialHairRow },
    { data: sleepRow },
    { data: skincareRow },
    { data: nutritionRow },
    { data: strengthRow },
    { data: cardioRow },
    { data: glp1Rows },
  ] = await Promise.all([
    supabase
      .from('survey_responses')
      .select('response_value')
      .eq('user_id', userId)
      .eq('question_key', 'focus_areas')
      .maybeSingle(),
    supabase
      .from('hair_assessments')
      .select('user_id, report_generated_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('style_assessments')
      .select('user_id, report_generated_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('facial_hair_assessments')
      .select('user_id, report_generated_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('sleep_assessments')
      .select('user_id, report_generated_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('skincare_assessments')
      .select('user_id, report_generated_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('nutrition_assessments')
      .select('user_id, report_generated_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('strength_assessments')
      .select('user_id, report_generated_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('cardio_assessments')
      .select('user_id, report_generated_at')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('interventions')
      .select('id, type, status')
      .eq('user_id', userId)
      .eq('type', 'glp1')
      .in('status', ['on_protocol', 'paused']),
  ]);

  let focusAreas: string[] = [];
  if (focusRow?.response_value) {
    try {
      const parsed = JSON.parse(focusRow.response_value as string);
      if (Array.isArray(parsed)) focusAreas = parsed as string[];
    } catch {
      // malformed survey — leave empty
    }
  }

  const hasReport = (
    row: { report_generated_at?: string | null } | null,
  ): boolean => row != null && row.report_generated_at != null;

  const journeys: ActiveJourney[] = [];

  // Pattern A — focus area + report. The current onboarding picker
  // writes journey slugs directly (hair, style, body_composition,
  // strength, cardio, sleep). Legacy values from earlier survey
  // vocabulary still resolve where they map cleanly: 'fitness'
  // expands to strength + cardio, 'grooming' → facial_hair,
  // 'skin' → skincare. Legacy-only values stay readable so users
  // who pre-date the picker change keep their reflection journeys.
  if (focusAreas.includes('hair') && hasReport(hairRow)) {
    journeys.push({ topic: 'hair', question: JOURNEY_QUESTIONS.hair });
  }
  if (focusAreas.includes('style') && hasReport(styleRow)) {
    journeys.push({ topic: 'style', question: JOURNEY_QUESTIONS.style });
  }
  if (focusAreas.includes('grooming') && hasReport(facialHairRow)) {
    journeys.push({
      topic: 'facial_hair',
      question: JOURNEY_QUESTIONS.facial_hair,
    });
  }
  if (focusAreas.includes('sleep') && hasReport(sleepRow)) {
    journeys.push({ topic: 'sleep', question: JOURNEY_QUESTIONS.sleep });
  }
  const skincareFocus =
    focusAreas.includes('skincare') || focusAreas.includes('skin');
  if (skincareFocus && hasReport(skincareRow)) {
    journeys.push({ topic: 'skincare', question: JOURNEY_QUESTIONS.skincare });
  }
  if (focusAreas.includes('body_composition') && hasReport(nutritionRow)) {
    journeys.push({
      topic: 'nutrition',
      question: JOURNEY_QUESTIONS.nutrition,
    });
  }
  const strengthFocus =
    focusAreas.includes('strength') || focusAreas.includes('fitness');
  if (strengthFocus && hasReport(strengthRow)) {
    journeys.push({ topic: 'strength', question: JOURNEY_QUESTIONS.strength });
  }
  const cardioFocus =
    focusAreas.includes('cardio') || focusAreas.includes('fitness');
  if (cardioFocus && hasReport(cardioRow)) {
    journeys.push({ topic: 'cardio', question: JOURNEY_QUESTIONS.cardio });
  }

  // Pattern D — active interventions. Only GLP-1 has its own
  // surface today; future TRT / peptides / etc. will follow the
  // same pattern.
  if (
    Array.isArray(glp1Rows) &&
    glp1Rows.length > 0
  ) {
    journeys.push({ topic: 'glp1', question: JOURNEY_QUESTIONS.glp1 });
  }

  return journeys;
}

// Suppress unused-import warning while the legacy v1 save path is
// being retired. JourneyTopic comes back into use below.
export type _JourneyTopic = JourneyTopic;
