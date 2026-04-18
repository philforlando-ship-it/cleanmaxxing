/**
 * Corpus audit — checks the POV docs for hierarchy-culture vocabulary
 * the spec §13 anti-hierarchy commitment rejects.
 *
 * Runs the same patterns as the manual audit completed 2026-04-18 and
 * fails loud if any banned phrasing creeps back in. Each check carries
 * a description and an optional per-file allowlist for places where a
 * term is used legitimately (e.g. "incel forums" as a historical
 * citation in doc 06 about bone-smashing's origin).
 *
 * Usage: npm run corpus-audit
 * Exit 0 on clean, 1 on any violation, 2 on script error.
 *
 * Intentionally scoped to content/povs/ only — the spec file, Mister P
 * prompt, and smoke test questions all legitimately contain banned
 * vocabulary because they exist to name and refuse it.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const POVS_DIR = 'content/povs';

type Check = {
  name: string;
  pattern: RegExp;
  description: string;
  // Files where this pattern is acceptable (e.g. factual citation).
  // Match is by filename only, not path.
  allowFiles?: string[];
};

const CHECKS: Check[] = [
  {
    name: 'alpha/beta/sigma male framing',
    pattern: /\b(alpha|beta|sigma)\s+(male|men|masculin)/gi,
    description: 'Hierarchy-culture taxonomy. Rejected per spec §13.',
  },
  {
    name: 'high-value male / HVM',
    pattern: /\b(high[-\s]value\s+(male|men|man)|HVM)\b/gi,
    description: 'Hierarchy-culture framing. Rejected per spec §13.',
  },
  {
    name: 'SMV / sexual market value',
    pattern: /\b(SMV|sexual\s+market\s+value)\b/gi,
    description: 'Dating-market framing. Rejected per spec §13.',
  },
  {
    name: 'PSL / looksmatch / mogging',
    pattern: /\b(PSL|looksmatch|looksmog|mogger|mogg(ed|ing))\b/gi,
    description: 'Looksmaxxing-subculture vocabulary. Rejected per spec §13.',
  },
  {
    name: 'pill language (red/black/blue)',
    pattern: /\b(blackpill|redpill|bluepill)\b|\b(black|red|blue)[\s-]*pilled\b/gi,
    description: 'Manosphere framing. Rejected per spec §13.',
  },
  {
    name: 'gigachad / chad',
    pattern: /\bgigachad\b|\bchads?\b/gi,
    description: 'Hierarchy-culture vocabulary. Rejected per spec §13.',
  },
  {
    name: 'decile / percentile ranking',
    pattern:
      /\b(top|bottom|global|upper|lower)\s+(decile|percentile)\b|\b(looks|attractiveness)\s+(decile|percentile|rank)/gi,
    description:
      'Attractiveness-ranking framing. Rejected per spec §13. Use "most optimized men visible online" or similar if the point is to name the comparison target.',
  },
  {
    name: 'out-of-league',
    pattern: /\bout\s+of\s+(?:my|your|his|her|their|a|the)\s+league\b/gi,
    description: 'Dating-market framing. Rejected per spec §13.',
  },
  {
    name: 'incel (outside citation context)',
    pattern: /\bincel/gi,
    description:
      'Only allowed as factual/historical citation in doc 06 (bone-smashing origin). Everywhere else: use "online forum" or specific subculture reference.',
    allowFiles: ['06-bone-smashing.md'],
  },
  {
    name: 'objectively attractive/ugly',
    pattern: /\bobjectively\s+(attractive|unattractive|ugly|beautiful|pretty)\b/gi,
    description:
      'Implies a universal hierarchy of worth via appearance. Rejected per spec §13.',
  },
];

type Violation = {
  check: string;
  file: string;
  line: number;
  snippet: string;
  description: string;
};

async function main() {
  const entries = await readdir(POVS_DIR);
  const files = entries
    .filter((f) => f.endsWith('.md') && !f.startsWith('_'))
    .sort();

  const violations: Violation[] = [];

  for (const file of files) {
    const content = await readFile(join(POVS_DIR, file), 'utf8');
    const lines = content.split('\n');

    for (const check of CHECKS) {
      if (check.allowFiles?.includes(file)) continue;
      // Reset lastIndex for each file — /g regex keeps state otherwise.
      for (let i = 0; i < lines.length; i++) {
        check.pattern.lastIndex = 0;
        const match = check.pattern.exec(lines[i]);
        if (match) {
          violations.push({
            check: check.name,
            file,
            line: i + 1,
            snippet: lines[i].trim().slice(0, 180),
            description: check.description,
          });
        }
      }
    }
  }

  if (violations.length === 0) {
    console.log(
      `\u2713 Corpus audit clean. Checked ${files.length} files against ${CHECKS.length} patterns.`
    );
    return;
  }

  console.error(
    `\u2717 Corpus audit failed. ${violations.length} violation(s) found across ${new Set(violations.map((v) => v.file)).size} file(s):\n`
  );
  for (const v of violations) {
    console.error(`  [${v.check}]`);
    console.error(`    ${v.file}:${v.line}`);
    console.error(`    ${v.snippet}`);
    console.error(`    \u2192 ${v.description}\n`);
  }
  process.exit(1);
}

main().catch((err) => {
  console.error('Corpus audit crashed:', err);
  process.exit(2);
});
