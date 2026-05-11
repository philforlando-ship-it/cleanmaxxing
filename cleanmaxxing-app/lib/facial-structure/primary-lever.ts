// Primary-lever compute. Pure function — mirrors the decision tree
// from lib/facial-structure/report-prompt.ts ("The next move"
// section) so the UI can surface a lever-specific Stage 2 card
// without parsing the LLM output.
//
// Decision order (first match wins):
//   1. BF >= 20-25 OR over 25 → 'body_comp'
//   2. Lean AND puff most_mornings/persistent → 'puff_diagnostic'
//   3. Lean AND forward_head AND clean puff → 'posture_neck'
//   4. Lean AND clean posture AND clean puff AND specific structural
//      concern AND openness >= 'curious' → 'cosmetic_patternd'
//   5. Else → 'framing'
//
// 'Lean' here means body_fat_estimate in (under_12 | 12_to_15 |
// 15_to_20). This matches POV 16's optimal facial-definition band.

import type { FacialStructureAssessment } from './types';

export type PrimaryLever =
  | 'body_comp'
  | 'puff_diagnostic'
  | 'posture_neck'
  | 'cosmetic_patternd'
  | 'framing';

const LEAN_BFS: ReadonlyArray<FacialStructureAssessment['body_fat_estimate']> = [
  'under_12',
  '12_to_15',
  '15_to_20',
];

const STRUCTURAL_CONCERNS: ReadonlyArray<
  FacialStructureAssessment['chin_jaw_concern']
> = ['chin_projection_side', 'jaw_definition_front'];

export function computePrimaryLever(
  assessment: FacialStructureAssessment,
): PrimaryLever {
  // Rule 1: BF >= 20%. The face is downstream of the cut; nothing
  // else is the primary move until BF moves.
  if (
    assessment.body_fat_estimate === 'over_25' ||
    assessment.body_fat_estimate === '20_to_25'
  ) {
    return 'body_comp';
  }

  const isLean = LEAN_BFS.includes(assessment.body_fat_estimate);

  // Rule 2: Lean + persistent / most-mornings puff = the issue is
  // upstream variables (sleep / sodium / alcohol). POV 44 framework.
  if (
    isLean &&
    (assessment.facial_puff_baseline === 'most_mornings' ||
      assessment.facial_puff_baseline === 'persistent')
  ) {
    return 'puff_diagnostic';
  }

  const hasForwardHead =
    assessment.postural_pattern.includes('forward_head');
  const cleanPuff =
    assessment.facial_puff_baseline === 'rarely' ||
    assessment.facial_puff_baseline === 'few_days_per_month';

  // Rule 3: Lean + forward head + clean puff = posture + neck training.
  // Posture protocol lives in POV 50; neck training is owned here.
  if (isLean && hasForwardHead && cleanPuff) {
    return 'posture_neck';
  }

  const hasStructuralDeficit = STRUCTURAL_CONCERNS.includes(
    assessment.chin_jaw_concern,
  );
  const cleanPosture =
    !hasForwardHead &&
    !assessment.postural_pattern.includes('rounded_shoulders');
  const openToProcedures =
    assessment.cosmetic_procedure_openness === 'curious_about_options' ||
    assessment.cosmetic_procedure_openness === 'actively_considering' ||
    assessment.cosmetic_procedure_openness === 'already_done';

  // Rule 4: Lean + clean foundations + specific structural deficit +
  // openness → Pattern D shell. Deep-links to /plan/procedures, NOT a
  // dedicated facial-structure D shell (per Slice 1 architectural call).
  if (
    isLean &&
    cleanPosture &&
    cleanPuff &&
    hasStructuralDeficit &&
    openToProcedures
  ) {
    return 'cosmetic_patternd';
  }

  // Rule 5: Default — framing layer (hair length / beard / tanning /
  // glasses). Read across hair + facial_hair + style.
  return 'framing';
}

export const PRIMARY_LEVER_LABEL: Record<PrimaryLever, string> = {
  body_comp: 'Body composition',
  puff_diagnostic: 'Facial puff diagnostic',
  posture_neck: 'Posture + neck training',
  cosmetic_patternd: 'Cosmetic procedure path',
  framing: 'Framing layer',
};

export const PRIMARY_LEVER_SHORT: Record<PrimaryLever, string> = {
  body_comp: 'Cut to the band where your face reads sharp.',
  puff_diagnostic:
    'Run the 2-week sleep / sodium / alcohol audit before assuming structural.',
  posture_neck:
    'Posture protocol from the posture work + neck training 2x/week.',
  cosmetic_patternd:
    'Open the procedural-fit surface — filler as diagnostic before anything permanent.',
  framing:
    'Coordinate hair length, beard cadence, tanning, and glasses with the face you have.',
};
