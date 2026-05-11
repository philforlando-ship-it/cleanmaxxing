// Types for the milestone trigger system (Phase D of the /today
// redesign).
//
// Trigger keys are strings rather than a closed enum because some
// triggers carry distinguishing ids. E.g. a user who's been on
// GLP-1 twice with a break in between earns the three-month
// milestone separately for each cycle — the trigger_key is
// `glp1_three_months_on_protocol:<intervention_uuid>` and the
// unique (user_id, trigger_key) index lets both rows coexist.

export type MilestoneRow = {
  id: string;
  user_id: string;
  trigger_key: string;
  triggered_at: string;
  value_at_trigger: Record<string, unknown> | null;
  created_at: string;
};

// Static trigger keys for the simple cases. Dynamic keys (with
// intervention id suffix) use the helper functions below.
export const STATIC_TRIGGER_KEYS = {
  PROTEIN_FLOOR_AUTOPILOT: 'protein_floor_autopilot',
  STRENGTH_CONSISTENCY_8_WEEKS: 'strength_consistency_8_weeks',
  HAIR_STAGE_4_COMPLETED: 'hair_stage_4_completed',
  NUTRITION_PLAN_THREE_MONTHS: 'nutrition_plan_three_months_old',
  STRENGTH_PLAN_THREE_MONTHS: 'strength_plan_three_months_old',
  // Tier 2 — body composition / weight / sleep consistency. The four
  // body-fat brackets each fire once when the user's self-estimate
  // first enters the bracket; the unique index prevents re-fire if
  // the estimate later goes back up.
  BODY_FAT_BELOW_25: 'body_fat_below_25',
  BODY_FAT_BELOW_20: 'body_fat_below_20',
  BODY_FAT_BELOW_15: 'body_fat_below_15',
  BODY_FAT_BELOW_12: 'body_fat_below_12',
  WEIGHT_5LB_BELOW_START: 'weight_5lb_below_start',
  SLEEP_CONSISTENCY_4_WEEKS: 'sleep_consistency_4_weeks',
  // A3 — bidirectional 5% body-mass shift from the start snapshot.
  // Fires whether the user is gaining or losing because clothes that
  // fit at 180 don't fit at 170 OR 190. Distinct from
  // WEIGHT_5LB_BELOW_START (cut-only celebration of weight loss);
  // this one cross-links into the style journey.
  WARDROBE_REEVAL_DUE: 'wardrobe_reeval_due',
  // Resting heart rate dropped below 60 bpm (rolling 14d avg) AND
  // the user wasn't already there at baseline. "Trained band" is
  // the conventional 50-60 bpm range for aerobically-conditioned
  // adults. Sourced from sleep_logs.resting_heart_rate (mig 0095).
  RHR_TRAINED_BAND_ENTERED: 'rhr_trained_band_entered',
  // VO2max trend turned 'improving' (latest vs ~90 days prior, >5%
  // gain) for the first time. Pro-gated. Sourced from
  // daily_activity.vo2_max via getVo2MaxSignal in
  // lib/vital/wearable-signals.ts.
  VO2_MAX_IMPROVING: 'vo2_max_improving',
} as const;

export type StaticTriggerKey =
  (typeof STATIC_TRIGGER_KEYS)[keyof typeof STATIC_TRIGGER_KEYS];

// Dynamic key constructor for per-row triggers (so a second GLP-1
// cycle's three-month mark can fire separately from the first).
export function glp1ThreeMonthsKey(interventionId: string): string {
  return `glp1_three_months_on_protocol:${interventionId}`;
}

// Reverse lookup — extracts the static category from any trigger
// key. Used by the copy lookup to route dynamic keys to the
// right copy template.
export function categoryForTriggerKey(triggerKey: string):
  | StaticTriggerKey
  | 'glp1_three_months_on_protocol'
  | 'unknown' {
  if (
    (Object.values(STATIC_TRIGGER_KEYS) as string[]).includes(triggerKey)
  ) {
    return triggerKey as StaticTriggerKey;
  }
  if (triggerKey.startsWith('glp1_three_months_on_protocol:')) {
    return 'glp1_three_months_on_protocol';
  }
  return 'unknown';
}

// Surface-window — how long after triggered_at the milestone shows
// in the prominent /today Area 3 fire surface vs. fading to a quiet
// timeline marker. 7 days per the redesign spec.
export const MILESTONE_SURFACE_WINDOW_DAYS = 7;
