import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data, error, count } = await supabase
    .from('journey_states')
    .select('*', { count: 'exact' });
  if (error) {
    console.error('ERR:', error.message);
    process.exit(1);
  }
  console.log(`rows: ${count}`);
  for (const row of data ?? []) console.log(row);
}

main();
