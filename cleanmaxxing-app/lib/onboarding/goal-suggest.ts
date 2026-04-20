import { GOAL_TEMPLATES } from '@/content/goal-templates';
import { plainLanguageFor } from '@/lib/content/plain-language';
import type { AgeSegment } from './types';

// Motivation segment (spec §2 Feature 1 amendment 2026-04-15). Drives
// ambient ranker weighting — never labeled back to the user. Null when
// the user predates the Q4 survey amendment or skipped the question.
export type MotivationSegment =
  | 'feel-better-in-own-skin'
  | 'social-professional-confidence'
  | 'specific-event'
  | 'structured-plan'
  | 'something-specific-bothering-me'
  | 'not-sure-yet'
  | null;

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
  plain_language: string | null;
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
  // Anti-aging (spec §2 Feature 1). Motivation for this focus area
  // overlaps with skin + sleep + eye-health; listing the slugs here
  // lets a user who explicitly picks "Anti-aging" get those goals
  // surfaced without having to also pick "Skin" or infer the stack.
  // 38-aging-appearance has no goal template anchored to it but is
  // included so onboarding ranking stays consistent with the /povs
  // age-relevance surface.
  anti_aging: [
    '07-skincare-antiaging',
    '42-sleep',
    '47-eye-health',
    '38-aging-appearance',
  ],
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
  goalType: 'process' | 'outcome',
  motivationSegment: MotivationSegment = null,
  category: string | null = null
): number {
  let score = baseTierScore(priorityTier);
  if (focusSlugs.has(slug)) score += 6;
  if (goalType === 'process') score += 1;
  score += motivationAdjustment(goalType, category, motivationSegment);
  return score;
}

// Ambient motivation routing. Adjusts the process/outcome balance and
// boosts self-acceptance content for the highest psychological-safety-risk
// segments. Magnitudes sized to actually move the top-3 picks — the prior
// ±2 values were overridden by the tier hierarchy in every test case
// except specific-event. See scripts/motivation-differentiation.ts for
// the empirical check that motivates these numbers.
function motivationAdjustment(
  goalType: 'process' | 'outcome',
  category: string | null,
  segment: MotivationSegment
): number {
  if (!segment) return 0;
  const isSelfAcceptance = category === 'safety';

  switch (segment) {
    case 'feel-better-in-own-skin':
    case 'not-sure-yet':
      // Soft-framing segments: up-weight process goals, down-weight
      // outcome goals, surface self-acceptance content earlier. ±4 is
      // the smallest magnitude that reliably flips a process+tier-2 goal
      // ahead of an outcome+tier-1 goal, and lets a self-acceptance
      // goal at tier-1 actually appear in the top-3 for the segments
      // where psychological safety is the priority.
      return (
        (goalType === 'process' ? 4 : -4) + (isSelfAcceptance ? 5 : 0)
      );
    case 'specific-event':
      // Deadline segment: tolerate outcome goals more readily. ±4 to
      // match the magnitude on the other side — a user prepping for a
      // specific event should see outcome goals prominently.
      return goalType === 'outcome' ? 4 : 0;
    case 'structured-plan':
    case 'social-professional-confidence':
    case 'something-specific-bothering-me':
      // Neutral in the ranker. The routing for these segments lives
      // elsewhere (confidence-dimension weighting, circuit breaker
      // threshold, Mister P priming) — not in tier ordering.
      return 0;
    default:
      return 0;
  }
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
  motivationSegment = null,
}: {
  povDocs: PovDocRow[];
  ageSegment: AgeSegment;
  focusAreas: string[];
  motivationSegment?: MotivationSegment;
}): SuggestedGoal[] {
  const focusSlugs = focusSlugsFor(focusAreas);
  const docsBySlug = new Map(povDocs.map((d) => [d.slug, d]));

  const candidates: SuggestedGoal[] = [];

  // Iterate templates rather than POV docs so multiple templates can share a
  // single source slug (a process and an outcome anchored to the same doc).
  for (const template of Object.values(GOAL_TEMPLATES)) {
    const doc = docsBySlug.get(template.source_slug);
    if (!doc) continue;
    if (!doc.priority_tier || EXCLUDED_TIERS.has(doc.priority_tier)) continue;
    if (!appliesToAge(doc, ageSegment)) continue;

    // conditional-tier-1 only surfaces when a focus area explicitly matches
    if (doc.priority_tier === 'conditional-tier-1' && !focusSlugs.has(doc.slug)) {
      continue;
    }

    const score = scoreDoc(
      doc.slug,
      doc.priority_tier,
      focusSlugs,
      template.goal_type,
      motivationSegment,
      doc.category ?? null
    );

    candidates.push({
      source_slug: doc.slug,
      title: template.title,
      description: template.description,
      plain_language: plainLanguageFor(doc.slug),
      category: doc.category ?? 'uncategorized',
      priority_tier: doc.priority_tier,
      goal_type: template.goal_type,
      score,
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

// Pick the top N from a ranked list with category diversity as the
// default — but break diversity when a same-category candidate outscores
// the best cross-category candidate by a large gap. The prior strict-
// diversity rule was pushing tier-4 goals into the top-3 when a user's
// focus areas concentrated in one or two categories; this keeps the
// spirit (variety across picks) while letting strong tier gaps dominate.
const CATEGORY_BREAK_SCORE = 4;

export function pickTopN(ranked: SuggestedGoal[], n: number): SuggestedGoal[] {
  const picked: SuggestedGoal[] = [];
  const seenCategories = new Set<string>();
  const remaining = [...ranked];

  while (picked.length < n && remaining.length > 0) {
    const topOverall = remaining[0];
    const topNewCat = remaining.find((g) => !seenCategories.has(g.category));

    let choice: SuggestedGoal;
    if (!topNewCat) {
      // No unseen categories left — fill from the top of what's remaining.
      choice = topOverall;
    } else if (seenCategories.has(topOverall.category)) {
      // Top overall repeats a category. Prefer a new-category candidate
      // unless the score gap is large enough to override diversity.
      const gap = topOverall.score - topNewCat.score;
      choice = gap >= CATEGORY_BREAK_SCORE ? topOverall : topNewCat;
    } else {
      // Top overall is in a new category — diversity and score agree.
      choice = topOverall;
    }

    picked.push(choice);
    seenCategories.add(choice.category);
    const idx = remaining.indexOf(choice);
    if (idx >= 0) remaining.splice(idx, 1);
  }

  return picked;
}
