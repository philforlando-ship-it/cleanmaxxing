// One-off: scan POV markdown files and propose new title fields based
// on the first in-doc __Bold__ heading (which is the actual document
// title authored by the writer; the frontmatter title is filename-derived
// and consistently flatter).
//
// Run: node scripts/propose-pov-titles.mjs
// Run with --apply to actually write changes.

import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const dir = 'content/povs';
const files = fs.readdirSync(dir).filter((f) => /^[0-9]+-.*\.md$/.test(f)).sort();

function extractH1(raw) {
  const lines = raw.split(/\r?\n/);
  let dashes = 0;
  for (const line of lines) {
    if (/^---$/.test(line)) {
      dashes++;
      continue;
    }
    if (dashes < 2) continue;
    const m = line.match(/^__([^_].*?)__\s*$/);
    if (m) {
      // The docx-to-md pipeline escapes hyphens, ampersands, and slashes
      // with backslashes (e.g., "Self\-Improvement"). Strip them.
      return m[1].replace(/\\(.)/g, '$1');
    }
  }
  return null;
}

const changes = [];
for (const file of files) {
  const slug = file.replace(/\.md$/, '');
  const filePath = path.join(dir, file);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const titleMatch = raw.match(/^title:\s*"?([^"\r\n]+?)"?\s*$/m);
  const current = titleMatch ? titleMatch[1].trim() : slug;
  const h1 = extractH1(raw);
  if (h1 && h1 !== current) {
    changes.push({ slug, current, proposed: h1, filePath, raw });
  }
}

for (const c of changes) {
  const left = `${c.slug.padEnd(35)} | ${c.current.padEnd(32)}`;
  console.log(`${left} -> ${c.proposed}`);
}
console.log(`\n${changes.length} of ${files.length} POVs would change`);

if (APPLY) {
  for (const c of changes) {
    // Replace the title line with the new value, preserving quote style.
    const next = c.raw.replace(
      /^title:\s*"?[^"\r\n]+?"?\s*$/m,
      `title: "${c.proposed}"`,
    );
    fs.writeFileSync(c.filePath, next);
  }
  console.log(`\nApplied to ${changes.length} files.`);
}
