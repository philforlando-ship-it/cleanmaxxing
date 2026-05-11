// One-shot: probe what columns sleep_assessments actually has on
// the live DB. Diagnostic for the PGRST204 "biggest_blockers column
// not found" save error that survived a full project restart.
//
// Usage:
//   npx tsx -r dotenv/config scripts/probe-sleep-schema.ts dotenv_config_path=.env.local

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

async function main() {
  console.log('Connected to:', url);
  console.log('---');

  // 1. Does the table exist at all? Try a no-op select.
  console.log('Probe 1: SELECT 1 column from sleep_assessments');
  const { data: tableProbe, error: tableErr } = await supabase
    .from('sleep_assessments')
    .select('user_id')
    .limit(1);
  if (tableErr) {
    console.log('  ERROR:', tableErr.code, tableErr.message);
  } else {
    console.log('  OK — table exists, returned', tableProbe?.length ?? 0, 'row(s)');
  }
  console.log('---');

  // 2. SELECT * to see what columns PostgREST believes exist.
  console.log('Probe 2: SELECT * from sleep_assessments');
  const { data: selectAll, error: selectErr } = await supabase
    .from('sleep_assessments')
    .select('*')
    .limit(1);
  if (selectErr) {
    console.log('  ERROR:', selectErr.code, selectErr.message);
  } else {
    const row = selectAll?.[0];
    if (row) {
      console.log('  Columns (from a real row):');
      Object.keys(row).forEach((k) => console.log('    -', k));
    } else {
      console.log('  No rows in table. Trying empty insert to see column shape from error...');
      // Trigger a constraint error to learn schema
      const { error: probeErr } = await supabase
        .from('sleep_assessments')
        .insert({});
      console.log('  Empty-insert error:', probeErr?.code, '—', probeErr?.message);
    }
  }
  console.log('---');

  // 3. Specifically probe biggest_blockers visibility.
  console.log('Probe 3: SELECT biggest_blockers explicitly');
  const { error: bbErr } = await supabase
    .from('sleep_assessments')
    .select('biggest_blockers')
    .limit(1);
  if (bbErr) {
    console.log('  ERROR:', bbErr.code, bbErr.message);
  } else {
    console.log('  OK — biggest_blockers column visible to PostgREST');
  }
  console.log('---');

  // 4. Same for the other expected columns from migration 0049.
  console.log('Probe 4: SELECT each migration 0049 column explicitly');
  for (const col of [
    'primary_concerns',
    'biggest_blockers',
    'schedule_consistency',
    'what_tried',
    'sleep_goal_text',
    'report_text',
    'created_at',
    // Legacy singular forms — probe to see if they linger from an
    // earlier migration shape.
    'primary_concern',
    'biggest_blocker',
  ]) {
    const { error } = await supabase
      .from('sleep_assessments')
      .select(col)
      .limit(1);
    console.log(`    ${col}: ${error ? `MISSING (${error.code}: ${error.message})` : 'OK'}`);
  }
}

main();
