import { GOAL_TEMPLATES, hasTemplate, type GoalTemplate } from '@/content/goal-templates';
import type { AgeSegment } from './types';

export type PovDocRow = {
  slug: string;
  title: string;
  category: string | null;
  priority_tier: string | null;
  age_segments: string[] | null;
};

export type SuggestedGoal = {
  source_slug: string;
  title: string;
  description: string;
  category: string;
  priority_tier: string;
  goal_type: 'process' | 'outcome';
  score: number; // for debugging / ranking transparency
};

// Docs that should never appear as goal suggestions.
// tier-5 polish and tier-4 are allowed but heavily downweighted.
const EXCLUDED_TIERS = new Set(['avoid', 'meta', 'monitor', 'advanced']);

// Onboarding Q6 focus area keys → POV slugs that are directly relevant.
// A slug may appear under multiple focus areas. Exact slug matches get the
// strongest boost during ranking; this is more precise than category matching
// because most slugs share the 'biological-foundation' category.
const FOCUS_TO_SLUGS: Record<string, string[]> = {
  fitness: ['19-strength-training', '23-cardio', '46-mobility'],
  body_composition: [
    '19-strength-training',
    '20-diet-macros',
    '21-protein-creatine',
    '30-appetite-control',
    '16-facial-definition-jawline',
    '45-meal-plans',
  ],
  skin: [
    '07-skincare-antiaging',
    '25-acne',
    '32-skin-texture-scarring',
    '35-gut-health-fiber',
    '47-eye-health',
  ],
  hair: ['08-head-hair-balding', '27-hair-loss-treatments'],
  facial_aesthetics: [
    '07-skincare-antiaging',
    '16-facial-definition-jawline',
    '09-facial-hair',
    '11-teeth-smile',
    '47-eye-health',
  ],
  style: ['12-style-clothing', '18-tanning', '48-skin-tone-guidance'],
  posture: ['50-posture', '46-mobility'],
  grooming: ['10-grooming', '09-facial-hair', '29-body-hair-methods', '11-teeth-smile'],
};

export function focusSlugsFor(focusAreas: string[]): Set<string> {
  return new Set(focusAreas.flatMap((f) => FOCUS_TO_SLUGS[f] ?? []));
}

// Scoring used by both the onboarding suggestion ranker and the library
// browser. No exclusion logic here — callers decide what to filter.
export function scoreDoc(
  slug: string,
  priorityTier: string | null,
  focusSlugs: Set<string>,
  goalType: 'process' | 'outcome'
): number {
  let score = baseTierScore(priorityTier);
  if (focusSlugs.has(slug)) score += 6;
  if (goalType === 'process') score += 1;
  return score;
}

function baseTierScore(tier: string | null): number {
  switch (tier) {
    case 'tier-1':
      return 10;
    case 'tier-2':
      return 7;
    case 'conditional-tier-1':
      return 6;
    case 'tier-3':
      return 5;
    case 'tier-4':
      return 3;
    case 'tier-5':
      return 1;
    default:
      return 0;
  }
}

function appliesToAge(doc: PovDocRow, segment: AgeSegment): boolean {
  if (!doc.age_segments || doc.age_segments.length === 0) return false;
  return doc.age_segments.includes(segment);
}

export function rankCandidates({
  povDocs,
  ageSegment,
  focusAreas,
}: {
  povDocs: PovDocRow[];
  ageSegment: AgeSegment;
  focusAreas: string[];
}): SuggestedGoal[] {
  const focusSlugs = new Set(
    focusAreas.flatMap((f) => FOCUS_TO_SLUGS[f] ?? [])
  );

  const candidates: SuggestedGoal[] = [];

  for (const doc of povDocs) {
    if (!hasTemplate(doc.slug)) continue;
    if (!doc.priority_tier || EXCLUDED_TIERS.has(doc.priority_tier)) continue;
    if (!appliesToAge(doc, ageSegment)) continue;

    const template: GoalTemplate = GOAL_TEMPLATES[doc.slug];

    let score = baseTierScore(doc.priority_tier);
    if (focusSlugs.has(doc.slug)) score += 6;
    if (template.goal_type === 'process') score += 1; // §13 bias toward process goals

    // conditional-tier-1 only surfaces when a focus area explicitly matches
    if (doc.priority_tier === 'conditional-tier-1' && !focusSlugs.has(doc.slug)) {
      continue;
    }

    candidates.push({
      source_slug: doc.slug,
      title: template.title,
      description: template.description,
      category: doc.category ?? 'uncategorized',
      priority_tier: doc.priority_tier,
      goal_type: template.goal_type,
      score,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

// Pick the top N from a ranked list with category diversity — prefer to avoid
// returning three tier-1 biological-foundation docs when a user picked multiple
// focus areas spanning different categories.
export function pickTopN(ranked: SuggestedGoal[], n: number): SuggestedGoal[] {
  const picked: SuggestedGoal[] = [];
  const seenCategories = new Set<string>();

  for (const g of ranked) {
    if (picked.length >= n) break;
    if (!seenCategories.has(g.category)) {
      picked.push(g);
      seenCategories.add(g.category);
    }
  }

  // If we haven't hit N yet (not enough categories), fill from remaining
  for (const g of ranked) {
    if (picked.length >= n) break;
    if (!picked.includes(g)) picked.push(g);
  }

  return picked;
}
