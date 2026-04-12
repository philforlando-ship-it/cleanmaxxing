/**
 * Quick sanity check: embed a test question and verify pgvector retrieval works.
 * Run with: npm run test-retrieval
 */
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const questions = [
    'Should I take creatine?',
    'What should I do about my hairline?',
    "What's a good test e cycle for a first-timer?",
  ];

  for (const q of questions) {
    console.log(`\n=== "${q}" ===`);

    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: q,
    });

    const { data, error } = await supabase.rpc('match_pov_chunks', {
      query_embedding: embedding.data[0].embedding as unknown as string,
      match_count: 3,
    });

    if (error) {
      console.error('Error:', error);
      continue;
    }

    for (const chunk of data || []) {
      console.log(
        `  [${chunk.similarity.toFixed(3)}] ${chunk.doc_slug} — ${chunk.content.slice(0, 100).replace(/\n/g, ' ')}...`
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
