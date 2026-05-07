// Ranks the 7 cardio modalities for a user based on their
// equipment_access, outdoor_access, time_per_session, and
// injury_constraints. Returns the top 3 with a per-modality
// rationale string. Pure function — no I/O.
//
// Surfaced in the /plan/cardio recommended-modalities panel below
// the report. Doesn't replace the modality_preference field; it's
// a visual recommendation. The user can still click "Consider this"
// to update their preference if they want.

import type {
  CardioEquipmentAccess,
  CardioInjuryConstraint,
  CardioModalityPreference,
  CardioOutdoorAccess,
  CardioTimePerSession,
} from './types';

export type RecommendedModalitiesArgs = {
  equipment_access: CardioEquipmentAccess | null;
  outdoor_access: CardioOutdoorAccess | null;
  time_per_session: CardioTimePerSession | null;
  injury_constraints: CardioInjuryConstraint[];
};

export type RankedModality = {
  modality: CardioModalityPreference;
  label: string;
  rationale: string;
};

const ALL_MODALITIES: CardioModalityPreference[] = [
  'running_jogging',
  'cycling',
  'rowing',
  'walking_hiking',
  'classes_group',
  'swimming',
  'hate_all_cardio',
];

const MODALITY_LABEL: Record<CardioModalityPreference, string> = {
  running_jogging: 'Running or jogging',
  cycling: 'Cycling (indoor or outdoor)',
  rowing: 'Rowing',
  walking_hiking: 'Walking or hiking',
  classes_group: 'Group classes (spin, rowing class, hiking groups)',
  swimming: 'Swimming',
  hate_all_cardio: 'Step count + brisk walking',
};

// Per-modality scoring against the user's situation. Higher score =
// stronger fit. Modalities are then sorted by score descending.
function scoreModality(
  modality: CardioModalityPreference,
  args: RecommendedModalitiesArgs,
): { score: number; rationale: string } {
  const inj = new Set(args.injury_constraints);

  // Hard exclusions — modalities that don't fit the user's situation
  // are not surfaced at all (negative score).
  if (modality === 'running_jogging') {
    if (inj.has('knee_pain') || inj.has('hip_pain')) {
      return { score: -100, rationale: 'Excluded — high impact on joints.' };
    }
    if (
      args.equipment_access === 'home_bike' ||
      args.equipment_access === 'classes_studio' ||
      args.equipment_access === 'none_minimal'
    ) {
      // Running needs either outdoor or treadmill access. Without
      // either, drop the score.
      const noOutdoor =
        args.outdoor_access === 'rare' || args.outdoor_access === 'never';
      if (noOutdoor) {
        return { score: -100, rationale: 'Excluded — no treadmill or outdoor route.' };
      }
    }
  }
  if (modality === 'rowing') {
    if (
      args.equipment_access !== 'full_gym' &&
      args.equipment_access !== 'classes_studio'
    ) {
      return { score: -100, rationale: 'Excluded — no rowing machine access.' };
    }
    if (inj.has('back_pain')) {
      return {
        score: -50,
        rationale: 'Possible — but back pain on file. Form-first, short sessions only.',
      };
    }
  }
  if (modality === 'cycling') {
    if (
      args.equipment_access === 'none_minimal' ||
      (args.equipment_access === 'home_treadmill' &&
        (args.outdoor_access === 'rare' || args.outdoor_access === 'never'))
    ) {
      return { score: -100, rationale: 'Excluded — no bike + no outdoor route.' };
    }
  }
  if (modality === 'swimming') {
    if (
      args.equipment_access !== 'full_gym' &&
      args.equipment_access !== 'classes_studio'
    ) {
      return { score: -100, rationale: 'Excluded — no pool access.' };
    }
  }

  // Now positive ranking — stronger fits get higher scores.
  let score = 0;
  let rationale = '';

  switch (modality) {
    case 'walking_hiking':
      score += 8; // walking is universally compatible
      rationale = 'Lowest friction. Joint-friendly. Step count compounds.';
      break;
    case 'cycling':
      score += 6;
      rationale =
        args.equipment_access === 'home_bike'
          ? 'You have a bike. Best at-home VO₂max stimulus available.'
          : 'Joint-friendly Zone 2. Indoor or outdoor.';
      break;
    case 'rowing':
      score += 5;
      rationale = 'Full-body, low-impact. Pairs well with lifting.';
      break;
    case 'running_jogging':
      score += 5;
      rationale = 'Time-efficient. Talk test for intensity.';
      break;
    case 'swimming':
      score += 5;
      rationale = 'Joint-friendly full-body. Use perceived effort, not heart rate.';
      break;
    case 'classes_group':
      score += 4;
      rationale = 'Social retention helps consistency. Watch HIIT-flavored classes for recovery cost.';
      break;
    case 'hate_all_cardio':
      score += 3;
      rationale =
        '8,000–10,000 daily steps captures most of the metabolic benefit. No formal sessions required.';
      break;
  }

  // Bonus for matching equipment access perfectly.
  if (modality === 'running_jogging' && args.equipment_access === 'home_treadmill') {
    score += 3;
  }
  if (modality === 'cycling' && args.equipment_access === 'home_bike') {
    score += 4;
  }
  if (modality === 'swimming' && args.equipment_access === 'classes_studio') {
    score += 1;
  }

  // Time-per-session adjustments.
  if (
    modality === 'walking_hiking' &&
    args.time_per_session === 'under_20min'
  ) {
    score += 2; // walking fits short windows well
  }
  if (modality !== 'hate_all_cardio' && args.time_per_session === 'under_20min') {
    score -= 1; // most structured cardio needs 30+ min for full Zone 2 benefit
  }

  // Outdoor access bonus for outdoor-leaning modalities.
  if (
    (modality === 'walking_hiking' ||
      modality === 'running_jogging' ||
      modality === 'cycling') &&
    args.outdoor_access === 'year_round'
  ) {
    score += 1;
  }

  return { score, rationale };
}

export function getRecommendedModalities(
  args: RecommendedModalitiesArgs,
): RankedModality[] {
  const ranked = ALL_MODALITIES.map((modality) => {
    const { score, rationale } = scoreModality(modality, args);
    return { modality, label: MODALITY_LABEL[modality], score, rationale };
  })
    .filter((r) => r.score >= 0)
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, 3).map(({ modality, label, rationale }) => ({
    modality,
    label,
    rationale,
  }));
}
