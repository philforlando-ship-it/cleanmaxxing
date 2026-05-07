// Picks the single primary action surfaced at the top of /today (Phase
// A of the redesign). Deterministic priority bucket order — same
// inputs always produce the same output, no randomness, no tiebreaker
// jitter across renders.
//
// Architectural decisions for this version:
// - One picker file owns the per-journey logic. Refactor to
//   per-journey getTodayPrimaryAction() exports when this file
//   exceeds ~400 lines.
// - State is fetched once in gatherPickerState; buckets are pure
//   sync functions. Easier to test, easier to add buckets.
// - Each bucket returns null when its trigger doesn't fire, letting
//   the orchestrator fall through to the next bucket.

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getProtocolRollup,
  listInterventions,
} from '@/lib/interventions/service';
import type { Intervention } from '@/lib/interventions/types';
import {
  getStyleAssessment,
  isStyleReportStale,
} from '@/lib/style/service';
import { getHairAssessment } from '@/lib/hair/service';
import type { HairAssessment } from '@/lib/hair/types';
import type { StyleAssessment } from '@/lib/style/types';
import { hasFacialHairAssessment } from '@/lib/facial-hair/service';
import { hasNutritionAssessment } from '@/lib/nutrition/service';
import { hasStrengthAssessment } from '@/lib/strength/service';
import { hasCardioAssessment } from '@/lib/cardio/service';
import { hasSleepAssessment } from '@/lib/sleep/service';
import { hasSkincareAssessment } from '@/lib/skincare/service';
import { getUserProfile } from '@/lib/profile/service';
import type { PrimaryAction } from './types';

// =====================
// State shape
// =====================

// Picker writes 'strength' / 'cardio' as distinct values; legacy
// users have 'fitness' which historically expanded to both. Both
// are accepted here so the picker can route either cleanly.
type FocusArea =
  | 'hair'
  | 'style'
  | 'grooming'
  | 'sleep'
  | 'skin'
  | 'body_composition'
  | 'strength'
  | 'cardio'
  | 'fitness';

type PickerState = {
  steppedAway: boolean;
  // The user's chosen focus areas. Empty array if no row yet.
  focusAreas: FocusArea[];
  // Per-journey assessment-existence rollup. `hasReport` matters more
  // than `hasAssessment` for the overdue/current-stage checks — an
  // assessment without a report means generation failed mid-flow.
  hair: HairAssessment | null;
  style: StyleAssessment | null;
  facialHair: { hasAssessment: boolean; hasReport: boolean };
  nutrition: { hasAssessment: boolean; hasReport: boolean };
  strength: { hasAssessment: boolean; hasReport: boolean };
  cardio: { hasAssessment: boolean; hasReport: boolean };
  sleep: { hasAssessment: boolean; hasReport: boolean };
  skincare: { hasAssessment: boolean; hasReport: boolean };
  // Pattern D protocol rollups. on_protocol means at least one active
  // intervention of this type; null means none.
  glp1Rollup: 'no_protocol' | 'on_protocol' | 'already_off';
  // Active interventions for next-check-in detection.
  activeInterventions: Intervention[];
  // Concerning-severity unresolved side effects in the last 7 days.
  // Each row carries the intervention id so the action can deep-link.
  concerningSideEffects: Array<{
    intervention_id: string;
    intervention_type: Intervention['type'];
    title: string;
    event_at: string;
  }>;
  // Hair stage 4 daily-routine activity in last 3 days. Null if Stage
  // 4 isn't started; otherwise the count of routine_log rows in the
  // 3-day window.
  hairStage4Logs3Days: number | null;
  // Strength workout activity in last 7 days. Null if no strength
  // assessment; otherwise count of workout_log rows.
  strengthSessions7Days: number | null;
  // Nutrition log activity in last 3 days. Null if no nutrition
  // assessment; otherwise count of nutrition_log rows.
  nutritionLogs3Days: number | null;
  // For style-staleness check.
  styleStalenessReasons: string[];
  // For first-run detection — true when the user has selected focus
  // areas but has no assessments at all (any focus area).
  hasAnyAssessment: boolean;
};

// =====================
// Gather
// =====================

const DAYS = (n: number) => n * 24 * 60 * 60 * 1000;

export async function gatherPickerState(
  supabase: SupabaseClient,
  userId: string,
): Promise<PickerState> {
  const sevenDaysAgo = new Date(Date.now() - DAYS(7)).toISOString();
  const threeDaysAgo = new Date(Date.now() - DAYS(3)).toISOString();

  const [
    profile,
    { data: userRow },
    { data: focusRow },
    hair,
    style,
    facialHair,
    nutrition,
    strength,
    cardio,
    sleep,
    skincare,
    glp1Rollup,
    interventions,
    { data: concerningEvents },
    { count: hairStage4Count },
    { count: strengthCount7d },
    { count: nutritionCount3d },
  ] = await Promise.all([
    getUserProfile(supabase, userId),
    supabase
      .from('users')
      .select('tracking_paused_at')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('survey_responses')
      .select('response_value')
      .eq('user_id', userId)
      .eq('question_key', 'focus_areas')
      .maybeSingle(),
    getHairAssessment(supabase, userId),
    getStyleAssessment(supabase, userId),
    hasFacialHairAssessment(supabase, userId),
    hasNutritionAssessment(supabase, userId),
    hasStrengthAssessment(supabase, userId),
    hasCardioAssessment(supabase, userId),
    hasSleepAssessment(supabase, userId),
    hasSkincareAssessment(supabase, userId),
    getProtocolRollup(supabase, userId, 'glp1'),
    listInterventions(supabase, userId),
    supabase
      .from('intervention_events')
      .select('intervention_id, title, event_at')
      .eq('user_id', userId)
      .eq('event_type', 'side_effect')
      .eq('severity', 'concerning')
      .is('resolved_at', null)
      .gte('event_at', sevenDaysAgo)
      .order('event_at', { ascending: false })
      .limit(5),
    supabase
      .from('hair_daily_routine_logs')
      .select('on_date', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('on_date', threeDaysAgo.slice(0, 10)),
    supabase
      .from('workout_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'strength')
      .gte('performed_on', sevenDaysAgo.slice(0, 10)),
    supabase
      .from('nutrition_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('date', threeDaysAgo.slice(0, 10)),
  ]);

  // Pull the intervention type onto the concerning-events rows so the
  // action can render with topic context. Intersect against the
  // already-loaded interventions list rather than a second query.
  const interventionsById = new Map(interventions.map((i) => [i.id, i]));
  const concerningSideEffects = ((concerningEvents ?? []) as Array<{
    intervention_id: string;
    title: string;
    event_at: string;
  }>)
    .map((e) => {
      const parent = interventionsById.get(e.intervention_id);
      if (!parent) return null;
      return {
        intervention_id: e.intervention_id,
        intervention_type: parent.type,
        title: e.title,
        event_at: e.event_at,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  let focusAreas: FocusArea[] = [];
  if (focusRow?.response_value) {
    try {
      const parsed = JSON.parse(focusRow.response_value as string);
      if (Array.isArray(parsed)) {
        focusAreas = parsed.filter((f): f is FocusArea =>
          [
            'hair',
            'style',
            'grooming',
            'sleep',
            'skin',
            'body_composition',
            'strength',
            'cardio',
            'fitness',
          ].includes(f),
        );
      }
    } catch {
      // malformed survey value — leave empty
    }
  }

  const styleStalenessReasons =
    style?.report_text != null
      ? (
          isStyleReportStale(style.report_input_modifiers, {
            bf_pct_self_estimate: profile.bf_pct_self_estimate,
            budget_tier: profile.budget_tier,
            current_interventions: profile.current_interventions,
            // Age comes from users table; the picker doesn't fetch it
            // separately — the staleness check will treat null as
            // "unknown band" and not flip the age_band reason.
            age: null,
          }) as string[]
        )
      : [];

  const hasAnyAssessment =
    hair !== null ||
    style !== null ||
    facialHair.hasAssessment ||
    nutrition.hasAssessment ||
    strength.hasAssessment ||
    cardio.hasAssessment ||
    sleep.hasAssessment ||
    skincare.hasAssessment;

  const trackingPausedAt =
    (userRow as { tracking_paused_at: string | null } | null)
      ?.tracking_paused_at ?? null;

  return {
    steppedAway: trackingPausedAt != null,
    focusAreas,
    hair,
    style,
    facialHair,
    nutrition,
    strength,
    cardio,
    sleep,
    skincare,
    glp1Rollup,
    activeInterventions: interventions.filter(
      (i) => i.status === 'on_protocol' || i.status === 'paused',
    ),
    concerningSideEffects,
    hairStage4Logs3Days:
      hair?.stage_4_started_at != null ? (hairStage4Count ?? 0) : null,
    strengthSessions7Days: strength.hasReport ? (strengthCount7d ?? 0) : null,
    nutritionLogs3Days: nutrition.hasReport ? (nutritionCount3d ?? 0) : null,
    styleStalenessReasons,
    hasAnyAssessment,
  };
}

// =====================
// Public entry
// =====================

export async function pickPrimaryAction(
  supabase: SupabaseClient,
  userId: string,
): Promise<PrimaryAction> {
  const state = await gatherPickerState(supabase, userId);
  return pickFromState(state);
}

// =====================
// Pure logic
// =====================

export function pickFromState(state: PickerState): PrimaryAction {
  const buckets = [
    bucket0_steppedAway,
    bucket1_firstRunAssessment,
    bucket2_concerningSideEffect,
    bucket3_overdueDailyAction,
    bucket4_currentStage,
    bucket5_prescriberCheckIn,
    bucket6_planStaleRefresh,
    bucket7_patternDConsidering,
    bucket8_circuitBreaker,
  ];
  for (const bucket of buckets) {
    const action = bucket(state);
    if (action) return action;
  }
  return bucket9_allQuiet();
}

// =====================
// Buckets
// =====================

function bucket0_steppedAway(state: PickerState): PrimaryAction | null {
  if (!state.steppedAway) return null;
  return {
    kind: 'stepped_away',
    journey_topic: null,
    title: 'You stepped away from the plan.',
    body: 'Take it back when you’re ready — nothing is lost.',
    cta_label: 'Resume',
    cta_href: '/profile',
  };
}

function bucket1_firstRunAssessment(state: PickerState): PrimaryAction | null {
  if (state.hasAnyAssessment) return null;
  // Map the user's first focus area to its assessment surface. Pick
  // deterministically: the first focus area in the canonical order
  // below that the user actually has.
  const firstFocus = ORDER_FOR_FIRST_RUN.find((f) =>
    state.focusAreas.includes(f),
  );
  if (!firstFocus) return null;

  const map = FIRST_RUN_BY_FOCUS[firstFocus];
  return {
    kind: 'first_run_assessment',
    journey_topic: map.topic,
    title: map.title,
    body: map.body,
    cta_label: 'Start',
    cta_href: map.href,
  };
}

const ORDER_FOR_FIRST_RUN: FocusArea[] = [
  'hair',
  'body_composition',
  'strength',
  'cardio',
  'fitness',
  'sleep',
  'style',
  'grooming',
  'skin',
];

const FIRST_RUN_BY_FOCUS: Record<
  FocusArea,
  { topic: PrimaryAction['journey_topic']; title: string; body: string; href: string }
> = {
  hair: {
    topic: 'hair',
    title: 'Start your hair plan.',
    body: 'A few questions about your density, face, and goal — Mister P writes you a short, specific plan.',
    href: '/plan/hair',
  },
  body_composition: {
    topic: 'nutrition',
    title: 'Start your nutrition plan.',
    body: 'A short assessment about your goal, eating context, and capacity. About five minutes.',
    href: '/plan/nutrition',
  },
  strength: {
    topic: 'strength',
    title: 'Start your strength plan.',
    body: 'A short assessment about your training, equipment, and priorities. About five minutes.',
    href: '/plan/strength',
  },
  cardio: {
    topic: 'cardio',
    title: 'Start your cardio plan.',
    body: 'A short assessment about your modality preferences, equipment, and goals.',
    href: '/plan/cardio',
  },
  fitness: {
    topic: 'strength',
    title: 'Start your strength plan.',
    body: 'A short assessment about your training, equipment, and priorities. About five minutes.',
    href: '/plan/strength',
  },
  sleep: {
    topic: 'sleep',
    title: 'Start your sleep plan.',
    body: 'A short assessment about your patterns and constraints. Mister P writes a focused plan.',
    href: '/plan/sleep',
  },
  style: {
    topic: 'style',
    title: 'Start your style plan.',
    body: 'Four questions about your frame, archetype, and closet state.',
    href: '/plan/style',
  },
  grooming: {
    topic: 'facial_hair',
    title: 'Start your facial-hair plan.',
    body: 'A short assessment about your beard pattern and goal.',
    href: '/plan/facial-hair',
  },
  skin: {
    topic: 'skincare',
    title: 'Start your skincare plan.',
    body: 'A short assessment about your skin type and concerns.',
    href: '/plan/skincare',
  },
};

function bucket2_concerningSideEffect(
  state: PickerState,
): PrimaryAction | null {
  const event = state.concerningSideEffects[0];
  if (!event) return null;
  // Path the user to the right Pattern D surface. Today only GLP-1
  // has a topic-specific surface; fin/min uses /plan/hair pattern-d
  // card. Future Pattern D topics extend this map.
  const protocolHref = PROTOCOL_HREF[event.intervention_type] ?? '/plan/hair';
  const topic = INTERVENTION_TYPE_TO_TOPIC[event.intervention_type] ?? 'hair';
  return {
    kind: 'pattern_d_concerning',
    journey_topic: topic,
    title: 'Concerning side effect logged.',
    body: `“${event.title}” is on file unresolved. This is a "talk to your prescriber soon" kind of side effect, not a "wait and see" one.`,
    cta_label: 'Open the protocol',
    cta_href: protocolHref,
  };
}

const PROTOCOL_HREF: Partial<Record<Intervention['type'], string>> = {
  glp1: '/plan/glp1',
  trt: '/plan/trt',
  finasteride: '/plan/hair',
  minoxidil: '/plan/hair',
};

const INTERVENTION_TYPE_TO_TOPIC: Partial<
  Record<Intervention['type'], PrimaryAction['journey_topic']>
> = {
  glp1: 'glp1',
  trt: 'trt',
  finasteride: 'hair',
  minoxidil: 'hair',
};

function bucket3_overdueDailyAction(
  state: PickerState,
): PrimaryAction | null {
  // Hair Stage 4 daily routine — overdue if started AND zero logs in
  // last 3 days.
  if (state.hairStage4Logs3Days === 0 && state.hair?.stage_4_started_at) {
    return {
      kind: 'pattern_a_overdue',
      journey_topic: 'hair',
      title: 'Hair routine — three days behind.',
      body: 'Stage 4 daily routine has missed 3+ days. Even one quick check-in keeps the streak intact.',
      cta_label: 'Open routine',
      cta_href: '/plan/hair',
    };
  }
  // Strength — overdue if a report exists AND no logged sessions in 7 days.
  if (
    state.strengthSessions7Days === 0 &&
    state.strength.hasReport
  ) {
    return {
      kind: 'pattern_a_overdue',
      journey_topic: 'strength',
      title: 'Strength — no sessions logged this week.',
      body: 'Your plan expects 2-4 sessions a week. Get one on the calendar this week, or open the plan to adjust.',
      cta_label: 'Open strength plan',
      cta_href: '/plan/strength',
    };
  }
  // Nutrition — overdue if a report exists AND zero protein logs in 3 days.
  if (
    state.nutritionLogs3Days === 0 &&
    state.nutrition.hasReport
  ) {
    return {
      kind: 'pattern_a_overdue',
      journey_topic: 'nutrition',
      title: 'Nutrition — protein log is dark.',
      body: 'Three days without a protein hit logged. Even a yes/no log keeps the felt-sense compliance honest.',
      cta_label: 'Open nutrition plan',
      cta_href: '/plan/nutrition',
    };
  }
  return null;
}

function bucket4_currentStage(state: PickerState): PrimaryAction | null {
  // Tiebreaker: most-recently-advanced journey wins. Approximated by
  // updated_at on the assessment row; the picker uses the implicit
  // order defined here when timestamps aren't readily comparable.

  // Style is the fastest-stage-progress journey today; check first.
  if (state.style && state.style.report_text) {
    if (!state.style.stage_1_completed_at) {
      return primaryActionFor('style', {
        kind: 'pattern_a_current_stage',
        title: 'Style Stage 1 — closet audit.',
        body: 'Mark your existing pieces keep / cut / replace. Mister P writes the audit recommendation. ~5 min.',
        cta_label: 'Open Stage 1',
        cta_href: '/plan/style',
      });
    }
    if (!state.style.stage_2_completed_at) {
      return primaryActionFor('style', {
        kind: 'pattern_a_current_stage',
        title: 'Style Stage 2 — foundation pieces.',
        body: 'The five pieces that anchor your archetype. Mark each as you acquire it.',
        cta_label: 'Open Stage 2',
        cta_href: '/plan/style',
      });
    }
    if (!state.style.stage_3_acknowledged_at) {
      return primaryActionFor('style', {
        kind: 'pattern_a_current_stage',
        title: 'Style Stage 3 — fit calibration.',
        body: 'Read the proportion principles tuned to your frame and age. Apply to everything you own from here.',
        cta_label: 'Open Stage 3',
        cta_href: '/plan/style',
      });
    }
  }

  // Hair stages — a lot of them. Walk in order.
  if (state.hair && state.hair.report_text) {
    if (!state.hair.stage_1_completed_at) {
      return primaryActionFor('hair', {
        kind: 'pattern_a_current_stage',
        title: 'Hair Stage 1 — go to the barber.',
        body: state.hair.stage_1_cut_family
          ? 'Your recommended cut is on file. Bring the reference image to your barber.'
          : 'Generate your cut recommendation, then take it to your barber.',
        cta_label: 'Open Stage 1',
        cta_href: '/plan/hair',
      });
    }
    if (!state.hair.stage_2_locked_in_at) {
      return primaryActionFor('hair', {
        kind: 'pattern_a_current_stage',
        title: 'Hair Stage 2 — pick a path.',
        body: 'Treat / Monitor / Transition. The decision is yours; Mister P presents the trade-offs.',
        cta_label: 'Open Stage 2',
        cta_href: '/plan/hair',
      });
    }
    if (!state.hair.stage_3_acknowledged_at) {
      return primaryActionFor('hair', {
        kind: 'pattern_a_current_stage',
        title: 'Hair Stage 3 — products.',
        body: 'Mister P matched products to your hair type. Confirm you have what you need to start the daily routine.',
        cta_label: 'Open Stage 3',
        cta_href: '/plan/hair',
      });
    }
    if (!state.hair.stage_4_started_at) {
      return primaryActionFor('hair', {
        kind: 'pattern_a_current_stage',
        title: 'Hair Stage 4 — start the daily routine.',
        body: 'Opt in and the daily logger turns on. Stage 5 unlocks after the target check-in count.',
        cta_label: 'Start Stage 4',
        cta_href: '/plan/hair',
      });
    }
    if (!state.hair.stage_4_completed_at) {
      // Stage 4 is in progress — daily logging is the action when it's
      // not 3-days-overdue (bucket 3 catches that case).
      return primaryActionFor('hair', {
        kind: 'pattern_a_current_stage',
        title: 'Hair routine — log today.',
        body: 'A quick yes/no on whether you ran the routine today. Stage 4 progresses on the count.',
        cta_label: 'Open routine',
        cta_href: '/plan/hair',
      });
    }
    if (!state.hair.stage_5_started_at) {
      return primaryActionFor('hair', {
        kind: 'pattern_a_current_stage',
        title: 'Hair Stage 5 — set up your photo cadence.',
        body: 'Quarterly photo monitoring. Set the cadence and Mister P prompts when the next session is due.',
        cta_label: 'Open Stage 5',
        cta_href: '/plan/hair',
      });
    }
    if (!state.hair.stage_6_started_at) {
      return primaryActionFor('hair', {
        kind: 'pattern_a_current_stage',
        title: 'Hair Stage 6 — maintenance.',
        body: 'The last stage. Set your cut cadence and revisit triggers; the plan goes quiet from here.',
        cta_label: 'Open Stage 6',
        cta_href: '/plan/hair',
      });
    }
  }

  // Other Pattern A journeys: pull-into-flow when assessed but not
  // reported (rare error case where save succeeded but generation
  // failed). Open the plan so the user can resubmit.
  if (state.nutrition.hasAssessment && !state.nutrition.hasReport) {
    return primaryActionFor('nutrition', {
      kind: 'pattern_a_current_stage',
      title: 'Nutrition plan needs a retry.',
      body: 'Mister P couldn’t finish your plan last time. Open it and submit again.',
      cta_label: 'Open',
      cta_href: '/plan/nutrition',
    });
  }
  if (state.strength.hasAssessment && !state.strength.hasReport) {
    return primaryActionFor('strength', {
      kind: 'pattern_a_current_stage',
      title: 'Strength plan needs a retry.',
      body: 'Mister P couldn’t finish your plan last time. Open it and submit again.',
      cta_label: 'Open',
      cta_href: '/plan/strength',
    });
  }
  if (state.cardio.hasAssessment && !state.cardio.hasReport) {
    return primaryActionFor('cardio', {
      kind: 'pattern_a_current_stage',
      title: 'Cardio plan needs a retry.',
      body: 'Mister P couldn’t finish your plan last time. Open it and submit again.',
      cta_label: 'Open',
      cta_href: '/plan/cardio',
    });
  }

  return null;
}

function bucket5_prescriberCheckIn(
  state: PickerState,
): PrimaryAction | null {
  const sevenDaysFromNow = new Date(Date.now() + DAYS(7)).toISOString();
  const upcoming = state.activeInterventions.find(
    (i) =>
      i.next_check_in_at != null &&
      i.next_check_in_at <= sevenDaysFromNow,
  );
  if (!upcoming) return null;
  const href = PROTOCOL_HREF[upcoming.type] ?? '/plan/hair';
  const topic = INTERVENTION_TYPE_TO_TOPIC[upcoming.type] ?? 'hair';
  return {
    kind: 'pattern_d_check_in',
    journey_topic: topic,
    title: 'Prescriber check-in coming up.',
    body: `Your next check-in is within a week. Pull up the visit summary on the protocol surface.`,
    cta_label: 'Open the protocol',
    cta_href: href,
  };
}

function bucket6_planStaleRefresh(state: PickerState): PrimaryAction | null {
  if (state.styleStalenessReasons.length > 0 && state.style?.report_text) {
    return primaryActionFor('style', {
      kind: 'plan_stale_refresh',
      title: 'Style plan is out of date.',
      body: 'Some inputs changed since this plan was written. Re-submit and Mister P rewrites it.',
      cta_label: 'Refresh plan',
      cta_href: '/plan/style?edit=1',
    });
  }
  return null;
}

function bucket7_patternDConsidering(
  state: PickerState,
): PrimaryAction | null {
  // Surface the GLP-1 Considering nudge only when:
  // - body_composition is a focus area
  // - no GLP-1 protocol exists at all (not on_protocol, not even off
  //   history — they've never engaged with the surface)
  if (
    state.focusAreas.includes('body_composition') &&
    state.glp1Rollup === 'no_protocol'
  ) {
    return {
      kind: 'pattern_d_considering',
      journey_topic: 'glp1',
      title: 'Considering a GLP-1?',
      body: 'Most discussions skip the part that matters most — what happens when you stop. Read the protocol surface before booking.',
      cta_label: 'Read',
      cta_href: '/plan/glp1',
    };
  }
  return null;
}

function bucket8_circuitBreaker(state: PickerState): PrimaryAction | null {
  // Count "actively engaged" surfaces: assessed Pattern A journeys
  // with reports + active Pattern D protocols. Threshold = 4.
  let count = 0;
  if (state.hair?.report_text) count++;
  if (state.style?.report_text) count++;
  if (state.facialHair.hasReport) count++;
  if (state.nutrition.hasReport) count++;
  if (state.strength.hasReport) count++;
  if (state.cardio.hasReport) count++;
  if (state.sleep.hasReport) count++;
  if (state.skincare.hasReport) count++;
  if (state.activeInterventions.length > 0) count++;
  if (count < 4) return null;
  return {
    kind: 'circuit_breaker',
    journey_topic: null,
    title: `You’re juggling ${count} active surfaces.`,
    body: 'That’s a lot to hold at once. Pick the one that matters most this month — the rest can wait.',
    cta_label: 'See your journeys',
    cta_href: '/today',
  };
}

function bucket9_allQuiet(): PrimaryAction {
  return {
    kind: 'all_quiet',
    journey_topic: null,
    title: 'All systems go.',
    body: 'Nothing pressing today. Check back tomorrow, or browse your journeys for what’s next.',
    cta_label: 'Browse journeys',
    cta_href: '/today',
  };
}

// =====================
// Helpers
// =====================

function primaryActionFor(
  topic: NonNullable<PrimaryAction['journey_topic']>,
  rest: Omit<PrimaryAction, 'journey_topic'>,
): PrimaryAction {
  return { journey_topic: topic, ...rest };
}
