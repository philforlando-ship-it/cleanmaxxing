/**
 * Simple paragraph-aware chunker. ~500 tokens per chunk, 50-token overlap.
 * Approximation: 1 token ≈ 4 chars of English.
 */

const TARGET_CHARS = 2000; // ~500 tokens
const OVERLAP_CHARS = 200; // ~50 tokens

export function chunkMarkdown(markdown: string): string[] {
  // Split on blank lines (paragraph boundaries)
  const paragraphs = markdown
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if (current.length + para.length + 2 <= TARGET_CHARS) {
      current = current ? `${current}\n\n${para}` : para;
    } else {
      if (current) chunks.push(current);
      // Start new chunk with overlap from tail of previous
      const tail = current.slice(-OVERLAP_CHARS);
      current = tail ? `${tail}\n\n${para}` : para;
    }
  }
  if (current) chunks.push(current);

  return chunks;
}
