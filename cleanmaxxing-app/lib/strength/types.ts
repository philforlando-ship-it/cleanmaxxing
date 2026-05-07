// Shared types + Zod schema + the 40-exercise catalog for the
// strength training plan v0. Mirrors check constraints in
// supabase/migrations/0055_strength_assessments.sql.

import { z } from 'zod';

export type StrengthPrimaryGoal =
  | 'size'
  | 'strength'
  | 'both'
  | 'general_fitness'
  | 'not_sure';

export type StrengthDaysPerWeek =
  | '2_days'
  | '3_days'
  | '4_days'
  | '5_days'
  | '6_days';

export type StrengthEquipmentAccess =
  | 'full_commercial_gym'
  | 'home_rack_bench'
  | 'minimal_dumbbells'
  | 'bodyweight_only';

export type StrengthCurrentSplit =
  | 'none_or_inconsistent'
  | 'full_body'
  | 'upper_lower'
  | 'push_pull_legs'
  | 'bro_split'
  | '5_day_aesthetic'
  | 'other';

// Visual-leverage stack from POV 19. The user picks 0-3; the
// report biases volume + frequency toward these.
export type StrengthPriorityMuscle =
  | 'side_delts'
  | 'upper_chest'
  | 'lats_back_width'
  | 'arms'
  | 'glutes'
  | 'hamstrings';

export const PRIORITY_MUSCLES: ReadonlyArray<StrengthPriorityMuscle> = [
  'side_delts',
  'upper_chest',
  'lats_back_width',
  'arms',
  'glutes',
  'hamstrings',
];

export const PRIORITY_MUSCLE_MAX = 3;

// T1 — multi-objective intent. v1 caps at one secondary objective per
// user; the prompt's combinatorial space is bounded by primary × this.
// Adding more secondaries later is a Zod-schema change, not a migration.
export type StrengthSecondaryObjective =
  | 'weight_loss'
  | 'core_strength'
  | 'mobility_flexibility'
  | 'cardiovascular_health'
  | 'general_function'
  | 'none';

export const SECONDARY_OBJECTIVES: ReadonlyArray<StrengthSecondaryObjective> = [
  'weight_loss',
  'core_strength',
  'mobility_flexibility',
  'cardiovascular_health',
  'general_function',
  'none',
];

// Partial A4 — high-impact injury subset for 35+ chronic conditions.
// Multi-select since knee + lower-back, etc. is a common pair.
export type StrengthInjuryConstraint =
  | 'lower_back_pain'
  | 'knee_pain'
  | 'shoulder_or_neck_pain'
  | 'elbow_pain';

export const INJURY_CONSTRAINTS: ReadonlyArray<StrengthInjuryConstraint> = [
  'lower_back_pain',
  'knee_pain',
  'shoulder_or_neck_pain',
  'elbow_pain',
];

export type StrengthAssessment = {
  user_id: string;
  primary_goal: StrengthPrimaryGoal;
  days_per_week: StrengthDaysPerWeek;
  equipment_access: StrengthEquipmentAccess;
  current_split: StrengthCurrentSplit;
  strength_goal_text: string | null;
  // Q5 (migration 0062): looksmaxxing priority muscles + optional
  // "what feels lagging" free text. Empty array = no priority bias.
  priority_muscles: StrengthPriorityMuscle[];
  lagging_muscles_text: string | null;
  // Q6 (migration 0067): one secondary objective alongside the
  // primary goal. Null when the user hasn't filled this in since
  // the field landed; nominally 'none' for "no secondary."
  secondary_objective: StrengthSecondaryObjective | null;
  // Q7 (migration 0067): high-impact injury constraints. Empty array
  // = no constraints. Drives exercise EXCLUSIONS in the report's
  // recommendations (the user's selected_exercise_slugs stay intact;
  // the report just routes around them).
  injury_constraints: StrengthInjuryConstraint[];
  // User's exercise picker preferences (added in migration 0057).
  // Read by the report generator on each (re-)generation; updates do
  // NOT trigger regeneration on their own — separate endpoint.
  selected_exercise_slugs: string[];
  excluded_exercise_slugs: string[];
  exercise_filter_text: string | null;
  // Stage milestone (migration 0060) — beginner ramp graduation.
  // Set when the user manually marks completion of the 8-12 week
  // full-body ramp. Triggers the prompt's main framework rules
  // (split selection, MAV-targeted volume) instead of the beginner
  // ramp prescription.
  beginner_ramp_completed_at: string | null;
  // Stage milestone (migration 0061) — plateau intervention. Set
  // when the user runs the Israetel SFR test re-evaluation gate
  // (typically after 3 deload cycles without progressive overload).
  last_plateau_intervention_at: string | null;
  report_text: string | null;
  report_generated_at: string | null;
  report_model: string | null;
  report_input_modifiers: StrengthReportInputModifiers | null;
  created_at: string;
  updated_at: string;
};

// Modifier shape captures profile context, age (the load-bearing
// tier driver), live workout signal, and the cross-modifier read
// from the nutrition assessment when it exists.
export type StrengthReportInputModifiers = {
  // Profile
  training_experience: string | null;
  daily_training_minutes: number | null;
  activity_level: string | null;
  bf_pct_self_estimate: string | null;
  current_interventions: string[];
  diet_restrictions: string | null;
  age: number | null;
  // Live data — last 7 days strength sessions
  strength_sessions_last_7: number;
  // Cross-modifier from the nutrition plan (when assessed)
  nutrition_goal_direction: string | null;
  // Cross-modifier from sleep tracker (rolling 7-night avg hours).
  // Recovery is the load-bearing variable for hypertrophy adaptation;
  // chronic poor sleep means programming has to soften.
  sleep_rolling_avg_hours: number | null;
  sleep_rolling_count: number;
  // User's exercise picker preferences (snapshotted at gen time so
  // the report's reasoning is reproducible)
  selected_exercise_slugs: string[];
  excluded_exercise_slugs: string[];
  exercise_filter_text: string | null;
  // Q5 priority muscles + lagging text (migration 0062), snapshotted
  // at gen time so the prompt's volume/frequency bias is reproducible.
  priority_muscles: StrengthPriorityMuscle[];
  lagging_muscles_text: string | null;
  // Q6 + Q7 (migration 0067) snapshotted into modifiers for prompt
  // input. secondary_objective null = user hasn't filled the field.
  secondary_objective: StrengthSecondaryObjective | null;
  injury_constraints: StrengthInjuryConstraint[];
  // Stage milestone — beginner ramp graduation. When non-null the
  // prompt treats the user as past the ramp regardless of
  // training_experience.
  beginner_ramp_completed_at: string | null;
  // Stage milestone — plateau intervention. When non-null the prompt
  // leans on the SFR test re-evaluation framing for the next move.
  last_plateau_intervention_at: string | null;
  // Autoregulation summary — last 7 days of morning-after recovery
  // checks (migration 0063). Empty when no feedback rows exist.
  feedback_rows_last_7: number;
  feedback_consecutive_high_soreness: string[];
  feedback_consecutive_low_soreness: string[];
  feedback_joint_pain_count: number;
  feedback_most_recent_energy: number | null;
};

export const PRIMARY_GOAL_LABEL: Record<StrengthPrimaryGoal, string> = {
  size: 'Size — build muscle, aesthetic physique (hypertrophy)',
  strength: 'Strength — get stronger on the lifts (powerlifting-leaning)',
  both: 'Both — hybrid: aesthetics + strength',
  general_fitness:
    'General fitness — stay in shape, no specific aesthetic / strength target',
  not_sure: 'Not sure yet',
};

export const DAYS_PER_WEEK_LABEL: Record<StrengthDaysPerWeek, string> = {
  '2_days': '2 days a week',
  '3_days': '3 days a week',
  '4_days': '4 days a week',
  '5_days': '5 days a week',
  '6_days': '6 days a week',
};

export const EQUIPMENT_ACCESS_LABEL: Record<StrengthEquipmentAccess, string> = {
  full_commercial_gym:
    'Full commercial gym (machines, cables, free weights, dedicated rack)',
  home_rack_bench: 'Home gym — rack, bench, barbell, plates',
  minimal_dumbbells: 'Minimal — dumbbells, bands, basic equipment',
  bodyweight_only: 'Bodyweight only / very minimal',
};

export const CURRENT_SPLIT_LABEL: Record<StrengthCurrentSplit, string> = {
  none_or_inconsistent: 'Nothing structured — inconsistent or just starting',
  full_body: 'Full-body sessions (3 days a week typically)',
  upper_lower: '4-day upper / lower split',
  push_pull_legs: 'Push / Pull / Legs (PPL)',
  bro_split: 'Body-part split (chest day, back day, legs day, etc.)',
  '5_day_aesthetic': '5-day aesthetic split (Israetel-style)',
  other: 'Other / custom',
};

export const PRIORITY_MUSCLE_LABEL: Record<StrengthPriorityMuscle, string> = {
  side_delts: 'Side delts (shoulder width — V-taper from the front)',
  upper_chest: 'Upper chest (clavicular pec — fills out the shirt up top)',
  lats_back_width: 'Lats / back width (V-taper from behind)',
  arms: 'Arms (biceps + triceps — sleeve fill)',
  glutes: 'Glutes (silhouette from the side, trousers + jeans hang)',
  hamstrings: 'Hamstrings (rear leg shape, partner of glute work)',
};

export const SECONDARY_OBJECTIVE_LABEL: Record<
  StrengthSecondaryObjective,
  string
> = {
  weight_loss: 'Weight loss — strength training while cutting at the same time',
  core_strength:
    'Core strength — explicit core priority (back protection, daily function)',
  mobility_flexibility:
    'Mobility & flexibility — keep range of motion, less stiffness',
  cardiovascular_health:
    'Cardiovascular health — integrate zone-2 cardio with the strength work',
  general_function:
    'General function — daily-life capability (carries, unilateral, posture)',
  none: 'None — strength is the only goal',
};

export const INJURY_CONSTRAINT_LABEL: Record<
  StrengthInjuryConstraint,
  string
> = {
  lower_back_pain: 'Lower back pain — chronic or recurring',
  knee_pain: 'Knee pain — chronic or recurring',
  shoulder_or_neck_pain: 'Shoulder or neck pain — chronic or recurring',
  elbow_pain: 'Elbow pain — tennis / golfer’s elbow or similar',
};

// =====================
// Exercise catalog (40)
// =====================

export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'horizontal_push'
  | 'vertical_push'
  | 'horizontal_pull'
  | 'vertical_pull'
  | 'shoulder_isolation'
  | 'arm_isolation'
  | 'leg_isolation'
  | 'core'
  | 'calf';

export type Equipment =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'weighted_bodyweight'
  | 'ez_bar'
  | 'smith';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'glutes'
  | 'core'
  | 'calves';

export type StrengthExercise = {
  // Stable identifier. Used by the report-prompt vocabulary block
  // so Mister P can recommend by slug → label lookup.
  slug: string;
  label: string;
  movement_pattern: MovementPattern;
  equipment: Equipment;
  // Primary muscle group this exercise belongs to for catalog
  // grouping. Distinct from primary_muscles which lists every
  // muscle the exercise loads.
  primary_group: MuscleGroup;
  primary_muscles: string[];
  // Form cues from the source infographic.
  key_points: string[];
  // Path to the source infographic. Multiple exercises share the
  // same image (4 per infographic) — the row position tells the
  // user where to look in the image.
  image_path: string;
  image_row: 1 | 2 | 3 | 4;
};

const IMG = '/images/strength-training-workouts/ChatGPT Image May 5, 2026, 02_56_01 PM';

export const STRENGTH_EXERCISES: ReadonlyArray<StrengthExercise> = [
  // ============ Image 1
  {
    slug: 'barbell_back_squat',
    label: 'Barbell Back Squat',
    movement_pattern: 'squat',
    equipment: 'barbell',
    primary_group: 'legs',
    primary_muscles: ['Quads', 'Glutes', 'Hamstrings'],
    key_points: [
      'Bar on upper back',
      'Chest up and core tight',
      'Push hips back and down',
      'Drive through mid-foot',
    ],
    image_path: `${IMG} (1).png`,
    image_row: 1,
  },
  {
    slug: 'flat_barbell_bench_press',
    label: 'Flat Barbell Bench Press',
    movement_pattern: 'horizontal_push',
    equipment: 'barbell',
    primary_group: 'chest',
    primary_muscles: ['Chest', 'Front Delts', 'Triceps'],
    key_points: [
      'Shoulder blades back and down',
      'Grip just outside shoulder width',
      'Lower to mid-chest',
      'Press up without shrugging',
    ],
    image_path: `${IMG} (1).png`,
    image_row: 2,
  },
  {
    slug: 'deadlift',
    label: 'Conventional Deadlift',
    movement_pattern: 'hinge',
    equipment: 'barbell',
    primary_group: 'back',
    primary_muscles: ['Glutes', 'Hamstrings', 'Lower Back'],
    key_points: [
      'Hips back and chest up',
      'Grip outside knees',
      'Push floor away',
      'Stand tall without leaning back',
    ],
    image_path: `${IMG} (1).png`,
    image_row: 3,
  },
  {
    slug: 'barbell_row',
    label: 'Barbell Row',
    movement_pattern: 'horizontal_pull',
    equipment: 'barbell',
    primary_group: 'back',
    primary_muscles: ['Upper Back', 'Lats', 'Rear Delts', 'Biceps'],
    key_points: [
      'Hinge at hips',
      'Back flat and chest up',
      'Pull elbows back',
      'Lower with control',
    ],
    image_path: `${IMG} (1).png`,
    image_row: 4,
  },

  // ============ Image 2
  {
    slug: 'standing_overhead_barbell_press',
    label: 'Standing Overhead Barbell Press',
    movement_pattern: 'vertical_push',
    equipment: 'barbell',
    primary_group: 'shoulders',
    primary_muscles: ['Front Delts', 'Side Delts', 'Triceps', 'Upper Chest'],
    key_points: [
      'Brace core and glutes',
      'Press in a straight line',
      'Finish with biceps by ears',
      'Avoid leaning back',
    ],
    image_path: `${IMG} (2).png`,
    image_row: 1,
  },
  {
    slug: 'overhand_pull_up',
    label: 'Overhand Pull-Up',
    movement_pattern: 'vertical_pull',
    equipment: 'bodyweight',
    primary_group: 'back',
    primary_muscles: ['Lats', 'Biceps', 'Upper Back'],
    key_points: [
      'Overhand grip wider than shoulders',
      'Full hang at the bottom',
      'Pull elbows down and back',
      'Control the descent',
    ],
    image_path: `${IMG} (2).png`,
    image_row: 2,
  },
  {
    slug: 'incline_dumbbell_press',
    label: 'Incline Dumbbell Press',
    movement_pattern: 'horizontal_push',
    equipment: 'dumbbell',
    primary_group: 'chest',
    primary_muscles: ['Upper Chest', 'Front Delts', 'Triceps'],
    key_points: [
      'Bench at 30–45 degrees',
      'Feet planted',
      'Shoulder blades back',
      'Lower with control',
    ],
    image_path: `${IMG} (2).png`,
    image_row: 3,
  },
  {
    slug: 'cable_flye',
    label: 'Cable Flye',
    movement_pattern: 'horizontal_push',
    equipment: 'cable',
    primary_group: 'chest',
    primary_muscles: ['Chest', 'Front Delts'],
    key_points: [
      'Slight elbow bend',
      'Chest up and shoulders down',
      'Bring hands together in an arc',
      'Control the stretch',
    ],
    image_path: `${IMG} (2).png`,
    image_row: 4,
  },

  // ============ Image 3
  {
    slug: 'romanian_deadlift',
    label: 'Romanian Deadlift',
    movement_pattern: 'hinge',
    equipment: 'barbell',
    primary_group: 'legs',
    primary_muscles: ['Hamstrings', 'Glutes', 'Lower Back'],
    key_points: [
      'Soft bend in knees',
      'Hinge at the hips',
      'Keep bar close',
      'Spine neutral',
    ],
    image_path: `${IMG} (3).png`,
    image_row: 1,
  },
  {
    slug: 'split_squat',
    label: 'Split Squat',
    movement_pattern: 'lunge',
    equipment: 'dumbbell',
    primary_group: 'legs',
    primary_muscles: ['Quads', 'Glutes', 'Adductors'],
    key_points: [
      'Stable split stance',
      'Front foot flat',
      'Lower straight down',
      'Drive through front heel',
    ],
    image_path: `${IMG} (3).png`,
    image_row: 2,
  },
  {
    slug: 'hack_squat',
    label: 'Hack Squat',
    movement_pattern: 'squat',
    equipment: 'machine',
    primary_group: 'legs',
    primary_muscles: ['Quadriceps', 'Glutes'],
    key_points: [
      'Back against pad',
      'Feet shoulder-width on platform',
      'Descend deep with control',
      'Drive through mid-foot',
    ],
    image_path: `${IMG} (3).png`,
    image_row: 3,
  },
  {
    slug: 'high_bar_squat',
    label: 'High Bar Squat',
    movement_pattern: 'squat',
    equipment: 'barbell',
    primary_group: 'legs',
    primary_muscles: ['Quads', 'Glutes', 'Hamstrings'],
    key_points: [
      'Bar rests on upper traps',
      'Torso more upright',
      'Sit between the hips',
      'Drive through mid-foot',
    ],
    image_path: `${IMG} (3).png`,
    image_row: 4,
  },

  // ============ Image 4
  {
    slug: 'seated_leg_curl',
    label: 'Seated Leg Curl',
    movement_pattern: 'leg_isolation',
    equipment: 'machine',
    primary_group: 'legs',
    primary_muscles: ['Hamstrings'],
    key_points: [
      'Pad above heels',
      'Hips stay pinned down',
      'Curl through full range',
      'Lower slowly with control',
    ],
    image_path: `${IMG} (4).png`,
    image_row: 1,
  },
  {
    slug: 'belt_squat',
    label: 'Belt Squat',
    movement_pattern: 'squat',
    equipment: 'machine',
    primary_group: 'legs',
    primary_muscles: ['Quadriceps', 'Glutes'],
    key_points: [
      'Belt attached securely at hips',
      'Chest tall and core braced',
      'Descend deep with control',
      'Drive through mid-foot',
    ],
    image_path: `${IMG} (4).png`,
    image_row: 2,
  },
  {
    slug: 'front_foot_elevated_smith_lunge',
    label: 'Front Foot Elevated Smith Machine Lunge',
    movement_pattern: 'lunge',
    equipment: 'smith',
    primary_group: 'glutes',
    primary_muscles: ['Glutes', 'Quads'],
    key_points: [
      'Front foot elevated',
      'Slight forward torso lean',
      'Lower straight down',
      'Drive through front heel',
    ],
    image_path: `${IMG} (4).png`,
    image_row: 3,
  },
  {
    slug: 'lying_leg_curl',
    label: 'Lying Leg Curl',
    movement_pattern: 'leg_isolation',
    equipment: 'machine',
    primary_group: 'legs',
    primary_muscles: ['Hamstrings'],
    key_points: [
      'Pad rests above ankles',
      'Hips stay down on pad',
      'Curl through full range',
      'Lower slowly with control',
    ],
    image_path: `${IMG} (4).png`,
    image_row: 4,
  },

  // ============ Image 5
  {
    slug: 'good_morning',
    label: 'Good Morning',
    movement_pattern: 'hinge',
    equipment: 'barbell',
    primary_group: 'legs',
    primary_muscles: ['Hamstrings', 'Glutes', 'Lower Back'],
    key_points: [
      'Bar on upper back',
      'Soft knees',
      'Hinge hard at hips',
      'Keep spine neutral',
    ],
    image_path: `${IMG} (5).png`,
    image_row: 1,
  },
  {
    slug: 'reverse_nordic',
    label: 'Reverse Nordic',
    movement_pattern: 'leg_isolation',
    equipment: 'bodyweight',
    primary_group: 'legs',
    primary_muscles: ['Quads', 'Rectus Femoris'],
    key_points: [
      'Kneel tall with hips extended',
      'Lean back from knees',
      'Keep torso straight',
      'Return under control',
    ],
    image_path: `${IMG} (5).png`,
    image_row: 2,
  },
  {
    slug: 'dumbbell_reverse_lunge',
    label: 'Dumbbell Reverse Lunge',
    movement_pattern: 'lunge',
    equipment: 'dumbbell',
    primary_group: 'legs',
    primary_muscles: ['Quads', 'Glutes', 'Hamstrings'],
    key_points: [
      'Step back under control',
      'Front foot stays flat',
      'Torso stays tall',
      'Drive through front heel',
    ],
    image_path: `${IMG} (5).png`,
    image_row: 3,
  },
  {
    slug: 'heel_elevated_bw_squat',
    label: 'Heel-Elevated Bodyweight Squat',
    movement_pattern: 'squat',
    equipment: 'bodyweight',
    primary_group: 'legs',
    primary_muscles: ['Quadriceps', 'Glutes'],
    key_points: [
      'Heels elevated on small plates or wedge',
      'Stay upright through the torso',
      'Let knees travel forward naturally',
      'Descend deep with control',
    ],
    image_path: `${IMG} (5).png`,
    image_row: 4,
  },

  // ============ Image 6
  {
    slug: 'dumbbell_lateral_raise',
    label: 'Dumbbell Lateral Raise',
    movement_pattern: 'shoulder_isolation',
    equipment: 'dumbbell',
    primary_group: 'shoulders',
    primary_muscles: ['Lateral Delts', 'Upper Traps'],
    key_points: [
      'Soft bend in elbows',
      'Raise to shoulder height',
      'Lead with elbows',
      'Avoid shrugging or swinging',
    ],
    image_path: `${IMG} (6).png`,
    image_row: 1,
  },
  {
    slug: 'cable_lateral_raise',
    label: 'Cable Lateral Raise',
    movement_pattern: 'shoulder_isolation',
    equipment: 'cable',
    primary_group: 'shoulders',
    primary_muscles: ['Lateral Delts', 'Upper Traps'],
    key_points: [
      'Slight bend in elbow',
      'Raise to shoulder height',
      'Lead with elbow',
      'Avoid shrugging or swinging',
    ],
    image_path: `${IMG} (6).png`,
    image_row: 2,
  },
  {
    slug: 'cable_y_raise',
    label: 'Cable Y-Raise',
    movement_pattern: 'shoulder_isolation',
    equipment: 'cable',
    primary_group: 'shoulders',
    primary_muscles: ['Front Delts', 'Side Delts', 'Upper Back'],
    key_points: [
      'Use low cable handles',
      'Raise arms in a Y-path',
      'Keep shoulders down',
      'Move with control',
    ],
    image_path: `${IMG} (6).png`,
    image_row: 3,
  },
  {
    slug: 'super_rom_lateral_raise',
    label: 'Super ROM Lateral Raise',
    movement_pattern: 'shoulder_isolation',
    equipment: 'dumbbell',
    primary_group: 'shoulders',
    primary_muscles: ['Side Delts'],
    key_points: [
      'Full range below and above shoulder level',
      'Lead with elbows',
      'Control the negative',
      'Slight bend in elbows',
    ],
    image_path: `${IMG} (6).png`,
    image_row: 4,
  },

  // ============ Image 7
  {
    slug: 'weighted_dip',
    label: 'Weighted Dip',
    movement_pattern: 'horizontal_push',
    equipment: 'weighted_bodyweight',
    primary_group: 'chest',
    primary_muscles: ['Chest', 'Triceps', 'Front Delts'],
    key_points: [
      'Dip belt with weight attached',
      'Chest slightly forward',
      'Lower until upper arms reach depth',
      'Press up without shrugging',
    ],
    image_path: `${IMG} (7).png`,
    image_row: 1,
  },
  {
    slug: 'underhand_pulldown',
    label: 'Underhand Pulldown',
    movement_pattern: 'vertical_pull',
    equipment: 'cable',
    primary_group: 'back',
    primary_muscles: ['Lats', 'Biceps', 'Upper Back'],
    key_points: [
      'Shoulder-width underhand grip',
      'Sit tall with chest up',
      'Drive elbows down',
      'Control the return',
    ],
    image_path: `${IMG} (7).png`,
    image_row: 2,
  },
  {
    slug: 'lat_pulldown',
    label: 'Lat Pulldown',
    movement_pattern: 'vertical_pull',
    equipment: 'cable',
    primary_group: 'back',
    primary_muscles: ['Lats', 'Upper Back', 'Biceps'],
    key_points: [
      'Grip wider than shoulders',
      'Slight lean back',
      'Pull elbows to ribs',
      'Control the way up',
    ],
    image_path: `${IMG} (7).png`,
    image_row: 3,
  },
  {
    slug: 'chest_supported_row',
    label: 'Chest-Supported Row',
    movement_pattern: 'horizontal_pull',
    equipment: 'machine',
    primary_group: 'back',
    primary_muscles: ['Upper Back', 'Lats', 'Rear Delts', 'Biceps'],
    key_points: [
      'Chest stays glued to pad',
      'Pull elbows back',
      'Squeeze shoulder blades',
      'Lower with control',
    ],
    image_path: `${IMG} (7).png`,
    image_row: 4,
  },

  // ============ Image 8
  {
    slug: 'deficit_barbell_bent_over_row',
    label: 'Deficit Barbell Bent-Over Row',
    movement_pattern: 'horizontal_pull',
    equipment: 'barbell',
    primary_group: 'back',
    primary_muscles: ['Lats', 'Upper Back', 'Rear Delts', 'Biceps'],
    key_points: [
      'Stand on low deficit platform',
      'Hinge at hips',
      'Keep back flat and chest set',
      'Row elbows back then lower with control',
    ],
    image_path: `${IMG} (8).png`,
    image_row: 1,
  },
  {
    slug: 'cable_facepull',
    label: 'Cable Facepull',
    movement_pattern: 'shoulder_isolation',
    equipment: 'cable',
    primary_group: 'shoulders',
    primary_muscles: ['Rear Delts', 'Upper Back', 'Rotator Cuff'],
    key_points: [
      'Pull rope to face level',
      'Elbows high and wide',
      'Rotate so hands separate',
      'Control the return',
    ],
    image_path: `${IMG} (8).png`,
    image_row: 2,
  },
  {
    slug: 'preacher_curl',
    label: 'Preacher Curl',
    movement_pattern: 'arm_isolation',
    equipment: 'ez_bar',
    primary_group: 'arms',
    primary_muscles: ['Biceps'],
    key_points: [
      'Upper arms fixed on pad',
      'Full stretch at the bottom',
      'Curl up and squeeze',
      'Control the negative',
    ],
    image_path: `${IMG} (8).png`,
    image_row: 3,
  },
  {
    slug: 'seated_incline_dumbbell_curl',
    label: 'Seated Incline Dumbbell Curl',
    movement_pattern: 'arm_isolation',
    equipment: 'dumbbell',
    primary_group: 'arms',
    primary_muscles: ['Biceps'],
    key_points: [
      'Bench at 45–60 degrees',
      'Arms hang fully at the bottom',
      'Curl without swinging',
      'Squeeze and lower slowly',
    ],
    image_path: `${IMG} (8).png`,
    image_row: 4,
  },

  // ============ Image 9
  {
    slug: 'barbell_skull_crusher',
    label: 'Barbell Skull Crusher',
    movement_pattern: 'arm_isolation',
    equipment: 'barbell',
    primary_group: 'arms',
    primary_muscles: ['Triceps'],
    key_points: [
      'Lie flat on bench',
      'Upper arms stay mostly fixed',
      'Lower bar toward forehead or just behind it',
      'Extend elbows under control',
    ],
    image_path: `${IMG} (9).png`,
    image_row: 1,
  },
  {
    slug: 'ez_bar_behind_neck_tricep_extension',
    label: 'EZ Bar Behind The Neck Tricep Extension',
    movement_pattern: 'arm_isolation',
    equipment: 'ez_bar',
    primary_group: 'arms',
    primary_muscles: ['Triceps'],
    key_points: [
      'Grip EZ bar evenly',
      'Elbows point up',
      'Lower bar behind head for stretch',
      'Extend without shrugging',
    ],
    image_path: `${IMG} (9).png`,
    image_row: 2,
  },
  {
    slug: 'straight_leg_calf_raise_belt_squat',
    label: 'Straight Leg Calf Raise (Belt Squat)',
    movement_pattern: 'calf',
    equipment: 'machine',
    primary_group: 'calves',
    primary_muscles: ['Calves (Gastrocnemius)'],
    key_points: [
      'Straight legs',
      'Full stretch at bottom',
      'Drive through balls of feet',
      'Pause and squeeze at top',
    ],
    image_path: `${IMG} (9).png`,
    image_row: 3,
  },
  {
    slug: 'ab_wheel_rollout',
    label: 'Ab Wheel Rollout',
    movement_pattern: 'core',
    equipment: 'bodyweight',
    primary_group: 'core',
    primary_muscles: ['Rectus Abdominis', 'Obliques'],
    key_points: [
      'Kneel and brace your core',
      'Roll out in a straight line',
      'Do not let hips sag',
      'Squeeze abs to roll back',
    ],
    image_path: `${IMG} (9).png`,
    image_row: 4,
  },

  // ============ Image 10
  {
    slug: 'incline_cambered_bar_bench_press',
    label: 'Incline Cambered Bar Bench Press',
    movement_pattern: 'horizontal_push',
    equipment: 'barbell',
    primary_group: 'chest',
    primary_muscles: ['Upper Chest', 'Chest', 'Triceps', 'Anterior Deltoids'],
    key_points: [
      'Shoulder blades back and down',
      'Deep stretch on upper chest',
      'Drive bar up and slightly back',
      'Full control throughout',
    ],
    image_path: `${IMG} (10).png`,
    image_row: 1,
  },
  {
    slug: 'deficit_push_up',
    label: 'Deficit Push-Up',
    movement_pattern: 'horizontal_push',
    equipment: 'bodyweight',
    primary_group: 'chest',
    primary_muscles: ['Chest', 'Triceps', 'Shoulders'],
    key_points: [
      'Hands elevated on handles or plates',
      'Go deeper for greater stretch',
      'Elbows at 30–45 degrees',
      'Full range of motion',
    ],
    image_path: `${IMG} (10).png`,
    image_row: 2,
  },
  {
    slug: 'lying_dumbbell_curl',
    label: 'Lying Dumbbell Curl',
    movement_pattern: 'arm_isolation',
    equipment: 'dumbbell',
    primary_group: 'arms',
    primary_muscles: ['Biceps', 'Brachialis'],
    key_points: [
      'Lie flat on bench',
      'Arms slightly behind torso',
      'Keep elbows fixed',
      'Full stretch at bottom',
    ],
    image_path: `${IMG} (10).png`,
    image_row: 3,
  },
  {
    slug: 'stiff_leg_deadlift',
    label: 'Stiff-Leg Deadlift (SLDL)',
    movement_pattern: 'hinge',
    equipment: 'barbell',
    primary_group: 'legs',
    primary_muscles: ['Hamstrings', 'Glutes', 'Lower Back'],
    key_points: [
      'Minimal knee bend',
      'Hinge hard at hips',
      'Bar stays close to legs',
      'Stretch hamstrings then stand tall',
    ],
    image_path: `${IMG} (10).png`,
    image_row: 4,
  },
];

// Subset of the catalog organized by primary muscle group — used by
// the exercise reference panel for sectioned rendering.
export const MUSCLE_GROUP_LABEL: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back & Lats',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
  glutes: 'Glutes',
  core: 'Core',
  calves: 'Calves',
};

export const StrengthAssessmentInputSchema = z.object({
  primary_goal: z.enum([
    'size',
    'strength',
    'both',
    'general_fitness',
    'not_sure',
  ]),
  days_per_week: z.enum(['2_days', '3_days', '4_days', '5_days', '6_days']),
  equipment_access: z.enum([
    'full_commercial_gym',
    'home_rack_bench',
    'minimal_dumbbells',
    'bodyweight_only',
  ]),
  current_split: z.enum([
    'none_or_inconsistent',
    'full_body',
    'upper_lower',
    'push_pull_legs',
    'bro_split',
    '5_day_aesthetic',
    'other',
  ]),
  strength_goal_text: z.string().max(280).nullable(),
  // Q5: 0-3 priority muscles + optional lagging note. Cardinality
  // enforced here (DB has only the value-set check). Empty array is
  // valid — means "no priority bias, default volume distribution."
  priority_muscles: z
    .array(
      z.enum([
        'side_delts',
        'upper_chest',
        'lats_back_width',
        'arms',
        'glutes',
        'hamstrings',
      ]),
    )
    .max(PRIORITY_MUSCLE_MAX),
  lagging_muscles_text: z.string().max(280).nullable(),
  // Q6 + Q7 (migration 0067). Both nullable to support the migration
  // window where existing assessments don't have these. The form
  // requires them on next submit. injury_constraints enum-array
  // enforced at the API boundary (DB stores raw text[]).
  secondary_objective: z
    .enum([
      'weight_loss',
      'core_strength',
      'mobility_flexibility',
      'cardiovascular_health',
      'general_function',
      'none',
    ])
    .nullable(),
  injury_constraints: z
    .array(
      z.enum([
        'lower_back_pain',
        'knee_pain',
        'shoulder_or_neck_pain',
        'elbow_pain',
      ]),
    )
    .max(4),
});

export type StrengthAssessmentInput = z.infer<
  typeof StrengthAssessmentInputSchema
>;

// Schema for the exercise-preferences endpoint. Slugs validated as
// strings only (existence in the catalog is enforced at the service
// layer to avoid a 40-entry enum here that drifts when the catalog
// grows).
export const StrengthExercisePreferencesInputSchema = z.object({
  selected_exercise_slugs: z.array(z.string()).max(STRENGTH_EXERCISES.length),
  excluded_exercise_slugs: z.array(z.string()).max(STRENGTH_EXERCISES.length),
  exercise_filter_text: z.string().max(500).nullable(),
});

export type StrengthExercisePreferencesInput = z.infer<
  typeof StrengthExercisePreferencesInputSchema
>;
