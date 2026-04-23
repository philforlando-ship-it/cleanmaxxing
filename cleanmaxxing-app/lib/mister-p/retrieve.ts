import OpenAI from 'openai';
import { createServiceClient } from '@/lib/supabase/server';

export type RetrievedChunk = {
  content: string;
  similarity: number;
  doc_slug: string;
  doc_title: string;
};

export async function embedQuestion(question: string): Promise<number[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const result = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
  });
  return result.data[0].embedding;
}

export async function retrieveChunksWithEmbedding(
  embedding: number[],
  matchCount = 5
): Promise<RetrievedChunk[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('match_pov_chunks', {
    query_embedding: embedding as unknown as string,
    match_count: matchCount,
  });

  if (error) {
    console.error('retrieveChunks error:', error);
    return [];
  }

  return (data || []) as RetrievedChunk[];
}

export async function retrieveChunks(question: string, matchCount = 5): Promise<RetrievedChunk[]> {
  const embedding = await embedQuestion(question);
  return retrieveChunksWithEmbedding(embedding, matchCount);
}

export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return '(no relevant context found)';
  return chunks
    .map((c, i) => `[${i + 1}] From "${c.doc_title}" (${c.doc_slug}):\n${c.content}`)
    .join('\n\n---\n\n');
}

// ============================================================
// Personalized retrieval
// ============================================================
//
// Wraps the standard retrieve with two per-user refinements:
//
//   1. Semantic-context augmentation — if `contextEmbedding` is
//      provided (built from specific_thing + recent reflection notes,
//      see lib/mister-p/semantic-context.ts), chunks are retrieved
//      from both the question vector and the context vector. The two
//      result sets are merged and deduped by slug+content so a user
//      whose reflection notes mention "skipping skincare at night"
//      surfaces evening-routine chunks even when they ask a narrower
//      question.
//
//   2. Citation-aware reranking — if `citationCounts` is provided
//      (slug → number of prior answers citing that doc), chunks get
//      a small bonus for unseen slugs and a small penalty per prior
//      citation beyond the second. Prevents the "same answer every
//      time" effect without changing the corpus.
//
// Both refinements are optional. When both are null/undefined,
// behavior reduces to the standard retrieveChunksWithEmbedding path.

// How many raw chunks to pull from each embedding before merging and
// reranking. Over-fetching gives the rerank step meaningful signal to
// work with. Numbers are tuned to stay well under the RPC cost ceiling
// while leaving the final top-5 comfortably above the similarity floor.
const QUESTION_OVERSAMPLE = 12;
const CONTEXT_OVERSAMPLE = 6;

// Citation rerank magnitudes. Cosine-similarity values in the corpus
// cluster roughly in [0.3, 0.75], so ±0.04 is a small but real nudge
// — enough to flip two near-neighbors, not enough to dominate a strong
// similarity signal. Tunable via exports if the behavior needs tuning.
export const UNSEEN_SLUG_BONUS = 0.04;
export const REPEAT_SLUG_PENALTY_STEP = 0.04;
export const REPEAT_SLUG_PENALTY_CAP = 0.15;
export const REPEAT_SLUG_THRESHOLD = 2; // citations above this trigger penalty

export type PersonalizedRetrieveOptions = {
  contextEmbedding?: number[] | null;
  citationCounts?: Map<string, number> | null;
  returnCount?: number;
};

export async function retrievePersonalized(
  questionEmbedding: number[],
  options: PersonalizedRetrieveOptions = {},
): Promise<RetrievedChunk[]> {
  const {
    contextEmbedding = null,
    citationCounts = null,
    returnCount = 5,
  } = options;

  // Retrieve in parallel. When there's no context embedding, the
  // second retrieval is skipped entirely.
  const [primary, contextual] = await Promise.all([
    retrieveChunksWithEmbedding(questionEmbedding, QUESTION_OVERSAMPLE),
    contextEmbedding
      ? retrieveChunksWithEmbedding(contextEmbedding, CONTEXT_OVERSAMPLE)
      : Promise.resolve([] as RetrievedChunk[]),
  ]);

  // Merge + dedupe. Dedupe key is slug + first 120 chars of content
  // because the same chunk can be returned by both queries, and
  // pgvector occasionally returns near-duplicates across adjacent
  // chunks of the same doc section. When a duplicate appears, keep
  // the higher similarity score.
  const merged = new Map<string, RetrievedChunk>();
  function upsert(chunk: RetrievedChunk) {
    const key = `${chunk.doc_slug}::${chunk.content.slice(0, 120)}`;
    const existing = merged.get(key);
    if (!existing || chunk.similarity > existing.similarity) {
      merged.set(key, chunk);
    }
  }
  for (const c of primary) upsert(c);
  for (const c of contextual) upsert(c);

  // Rerank.
  const reranked = Array.from(merged.values()).map((chunk) => {
    let adjusted = chunk.similarity;
    if (citationCounts) {
      const count = citationCounts.get(chunk.doc_slug) ?? 0;
      if (count === 0) {
        adjusted += UNSEEN_SLUG_BONUS;
      } else if (count > REPEAT_SLUG_THRESHOLD) {
        const raw = REPEAT_SLUG_PENALTY_STEP * (count - REPEAT_SLUG_THRESHOLD);
        const penalty = Math.min(raw, REPEAT_SLUG_PENALTY_CAP);
        adjusted -= penalty;
      }
    }
    return { chunk, adjusted };
  });

  reranked.sort((a, b) => b.adjusted - a.adjusted);
  return reranked.slice(0, returnCount).map((r) => r.chunk);
}
