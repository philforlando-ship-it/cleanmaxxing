// Plain-language summary lookup for POV docs.
// Source: content/povs/_plain_language.json (authored manually).
// Surfaced on goal cards as a "What does this mean?" helper per spec §2 Feature 1.

import plainLanguageRaw from '@/content/povs/_plain_language.json';

const map = plainLanguageRaw as Record<string, unknown>;

export function plainLanguageFor(slug: string): string | null {
  if (slug.startsWith('_')) return null;
  const entry = map[slug];
  if (typeof entry !== 'string' || entry.trim() === '') return null;
  return entry;
}
