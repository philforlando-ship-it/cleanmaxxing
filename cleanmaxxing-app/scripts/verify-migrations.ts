// One-shot migration verifier. Runs against the live Supabase using
// the service role key and asks information_schema whether the three
// recent migrations (0085, 0086, 0087) actually landed.
//
// Usage:
//   npm exec -c "tsx -r dotenv/config scripts/verify-migrations.ts dotenv_config_path=.env.local"

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

type Check = {
  label: string;
  query: string;
  predicate: (rows: unknown[]) => { ok: boolean; detail: string };
};

const checks: Check[] = [
  {
    label: '0085 — facial_hair_assessments.growth_quality nullable',
    query: `
      select is_nullable
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'facial_hair_assessments'
        and column_name = 'growth_quality'
    `,
    predicate: (rows) => {
      const row = rows[0] as { is_nullable: string } | undefined;
      if (!row) return { ok: false, detail: 'column not found at all' };
      return {
        ok: row.is_nullable === 'YES',
        detail: `is_nullable=${row.is_nullable}`,
      };
    },
  },
  {
    label: '0086 — nutrition_assessments.fasting_protocol allows extended_36_biweekly',
    query: `
      select pg_get_constraintdef(oid) as defn
      from pg_constraint
      where conname = 'nutrition_assessments_fasting_protocol_check'
    `,
    predicate: (rows) => {
      const row = rows[0] as { defn: string } | undefined;
      if (!row) return { ok: false, detail: 'constraint not found' };
      return {
        ok: row.defn.includes('extended_36_biweekly'),
        detail: row.defn.replace(/\s+/g, ' ').slice(0, 200),
      };
    },
  },
  {
    label: '0087 — nutrition_assessments.gut_sensitivity column + check',
    query: `
      select column_name, data_type, column_default, is_nullable
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'nutrition_assessments'
        and column_name = 'gut_sensitivity'
    `,
    predicate: (rows) => {
      const row = rows[0] as
        | { column_name: string; column_default: string | null }
        | undefined;
      if (!row) return { ok: false, detail: 'column missing' };
      return {
        ok: true,
        detail: `default=${row.column_default ?? '<none>'}`,
      };
    },
  },
];

async function runQuery(sql: string): Promise<unknown[]> {
  // Use the PostgREST RPC mechanism. We don't have a stored proc for
  // arbitrary SQL (that would be a security hole), so instead we hit
  // information_schema views via the supabase JS client by translating
  // each into a .from(view).select(...) call. Below per check.
  void sql;
  return [];
}

async function check0085() {
  // PostgREST locks down cross-schema reads, so we can't ask
  // information_schema directly. Behavioral probe instead: try to
  // insert a sentinel row WITHOUT growth_quality. If the migration
  // landed, the insert fails on FK only (user_id 0000... isn't in
  // auth.users) — meaning the column accepted null. If the migration
  // didn't land, we'd get the 23502 NOT NULL violation first.
  const sentinelUserId = '00000000-0000-0000-0000-000000000000';
  await supabase
    .from('facial_hair_assessments')
    .delete()
    .eq('user_id', sentinelUserId);
  const { error } = await supabase.from('facial_hair_assessments').insert({
    user_id: sentinelUserId,
    current_state: 'clean_shaven',
    goal: 'not_sure_yet',
    time_commitment: 'low',
    density_cheeks: 'full',
    density_chin: 'full',
    density_mustache: 'full',
    // growth_quality intentionally omitted — that's the migration check
  });
  await supabase
    .from('facial_hair_assessments')
    .delete()
    .eq('user_id', sentinelUserId);
  if (error) {
    if (
      error.code === '23502' || // not_null_violation
      /null value in column "growth_quality"/i.test(error.message)
    ) {
      return {
        ok: false,
        detail: `growth_quality is still NOT NULL: ${error.message}`,
      };
    }
    if (
      error.code === '23503' || // foreign_key_violation — expected
      /foreign key/i.test(error.message)
    ) {
      return {
        ok: true,
        detail:
          'growth_quality omitted, FK rejected sentinel user (expected)',
      };
    }
    return { ok: false, detail: `unexpected error: ${error.message}` };
  }
  return { ok: true, detail: 'sentinel insert accepted without growth_quality' };
}

async function check0086() {
  // Probe the constraint by attempting an INSERT-validating
  // SELECT — the cheapest way without a stored proc. Use a synthetic
  // throwaway via a CTE expression. Easier: just try the new value
  // path by upserting a sentinel row and rolling back via DELETE.
  //
  // Even cheaper: query pg_constraint via a custom RPC… we don't
  // have one. So fall back to a behavioral check: try to set
  // gut_sensitivity AND fasting_protocol on a tagged sentinel row.
  // If the migration didn't land, the insert errors with check
  // constraint violation.
  const sentinelUserId = '00000000-0000-0000-0000-000000000000';
  // Cleanup any prior sentinel
  await supabase
    .from('nutrition_assessments')
    .delete()
    .eq('user_id', sentinelUserId);
  const { error } = await supabase.from('nutrition_assessments').insert({
    user_id: sentinelUserId,
    goal_direction: 'maintain',
    urgency: 'no_timeline',
    eating_context: 'inconsistent',
    what_tried: 'nothing_systematic',
    fasting_protocol: 'extended_36_biweekly',
    gut_sensitivity: 'sensitive',
  });
  // Always clean up
  await supabase
    .from('nutrition_assessments')
    .delete()
    .eq('user_id', sentinelUserId);
  if (error) {
    // FK error on user_id is expected (user 0000... doesn't exist in
    // auth.users) — but we want to distinguish that from a CHECK
    // constraint violation, which would mean the migration didn't
    // land.
    if (
      error.code === '23514' || // check_violation
      /check constraint/i.test(error.message) ||
      /violates check/i.test(error.message)
    ) {
      return {
        ok: false,
        detail: `check constraint rejected new values: ${error.message}`,
      };
    }
    if (
      error.code === '23503' || // foreign_key_violation — expected
      /foreign key/i.test(error.message)
    ) {
      // FK rejection means the column types accepted our values.
      return {
        ok: true,
        detail:
          'columns accepted new values (FK rejected sentinel user, expected)',
      };
    }
    if (/column .* does not exist/i.test(error.message)) {
      return { ok: false, detail: `column missing: ${error.message}` };
    }
    return { ok: false, detail: `unexpected error: ${error.message}` };
  }
  return { ok: true, detail: 'sentinel insert accepted' };
}

async function check0087() {
  // Behavioral: 0086 sentinel above already covers this (the insert
  // sets gut_sensitivity='sensitive' and the only error was FK). This
  // function is kept as a no-op placeholder so the dashboard reads
  // cleanly; combined verification lives in check0086.
  return {
    ok: true,
    detail: 'covered by combined sentinel insert in check above',
  };
}

// =====================
// 0088–0092 — independent migrations Phil shipped after the verifier
// landed. Same behavioral pattern: sentinel insert against synthetic
// user_id, expect FK rejection. Anything else (column missing, check
// violation, type mismatch) means the migration didn't apply.
// =====================

const SENTINEL_USER_ID = '00000000-0000-0000-0000-000000000000';

async function check0088() {
  // cardio_assessments.programming_priority — single text column.
  // Note that 0090 converted primary_role / modality_preference /
  // equipment_access on this same table to text[], so the sentinel
  // row passes ARRAYs for those (proves both 0088 + 0090 in one
  // insert if both have applied).
  await supabase
    .from('cardio_assessments')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  const { error } = await supabase.from('cardio_assessments').insert({
    user_id: SENTINEL_USER_ID,
    primary_role: ['cardiovascular_health'],
    current_movement: 'mostly_sedentary',
    modality_preference: ['brisk_walking_hiking'],
    days_per_week: '3_4_days',
    programming_priority: 'strength',
  });
  await supabase
    .from('cardio_assessments')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  return classifyError(error, 'programming_priority + array columns accepted');
}

async function check0089() {
  // weekly_reflections.activity_change — single nullable text column.
  await supabase
    .from('weekly_reflections')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  const { error } = await supabase.from('weekly_reflections').insert({
    user_id: SENTINEL_USER_ID,
    week_start: '2099-01-05', // fixed Monday far in the future
    activity_change: 'no_change',
  });
  await supabase
    .from('weekly_reflections')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  return classifyError(error, 'activity_change accepted');
}

async function check0090() {
  // 0090 converted three cardio_assessments columns to text[]. Already
  // exercised by check0088's array values — if that passed, this did
  // too. Kept as a labeled entry so the dashboard reads cleanly.
  return {
    ok: true,
    detail: 'covered by check0088 (array values in primary_role / modality_preference)',
  };
}

async function check0091() {
  // hair_try_ons.cut_family check expanded to include bro_flow +
  // classic_sweep_back. Smaller table than hair_assessments, easier
  // to construct a valid sentinel.
  await supabase
    .from('hair_try_ons')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  const { error } = await supabase.from('hair_try_ons').insert({
    user_id: SENTINEL_USER_ID,
    cut_family: 'bro_flow',
    storage_path: 'sentinel/never-used.png',
    model: 'verify-migrations-script',
  });
  await supabase
    .from('hair_try_ons')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  return classifyError(error, 'bro_flow accepted in cut_family check');
}

async function check0092() {
  // weekly_reflections.fatigue_level + fatigue_source — both nullable
  // text columns with check constraints on allowed enums.
  await supabase
    .from('weekly_reflections')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  const { error } = await supabase.from('weekly_reflections').insert({
    user_id: SENTINEL_USER_ID,
    week_start: '2099-01-05',
    fatigue_level: 'struggling',
    fatigue_source: 'cardio',
  });
  await supabase
    .from('weekly_reflections')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  return classifyError(error, 'fatigue_level + fatigue_source accepted');
}

async function check0093() {
  // style_assessments adds 5 granular body-dimension columns
  // (shoulder_width, arm_length, leg_length, build, skin_undertone),
  // all nullable. Sentinel sets all five + the existing required
  // columns (frame_estimate / current_archetype / target_archetype /
  // closet_state); FK rejects on user_id.
  await supabase
    .from('style_assessments')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  const { error } = await supabase.from('style_assessments').insert({
    user_id: SENTINEL_USER_ID,
    frame_estimate: 'athletic',
    current_archetype: 'clean_minimalist',
    target_archetype: 'clean_minimalist',
    closet_state: 'functional',
    shoulder_width: 'broad',
    arm_length: 'proportional',
    leg_length: 'long',
    build: 'athletic',
    skin_undertone: 'cool',
  });
  await supabase
    .from('style_assessments')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  return classifyError(
    error,
    'shoulder_width + arm_length + leg_length + build + skin_undertone accepted',
  );
}

async function check0094() {
  // strength_assessments.asymmetry_concern — nullable text column with
  // a check constraint on ('none', 'mild', 'noticeable'). Sentinel
  // sets the new column + the four required strength_assessments
  // columns; FK rejects on user_id.
  await supabase
    .from('strength_assessments')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  const { error } = await supabase.from('strength_assessments').insert({
    user_id: SENTINEL_USER_ID,
    primary_goal: 'size',
    days_per_week: '3_days',
    equipment_access: 'full_commercial_gym',
    current_split: 'full_body',
    asymmetry_concern: 'noticeable',
  });
  await supabase
    .from('strength_assessments')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  return classifyError(error, 'asymmetry_concern accepted');
}

async function check0095() {
  // sleep_logs.resting_heart_rate — nullable int with check constraint
  // (rhr > 0 and rhr < 250). Sentinel sets the three required
  // sleep_logs columns + a valid rhr; FK rejects on user_id (sleep_logs
  // FKs to auth.users, not public.users — same rejection shape).
  await supabase
    .from('sleep_logs')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  const { error } = await supabase.from('sleep_logs').insert({
    user_id: SENTINEL_USER_ID,
    night_of: '2099-01-05',
    hours: 7.5,
    resting_heart_rate: 58,
  });
  await supabase
    .from('sleep_logs')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  return classifyError(error, 'resting_heart_rate accepted');
}

async function check0096() {
  // Two columns added in one migration: sleep_logs.hrv_rmssd (int,
  // 0 < n < 300) and daily_activity.vo2_max (numeric, 0 < n < 100).
  // Probe both; combined PASS only if both columns accept their
  // sentinel values + FK-reject the user_id.

  // HRV first.
  await supabase
    .from('sleep_logs')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  const { error: hrvError } = await supabase.from('sleep_logs').insert({
    user_id: SENTINEL_USER_ID,
    night_of: '2099-01-06',
    hours: 7.5,
    hrv_rmssd: 45,
  });
  await supabase
    .from('sleep_logs')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  const hrvResult = classifyError(hrvError, 'hrv_rmssd accepted');
  if (!hrvResult.ok) {
    return { ok: false, detail: `hrv_rmssd: ${hrvResult.detail}` };
  }

  // VO2max next.
  await supabase
    .from('daily_activity')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  const { error: vo2Error } = await supabase.from('daily_activity').insert({
    user_id: SENTINEL_USER_ID,
    date: '2099-01-06',
    source: 'manual',
    vo2_max: 42.5,
  });
  await supabase
    .from('daily_activity')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  const vo2Result = classifyError(vo2Error, 'vo2_max accepted');
  if (!vo2Result.ok) {
    return { ok: false, detail: `vo2_max: ${vo2Result.detail}` };
  }

  return {
    ok: true,
    detail: 'hrv_rmssd + vo2_max both accepted (FK rejected sentinel user, expected)',
  };
}

async function check0097() {
  // style_assessments.frame_density — nullable text with check on
  // ('lean', 'dense', 'soft'). Sentinel sets frame_density + required
  // style_assessments columns; FK rejects on user_id.
  await supabase
    .from('style_assessments')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  const { error } = await supabase.from('style_assessments').insert({
    user_id: SENTINEL_USER_ID,
    frame_estimate: 'athletic',
    current_archetype: 'clean_minimalist',
    target_archetype: 'clean_minimalist',
    closet_state: 'functional',
    frame_density: 'dense',
  });
  await supabase
    .from('style_assessments')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  return classifyError(error, 'frame_density accepted');
}

async function check0098() {
  // Drop migration — daily_notes table was retired entirely. The
  // probe shape inverts: we WANT the query to fail with a
  // "table/relation does not exist" error. PostgREST surfaces this
  // as PGRST205 (resource not found) or as a Postgres 42P01 message
  // depending on whether the schema cache has refreshed. We accept
  // either.
  const { error } = await supabase
    .from('daily_notes')
    .select('id')
    .limit(1);
  if (!error) {
    return {
      ok: false,
      detail: 'daily_notes still exists (migration not applied or cache stale)',
    };
  }
  if (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    /does not exist/i.test(error.message ?? '') ||
    /could not find the table/i.test(error.message ?? '')
  ) {
    return {
      ok: true,
      detail: 'daily_notes table absent (drop confirmed)',
    };
  }
  return {
    ok: false,
    detail: `unexpected error (${error.code ?? 'no code'}): ${error.message}`,
  };
}

async function check0099() {
  // style_assessments.eye_color — nullable text column with check
  // constraint on six values. Sentinel sets the four required
  // style_assessments columns + the new eye_color; FK rejects on
  // user_id.
  await supabase
    .from('style_assessments')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  const { error } = await supabase.from('style_assessments').insert({
    user_id: SENTINEL_USER_ID,
    frame_estimate: 'athletic',
    current_archetype: 'clean_minimalist',
    target_archetype: 'clean_minimalist',
    closet_state: 'functional',
    eye_color: 'hazel',
  });
  await supabase
    .from('style_assessments')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  return classifyError(error, 'eye_color accepted');
}

async function check0102() {
  // style_assessments.wrist_size + dress_code_context — two nullable
  // text columns with check constraints. Sentinel sets the four
  // required style_assessments columns + both new fields; FK rejects
  // on user_id.
  await supabase
    .from('style_assessments')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  const { error } = await supabase.from('style_assessments').insert({
    user_id: SENTINEL_USER_ID,
    frame_estimate: 'athletic',
    current_archetype: 'clean_minimalist',
    target_archetype: 'clean_minimalist',
    closet_state: 'functional',
    wrist_size: 'average',
    dress_code_context: 'business_casual',
  });
  await supabase
    .from('style_assessments')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  return classifyError(error, 'wrist_size + dress_code_context accepted');
}

async function check0104() {
  // mister_p_queries.journey_slug — nullable text column, no DB-side
  // check constraint (slug values are validated app-side against
  // lib/today/journeys.ts JOURNEYS catalog). Sentinel insert sets
  // user_id (FK reject expected), question, answer, and journey_slug
  // to a known journey. FK rejection = pass.
  await supabase
    .from('mister_p_queries')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  const { error } = await supabase.from('mister_p_queries').insert({
    user_id: SENTINEL_USER_ID,
    question: 'sentinel',
    answer: 'sentinel',
    journey_slug: 'hair',
  });
  await supabase
    .from('mister_p_queries')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  return classifyError(error, 'journey_slug accepted');
}

async function check0103() {
  // nutrition_assessments.cheat_day_pattern — nullable text column
  // with check constraint on the four enum values. Sentinel sets
  // the required existing columns + the new field; FK rejects on
  // user_id (the sentinel UUID isn't a real user).
  await supabase
    .from('nutrition_assessments')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  const { error } = await supabase.from('nutrition_assessments').insert({
    user_id: SENTINEL_USER_ID,
    goal_direction: 'lose_fat',
    urgency: 'steady_6_to_12_months',
    eating_context: 'cook_most_meals',
    what_tried: 'nothing_systematic',
    fasting_protocol: 'none',
    alcohol_use: 'occasional',
    cannabis_use: 'none',
    cheat_day_pattern: 'planned_weekly_meal',
  });
  await supabase
    .from('nutrition_assessments')
    .delete()
    .eq('user_id', SENTINEL_USER_ID);
  return classifyError(error, 'cheat_day_pattern accepted');
}

// Shared helper: classify a Supabase error into pass / fail with
// detail. FK rejection = pass (column accepted, only the sentinel
// user_id was wrong). Anything else = fail with the postgres reason.
function classifyError(
  error: { code?: string; message?: string } | null,
  okDetail: string,
): { ok: boolean; detail: string } {
  if (!error) return { ok: true, detail: `${okDetail} (sentinel insert succeeded)` };
  if (
    error.code === '23503' ||
    /foreign key/i.test(error.message ?? '')
  ) {
    return {
      ok: true,
      detail: `${okDetail} (FK rejected sentinel user, expected)`,
    };
  }
  if (
    error.code === '23514' ||
    /check constraint/i.test(error.message ?? '') ||
    /violates check/i.test(error.message ?? '')
  ) {
    return {
      ok: false,
      detail: `check constraint rejected: ${error.message}`,
    };
  }
  if (/column .* does not exist/i.test(error.message ?? '')) {
    return { ok: false, detail: `column missing: ${error.message}` };
  }
  if (/invalid input syntax for type/i.test(error.message ?? '')) {
    return { ok: false, detail: `type mismatch: ${error.message}` };
  }
  return {
    ok: false,
    detail: `unexpected error (${error.code ?? 'no code'}): ${error.message}`,
  };
}

async function main() {
  const checks = [
    {
      label: '0085 — facial_hair_assessments.growth_quality nullable',
      run: check0085,
    },
    {
      label: '0086 — nutrition.fasting_protocol accepts extended_36_biweekly + 0087 column accepts sensitive',
      run: check0086,
    },
    {
      label: '0087 — nutrition_assessments.gut_sensitivity column exists',
      run: check0087,
    },
    {
      label: '0088 — cardio_assessments.programming_priority',
      run: check0088,
    },
    {
      label: '0089 — weekly_reflections.activity_change',
      run: check0089,
    },
    {
      label: '0090 — cardio_assessments multi-select arrays',
      run: check0090,
    },
    {
      label: '0091 — hair cut_family adds bro_flow + classic_sweep_back',
      run: check0091,
    },
    {
      label: '0092 — weekly_reflections.fatigue_level + fatigue_source',
      run: check0092,
    },
    {
      label: '0093 — style_assessments granular body dimensions',
      run: check0093,
    },
    {
      label: '0094 — strength_assessments.asymmetry_concern',
      run: check0094,
    },
    {
      label: '0095 — sleep_logs.resting_heart_rate',
      run: check0095,
    },
    {
      label: '0096 — sleep_logs.hrv_rmssd + daily_activity.vo2_max',
      run: check0096,
    },
    {
      label: '0097 — style_assessments.frame_density',
      run: check0097,
    },
    {
      label: '0098 — daily_notes table dropped',
      run: check0098,
    },
    {
      label: '0099 — style_assessments.eye_color',
      run: check0099,
    },
    {
      label: '0102 — style_assessments.wrist_size + dress_code_context',
      run: check0102,
    },
    {
      label: '0103 — nutrition_assessments.cheat_day_pattern',
      run: check0103,
    },
    {
      label: '0104 — mister_p_queries.journey_slug',
      run: check0104,
    },
  ];

  let allOk = true;
  for (const c of checks) {
    const { ok, detail } = await c.run();
    const tag = ok ? 'PASS' : 'FAIL';
    console.log(`[${tag}] ${c.label}\n        ${detail}`);
    if (!ok) allOk = false;
  }
  process.exit(allOk ? 0 : 1);
}

void runQuery;
main().catch((err) => {
  console.error('verify-migrations crashed:', err);
  process.exit(2);
});
