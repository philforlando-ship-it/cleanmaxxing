// Phase F types for the v2 weekly reflection (process adherence +
// outcome observations). The legacy v1 types (ReflectionDimensions
// and the original WeeklyReflection shape) live in service.ts for
// backwards compat with rows that pre-date this migration.
//
// Cohabit strategy: v1 columns and v2 columns coexist on the same
// weekly_reflections table. WeeklyReflection becomes a superset
// type that can carry either or both. Helpers `hasV1Data` /
// `hasV2Data` let consumers branch on which version of a row
// they're looking at.

export type ProcessAdherenceTier = 'most_days' | 'some_days' | 'few_or_none';

export const PROCESS_ADHERENCE_TIERS: ReadonlyArray<ProcessAdherenceTier> = [
  'most_days',
  'some_days',
  'few_or_none',
];

export const PROCESS_ADHERENCE_TIER_LABEL: Record<
  ProcessAdherenceTier,
  string
> = {
  most_days: 'Most days',
  some_days: 'Some days',
  few_or_none: 'Few or none',
};

// Process adherence is keyed by journey topic. Topics not present
// = the user does NOT have that journey active right now (which
// is meaningfully different from "didn't answer").
export type JourneyTopic =
  | 'hair'
  | 'style'
  | 'facial_hair'
  | 'sleep'
  | 'skincare'
  | 'nutrition'
  | 'strength'
  | 'cardio'
  | 'glp1';

export type ProcessAdherence = Partial<Record<JourneyTopic, ProcessAdherenceTier>>;

// Outcome observation enums.
export type OutcomeInitiated = 'yes' | 'no' | 'not_applicable';

export const OUTCOME_INITIATED_LABEL: Record<OutcomeInitiated, string> = {
  yes: 'Yes',
  no: 'No',
  not_applicable: 'Not applicable',
};

export type OutcomePhysicalFeel = 'better' | 'same' | 'worse' | 'mixed';

export const OUTCOME_PHYSICAL_FEEL_LABEL: Record<OutcomePhysicalFeel, string> = {
  better: 'Better',
  same: 'Same',
  worse: 'Worse',
  mixed: 'Mixed',
};

// Directional flag — replaces the legacy stuck-confidence signal.
// The user's own self-report of how the week feels relative to
// last week. Single-question early-warning signal for churn.
export type DirectionalFlag =
  | 'more_on_track'
  | 'about_the_same'
  | 'less_on_track'
  | 'losing_momentum';

export const DIRECTIONAL_FLAG_LABEL: Record<DirectionalFlag, string> = {
  more_on_track: 'More on track',
  about_the_same: 'About the same',
  less_on_track: 'Less on track',
  losing_momentum: 'Honestly losing momentum',
};

// Activity-change capture (migration 0089) — cross-journey energy +
// fatigue architecture, slice 5. Optional. When 'increased' or
// 'decreased', the form surfaces a nudge to revisit /plan/nutrition.
export type ActivityChange = 'no_change' | 'increased' | 'decreased';

export const ACTIVITY_CHANGE_LABEL: Record<ActivityChange, string> = {
  no_change: 'About the same',
  increased: 'Increased meaningfully (more cardio / strength / walking)',
  decreased: 'Decreased meaningfully (dropped a journey, injured, paused)',
};

// Fatigue signal (migration 0092) — cross-journey energy + fatigue
// architecture, slice 6. Optional. Three-point self-report; when
// 'struggling', the source field becomes load-bearing for which
// plan softens its prescription. Cross-modifier read by cardio +
// strength + nutrition report builders.
export type FatigueLevel = 'good' | 'okay' | 'struggling';

export const FATIGUE_LEVEL_LABEL: Record<FatigueLevel, string> = {
  good: 'Good — energy is high, recovery is solid',
  okay: 'Okay — neither great nor struggling',
  struggling: 'Struggling — low energy, recovery is compromised',
};

export type FatigueSource = 'cardio' | 'strength' | 'sleep' | 'stress' | 'unknown';

export const FATIGUE_SOURCE_LABEL: Record<FatigueSource, string> = {
  cardio: 'Cardio ramp — recent volume or intensity increase',
  strength: 'Strength — heavy training, accumulating soreness',
  sleep: 'Sleep — short, fragmented, or poor quality',
  stress: 'Stress — work, life, or emotional load',
  unknown: 'Not sure',
};

// Free-text rotating prompt keys. The form picks one per week
// deterministically (weekIndex % 3) and stores which one it
// showed so the chart can group answers by question type.
export type FreeTextPromptKey =
  | 'something_worth_noting'
  | 'something_surprising'
  | 'tried_what_worked';

export const FREE_TEXT_PROMPTS: Record<FreeTextPromptKey, string> = {
  something_worth_noting:
    'What\'s one specific thing that happened this week worth noting?',
  something_surprising: 'Anything you noticed that surprised you?',
  tried_what_worked: 'What\'s one thing you tried that worked or didn\'t?',
};

// Pick the rotating prompt for a given week_start. Deterministic
// so the same week always shows the same prompt (no flicker if
// the user reloads).
export function pickFreeTextPrompt(weekStart: string): FreeTextPromptKey {
  // Hash by weeks-since-epoch (Monday). Using week_start ISO
  // string directly: parse to ms, divide by 7d, mod 3.
  const ms = new Date(`${weekStart}T00:00:00Z`).getTime();
  if (Number.isNaN(ms)) return 'something_worth_noting';
  const weeks = Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
  const keys: FreeTextPromptKey[] = [
    'something_worth_noting',
    'something_surprising',
    'tried_what_worked',
  ];
  const i = ((weeks % 3) + 3) % 3;
  return keys[i];
}

// V2-specific input shape for the save path.
export type WeeklyReflectionV2Input = {
  process_adherence: ProcessAdherence;
  outcome_appearance_comment: boolean | null;
  outcome_appearance_comment_text: string | null;
  outcome_initiated: OutcomeInitiated | null;
  outcome_physical_feel: OutcomePhysicalFeel | null;
  directional_flag: DirectionalFlag | null;
  prompt_used: FreeTextPromptKey | null;
  notes: string | null;
  activity_change: ActivityChange | null;
  fatigue_level: FatigueLevel | null;
  fatigue_source: FatigueSource | null;
};

// Active journey entry for the form — one row per journey the
// user has active (focus area + completed assessment with report,
// or active Pattern D protocol).
export type ActiveJourney = {
  topic: JourneyTopic;
  // The question copy specific to this journey.
  question: string;
};
