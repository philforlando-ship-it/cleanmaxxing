// Warm-up + mobility catalog. Despite the path under lib/strength/,
// this catalog now also serves cardio users — most static mobility
// (couch stretch, pigeon, lat stretch, lying spinal twist) applies
// to anyone post-workout regardless of modality. A small set of
// cardio-specific additions (calf stretch, IT band, forward fold,
// leg swings) was added 2026-05-07 so runners + cyclists + rowers
// can use the same panel.
//
// Distinct from the lifting catalog (STRENGTH_EXERCISES). The voice
// posture matters here: most lifters mishandle stretching by doing
// static stretches pre-lift, which the literature shows blunts force
// production for 30-60 minutes (Behm, Simic, Kallerud meta-analyses).
// The same finding applies to cardio — but cardio modalities are
// largely self-warming (a 5-min easy spin warms up cycling) so the
// dynamic-warmup demand is smaller pre-cardio than pre-lift.
//
// Two flow types:
//   dynamic_warmup → pre-lift, movement-prep style. Pattern-mapped:
//     universal warm-ups (empty pairs_with_patterns) belong before
//     any session; lift-specific ones map to MovementPattern values
//     that the user's selected exercises hit.
//   static_mobility → POST-workout or dedicated mobility session.
//     Targets-areas mapping ('hip_flexor', 'pec', 'glutes', etc.) so
//     the prompt can recommend specific holds for chronic tightness.
//
// No image_path on most entries yet — infographics for warm-ups are
// out-of-band content work the user generates separately. The panel
// renders text-only when no image is set, same graceful-degrade
// pattern as the cut-families.

import type { MovementPattern } from './types';

export type WarmupFlowType = 'dynamic_warmup' | 'static_mobility';

export type WarmupEquipment =
  | 'bodyweight'
  | 'resistance_bands'
  | 'dumbbells';

// Body areas a static mobility exercise targets. Used by the prompt
// when surfacing mobility for chronic tightness — e.g., a user with
// `injury_constraints: ['lower_back_pain']` gets hip_flexor +
// glutes recommendations because tight hip flexors pull the pelvis
// into anterior tilt, which loads the lumbar spine.
export type TargetArea =
  | 'hip_flexor'
  | 'glutes'
  | 'pec'
  | 'lat'
  | 'spine'
  | 'tspine'
  | 'ankle'
  | 'piriformis'
  // Cardio-relevant additions (2026-05-07). Calf tightness drives
  // achilles + plantar fascia overuse for runners; IT band is the
  // #1 cyclist + mid-distance-runner complaint; hamstrings tighten
  // from cycling + rowing posture.
  | 'calves'
  | 'it_band'
  | 'hamstrings';

export type WarmupMobilityExercise = {
  slug: string;
  label: string;
  flow_type: WarmupFlowType;
  // Empty array = universal (good before any lift). Non-empty =
  // pairs best with these movement patterns (squat → hits squat
  // family + lunge family; horizontal_push → bench + DB press
  // variants + dips; etc.).
  pairs_with_patterns: MovementPattern[];
  // For static mobility — areas this exercise targets. Empty for
  // dynamic warm-ups (they're not aimed at a chronic-tightness
  // signal the same way).
  targets_areas: TargetArea[];
  equipment: WarmupEquipment;
  // Human-readable dose. Not parsed; surfaces directly in the UI
  // and the prompt.
  duration_or_reps: string;
  key_points: string[];
  // Optional. When unset, the panel renders text-only.
  image_path?: string;
};

export const WARMUP_MOBILITY_EXERCISES: ReadonlyArray<WarmupMobilityExercise> = [
  // ============ Universal dynamic warm-ups (5)
  {
    slug: 'cat_cow',
    label: 'Cat-Cow',
    flow_type: 'dynamic_warmup',
    pairs_with_patterns: [],
    targets_areas: [],
    equipment: 'bodyweight',
    duration_or_reps: '8–10 cycles, slow',
    key_points: [
      'On hands and knees',
      'Inhale → arch (cow), gaze up',
      'Exhale → round (cat), tuck chin',
      'Move through full spine, not just lower back',
    ],
  },
  {
    slug: 'worlds_greatest_stretch',
    label: 'World’s Greatest Stretch',
    flow_type: 'dynamic_warmup',
    pairs_with_patterns: [],
    targets_areas: [],
    equipment: 'bodyweight',
    duration_or_reps: '5 reps each side',
    key_points: [
      'Step into a deep lunge',
      'Place opposite hand on the floor inside the lead foot',
      'Rotate top arm up and open the chest',
      'Return and switch sides',
    ],
  },
  {
    slug: 'hip_90_90_switches',
    label: 'Hip 90/90 Switches',
    flow_type: 'dynamic_warmup',
    pairs_with_patterns: [],
    targets_areas: [],
    equipment: 'bodyweight',
    duration_or_reps: '8 switches each direction',
    key_points: [
      'Sit with one leg in front, one to the side, both at 90°',
      'Stay tall through the spine',
      'Rotate hips to switch sides without using hands',
      'Move slowly through end range',
    ],
  },
  {
    slug: 'walking_lunge_overhead_reach',
    label: 'Walking Lunge with Overhead Reach',
    flow_type: 'dynamic_warmup',
    pairs_with_patterns: [],
    targets_areas: [],
    equipment: 'bodyweight',
    duration_or_reps: '8 lunges total',
    key_points: [
      'Step into a deep lunge',
      'Reach both arms overhead and slightly back',
      'Keep ribs down, don’t flare',
      'Step through to the next lunge',
    ],
  },
  {
    slug: 'inchworm_to_pushup',
    label: 'Inchworm to Push-up',
    flow_type: 'dynamic_warmup',
    pairs_with_patterns: [],
    targets_areas: [],
    equipment: 'bodyweight',
    duration_or_reps: '5–8 reps',
    key_points: [
      'Hinge forward and walk hands out to plank',
      'Lower into one push-up',
      'Walk feet toward hands',
      'Stand tall, repeat',
    ],
  },
  {
    // Cardio-relevant universal warm-up. Particularly useful pre-run
    // (the canonical pre-run dynamic move), but also good before any
    // lower-body work.
    slug: 'leg_swings',
    label: 'Leg Swings (front-back + side-to-side)',
    flow_type: 'dynamic_warmup',
    pairs_with_patterns: [],
    targets_areas: [],
    equipment: 'bodyweight',
    duration_or_reps: '10 each direction, each leg',
    key_points: [
      'Stand next to a wall or post for balance',
      'Swing one leg front-to-back through full range',
      'Switch to side-to-side swings (across the body)',
      'Stay tall through the spine — don’t lean to swing',
    ],
  },

  // ============ Pre-squat / lower-body specific (4)
  {
    slug: 'banded_ankle_mobilization',
    label: 'Banded Ankle Mobilization',
    flow_type: 'dynamic_warmup',
    pairs_with_patterns: ['squat', 'lunge', 'leg_isolation'],
    targets_areas: [],
    equipment: 'resistance_bands',
    duration_or_reps: '10 reps each side',
    key_points: [
      'Anchor band at low point, loop over front of ankle',
      'Step forward into a half-kneel',
      'Drive front knee forward over toes',
      'Keep heel flat — work the ankle, not the calf',
    ],
  },
  {
    slug: 'goblet_deep_squat_hold',
    label: 'Goblet Deep Squat Hold',
    flow_type: 'dynamic_warmup',
    pairs_with_patterns: ['squat', 'lunge'],
    targets_areas: [],
    equipment: 'dumbbells',
    duration_or_reps: '20–30s, 1–2 sets',
    key_points: [
      'Hold one dumbbell at chest',
      'Sit into a deep squat — heels flat',
      'Use elbows to gently push knees out',
      'Stay tall through the spine',
    ],
  },
  {
    slug: 'cossack_squat',
    label: 'Cossack Squat',
    flow_type: 'dynamic_warmup',
    pairs_with_patterns: ['squat', 'lunge'],
    targets_areas: [],
    equipment: 'bodyweight',
    duration_or_reps: '6 reps each side',
    key_points: [
      'Wide stance, toes slightly out',
      'Sit hips back into one side, opposite leg straight',
      'Heel of the bent-knee leg stays flat',
      'Shift slowly side to side',
    ],
  },
  {
    slug: 'hip_airplanes',
    label: 'Hip Airplanes',
    flow_type: 'dynamic_warmup',
    pairs_with_patterns: ['squat', 'lunge', 'hinge'],
    targets_areas: [],
    equipment: 'bodyweight',
    duration_or_reps: '6 reps each side',
    key_points: [
      'Stand on one leg, hinge forward at hips',
      'Trail leg extends behind',
      'Rotate hips open, then closed, then open',
      'Keep standing leg slightly bent and stable',
    ],
  },

  // ============ Pre-bench / press specific (3)
  {
    slug: 'band_pull_aparts',
    label: 'Band Pull-Aparts',
    flow_type: 'dynamic_warmup',
    pairs_with_patterns: ['horizontal_push', 'vertical_push'],
    targets_areas: [],
    equipment: 'resistance_bands',
    duration_or_reps: '15–20 reps',
    key_points: [
      'Hold band at shoulder height, arms straight',
      'Pull band apart by squeezing shoulder blades',
      'Lead with elbows back and down',
      'Slow return',
    ],
  },
  {
    slug: 'wall_slides',
    label: 'Wall Slides',
    flow_type: 'dynamic_warmup',
    pairs_with_patterns: ['horizontal_push', 'vertical_push'],
    targets_areas: [],
    equipment: 'bodyweight',
    duration_or_reps: '8–10 reps',
    key_points: [
      'Stand with back against wall, feet 6 inches out',
      'Arms on wall in goal-post position',
      'Slide arms up overhead while keeping back + arms in contact',
      'Lower with control',
    ],
  },
  {
    slug: 'open_book_tspine_rotation',
    label: 'Open-Book T-Spine Rotation',
    flow_type: 'dynamic_warmup',
    pairs_with_patterns: ['horizontal_push', 'vertical_push'],
    targets_areas: [],
    equipment: 'bodyweight',
    duration_or_reps: '6 reps each side',
    key_points: [
      'Side-lying with knees stacked at 90°',
      'Arms extended in front, palms together',
      'Rotate top arm open, follow with eyes',
      'Keep knees stacked — rotation comes from the spine',
    ],
  },

  // ============ Pre-deadlift / hinge specific (2)
  {
    slug: 'bird_dog',
    label: 'Bird-Dog',
    flow_type: 'dynamic_warmup',
    pairs_with_patterns: ['hinge'],
    targets_areas: [],
    equipment: 'bodyweight',
    duration_or_reps: '8 reps each side',
    key_points: [
      'On hands and knees, neutral spine',
      'Extend opposite arm and leg simultaneously',
      'Keep hips square — don’t let pelvis tip',
      'Slow return',
    ],
  },
  {
    slug: 'bodyweight_glute_bridge_warmup',
    label: 'Glute Bridge (warm-up reps)',
    flow_type: 'dynamic_warmup',
    pairs_with_patterns: ['hinge'],
    targets_areas: [],
    equipment: 'bodyweight',
    duration_or_reps: '10 reps with 1s squeeze at top',
    key_points: [
      'Lie on back, knees bent, feet flat',
      'Drive through heels to lift hips',
      'Squeeze glutes hard at the top',
      'Lower with control',
    ],
  },

  // ============ Post-workout static mobility (5)
  {
    slug: 'couch_stretch',
    label: 'Couch Stretch',
    flow_type: 'static_mobility',
    pairs_with_patterns: [],
    targets_areas: ['hip_flexor'],
    equipment: 'bodyweight',
    duration_or_reps: '60–90s each side',
    key_points: [
      'Place rear foot up on a couch or wall',
      'Front leg in a half-kneel, knee at 90°',
      'Squeeze the rear glute and tuck pelvis',
      'Stay tall — don’t arch the lower back',
    ],
  },
  {
    slug: 'pigeon_pose',
    label: 'Pigeon Pose',
    flow_type: 'static_mobility',
    pairs_with_patterns: [],
    targets_areas: ['glutes', 'piriformis'],
    equipment: 'bodyweight',
    duration_or_reps: '60–90s each side',
    key_points: [
      'From a quadruped position, bring one knee forward and out',
      'Extend the back leg straight behind you',
      'Lower the chest toward the floor',
      'Breathe into the front-leg glute',
    ],
  },
  {
    slug: 'lying_spinal_twist',
    label: 'Lying Spinal Twist',
    flow_type: 'static_mobility',
    pairs_with_patterns: [],
    targets_areas: ['spine', 'glutes'],
    equipment: 'bodyweight',
    duration_or_reps: '45–60s each side',
    key_points: [
      'Lie on back, draw one knee across the body',
      'Extend the opposite arm out to the side',
      'Look toward the extended arm',
      'Keep both shoulders flat on the floor',
    ],
  },
  {
    slug: 'doorway_pec_stretch',
    label: 'Doorway Pec Stretch',
    flow_type: 'static_mobility',
    pairs_with_patterns: [],
    targets_areas: ['pec'],
    equipment: 'bodyweight',
    duration_or_reps: '45–60s each side',
    key_points: [
      'Stand in a doorway, forearm against the frame at 90°',
      'Step the same-side foot through the doorway',
      'Rotate chest gently away from the arm',
      'Don’t crank — feel a stretch, not pain',
    ],
  },
  {
    slug: 'lat_stretch_overhead_reach',
    label: 'Lat Stretch (Overhead Reach)',
    flow_type: 'static_mobility',
    pairs_with_patterns: [],
    targets_areas: ['lat'],
    equipment: 'bodyweight',
    duration_or_reps: '45–60s each side',
    key_points: [
      'Kneel facing a low surface (couch, bench)',
      'Place forearms on the surface, palms together',
      'Sit hips back toward heels, chest dropping toward the floor',
      'Reach long through both arms',
    ],
  },

  // ============ Cardio-relevant static mobility (3 — 2026-05-07)
  {
    // Most overuse injuries in runners and walkers route through the
    // calf-achilles-plantar-fascia chain. Static calf stretching
    // post-cardio is one of the genuinely high-ROI interventions.
    slug: 'standing_calf_stretch',
    label: 'Standing Calf Stretch',
    flow_type: 'static_mobility',
    pairs_with_patterns: [],
    targets_areas: ['calves'],
    equipment: 'bodyweight',
    duration_or_reps: '45–60s each side, both straight + bent knee',
    key_points: [
      'Hands on a wall, one foot back, heel pressed down',
      'Straight back leg targets gastrocnemius',
      'Bend the back knee to shift to soleus',
      'Hold each variation; don’t bounce',
    ],
  },
  {
    // The #1 mid-distance runner + cyclist complaint. The figure-4
    // / standing variation is more accessible than the floor lying
    // version many guides show.
    slug: 'it_band_stretch_standing',
    label: 'IT Band Stretch (Standing)',
    flow_type: 'static_mobility',
    pairs_with_patterns: [],
    targets_areas: ['it_band'],
    equipment: 'bodyweight',
    duration_or_reps: '45–60s each side',
    key_points: [
      'Cross right leg behind left, feet roughly shoulder width',
      'Reach right arm overhead, side-bend to the left',
      'Push the right hip out to the right',
      'Feel the stretch along the outer right thigh',
    ],
  },
  {
    // Hamstring lengthening + low-back release. Cyclist + rower
    // archetype — both modalities shorten hamstrings + flex the
    // lumbar spine for hours.
    slug: 'standing_forward_fold',
    label: 'Standing Forward Fold',
    flow_type: 'static_mobility',
    pairs_with_patterns: [],
    targets_areas: ['hamstrings', 'spine'],
    equipment: 'bodyweight',
    duration_or_reps: '45–90s, soft knees',
    key_points: [
      'Stand tall, feet hip-width',
      'Hinge forward at the hips with soft knees',
      'Let head and arms hang heavy',
      'Don’t force the floor — depth comes with time',
    ],
  },
];

// =====================
// Helpers
// =====================

// Universal warm-ups — pairs_with_patterns is empty. Always
// recommended as the floor of any session's movement prep.
export function universalWarmups(): WarmupMobilityExercise[] {
  return WARMUP_MOBILITY_EXERCISES.filter(
    (w) => w.flow_type === 'dynamic_warmup' && w.pairs_with_patterns.length === 0,
  );
}

// Lift-specific dynamic warm-ups for a given set of movement
// patterns (derived from the user's selected exercises). Returns
// warm-ups whose pairs_with_patterns intersect with the input.
export function patternSpecificWarmups(
  patterns: ReadonlyArray<MovementPattern>,
): WarmupMobilityExercise[] {
  if (patterns.length === 0) return [];
  const set = new Set(patterns);
  return WARMUP_MOBILITY_EXERCISES.filter(
    (w) =>
      w.flow_type === 'dynamic_warmup' &&
      w.pairs_with_patterns.some((p) => set.has(p)),
  );
}

// All static mobility, for the post-workout / dedicated session
// surface. Targets-area filtering happens at render time when the
// user wants to focus on specific tightness.
export function allStaticMobility(): WarmupMobilityExercise[] {
  return WARMUP_MOBILITY_EXERCISES.filter(
    (w) => w.flow_type === 'static_mobility',
  );
}

// Cardio-specific static mobility — filters out lift-flavored entries
// (pec / lat / heavy tspine work) that don't address the chronic
// tightness patterns cardio users actually accumulate. Surfaces:
// calves (gastroc + soleus, runners), IT band (cyclists + runners),
// hamstrings (cyclists + rowers), hip flexor (everyone with seated
// time), glutes / piriformis (runners + cyclists), spine (lumbar
// release post-cycling). Used by the cardio mobility panel.
const CARDIO_RELEVANT_AREAS: ReadonlyArray<TargetArea> = [
  'calves',
  'it_band',
  'hamstrings',
  'hip_flexor',
  'glutes',
  'piriformis',
  'ankle',
  'spine',
];

export function cardioStaticMobility(): WarmupMobilityExercise[] {
  const areas = new Set<TargetArea>(CARDIO_RELEVANT_AREAS);
  return WARMUP_MOBILITY_EXERCISES.filter(
    (w) =>
      w.flow_type === 'static_mobility' &&
      w.targets_areas.some((a) => areas.has(a)),
  );
}

export const FLOW_TYPE_LABEL: Record<WarmupFlowType, string> = {
  dynamic_warmup: 'Dynamic warm-up (pre-lift)',
  static_mobility: 'Static mobility (post-lift)',
};

export const WARMUP_EQUIPMENT_LABEL: Record<WarmupEquipment, string> = {
  bodyweight: 'Bodyweight',
  resistance_bands: 'Resistance bands',
  dumbbells: 'Dumbbells',
};

export const TARGET_AREA_LABEL: Record<TargetArea, string> = {
  hip_flexor: 'Hip flexor',
  glutes: 'Glutes',
  pec: 'Pec / front shoulder',
  lat: 'Lat',
  spine: 'Spine',
  tspine: 'Thoracic spine',
  ankle: 'Ankle',
  piriformis: 'Piriformis',
  calves: 'Calves',
  it_band: 'IT band',
  hamstrings: 'Hamstrings',
};
