/**
 * Embed POV chunks into Supabase pgvector.
 *
 * Reads content/povs/*.md, chunks them, embeds with OpenAI
 * text-embedding-3-small, and upserts into pov_docs + pov_chunks.
 * Run whenever POV markdown changes so Mister P's retrieval stays
 * in sync with the committed corpus.
 *
 * Usage: npm run embed-povs
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { chunkMarkdown } from '../lib/mister-p/chunking';

const POVS_DIR = 'content/povs';
const METADATA_FILE = 'content/povs/_metadata.json';

type PovTier =
  | 'tier-1'
  | 'tier-2'
  | 'tier-3'
  | 'tier-4'
  | 'tier-5'
  | 'conditional-tier-1'
  | 'advanced'
  | 'monitor'
  | 'avoid'
  | 'meta';

type PovCategory =
  | 'biological-foundation'
  | 'structural-framing'
  | 'grooming-refinement'
  | 'behavioral-aesthetics'
  | 'perception-identity'
  | 'system'
  | 'safety'
  | 'context';

type PovMetadata = {
  priority_tier: PovTier | null;
  category: PovCategory | null;
  age_segments: Array<'18-24' | '25-32' | '33-40'>;
};

async function loadMetadata(): Promise<Record<string, PovMetadata>> {
  const raw = await readFile(METADATA_FILE, 'utf8');
  const parsed = JSON.parse(raw) as Record<string, PovMetadata>;
  // Strip legend / comment keys
  return Object.fromEntries(
    Object.entries(parsed).filter(([k]) => !k.startsWith('_'))
  );
}

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

  const metadata = await loadMetadata();
  const files = (await readdir(POVS_DIR)).filter((f) => f.endsWith('.md'));
  console.log(`Found ${files.length} POV docs, ${Object.keys(metadata).length} metadata entries`);

  let missingMeta = 0;
  let incompleteMeta = 0;

  for (const file of files) {
    const raw = await readFile(join(POVS_DIR, file), 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    const slug = meta.slug || file.replace(/\.md$/, '');
    const title = meta.title || slug;

    const md = metadata[slug];
    if (!md) {
      console.warn(`  WARN ${slug}: no entry in _metadata.json — add one`);
      missingMeta++;
    } else if (md.priority_tier === null || md.category === null || md.age_segments.length === 0) {
      console.warn(`  WARN ${slug}: metadata incomplete (tier=${md.priority_tier} category=${md.category} segments=${md.age_segments.length})`);
      incompleteMeta++;
    }

    // Upsert pov_docs
    const { data: doc, error: docErr } = await supabase
      .from('pov_docs')
      .upsert(
        {
          slug,
          title,
          category: md?.category ?? null,
          priority_tier: md?.priority_tier ?? null,
          age_segments: md?.age_segments ?? [],
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
  if (missingMeta > 0 || incompleteMeta > 0) {
    console.log(`Metadata gaps: ${missingMeta} missing, ${incompleteMeta} incomplete. Goal suggestion will skip these.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
