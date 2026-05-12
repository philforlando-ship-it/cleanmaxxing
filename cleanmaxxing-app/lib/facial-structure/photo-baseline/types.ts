// Persisted shape of facial_structure_assessments.photo_features.
// The DB column is jsonb without a check constraint — the truth lives
// here and in the prompt schema (lib/facial-structure/photo-baseline/
// prompt.ts). Keep them in sync.

import type {
  ASYMMETRY_VALUES,
  BUCCAL_VALUES,
  CHIN_VALUES,
  DISTRIBUTION_VALUES,
  JAWLINE_VALUES,
  MIDFACE_VALUES,
  POSTURE_VALUES,
  PUFF_VALUES,
} from './prompt';

export type JawlineValue = (typeof JAWLINE_VALUES)[number];
export type ChinValue = (typeof CHIN_VALUES)[number];
export type MidfaceValue = (typeof MIDFACE_VALUES)[number];
export type DistributionVisualValue = (typeof DISTRIBUTION_VALUES)[number];
export type BuccalValue = (typeof BUCCAL_VALUES)[number];
export type PostureValue = (typeof POSTURE_VALUES)[number];
export type PuffValue = (typeof PUFF_VALUES)[number];
export type AsymmetryValue = (typeof ASYMMETRY_VALUES)[number];

export type PhotoBaselineAngle = 'front' | 'close' | 'side';

// Persisted shape of facial_structure_assessments.photo_features.
// Extends the model output with the angles_used metadata so the
// report prompt can hedge confidence based on which views the
// extraction had access to.
export type PhotoFeatures = {
  jawline_definition: JawlineValue;
  chin_projection: ChinValue;
  midface_balance: MidfaceValue;
  face_first_distribution_visual: DistributionVisualValue;
  buccal_fullness: BuccalValue;
  posture_head_carriage: PostureValue;
  facial_puff_visible: PuffValue;
  asymmetry_flag: AsymmetryValue;
  angles_used: PhotoBaselineAngle[];
  notes: string | null;
};

// Labels used in the UI panel that surfaces the extracted features
// back to the user (the journey itself is the consumer; the user
// sees this for transparency).
export const JAWLINE_LABEL: Record<JawlineValue, string> = {
  low: 'Soft outline',
  medium: 'Partially visible',
  high: 'Bony border visible',
  unreadable: 'Couldn’t read reliably',
};

export const CHIN_LABEL: Record<ChinValue, string> = {
  recessed: 'Sits behind lower lip plane',
  neutral: 'Aligned with lower lip plane',
  projected: 'Sits ahead of lower lip plane',
  unreadable: 'Side photo needed to read',
};

export const MIDFACE_LABEL: Record<MidfaceValue, string> = {
  short: 'Lower third shorter than middle third',
  balanced: 'Thirds roughly balanced',
  long: 'Lower third longer than middle third',
  unreadable: 'Couldn’t read reliably',
};

export const DISTRIBUTION_VISUAL_LABEL: Record<
  DistributionVisualValue,
  string
> = {
  face_first: 'Face softer than body',
  balanced: 'Face and body track together',
  body_first: 'Face leaner than body',
  unreadable: 'Couldn’t read from face alone',
};

export const BUCCAL_LABEL: Record<BuccalValue, string> = {
  lean: 'Buccal hollow visible',
  moderate: 'Neutral fill',
  full: 'Cheeks pillowed',
  unreadable: 'Couldn’t read reliably',
};

export const POSTURE_LABEL: Record<PostureValue, string> = {
  neutral: 'Head stacks over shoulders',
  forward: 'Forward head carriage',
  tilted: 'Tilted at the neck',
  unreadable: 'Side photo needed to read',
};

export const PUFF_LABEL: Record<PuffValue, string> = {
  low: 'Sharp under-eye, no puff',
  moderate: 'Some under-eye or lower-face puff',
  high: 'Pronounced puff obscuring structure',
  unreadable: 'Couldn’t read reliably',
};

export const ASYMMETRY_LABEL: Record<AsymmetryValue, string> = {
  none: 'No notable asymmetry',
  mild: 'Subtle asymmetry on careful look',
  notable: 'Asymmetry draws the eye',
  unreadable: 'Couldn’t read reliably',
};

// Dimension order used when surfacing features in UI + prompt.
// Roughly: structural (jaw/chin/midface) → soft-tissue (buccal/puff)
// → modifiers (distribution/posture/asymmetry).
export const PHOTO_FEATURE_ORDER: ReadonlyArray<keyof PhotoFeatures> = [
  'jawline_definition',
  'chin_projection',
  'midface_balance',
  'buccal_fullness',
  'facial_puff_visible',
  'face_first_distribution_visual',
  'posture_head_carriage',
  'asymmetry_flag',
];

export const PHOTO_FEATURE_LABEL: Record<
  Exclude<keyof PhotoFeatures, 'angles_used' | 'notes'>,
  string
> = {
  jawline_definition: 'Jawline definition',
  chin_projection: 'Chin projection',
  midface_balance: 'Midface balance',
  face_first_distribution_visual: 'Face / body distribution',
  buccal_fullness: 'Buccal area',
  posture_head_carriage: 'Head carriage',
  facial_puff_visible: 'Visible puff',
  asymmetry_flag: 'Asymmetry',
};

// Per-dimension value-label lookup. Helps the UI panel render
// values without a switch.
export function featureValueLabel(
  dimension: keyof PhotoFeatures,
  value: string,
): string {
  switch (dimension) {
    case 'jawline_definition':
      return JAWLINE_LABEL[value as JawlineValue] ?? value;
    case 'chin_projection':
      return CHIN_LABEL[value as ChinValue] ?? value;
    case 'midface_balance':
      return MIDFACE_LABEL[value as MidfaceValue] ?? value;
    case 'face_first_distribution_visual':
      return DISTRIBUTION_VISUAL_LABEL[value as DistributionVisualValue] ?? value;
    case 'buccal_fullness':
      return BUCCAL_LABEL[value as BuccalValue] ?? value;
    case 'posture_head_carriage':
      return POSTURE_LABEL[value as PostureValue] ?? value;
    case 'facial_puff_visible':
      return PUFF_LABEL[value as PuffValue] ?? value;
    case 'asymmetry_flag':
      return ASYMMETRY_LABEL[value as AsymmetryValue] ?? value;
    default:
      return value;
  }
}
