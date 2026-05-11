// "Why this cut?" explainer for the Stage 1 cut-family pick on
// /plan/hair. Pure helper — names the funnel that produced the
// LLM's recommendation, in plain language:
//   density bucket → cuts in pool
//   age cohort → cuts in pool
//   intersection = the allowed list the LLM picked from
//   face shape + report → the LLM's specific pick within that
//
// Voice posture: dry, math-grounded. The user shouldn't think the
// cut was magic; they should see the rule chain that produced it.

import { cutsForDensity } from './cut-by-density';
import { cutsForAge } from './cut-by-age';
import {
  CUT_FAMILY_LABEL,
  DENSITY_STATE_LABEL,
  FACE_SHAPE_LABEL,
  type BaldingPattern,
  type BaldingSeverity,
  type CutFamily,
  type DensityState,
  type FaceShape,
} from './types';

export type CutFamilyExplainerInputs = {
  cut_family: CutFamily;
  density_state: DensityState;
  face_shape: FaceShape;
  age: number | null;
  // Migration 0099 — when the balding pattern + severity override
  // narrows the allowed list (front_and_vertex / diffuse + severity
  // 3+), we surface that to the user so they understand the cut
  // pool was tightened beyond what density_state alone implies.
  balding_pattern: BaldingPattern | null;
  balding_severity: BaldingSeverity | null;
};

export function explainCutFamily(
  args: CutFamilyExplainerInputs,
): string[] {
  const densityCuts = cutsForDensity(
    args.density_state,
    args.balding_pattern,
    args.balding_severity,
  );
  const ageFiltered = cutsForAge(args.age, densityCuts);
  const baldingOverrideFired =
    args.balding_severity !== null &&
    args.balding_severity >= 3 &&
    (args.balding_pattern === 'front_and_vertex' ||
      args.balding_pattern === 'diffuse');
  const ageCohort: 'young' | 'middle' | 'mature' =
    args.age == null
      ? 'young'
      : args.age >= 45
        ? 'mature'
        : args.age >= 35
          ? 'middle'
          : 'young';

  const lines: string[] = [
    `Density: ${DENSITY_STATE_LABEL[args.density_state]}. The cut catalog is filtered to the ~${densityCuts.length} cuts that work at this density (no curtains on a thinning crown, no hard fades on shaved-or-buzzed, etc.).`,
  ];

  if (baldingOverrideFired) {
    lines.push(
      `Pattern + severity: you flagged ${args.balding_pattern === 'diffuse' ? 'diffuse thinning' : 'both front and vertex loss'} at severity ${args.balding_severity}/4. That tightens the pool further — coverage strategies stop working past that point, so volume-on-top cuts are out regardless of how density alone read.`,
    );
  }

  if (args.age != null) {
    lines.push(
      `Age cohort: ${args.age} → ${ageCohort}. The age filter strips ${
        ageCohort === 'mature'
          ? 'youth-coded cuts that age users out of frame'
          : ageCohort === 'young'
            ? 'mature-coded cuts that read as too settled for your stage'
            : 'extreme-young and extreme-mature options at the edges'
      } from the density-filtered set, leaving ${ageFiltered.length} candidates.`,
    );
  } else {
    lines.push(
      `Age: not on file. Age filter wasn't applied; the density-filtered set of ${densityCuts.length} cuts was the full candidate pool. Add your age in /profile to tighten this.`,
    );
  }

  lines.push(
    `Face shape: ${FACE_SHAPE_LABEL[args.face_shape]}. Inside the allowed candidates, Mister P picked the cut that fits your face geometry and the rationale already in your personal report — landing on ${CUT_FAMILY_LABEL[args.cut_family]}.`,
  );

  lines.push(
    `If the call doesn't sit right, the alternates below are also inside the same allowed set — pick a different one and the barber instructions rewrite for it.`,
  );

  return lines;
}
