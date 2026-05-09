// Stage 2 foundation pieces — authored, archetype-specific. The user's
// 5-piece capsule depends on (target_archetype, frame_estimate,
// budget_tier) for the slug list, plus the v2 granular axes for the
// per-piece modifier notes. Frame and budget shift the inline guidance,
// not the slug list, so the user's progress survives a budget tier
// change. v2 axes (leg_length, arm_length, skin_undertone — added
// 2026-05-09) layer additional notes onto the relevant piece categories
// without altering the capsule itself.
//
// No LLM call here — these are stable POV-12 derived recommendations
// and re-rolling them per user wastes tokens and varies the
// experience. The user's report (Stage 0) already has the
// modifier-aware framing; this is the concrete shopping list.

import type {
  BodyFatEstimate,
  BudgetTier,
} from '@/lib/profile/service';
import type {
  ArmLength,
  FrameEstimate,
  LegLength,
  SkinUndertone,
  StyleArchetype,
} from './types';

export type FoundationPiece = {
  // Stable slug used in stage_2_pieces_acquired array. Globally unique
  // across archetypes so the array remains meaningful even if the
  // user changes target_archetype.
  slug: string;
  category: 'tee' | 'pants' | 'sneakers' | 'jacket' | 'extra';
  label: string;
  // 1-line shopping description. Frame + budget conditional.
  guidance: string;
  // Optional second-line note that surfaces when a specific modifier
  // is on. Keeps the primary guidance line clean.
  modifier_note?: string;
};

type Inputs = {
  archetype: StyleArchetype;
  frame: FrameEstimate;
  budget: BudgetTier | null;
  bf_pct: BodyFatEstimate | null;
  age: number | null;
  // v2 granular axes (migration 0093). Nullable for pre-migration rows
  // — when null, the v2-axis modifier notes simply don't fire and the
  // legacy frame-based guidance still works.
  leg_length: LegLength | null;
  arm_length: ArmLength | null;
  skin_undertone: SkinUndertone | null;
};

// Helper — frame-aware fit description suffix.
function fitFor(frame: FrameEstimate, base: string): string {
  if (frame === 'slim') return `${base} — fitted enough to suggest the V-taper.`;
  if (frame === 'athletic')
    return `${base} — fitted, follows shoulders without compressing.`;
  if (frame === 'broader')
    return `${base} — straight cut through the chest, never pulling at buttons.`;
  if (frame === 'heavier')
    return `${base} — straight, not clingy; vertical lines preferred.`;
  return base;
}

// Helper — budget-aware sourcing suffix.
function budgetFor(budget: BudgetTier | null): string {
  if (budget === 'under_50')
    return 'Aim for solid basics from chain or secondhand stores; pattern beats brand.';
  if (budget === '50_to_150')
    return 'Mid-tier brand basics or quality secondhand are fine here.';
  if (budget === '150_to_500')
    return 'Worth investing in quality fabric and tailored fit at this tier.';
  if (budget === 'no_limit')
    return 'Heavyweight cottons, real leather, proper tailoring all in scope.';
  return 'Match to your budget — fit beats price every time.';
}

const ARCHETYPE_PIECES: Record<
  StyleArchetype,
  ReadonlyArray<Omit<FoundationPiece, 'guidance' | 'modifier_note'> & {
    guidance_base: string;
  }>
> = {
  clean_minimalist: [
    {
      slug: 'cm_white_crew_tee',
      category: 'tee',
      label: 'Plain white crew-neck tee',
      guidance_base:
        'Heavyweight cotton, no logos, sleeve hits mid-bicep',
    },
    {
      slug: 'cm_dark_indigo_jeans',
      category: 'pants',
      label: 'Dark indigo slim-tapered jeans',
      guidance_base:
        'Dark indigo wash, slight taper to ankle, no distressing',
    },
    {
      slug: 'cm_minimal_white_sneakers',
      category: 'sneakers',
      label: 'Minimal white leather sneakers',
      guidance_base:
        'Low-top, minimal branding, white leather upper, white sole',
    },
    {
      slug: 'cm_unstructured_navy_blazer',
      category: 'jacket',
      label: 'Unstructured navy blazer',
      guidance_base:
        'Navy wool or cotton-linen blend, no shoulder pads, fits clean over a tee',
    },
    {
      slug: 'cm_neutral_chinos',
      category: 'extra',
      label: 'Neutral chinos in stone or olive',
      guidance_base:
        'Stone, olive, or charcoal — slim-tapered, sits at natural waist',
    },
  ],
  athletic_casual: [
    {
      slug: 'ac_fitted_grey_tee',
      category: 'tee',
      label: 'Fitted heather-grey tee',
      guidance_base:
        'Cotton or cotton-modal blend, follows shoulders, sleeve mid-bicep',
    },
    {
      slug: 'ac_tapered_athletic_chinos',
      category: 'pants',
      label: 'Tapered athletic chinos',
      guidance_base:
        'Stretch chino fabric, athletic cut through thigh, taper to ankle',
    },
    {
      slug: 'ac_black_low_top_sneakers',
      category: 'sneakers',
      label: 'Black-and-white minimal low-top sneakers',
      guidance_base:
        'Low profile, no chunky midsole, neutral colorway',
    },
    {
      slug: 'ac_bomber_or_zip',
      category: 'jacket',
      label: 'Fitted bomber or athletic zip-up',
      guidance_base:
        'Black, navy, or olive — clean silhouette, no loud branding',
    },
    {
      slug: 'ac_dark_slim_jeans',
      category: 'extra',
      label: 'Dark slim jeans',
      guidance_base:
        'Crossover piece for casual settings, slight taper, no distressing',
    },
  ],
  rugged_masculine: [
    {
      slug: 'rm_olive_henley',
      category: 'tee',
      label: 'Heavyweight olive long-sleeve henley',
      guidance_base:
        'Cotton or cotton-waffle, two or three buttons, earth tone',
    },
    {
      slug: 'rm_raw_dark_denim',
      category: 'pants',
      label: 'Raw or dark indigo straight-cut jeans',
      guidance_base:
        'Heavyweight denim, straight cut (not slim), full break at the boot',
    },
    {
      slug: 'rm_brown_leather_boots',
      category: 'sneakers',
      label: 'Brown leather lace-up boots',
      guidance_base:
        'Work-boot or chukka silhouette in tobacco or chestnut leather',
    },
    {
      slug: 'rm_canvas_field_jacket',
      category: 'jacket',
      label: 'Canvas or waxed-cotton field jacket',
      guidance_base:
        'Olive, brown, or tan — utility pockets, no logos, lived-in look earned not bought',
    },
    {
      slug: 'rm_flannel_overshirt',
      category: 'extra',
      label: 'Flannel or heavyweight overshirt',
      guidance_base:
        'Earth-tone plaid or solid heavyweight cotton, layers cleanly over henley',
    },
  ],
  mature_professional: [
    {
      slug: 'mp_white_oxford_or_fine_knit',
      category: 'tee',
      label: 'Fine-gauge merino crew or white oxford',
      guidance_base:
        'Merino crewneck or non-iron oxford, fits cleanly under a blazer',
    },
    {
      slug: 'mp_grey_wool_trousers',
      category: 'pants',
      label: 'Mid-grey wool trousers',
      guidance_base:
        'Tailored, sits at natural waist, slight taper, no pleats',
    },
    {
      slug: 'mp_brown_leather_loafers',
      category: 'sneakers',
      label: 'Brown leather loafers or minimal leather sneakers',
      guidance_base:
        'Either penny loafers in chestnut or low-top white leather sneakers — choose for occasion',
    },
    {
      slug: 'mp_unstructured_navy_blazer',
      category: 'jacket',
      label: 'Unstructured navy blazer',
      guidance_base:
        'The single highest-leverage piece. Navy wool or cotton-blend, no shoulder pads',
    },
    {
      slug: 'mp_dark_denim_or_chinos',
      category: 'extra',
      label: 'Dark denim or fine-twill chinos',
      guidance_base:
        'For casual register — dark indigo or olive, tailored not slim',
    },
  ],
  streetwear: [
    {
      slug: 'sw_premium_oversized_tee',
      category: 'tee',
      label: 'Premium oversized tee with structured shoulders',
      guidance_base:
        'Heavyweight cotton, boxy through body, structured at the shoulder, no graphics',
    },
    {
      slug: 'sw_wide_leg_dark_denim',
      category: 'pants',
      label: 'Wide-leg or relaxed straight dark denim',
      guidance_base:
        'Dark indigo, full leg with slight crop or full break, modern silhouette',
    },
    {
      slug: 'sw_chunky_clean_sneakers',
      category: 'sneakers',
      label: 'Chunky clean-silhouette sneakers',
      guidance_base:
        'White or cream upper, intentional sole volume, low-key branding',
    },
    {
      slug: 'sw_chore_or_workwear_jacket',
      category: 'jacket',
      label: 'Chore jacket or workwear overshirt',
      guidance_base:
        'Black, ecru, or washed indigo canvas — boxy, structured, layers over the tee',
    },
    {
      slug: 'sw_one_statement_piece',
      category: 'extra',
      label: 'One statement piece (jewelry, hat, or accessory)',
      guidance_base:
        'Pick ONE — thin gold chain, considered ball cap, distinctive watch. Keep the rest grounded.',
    },
  ],
  creative_eclectic: [
    {
      slug: 'ce_loose_knit_sweater',
      category: 'tee',
      label: 'Loose-knit crewneck or cardigan',
      guidance_base:
        'Earth tone (cream, oatmeal, rust, slate), texture visible, layers over an oxford',
    },
    {
      slug: 'ce_pleated_wool_trousers',
      category: 'pants',
      label: 'Pleated or wide-leg trousers',
      guidance_base:
        'Wool or cotton-twill, earth-toned, vintage-leaning silhouette',
    },
    {
      slug: 'ce_leather_derbies',
      category: 'sneakers',
      label: 'Leather derbies or unlined loafers',
      guidance_base:
        'Brown or oxblood leather, slightly worn-in feel, no athletic crossover',
    },
    {
      slug: 'ce_oxford_layer',
      category: 'jacket',
      label: 'Oxford shirt or overshirt as layer',
      guidance_base:
        'Slate-blue, white, or stripe — collar visible above the knit, lightweight cotton',
    },
    {
      slug: 'ce_textural_accessory_or_glasses',
      category: 'extra',
      label: 'Textural scarf or distinctive glasses',
      guidance_base:
        'One element doing visual work — a wool scarf, kerchief, or thin-frame glasses',
    },
  ],
};

export function foundationPiecesFor(inputs: Inputs): FoundationPiece[] {
  const base = ARCHETYPE_PIECES[inputs.archetype];
  return base.map((piece) => {
    const guidance = `${fitFor(inputs.frame, piece.guidance_base)}. ${budgetFor(inputs.budget)}`;

    const notes: string[] = [];

    // Style Past 45 — fit calibration tweak applied to T-shirts and
    // sweaters specifically. Tops a half-size up from "slim fit" at
    // this age; recalibrated cuts described in POV 12.
    if (inputs.age != null && inputs.age >= 45 && piece.category === 'tee') {
      notes.push(
        'At 45+, take a half-size up from your usual slim fit. The cut should drape rather than cling.',
      );
    }

    // Heavier frame + bottoms → vertical line emphasis.
    if (
      (inputs.frame === 'heavier' || inputs.bf_pct === 'over_25') &&
      piece.category === 'pants'
    ) {
      notes.push(
        'Vertical lines work for you here — straight cut, dark wash, no contrast cuffs.',
      );
    }

    // v2 — leg_length on bottoms. Highest-leverage proportion lever
    // per Gentleman's Gazette: trouser rise + shoe-color matching for
    // short legs; rise/hem latitude for long legs.
    if (piece.category === 'pants') {
      if (inputs.leg_length === 'short') {
        notes.push(
          'Long-torso/short-legs: pick the highest rise the cut allows, no break or slight break, and match shoe color to pant color for a continuous visual line.',
        );
      } else if (inputs.leg_length === 'long') {
        notes.push(
          'Short-torso/long-legs: lower rises are tolerable here, and a contrasting belt or shoe color works as a deliberate horizontal break.',
        );
      }
    }

    // v2 — arm_length on tops + jackets. Off-the-rack sleeve issues +
    // tailor expectations.
    if (piece.category === 'tee' || piece.category === 'jacket') {
      if (inputs.arm_length === 'short') {
        notes.push(
          'Sleeves likely run long off the rack. Shop "slim/short" sizes when available, or budget ~1-1.5" sleeve shortening at the tailor.',
        );
      } else if (inputs.arm_length === 'long') {
        notes.push(
          'Sleeves likely run short off the rack. Shop "long" sizes when available; under jackets, show only ~1/4" of cuff (less than the standard half-inch) to make the arms read shorter.',
        );
      }
    }

    // v2 — skin_undertone palette anchor. Fires on the categories
    // where color near the face matters most.
    if (
      piece.category === 'tee' ||
      piece.category === 'jacket' ||
      piece.category === 'extra'
    ) {
      if (inputs.skin_undertone === 'cool') {
        notes.push(
          'Anchor the color in the cool family — charcoal, navy, true white, jewel tones. Warm reds, oranges, and yellows fight the undertone near the face.',
        );
      } else if (inputs.skin_undertone === 'warm') {
        notes.push(
          'Anchor the color in the warm family — olive, rust, warm browns, cream, ochre. Icy blues and cool greys fight the undertone near the face.',
        );
      }
      // 'neutral' intentionally not noted — the report explains it; on
      // the shopping list it would be noise on every piece.
    }

    const modifier_note = notes.length > 0 ? notes.join(' · ') : undefined;

    return {
      slug: piece.slug,
      category: piece.category,
      label: piece.label,
      guidance,
      modifier_note,
    };
  });
}

// Validates a piece slug belongs to the user's archetype catalog.
// Returns true if valid. Used at the API boundary before persisting
// stage_2_pieces_acquired updates.
export function isValidFoundationPieceSlug(
  archetype: StyleArchetype,
  slug: string,
): boolean {
  return ARCHETYPE_PIECES[archetype].some((p) => p.slug === slug);
}

// Returns the full slug list for an archetype. Used to know when all
// 5 pieces have been acquired (auto-complete trigger).
export function allSlugsFor(archetype: StyleArchetype): string[] {
  return ARCHETYPE_PIECES[archetype].map((p) => p.slug);
}
