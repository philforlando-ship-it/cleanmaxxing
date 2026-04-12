/**
 * Sync POV docs from ../Cleanmaxxing\ POV/*.docx into content/povs/*.md
 *
 * This keeps the markdown corpus in the app repo version-controlled while
 * letting Phil continue authoring in Word. Runs via `npm run sync-povs`.
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
  await mkdir(OUT_DIR, { recursive: true });
  let total = 0;
  let totalWords = 0;

  for (const dir of SOURCE_DIRS) {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      console.warn(`Skipping (not found): ${dir}`);
      continue;
    }

    const docx = entries.filter((f) => extname(f).toLowerCase() === '.docx' && !f.startsWith('~$'));
    for (const file of docx) {
      const result = await convertOne(join(dir, file), OUT_DIR);
      console.log(`  ${result.slug.padEnd(50)} ${result.words.toLocaleString().padStart(6)} words`);
      total++;
      totalWords += result.words;
    }
  }

  console.log(`\n${total} docs synced, ${totalWords.toLocaleString()} total words -> ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
