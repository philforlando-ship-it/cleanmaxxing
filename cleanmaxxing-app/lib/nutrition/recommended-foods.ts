// Recommends a subset of the nutrition food catalog based on the
// user's assessment + profile. Pure function — no I/O. Mirrors
// lib/strength/recommended-exercises.ts in shape so the picker UI
// can default-render the recommended subset and reveal filteredOut
// behind a "Show all" toggle.
//
// Filter order:
//   1. Dietary pattern hard filter — exclude foods incompatible
//      with the user's dietary_pattern (vegan / vegetarian /
//      pescatarian / omnivore)
//   2. Food exclusions hard filter — exclude foods the user has
//      explicitly added to food_exclusions
//   3. Goal direction up-rank — pin certain categories to the top
//      based on lose_fat / gain_muscle / recomp / maintain
//   4. Cooking capacity rank — assembly-friendly foods up-ranked
//      for low-capacity users

import { FOODS, type Food, type GoalDirection } from './types';
import type { CookingCapacity, DietaryPattern } from './types';

export type RecommendedFoodsArgs = {
  dietary_pattern: DietaryPattern | null;
  cooking_capacity: CookingCapacity | null;
  goal_direction: GoalDirection;
  food_exclusions: string[];
};

export type RecommendedFoodsResult = {
  recommended: Food[];
  // Foods filtered out by an explicit exclusion (dietary pattern
  // mismatch or explicit food_exclusions). Surfaced in the
  // expanded view dimmed — the user can still pick them.
  filteredOut: Food[];
};

// Tags that disqualify a food per dietary pattern.
const DIETARY_EXCLUDED_TAGS: Record<DietaryPattern, ReadonlyArray<string>> = {
  vegan: ['red_meat', 'pork', 'seafood', 'shellfish', 'dairy', 'egg'],
  vegetarian: ['red_meat', 'pork', 'seafood', 'shellfish'],
  pescatarian: ['red_meat', 'pork'],
  omnivore: [],
  mixed_no_pattern: [],
};

// Slugs known to be assembly-friendly (no cooking required, just
// open or scoop). Up-ranked when cooking_capacity is dont_cook /
// cook_rarely. Hand-curated subset of the catalog — not exhaustive,
// but the most obvious wins.
const ASSEMBLY_FRIENDLY_SLUGS = new Set<string>([
  'greek_yogurt_nonfat',
  'cottage_cheese',
  'whey_protein',
  'pea_protein',
  'tuna',
  'whole_eggs',
  'egg_whites',
  'banana',
  'apple',
  'berries',
  'orange',
  'grapes',
  'avocado',
  'mixed_nuts',
  'almond_butter',
  'peanut_butter',
  'olive_oil',
  'protein_bar',
  'beef_jerky',
  'string_cheese',
  'hummus',
]);

export function getRecommendedFoods(
  args: RecommendedFoodsArgs,
  allFoods: ReadonlyArray<Food> = FOODS,
): RecommendedFoodsResult {
  const excludedTags = new Set(
    args.dietary_pattern != null
      ? DIETARY_EXCLUDED_TAGS[args.dietary_pattern]
      : [],
  );
  const explicitlyExcluded = new Set(args.food_exclusions);

  const recommended: Array<{ food: Food; rank: number }> = [];
  const filteredOut: Food[] = [];

  for (const food of allFoods) {
    // Dietary hard filter — incompatible tag → filtered out
    const incompatibleTag = food.tags.some((t) => excludedTags.has(t));
    if (incompatibleTag) {
      filteredOut.push(food);
      continue;
    }
    // Explicit exclusion → filtered out
    if (explicitlyExcluded.has(food.slug)) {
      filteredOut.push(food);
      continue;
    }

    let rank = 0;

    // Goal-direction up-rank — pin categories aligned with goal.
    if (args.goal_direction === 'lose_fat') {
      if (food.category === 'protein') rank += 8;
      if (food.category === 'veggie') rank += 6;
      if (food.category === 'fruit') rank += 3;
    } else if (args.goal_direction === 'gain_muscle') {
      if (food.category === 'protein') rank += 8;
      if (food.category === 'complex_carb') rank += 6;
    } else if (args.goal_direction === 'recomp') {
      if (food.category === 'protein') rank += 6;
      if (food.category === 'veggie') rank += 3;
    }
    // 'maintain' / 'not_sure' → no goal-driven shift

    // Cooking capacity up-rank — assembly-friendly foods pinned for
    // low-capacity users.
    if (
      (args.cooking_capacity === 'dont_cook' ||
        args.cooking_capacity === 'cook_rarely') &&
      ASSEMBLY_FRIENDLY_SLUGS.has(food.slug)
    ) {
      rank += 5;
    }

    recommended.push({ food, rank });
  }

  // Sort recommended by rank desc, stable on original catalog order.
  const indexById = new Map(allFoods.map((f, i) => [f.slug, i]));
  recommended.sort((a, b) => {
    if (a.rank !== b.rank) return b.rank - a.rank;
    return (indexById.get(a.food.slug) ?? 0) - (indexById.get(b.food.slug) ?? 0);
  });

  return {
    recommended: recommended.map((r) => r.food),
    filteredOut,
  };
}
