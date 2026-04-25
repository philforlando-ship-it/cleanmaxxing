/**
 * Motivation-segment ranker differentiation check.
 *
 * Simulates rankCandidates + pickTopN across all 6 motivation segments ×
 * 3 age segments × 2 focus scenarios, prints the top-3 suggestions per
 * cell, and reports a differentiation score — how many unique goals
 * appear across the 6 motivation segment outputs within a given
 * age+focus cell. Low unique count = ranker does not meaningfully
 * differentiate by motivation. High unique count = motivation is
 * actually shifting recommendations.
 *
 * Data source: content/povs/_metadata.json. No Supabase or network
 * calls. Safe to run anytime.
 *
 * Usage: npm run motivation-diff
 */
import { readFile } from 'node:fs/promises';
import {
  pickTopN,
  rankCandidates,
  type MotivationSegment,
  type PovDocRow,
} from '../lib/onboarding/goal-suggest';
import type { AgeSegment } from '../lib/onboarding/types';

const METADATA_FILE = 'content/povs/_metadata.json';

const MOTIVATIONS: MotivationSegment[] = [
  'feel-better-in-own-skin',
  'social-professional-confidence',
  'specific-event',
  'structured-plan',
  'something-specific-bothering-me',
  'not-sure-yet',
];

const AGES: AgeSegment[] = ['18-24', '25-32', '33-40', '41-45', '46-55'];

type FocusScenario = { name: string; focusAreas: string[] };

const SCENARIOS: FocusScenario[] = [
  { name: 'Body-focused', focusAreas: ['fitness', 'body_composition'] },
  { name: 'Surface-focused', focusAreas: ['skin', 'hair', 'grooming'] },
];

type MetadataEntry = {
  priority_tier: string | null;
  category: string | null;
  age_segments: string[];
};

type Metadata = Record<string, MetadataEntry>;

async function loadPovDocs(): Promise<PovDocRow[]> {
  const raw = await readFile(METADATA_FILE, 'utf8');
  const parsed = JSON.parse(raw) as Metadata;
  const docs: PovDocRow[] = [];
  for (const [slug, md] of Object.entries(parsed)) {
    // Skip the _legend entry and anything that looks internal
    if (slug.startsWith('_')) continue;
    docs.push({
      slug,
      title: slug, // not used by ranker
      category: md.category,
      priority_tier: md.priority_tier,
      age_segments: md.age_segments,
    });
  }
  return docs;
}

function padRight(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

async function main() {
  const povDocs = await loadPovDocs();
  console.log(
    `Loaded ${povDocs.length} POV docs from ${METADATA_FILE}.\n`
  );

  for (const scenario of SCENARIOS) {
    console.log(
      `\n=== Focus scenario: ${scenario.name} [${scenario.focusAreas.join(', ')}] ===`
    );

    for (const age of AGES) {
      console.log(`\n--- Age segment: ${age} ---`);

      // Track unique picks across all motivation segments for this cell
      const allPicks = new Set<string>();
      const picksByMotivation: Array<{
        motivation: MotivationSegment;
        slugs: string[];
      }> = [];

      for (const motivation of MOTIVATIONS) {
        const ranked = rankCandidates({
          povDocs,
          ageSegment: age,
          focusAreas: scenario.focusAreas,
          motivationSegment: motivation,
        });
        const top = pickTopN(ranked, 3);
        picksByMotivation.push({
          motivation,
          slugs: top.map((g) => `${g.source_slug}:${g.goal_type}`),
        });
        for (const g of top) allPicks.add(`${g.source_slug}:${g.goal_type}`);

        const label = padRight(String(motivation), 34);
        const picks = top
          .map(
            (g) =>
              `${g.title} [${g.priority_tier}/${g.goal_type[0]}/${g.score}]`
          )
          .join(' | ');
        console.log(`  ${label} ${picks}`);
      }

      // Differentiation score: of the max 18 picks (6 motivations × 3),
      // how many are unique? 3 = no differentiation; 18 = total
      // differentiation. Low differentiation is only a problem when the
      // candidate pool has structural diversity (outcome goals, safety
      // category, etc.) — otherwise motivation has nothing to reorder.
      const unique = allPicks.size;
      const hadOutcome = picksByMotivation.some((p) =>
        p.slugs.some((s) => s.endsWith(':outcome'))
      );
      const shiftedCategories =
        new Set(
          picksByMotivation.flatMap((p) =>
            p.slugs.map((s) => s.split(':')[0])
          )
        ).size > 3;
      const verdict =
        unique <= 4
          ? hadOutcome || shiftedCategories
            ? 'LOW — motivation barely shifts output (flag for review)'
            : 'LOW — expected: candidate pool is uniform goal_type/category'
          : unique <= 8
            ? 'MODERATE — some shift'
            : 'HIGH — motivation meaningfully differentiates';
      console.log(
        `  → Unique picks across motivations: ${unique} / 18 — ${verdict}`
      );
    }
  }

  console.log('\n');
  console.log(
    '[priority_tier/goal_type/score]  — e.g. [tier-1/p/14] means tier-1 process goal, score 14'
  );
  console.log(
    'Interpretation: each row is what one user would see as their top 3 based on their motivation answer.'
  );
  console.log(
    'If rows look identical within a cell, the ranker is not routing by motivation for that profile.'
  );
}

main().catch((err) => {
  console.error('Motivation differentiation check crashed:', err);
  process.exit(1);
});
