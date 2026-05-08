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
import type {
  CookingCapacity,
  DietaryPattern,
  GutSensitivity,
} from './types';

export type RecommendedFoodsArgs = {
  dietary_pattern: DietaryPattern | null;
  cooking_capacity: CookingCapacity | null;
  goal_direction: GoalDirection;
  food_exclusions: string[];
  // Migration 0087 — when 'sensitive', foods tagged 'gut_unfriendly'
  // (citrus, tomatoes, legumes, cruciferous, dark chocolate, etc.)
  // are routed to the dietaryIncompatible bucket so the picker never
  // shows them. Same hard-hide treatment as a vegan with beef.
  gut_sensitivity?: GutSensitivity | null;
};

export type RecommendedFoodsResult = {
  recommended: Food[];
  // Foods the user explicitly excluded via food_exclusions. Surfaced
  // in the "Show all" expanded view dimmed — the user can still
  // un-exclude and pick them.
  filteredOut: Food[];
  // Foods incompatible with the user's dietary_pattern (vegan can't
  // eat dairy; pescatarian can't eat sirloin) OR with their gut
  // sensitivity (when 'sensitive', anything tagged 'gut_unfriendly').
  // NEVER surfaced in the picker — a pescatarian shouldn't see beef
  // photos at all, and a gut-sensitive user shouldn't see fried
  // tomatoes. Returned only so callers that need totals can see them.
  dietaryIncompatible: Food[];
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
//
// Refreshed 2026-05-08: aligned all entries with real catalog slugs
// (the previous list had several orphaned references — 'protein_bar',
// 'beef_jerky', 'string_cheese', 'hummus' don't exist as base slugs;
// the catalog has snack_-prefixed variants). Also added the five new
// snack entries from the catalog expansion that fit the assembly
// criterion.
const ASSEMBLY_FRIENDLY_SLUGS = new Set<string>([
  // Proteins (no-cook)
  'greek_yogurt_nonfat',
  'cottage_cheese',
  'whey_protein',
  'pea_protein',
  'tuna',
  'canned_chicken',
  'sardines',
  'whole_eggs',
  'egg_whites',
  // Fruits (no-prep)
  'banana',
  'apple',
  'berries',
  'orange',
  'grapes',
  'pear',
  'peach',
  'watermelon',
  // Fats (open / pour)
  'avocado',
  'almond_butter',
  'peanut_butter',
  'olive_oil',
  'cashews',
  'pumpkin_seeds',
  'chia_seeds',
  // Snacks (pre-packaged or quick-assembly)
  'snack_protein_bar',
  'snack_jerky',
  'snack_mixed_nuts',
  'snack_trail_mix',
  'snack_hard_boiled_eggs',
  'snack_protein_shake',
  'snack_rice_cakes',
  'snack_string_cheese',
  'snack_yogurt_berries',
  'snack_tuna_pouch',
  'snack_hummus_veggies',
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
  const dietaryIncompatible: Food[] = [];

  const gutSensitive = args.gut_sensitivity === 'sensitive';

  for (const food of allFoods) {
    // Dietary hard filter — pescatarians don't see beef, vegans don't
    // see dairy. These foods are hidden completely from the picker
    // (they don't exist for this user); they go to dietaryIncompatible
    // so we can still report counts.
    const incompatibleTag = food.tags.some((t) => excludedTags.has(t));
    if (incompatibleTag) {
      dietaryIncompatible.push(food);
      continue;
    }
    // Gut-sensitivity hard filter — same hide-completely treatment as
    // dietary mismatch. Routes citrus/tomato/legume/cruciferous/etc.
    // out of view for users who flagged sensitivity.
    if (gutSensitive && food.tags.includes('gut_unfriendly')) {
      dietaryIncompatible.push(food);
      continue;
    }
    // Explicit exclusion → filtered out (user can un-exclude)
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
    dietaryIncompatible,
  };
}
