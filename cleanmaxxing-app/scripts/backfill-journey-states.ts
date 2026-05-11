// One-time backfill: iterate every user with at least one journey
// assessment and run syncJourneyStates so journey_states gets seeded
// AND retroactive graduation milestones fire for users who already
// meet the maintaining criteria (per Slice 1 scope 2026-05-11, the
// retroactive-graduation default is ON).
//
// Idempotent: safe to re-run. syncJourneyStates only writes when the
// computed phase differs from the stored phase, and the milestone
// upsert is unique-key gated.
//
// Usage:
//   npm run backfill-journey-states
//
// After migration 0109 is applied in Supabase, run this script once
// to populate the table. New users picked up by the regular /today
// sync as they hit the page.

import { createClient } from '@supabase/supabase-js';
import { syncJourneyStates } from '../lib/journey-state/persist';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Union the user_id columns across every assessment table — these are
// the users with at least one active journey. Hitting the workout_logs
// table for strength/cardio activity too.
async function listCandidateUserIds(): Promise<string[]> {
  const sources: Array<{ table: string; column: string }> = [
    { table: 'hair_assessments', column: 'user_id' },
    { table: 'style_assessments', column: 'user_id' },
    { table: 'nutrition_assessments', column: 'user_id' },
    { table: 'strength_assessments', column: 'user_id' },
    { table: 'cardio_assessments', column: 'user_id' },
    { table: 'sleep_assessments', column: 'user_id' },
    { table: 'skincare_assessments', column: 'user_id' },
    { table: 'facial_hair_assessments', column: 'user_id' },
    { table: 'facial_structure_assessments', column: 'user_id' },
  ];

  const userIds = new Set<string>();
  for (const src of sources) {
    const { data, error } = await supabase.from(src.table).select(src.column);
    if (error) {
      console.warn(`  skipping ${src.table}: ${error.message}`);
      continue;
    }
    for (const row of (data ?? []) as unknown as Array<
      Record<string, string>
    >) {
      const id = row[src.column];
      if (id) userIds.add(id);
    }
  }
  return Array.from(userIds);
}

async function main() {
  console.log('backfill-journey-states: gathering candidate user ids');
  const userIds = await listCandidateUserIds();
  console.log(`  ${userIds.length} candidate users found`);

  let synced = 0;
  let failed = 0;
  for (const userId of userIds) {
    try {
      const computed = await syncJourneyStates(supabase, userId);
      const slugs = Object.keys(computed).join(',') || '(none)';
      console.log(`  ok  ${userId}: ${slugs}`);
      synced += 1;
    } catch (err) {
      console.error(`  err ${userId}:`, err);
      failed += 1;
    }
  }

  console.log(`done: synced=${synced} failed=${failed}`);
}

main().catch((err) => {
  console.error('backfill crashed:', err);
  process.exit(2);
});
