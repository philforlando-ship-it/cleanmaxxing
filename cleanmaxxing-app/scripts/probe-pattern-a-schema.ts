// Probe Pattern A assessment tables for partial-migration drift.
// Generalized from probe-sleep-schema.ts.
//
// Usage:
//   npx tsx -r dotenv/config scripts/probe-pattern-a-schema.ts dotenv_config_path=.env.local

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SENTINEL_USER_ID = '00000000-0000-0000-0000-000000000000';

type TableSpec = {
  name: string;
  expectedCols: string[];
  // Full-row sentinel for array-shape probes that need all NOT NULL
  // cols populated. Maps col → value (use array values for array
  // cols you want to test).
  arrayProbe?: { row: Record<string, unknown>; testCols: string[] };
  legacyCols: string[];
};

const TABLES: TableSpec[] = [
  {
    name: 'hair_assessments',
    expectedCols: [
      // 0035 create
      'user_id', 'face_shape', 'density_state', 'hair_type_strand',
      'hair_type_pattern', 'hair_type_density', 'current_routine',
      'hair_goal_text', 'report_text', 'report_generated_at',
      'report_model', 'report_input_modifiers', 'created_at', 'updated_at',
      // 0036
      'stage_1_cut_family', 'stage_1_barber_text', 'stage_1_generated_at',
      'stage_1_completed_at',
      // 0037 (stage_2_pattern_d_goal_id dropped in goals-retirement Tier 3)
      'stage_2_path', 'stage_2_locked_in_at',
      // 0038
      'stage_4_started_at', 'stage_4_target_check_ins', 'stage_4_completed_at',
      // 0039
      'stage_3_recommendation_text', 'stage_3_generated_at',
      'stage_3_model', 'stage_3_acknowledged_at',
      // 0040
      'pattern_d_treatment_started_at',
      // 0041
      'stage_5_started_at', 'stage_5_cadence_days',
      'stage_5_last_session_at', 'stage_5_session_count',
      'stage_6_started_at', 'stage_6_cut_cadence_weeks',
      // 0099 expanded
      'head_shape', 'head_size', 'graying_level', 'ear_prominence',
      'balding_pattern',
    ],
    legacyCols: [],
  },
  {
    name: 'style_assessments',
    expectedCols: [
      // 0043 create
      'user_id', 'frame_estimate', 'current_archetype', 'target_archetype',
      'closet_state', 'style_goal_text', 'report_text', 'report_generated_at',
      'report_model', 'report_input_modifiers', 'created_at', 'updated_at',
      // 0064 stages
      'stage_1_chip_selections', 'stage_1_audit_text', 'stage_1_generated_at',
      'stage_1_completed_at', 'stage_2_pieces_acquired', 'stage_2_completed_at',
      'stage_3_acknowledged_at',
      // 0093 v2 granular
      'shoulder_width', 'arm_length', 'leg_length', 'build', 'skin_undertone',
      // 0097
      'frame_density',
      // 0099
      'eye_color',
      // 0102
      'wrist_size', 'dress_code_context',
    ],
    legacyCols: [],
  },
  {
    name: 'facial_hair_assessments',
    expectedCols: [
      // 0048 create
      'user_id', 'current_state', 'growth_quality', 'goal',
      'time_commitment', 'facial_hair_goal_text', 'report_text',
      'report_generated_at', 'report_model', 'report_input_modifiers',
      'created_at', 'updated_at',
      // 0060
      'growout_test_started_at', 'growout_test_completed_at',
      // 0074 density by area
      'density_cheeks', 'density_chin', 'density_mustache',
      // 0076 minoxidil
      'minoxidil_for_beard_started_at',
    ],
    legacyCols: [],
  },
  {
    name: 'skincare_assessments',
    expectedCols: [
      // 0053 create
      'user_id', 'skin_behavior', 'primary_concern', 'current_routine',
      'sun_exposure', 'skincare_goal_text', 'report_text',
      'report_generated_at', 'report_model', 'report_input_modifiers',
      'created_at', 'updated_at',
      // 0060
      'retinoid_started_at',
      // 0061
      'last_step_up_at',
      // 0071
      'baseline_established_at',
      // 0073
      'sensitivity_history', 'barrier_state',
    ],
    legacyCols: [],
  },
  {
    name: 'nutrition_assessments',
    expectedCols: [
      // 0054 create
      'user_id', 'goal_direction', 'urgency', 'eating_context',
      'what_tried', 'nutrition_goal_text', 'report_text',
      'report_generated_at', 'report_model', 'report_input_modifiers',
      'created_at', 'updated_at',
      // 0058 v2 (subset shown — checking the visible ones)
      'fasting_protocol', 'alcohol_use', 'cannabis_use',
      'food_preferences', 'food_exclusions', 'food_filter_text',
      'tdee_estimate', 'calorie_target', 'protein_target_g',
      'carb_target_g',
      // 0060
      'last_evaluated_at',
      // 0066
      'cooking_capacity', 'dietary_pattern', 'meal_service_willingness',
      'snacking_style',
      // 0079
      'goal_weight_lbs', 'goal_target_weeks', 'bf_pct_assessment',
      'safe_max_weekly_pct', 'realistic_target_weeks',
      // 0087
      'gut_sensitivity',
      // 0103
      'cheat_day_pattern',
    ],
    legacyCols: [],
  },
  {
    name: 'strength_assessments',
    expectedCols: [
      // 0055 create
      'user_id', 'primary_goal', 'days_per_week', 'equipment_access',
      'current_split', 'strength_goal_text', 'report_text',
      'report_generated_at', 'report_model', 'report_input_modifiers',
      'created_at', 'updated_at',
      // 0057
      'selected_exercise_slugs', 'excluded_exercise_slugs',
      'exercise_filter_text',
      // 0060
      'beginner_ramp_completed_at',
      // 0061
      'last_plateau_intervention_at',
      // 0062
      'priority_muscles', 'lagging_muscles_text',
      // 0067
      'secondary_objective', 'injury_constraints',
      // 0080
      'bodyweight_preference',
      // 0081
      'equipment_owned',
      // 0094
      'asymmetry_concern',
    ],
    arrayProbe: {
      row: {
        user_id: SENTINEL_USER_ID,
        primary_goal: 'size',
        days_per_week: '3_days',
        equipment_access: 'full_commercial_gym',
        current_split: 'full_body',
      },
      testCols: [
        'selected_exercise_slugs',
        'excluded_exercise_slugs',
        'priority_muscles',
        'injury_constraints',
        'equipment_owned',
      ],
    },
    legacyCols: [],
  },
  {
    name: 'cardio_assessments',
    expectedCols: [
      // 0056 create
      'user_id', 'primary_role', 'current_movement', 'modality_preference',
      'days_per_week', 'cardio_goal_text', 'report_text',
      'report_generated_at', 'report_model', 'report_input_modifiers',
      'created_at', 'updated_at',
      // 0060
      'zone_2_layer_started_at',
      // 0061
      'hiit_layer_started_at',
      // 0070
      'injury_constraints', 'outdoor_access',
      'time_per_session', 'occupation_activity',
      // 0088
      'programming_priority',
    ],
    arrayProbe: {
      // The big one for cardio: 0090 ALTERed primary_role, modality_preference,
      // and equipment_access from text → text[]. Probe whether that
      // actually landed. Valid post-0090 enum values used so check
      // constraints don't reject before we can test type shape.
      row: {
        user_id: SENTINEL_USER_ID,
        current_movement: 'light_movement',
        days_per_week: '3_4_days',
        primary_role: ['cardiovascular_health'],
        modality_preference: ['cycling'],
      },
      testCols: ['primary_role', 'modality_preference', 'equipment_access'],
    },
    legacyCols: [],
  },
];

async function probeColumn(table: string, col: string): Promise<string> {
  const { error } = await supabase.from(table).select(col).limit(1);
  if (error) return `MISSING (${error.code}: ${error.message})`;
  return 'OK';
}

async function probeArrayShapeAdvanced(
  table: string,
  baseRow: Record<string, unknown>,
  testCol: string,
): Promise<string> {
  await supabase.from(table).delete().eq('user_id', SENTINEL_USER_ID);
  const row = { ...baseRow, [testCol]: ['sentinel_test_value'] };
  const { error } = await supabase.from(table).insert(row);
  await supabase.from(table).delete().eq('user_id', SENTINEL_USER_ID);

  if (!error) return 'array_OK_insert_succeeded';
  if (error.code === '23503' || /foreign key/i.test(error.message ?? '')) {
    return 'array_OK_FK_rejected';
  }
  if (error.code === '22P02' || /invalid input syntax for type text/i.test(error.message ?? '')) {
    return `SCALAR_DRIFT — column is text not text[] (${error.code}: ${error.message})`;
  }
  if (error.code === '23514' && /= ANY/i.test(error.message ?? '')) {
    return `SCALAR_DRIFT_via_check — old check uses = ANY (scalar form): ${error.message}`;
  }
  if (error.code === '23514') {
    return `check_violation — likely just bad sentinel value, column shape probably OK: ${error.message}`;
  }
  if (error.code === '23502') {
    return `inconclusive — other NOT NULL: ${error.message}`;
  }
  return `UNKNOWN (${error.code}: ${error.message})`;
}

async function main() {
  console.log('Connected to:', url);
  console.log('===');
  let anyDrift = false;
  for (const spec of TABLES) {
    console.log(`\n=== ${spec.name} ===`);

    let tableHasDrift = false;
    const missing: string[] = [];
    for (const col of spec.expectedCols) {
      const status = await probeColumn(spec.name, col);
      if (status !== 'OK') {
        missing.push(col);
        tableHasDrift = true;
      }
    }
    if (missing.length === 0) {
      console.log('  All expected columns: OK');
    } else {
      console.log('  MISSING columns:');
      missing.forEach((c) => console.log(`    - ${c}`));
    }

    if (spec.legacyCols.length > 0) {
      const present: string[] = [];
      for (const col of spec.legacyCols) {
        const status = await probeColumn(spec.name, col);
        if (status === 'OK') present.push(col);
      }
      if (present.length > 0) {
        console.log('  LEGACY columns still present (drift):');
        present.forEach((c) => console.log(`    - ${c}`));
        tableHasDrift = true;
      }
    }

    if (spec.arrayProbe) {
      console.log('  Array shape:');
      for (const col of spec.arrayProbe.testCols) {
        const result = await probeArrayShapeAdvanced(
          spec.name,
          spec.arrayProbe.row,
          col,
        );
        const flag = result.includes('SCALAR_DRIFT') ? ' ⚠️' : '';
        console.log(`    ${col}: ${result}${flag}`);
        if (result.includes('SCALAR_DRIFT')) tableHasDrift = true;
      }
    }

    console.log(`  STATUS: ${tableHasDrift ? 'DRIFT_FOUND' : 'CLEAN'}`);
    if (tableHasDrift) anyDrift = true;
  }
  console.log('\n===');
  console.log(`Audit complete. ${anyDrift ? 'DRIFT FOUND.' : 'All tables clean.'}`);
}

main();
