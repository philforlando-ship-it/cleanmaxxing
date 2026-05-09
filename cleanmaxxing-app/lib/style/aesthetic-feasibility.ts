// Per-user aesthetic-feasibility computation. Style v2 Phase 2b
// (2026-05-09). Pure function — takes the user's body data + age and
// returns a feasibility tier + rationale for each archetype.
//
// Read by:
//   - /plan/style form Q7: surfaces tier + rationale inline next to
//     each target archetype option, so the user sees the realistic
//     read on their frame before committing to an aesthetic
//   - generate-report: snapshots the PICKED archetype's tier into
//     modifiers, and the report prompt branches on it (notably:
//     "you picked rugged but your frame fights this; here's how to
//     make it workable, or here's the closer-to-feasible blend")
//
// Inputs are intentionally limited to the data the v2 assessment +
// user_profile + users tables already capture. Beard density, hair
// density, and face shape ARE relevant to feasibility (per POV 12)
// but require reading other journey assessments — held back to a
// later iteration to keep the v1 cut contained.

import type {
  Build,
  ShoulderWidth,
  StyleArchetype,
} from './types';

export type FeasibilityTier = 'strong_fit' | 'workable' | 'fights_your_frame';

export type FeasibilityResult = {
  tier: FeasibilityTier;
  rationale: string;
};

export type FeasibilityInputs = {
  shoulder_width: ShoulderWidth | null;
  build: Build | null;
  // Optional inputs that refine the read when present. Null is fine.
  height_inches: number | null;
  age: number | null;
};

export type FeasibilityMap = Record<StyleArchetype, FeasibilityResult>;

const NEUTRAL_RATIONALE = 'Body data not yet captured — once you fill in the assessment we can give a per-user read.';

export const FEASIBILITY_TIER_LABEL: Record<FeasibilityTier, string> = {
  strong_fit: 'Strong fit',
  workable: 'Workable',
  fights_your_frame: 'Fights your frame',
};

export function computeArchetypeFeasibility(
  inputs: FeasibilityInputs,
): FeasibilityMap {
  // No-opinion fallback when key body inputs are missing. The form's
  // inline warning fires only when we have confident reads.
  if (!inputs.shoulder_width || !inputs.build) {
    const neutral: FeasibilityResult = {
      tier: 'workable',
      rationale: NEUTRAL_RATIONALE,
    };
    return {
      rugged_masculine: neutral,
      mature_professional: neutral,
      clean_minimalist: neutral,
      streetwear: neutral,
      athletic_casual: neutral,
      creative_eclectic: neutral,
    };
  }

  return {
    rugged_masculine: feasRugged(inputs),
    mature_professional: feasMature(inputs),
    clean_minimalist: feasMinimalist(inputs),
    streetwear: feasStreetwear(inputs),
    athletic_casual: feasAthleticCasual(inputs),
    creative_eclectic: feasCreativeEclectic(inputs),
  };
}

// Per-archetype rules. Each function assumes shoulder_width + build
// are set (the no-opinion guard above handles null). Other inputs may
// still be null and the rule degrades gracefully.

function feasRugged(i: FeasibilityInputs): FeasibilityResult {
  // Slight build is the strongest negative signal — the aesthetic
  // was developed around men with physical-labor body markers.
  if (i.build === 'slight') {
    return {
      tier: 'fights_your_frame',
      rationale:
        'Rugged was developed around broader builds; slight builds in workwear read costume-y. Consider rugged-adjacent (heritage / workwear-influenced minimalist) instead, or commit to the body work that earns the silhouette.',
    };
  }
  // Narrow shoulders + short stature also fights even when build is
  // athletic — height is the rugged ceiling.
  if (
    i.shoulder_width === 'narrow' &&
    i.height_inches != null &&
    i.height_inches < 69
  ) {
    return {
      tier: 'fights_your_frame',
      rationale:
        "Rugged scales best at 5'9\"+ with broader shoulders. Your shorter + narrow-shoulder combo gets visually swallowed by the workwear silhouette.",
    };
  }
  // Strong fit: athletic+ build, medium-or-broad shoulders, 5'9"+
  // (height optional — null defaults permissive).
  if (
    (i.build === 'athletic' || i.build === 'stocky' || i.build === 'heavyset') &&
    (i.shoulder_width === 'medium' || i.shoulder_width === 'broad') &&
    (i.height_inches == null || i.height_inches >= 69)
  ) {
    return {
      tier: 'strong_fit',
      rationale:
        'Your build + shoulders carry rugged well. Beard capability is the remaining variable — heavy stubble at minimum, ideally a full beard.',
    };
  }
  return {
    tier: 'workable',
    rationale:
      'Rugged is workable on your frame with attention to fit; the silhouette flatters broader builds more, but yours can carry it with tailored heavier textures and beard support.',
  };
}

function feasMature(_i: FeasibilityInputs): FeasibilityResult {
  // Universally accessible per POV 12 — tailoring fixes most fit
  // issues. Keeping this static "strong_fit" until we have a
  // budget-tier signal that would meaningfully change the read.
  return {
    tier: 'strong_fit',
    rationale:
      'Mature professional is the most universally accessible archetype — tailoring fixes most fit issues. Works on your build given budget for alterations.',
  };
}

function feasMinimalist(i: FeasibilityInputs): FeasibilityResult {
  if (i.build === 'heavyset') {
    return {
      tier: 'fights_your_frame',
      rationale:
        'Minimalist is unforgiving — clothes follow the body line closely without disguise. Heavyset builds need looser cuts and structured pieces, which lose the crispness the aesthetic depends on.',
    };
  }
  if (i.build === 'slight' || i.build === 'athletic') {
    return {
      tier: 'strong_fit',
      rationale:
        'Your build is what minimalist was designed around — clothes follow your body line cleanly without competing with bulk.',
    };
  }
  // stocky
  return {
    tier: 'workable',
    rationale:
      'Minimalist works on stocky builds but loses some crispness; the silhouette wants to soften, but you can run looser cuts with structured pieces and still get the clean read.',
  };
}

function feasStreetwear(i: FeasibilityInputs): FeasibilityResult {
  // Body-flexible but age-coded — full streetwear past 38 reads
  // try-too-hard for the 32-45 cohort.
  if (i.age != null && i.age >= 38) {
    return {
      tier: 'workable',
      rationale:
        'Streetwear is age-coded — full streetwear past about 38 reads try-too-hard. Streetwear-adjacent (sneakers + clean tee + relaxed pants) ages up better and is the right register for your cohort.',
    };
  }
  return {
    tier: 'strong_fit',
    rationale:
      'Body-flexible aesthetic — your build works regardless. Lean into the silhouette that matches it (oversized for slight, relaxed for muscular, structured-loose for larger).',
  };
}

function feasAthleticCasual(_i: FeasibilityInputs): FeasibilityResult {
  return {
    tier: 'strong_fit',
    rationale:
      'Most body-agnostic of the archetypes. Polo or button-down + chinos + clean leather sneakers works on your build given right fit. The safest default when archetype indicators aren\'t strongly pulling elsewhere.',
  };
}

function feasCreativeEclectic(_i: FeasibilityInputs): FeasibilityResult {
  // Variable; depends on personality coherence which we can't
  // compute from body data. Default to workable.
  return {
    tier: 'workable',
    rationale:
      "Creative eclectic depends on personality coherence — body data alone can't tell us if it suits you. Workable on your build; commitment to coherent eclectic styling across the whole outfit (not standalone Rakish elements) is what actually makes it work.",
  };
}
