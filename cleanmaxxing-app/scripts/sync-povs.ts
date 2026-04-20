/**
 * Sync POV docs from ../Cleanmaxxing\ POV/*.docx into content/povs/*.md
 *
 * This keeps the markdown corpus in the app repo version-controlled while
 * letting Phil continue authoring in Word.
 *
 * SAFETY: as of 2026-04-20 several POV .md files contain content that was
 * never mirrored into the corresponding .docx (AI-collaborative edits went
 * directly into .md across multiple commits). A blind sync overwrites .md
 * from stale .docx and silently deletes that content — we lost ~540 lines
 * across 19 files this way before recovering from git. To prevent a repeat,
 * this script now REQUIRES explicit confirmation via CONFIRM=1 and supports
 * a SYNC_ONLY filter for targeted syncs of just the .docx files you edited.
 *
 * Usage:
 *   CONFIRM=1 npm run sync-povs                         # sync everything
 *   CONFIRM=1 SYNC_ONLY=11_Teeth_Smile npm run sync-povs # single file
 *   CONFIRM=1 SYNC_ONLY=11_Teeth_Smile,25_Acne npm run sync-povs # several
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, basename, extname } from 'node:path';
import * as mammothImport from 'mammoth';

// mammoth's TypeScript definitions omit convertToMarkdown; it exists at runtime.
const mammoth = mammothImport as typeof mammothImport & {
  convertToMarkdown(input: { buffer: Buffer }): Promise<{ value: string; messages: unknown[] }>;
};

const SOURCE_DIRS = [
  '../Cleanmaxxing POV',
  '../Other Cleanmaxxing Docs',
];
const OUT_DIR = 'content/povs';

function slugify(name: string): string {
  return name
    .replace(/\.docx$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function convertOne(sourcePath: string, outDir: string): Promise<{ slug: string; title: string; words: number }> {
  const buffer = await readFile(sourcePath);
  const result = await mammoth.convertToMarkdown({ buffer });
  const md = result.value;

  const filename = basename(sourcePath);
  const slug = slugify(filename);
  const title = filename.replace(/\.docx$/i, '').replace(/^\d+_/, '').replace(/_/g, ' ');

  // Minimal frontmatter — richer tier/category data added manually per doc later
  const frontmatter = [
    '---',
    `slug: ${slug}`,
    `title: "${title}"`,
    `source: "${filename}"`,
    '---',
    '',
  ].join('\n');

  const outPath = join(outDir, `${slug}.md`);
  await writeFile(outPath, frontmatter + md, 'utf8');

  const words = md.split(/\s+/).filter(Boolean).length;
  return { slug, title, words };
}

async function main() {
  if (process.env.CONFIRM !== '1') {
    console.error(
      [
        'sync-povs refuses to run without CONFIRM=1.',
        '',
        'Why: POV .md files contain sections that were never mirrored into',
        '.docx. Running this command without checking will overwrite .md',
        'from stale .docx and silently delete that content.',
        '',
        'Before confirming:',
        '  1. Identify which .docx file(s) you actually edited.',
        '  2. Prefer SYNC_ONLY to sync just those, e.g.:',
        '       CONFIRM=1 SYNC_ONLY=11_Teeth_Smile npm run sync-povs',
        '  3. After sync, run: git diff --stat content/povs/',
        '  4. If unexpected files show large deletions, restore with:',
        '       git checkout HEAD -- content/povs/',
        '',
        'To sync everything (only when every .docx is genuinely up to date):',
        '  CONFIRM=1 npm run sync-povs',
      ].join('\n'),
    );
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  let total = 0;
  let totalWords = 0;

  // SYNC_ONLY accepts a comma-separated list of .docx filename prefixes
  // (without the .docx extension). Matches case-sensitively at the start
  // of the filename, so "11_Teeth_Smile" matches 11_Teeth_Smile.docx.
  const ONLY = process.env.SYNC_ONLY?.split(',').map((s) => s.trim()).filter(Boolean);

  for (const dir of SOURCE_DIRS) {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      console.warn(`Skipping (not found): ${dir}`);
      continue;
    }

    const docx = entries.filter((f) => {
      if (extname(f).toLowerCase() !== '.docx' || f.startsWith('~$')) return false;
      if (ONLY && ONLY.length > 0) return ONLY.some((prefix) => f.startsWith(prefix));
      return true;
    });
    for (const file of docx) {
      const result = await convertOne(join(dir, file), OUT_DIR);
      console.log(`  ${result.slug.padEnd(50)} ${result.words.toLocaleString().padStart(6)} words`);
      total++;
      totalWords += result.words;
    }
  }

  console.log(`\n${total} docs synced, ${totalWords.toLocaleString()} total words -> ${OUT_DIR}`);

  if (ONLY && ONLY.length > 0) {
    const matched = new Set<string>();
    for (const dir of SOURCE_DIRS) {
      try {
        const entries = await readdir(dir);
        for (const f of entries) {
          if (extname(f).toLowerCase() !== '.docx' || f.startsWith('~$')) continue;
          for (const prefix of ONLY) {
            if (f.startsWith(prefix)) matched.add(prefix);
          }
        }
      } catch {
        // ignore
      }
    }
    const unmatched = ONLY.filter((p) => !matched.has(p));
    if (unmatched.length > 0) {
      console.warn(
        `\nWarning: SYNC_ONLY prefixes with no match: ${unmatched.join(', ')}`,
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
