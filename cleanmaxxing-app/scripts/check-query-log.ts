/**
 * Quick check: did the onFinish handler in /api/mister-p/ask log the query?
 */
import { createClient } from '@supabase/supabase-js';

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from('mister_p_queries')
    .select('id, question, was_refused, refusal_reason, citations, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Found ${data?.length ?? 0} recent mister_p_queries rows:\n`);
  for (const row of data || []) {
    console.log(`  [${row.created_at}]`);
    console.log(`  Q: ${row.question}`);
    console.log(`  Refused: ${row.was_refused}${row.refusal_reason ? ` (${row.refusal_reason})` : ''}`);
    console.log(`  Citations: ${JSON.stringify(row.citations).slice(0, 200)}`);
    console.log();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
