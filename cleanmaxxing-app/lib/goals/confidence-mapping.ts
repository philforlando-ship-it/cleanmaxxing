// Maps each POV slug to the confidence dimension its goal most directly
// affects. Used by the monthly checkpoint to correlate "goal has been
// active N weeks" with "relevant confidence dimension is trending up /
// flat / down over that window."
//
// Hand-authored rather than derived from metadata.category because the
// POV category doesn't map cleanly — 07-skincare is tagged
// biological-foundation but is squarely an appearance variable, for
// example. The four dimensions match the weekly reflection schema
// (social / work / physical / appearance).

export type ConfidenceDimension =
  | 'social_confidence'
  | 'work_confidence'
  | 'physical_confidence'
  | 'appearance_confidence';

const GOAL_DIMENSION_MAP: Record<string, ConfidenceDimension> = {
  // Appearance-facing work — skin, hair, grooming, style, presentation
  '07-skincare-antiaging': 'appearance_confidence',
  '08-head-hair-balding': 'appearance_confidence',
  '09-facial-hair': 'appearance_confidence',
  '10-grooming': 'appearance_confidence',
  '11-teeth-smile': 'appearance_confidence',
  '12-style-clothing': 'appearance_confidence',
  '16-facial-definition-jawline': 'appearance_confidence',
  '18-tanning': 'appearance_confidence',
  '25-acne': 'appearance_confidence',
  '27-hair-loss-treatments': 'appearance_confidence',
  '29-body-hair-methods': 'appearance_confidence',
  '32-skin-texture-scarring': 'appearance_confidence',
  '33-niche-enhancements': 'appearance_confidence',
  '34-recovery-tools-polish': 'appearance_confidence',
  '47-eye-health': 'appearance_confidence',
  '48-skin-tone-guidance': 'appearance_confidence',
  '50-posture': 'appearance_confidence',

  // Physical — training, fueling, recovery, mobility, environment that
  // structures the physical habit stack
  '05-supplements': 'physical_confidence',
  '17-environment-lifestyle-design': 'physical_confidence',
  '19-strength-training': 'physical_confidence',
  '20-diet-macros': 'physical_confidence',
  '21-protein-creatine': 'physical_confidence',
  '23-cardio': 'physical_confidence',
  '30-appetite-control': 'physical_confidence',
  '31-calorie-macro-framework': 'physical_confidence',
  '35-gut-health-fiber': 'physical_confidence',
  '42-sleep': 'physical_confidence',
  '45-meal-plans': 'physical_confidence',
  '46-mobility': 'physical_confidence',

  // Social / perception
  '51-dating-apps': 'social_confidence',
  '54-when-to-stop': 'social_confidence',
  '55-limits-self-improvement': 'social_confidence',
  '56-identity-beyond-appearance': 'social_confidence',
};

export function dimensionFor(
  slug: string | null | undefined,
): ConfidenceDimension | null {
  if (!slug) return null;
  return GOAL_DIMENSION_MAP[slug] ?? null;
}

// Readable label for UI copy ("your appearance confidence", etc.). The
// schema-level key stays the same (physical_confidence) but we drop the
// _confidence suffix when naming it in prose.
export function dimensionLabel(d: ConfidenceDimension): string {
  switch (d) {
    case 'appearance_confidence':
      return 'appearance';
    case 'physical_confidence':
      return 'physical';
    case 'social_confidence':
      return 'social';
    case 'work_confidence':
      return 'work';
  }
}
