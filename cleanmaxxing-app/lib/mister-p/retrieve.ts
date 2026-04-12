import OpenAI from 'openai';
import { createServiceClient } from '@/lib/supabase/server';

export type RetrievedChunk = {
  content: string;
  similarity: number;
  doc_slug: string;
  doc_title: string;
};

export async function retrieveChunks(question: string, matchCount = 5): Promise<RetrievedChunk[]> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
  });

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('match_pov_chunks', {
    query_embedding: embedding.data[0].embedding as unknown as string,
    match_count: matchCount,
  });

  if (error) {
    console.error('retrieveChunks error:', error);
    return [];
  }

  return (data || []) as RetrievedChunk[];
}

export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return '(no relevant context found)';
  return chunks
    .map((c, i) => `[${i + 1}] From "${c.doc_title}" (${c.doc_slug}):\n${c.content}`)
    .join('\n\n---\n\n');
}
