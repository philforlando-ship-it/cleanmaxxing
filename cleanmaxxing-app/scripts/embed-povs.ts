/**
 * Embed POV chunks into Supabase pgvector.
 *
 * Run after `npm run sync-povs`. Reads content/povs/*.md, chunks them,
 * embeds with OpenAI text-embedding-3-small, and upserts into pov_docs + pov_chunks.
 *
 * Usage: npm run embed-povs
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { chunkMarkdown } from '../lib/mister-p/chunking';

const POVS_DIR = 'content/povs';

function parseFrontmatter(md: string): { meta: Record<string, string>; body: string } {
  const match = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: md };
  const meta: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) meta[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return { meta, body: match[2] };
}

async function main() {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const files = (await readdir(POVS_DIR)).filter((f) => f.endsWith('.md'));
  console.log(`Found ${files.length} POV docs`);

  for (const file of files) {
    const raw = await readFile(join(POVS_DIR, file), 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    const slug = meta.slug || file.replace(/\.md$/, '');
    const title = meta.title || slug;

    // Upsert pov_docs
    const { data: doc, error: docErr } = await supabase
      .from('pov_docs')
      .upsert(
        {
          slug,
          title,
          category: meta.category || null,
          priority_tier: meta.priority_tier || null,
          content: body,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'slug' }
      )
      .select()
      .single();

    if (docErr || !doc) {
      console.error(`  FAIL ${slug}: ${docErr?.message}`);
      continue;
    }

    // Delete existing chunks for this doc
    await supabase.from('pov_chunks').delete().eq('pov_doc_id', doc.id);

    // Chunk and embed
    const chunks = chunkMarkdown(body);
    if (chunks.length === 0) {
      console.log(`  ${slug}: empty, skipped`);
      continue;
    }

    // Batch embed
    const { data: embeddingData } = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunks,
    });

    const rows = embeddingData.map((e, i) => ({
      pov_doc_id: doc.id,
      chunk_index: i,
      content: chunks[i],
      embedding: e.embedding as unknown as string, // pgvector accepts array
    }));

    const { error: chunkErr } = await supabase.from('pov_chunks').insert(rows);
    if (chunkErr) {
      console.error(`  FAIL chunks ${slug}: ${chunkErr.message}`);
      continue;
    }

    console.log(`  ${slug.padEnd(50)} ${chunks.length} chunks`);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
