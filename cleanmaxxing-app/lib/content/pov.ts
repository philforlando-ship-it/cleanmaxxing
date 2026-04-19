// POV markdown loader. Reads content/povs/[slug].md, strips frontmatter,
// promotes __Section__ bold lines to H2 so the viewer can render them with
// visible hierarchy (the docx->markdown pipeline encodes section titles
// as bold lines rather than real headers).
//
// Used by app/(app)/povs/[slug]/page.tsx and the "Learn more" link gating
// on goal surfaces.

import { readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const POVS_DIR = path.join(process.cwd(), 'content', 'povs');

// Slug must start with alphanumeric and contain only lowercase alphanumerics
// and hyphens. Rejects path-traversal attempts and the underscore-prefixed
// internal files (_plain_language, _metadata) that aren't user-facing.
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

// Readdir once per server instance. The corpus is static per deploy, so
// there's no reason to re-scan on every request — a goal card that asks
// "does this POV exist?" gets an O(1) Set lookup.
let availableSlugs: Set<string> | null = null;

function getAvailableSlugs(): Set<string> {
  if (availableSlugs) return availableSlugs;
  const files = readdirSync(POVS_DIR);
  const slugs = new Set<string>();
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const slug = file.slice(0, -3);
    if (isValidSlug(slug)) slugs.add(slug);
  }
  availableSlugs = slugs;
  return slugs;
}

export function povExists(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return getAvailableSlugs().has(slug);
}

export function listPovSlugs(): string[] {
  return Array.from(getAvailableSlugs()).sort();
}

export type Pov = {
  slug: string;
  title: string;
  body: string;
};

export async function povFor(slug: string): Promise<Pov | null> {
  if (!isValidSlug(slug)) return null;
  const filePath = path.join(POVS_DIR, `${slug}.md`);
  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch {
    return null;
  }

  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  const [, frontmatter, rawBody] = match;

  // Extract title. Frontmatter is small and hand-authored — regex is fine.
  const titleMatch = frontmatter.match(/^title:\s*"?([^"\r\n]+?)"?\s*$/m);
  const title = titleMatch ? titleMatch[1].trim() : slug;

  // Promote any line that is solely __bold text__ to a markdown H2.
  // The docx conversion produces bold as the visual section marker; the
  // reader experience is significantly worse without this promotion.
  const body = rawBody.replace(/^__([^\n_][^\n]*?)__\s*$/gm, '## $1');

  return { slug, title, body };
}
