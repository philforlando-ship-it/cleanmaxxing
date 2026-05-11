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
  DressCodeContext,
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
  // 'accessory' added with mig 0102 component-library expansion. The
  // existing 'extra' bucket is kept for archetype-specific second-
  // bottoms / second-tops that don't fit the 4 core categories.
  category: 'tee' | 'pants' | 'sneakers' | 'jacket' | 'extra' | 'accessory';
  // 'core' counts toward Stage 2 auto-complete; 'optional' does not.
  // The 5 archetype anchor pieces are core; accessories are optional
  // — they elevate but don't gate the stage.
  tier: 'core' | 'optional';
  label: string;
  // 1-line shopping description. Frame + budget conditional.
  guidance: string;
  // Optional second-line note that surfaces when a specific modifier
  // is on. Keeps the primary guidance line clean.
  modifier_note?: string;
  // Optional third-line note that fires when the user's
  // dress_code_context is in dress_code_deprioritized. Used to flag
  // pieces that are meaningfully less essential in specific contexts
  // (e.g. minimal white sneakers in a corporate context where leather
  // is the higher-priority shoe).
  dress_code_note?: string;
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
  // Mig 0102 (2026-05-10). Drives the "lower priority for your dress
  // code" note on pieces with dress_code_deprioritized set. Nullable
  // for pre-migration rows.
  dress_code_context: DressCodeContext | null;
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

// Internal record shape — adds the runtime-computed fields back at
// foundationPiecesFor() time.
type ArchetypePieceSpec = Omit<
  FoundationPiece,
  'guidance' | 'modifier_note' | 'dress_code_note'
> & {
  guidance_base: string;
  // Dress codes where this piece is meaningfully less essential.
  // When user's dress_code_context is in this list, the
  // dress_code_deprioritized_note surfaces. Empty/undefined =
  // generally load-bearing across contexts.
  dress_code_deprioritized?: ReadonlyArray<DressCodeContext>;
  dress_code_deprioritized_note?: string;
};

const ARCHETYPE_PIECES: Record<StyleArchetype, ReadonlyArray<ArchetypePieceSpec>> = {
  clean_minimalist: [
    {
      slug: 'cm_white_crew_tee',
      category: 'tee',
      tier: 'core',
      label: 'Plain white crew-neck tee',
      guidance_base:
        'Heavyweight cotton, no logos, sleeve hits mid-bicep',
    },
    {
      slug: 'cm_dark_indigo_jeans',
      category: 'pants',
      tier: 'core',
      label: 'Dark indigo slim-tapered jeans',
      guidance_base:
        'Dark indigo wash, slight taper to ankle, no distressing',
    },
    {
      slug: 'cm_minimal_white_sneakers',
      category: 'sneakers',
      tier: 'core',
      label: 'Minimal white leather sneakers',
      guidance_base:
        'Low-top, minimal branding, white leather upper, white sole',
      dress_code_deprioritized: ['corporate', 'blue_collar'],
      dress_code_deprioritized_note:
        'Lower priority for your context — corporate biases toward leather (loafer or derby); for blue collar, concentrate shoe spend on quality leather for off-work.',
    },
    {
      slug: 'cm_unstructured_navy_blazer',
      category: 'jacket',
      tier: 'core',
      label: 'Unstructured navy blazer',
      guidance_base:
        'Navy wool or cotton-linen blend, no shoulder pads, fits clean over a tee',
      dress_code_deprioritized: ['casual_wfh', 'blue_collar'],
      dress_code_deprioritized_note:
        'Lower priority for your context — useful for dress-up edge cases, not daily wear. Acquire after the core casual rotation is solid.',
    },
    {
      slug: 'cm_neutral_chinos',
      category: 'extra',
      tier: 'core',
      label: 'Neutral chinos in stone or olive',
      guidance_base:
        'Stone, olive, or charcoal — slim-tapered, sits at natural waist',
    },
    {
      slug: 'cm_dress_watch',
      category: 'accessory',
      tier: 'optional',
      label: 'Dress watch on leather strap',
      guidance_base:
        'Simple round dial, sub-second hand or none, slim case, brown or black leather strap. Quiet, not loud — the clean-minimalist register',
    },
    {
      slug: 'cm_acetate_sunglasses',
      category: 'accessory',
      tier: 'optional',
      label: 'Acetate square or wayfarer sunglasses',
      guidance_base:
        'Tortoise or black acetate, square or wayfarer silhouette — adds the architecture without breaking the minimalist register',
    },
  ],
  athletic_casual: [
    {
      slug: 'ac_fitted_grey_tee',
      category: 'tee',
      tier: 'core',
      label: 'Fitted heather-grey tee',
      guidance_base:
        'Cotton or cotton-modal blend, follows shoulders, sleeve mid-bicep',
    },
    {
      slug: 'ac_tapered_athletic_chinos',
      category: 'pants',
      tier: 'core',
      label: 'Tapered athletic chinos',
      guidance_base:
        'Stretch chino fabric, athletic cut through thigh, taper to ankle',
    },
    {
      slug: 'ac_black_low_top_sneakers',
      category: 'sneakers',
      tier: 'core',
      label: 'Black-and-white minimal low-top sneakers',
      guidance_base:
        'Low profile, no chunky midsole, neutral colorway',
      dress_code_deprioritized: ['corporate'],
      dress_code_deprioritized_note:
        'Lower priority for corporate — a clean leather loafer or derby covers more weekly outfits at your dress code.',
    },
    {
      slug: 'ac_bomber_or_zip',
      category: 'jacket',
      tier: 'core',
      label: 'Fitted bomber or athletic zip-up',
      guidance_base:
        'Black, navy, or olive — clean silhouette, no loud branding',
      dress_code_deprioritized: ['corporate'],
      dress_code_deprioritized_note:
        'Lower priority for corporate — a structured blazer or overcoat hits the formality floor your weekday needs.',
    },
    {
      slug: 'ac_dark_slim_jeans',
      category: 'extra',
      tier: 'core',
      label: 'Dark slim jeans',
      guidance_base:
        'Crossover piece for casual settings, slight taper, no distressing',
    },
    {
      slug: 'ac_dive_or_field_watch',
      category: 'accessory',
      tier: 'optional',
      label: 'Dive or field watch',
      guidance_base:
        '38–42mm case, rubber/silicone or NATO strap — sport register fits the athletic_casual aesthetic. Steel bracelet works for the dressier end',
    },
    {
      slug: 'ac_acetate_sunglasses',
      category: 'accessory',
      tier: 'optional',
      label: 'Acetate wayfarer or aviator sunglasses',
      guidance_base:
        'Black, tortoise, or matte — wayfarer or aviator silhouette pairs with the athletic register without going sporty-techy',
    },
  ],
  rugged_masculine: [
    {
      slug: 'rm_olive_henley',
      category: 'tee',
      tier: 'core',
      label: 'Heavyweight olive long-sleeve henley',
      guidance_base:
        'Cotton or cotton-waffle, two or three buttons, earth tone',
    },
    {
      slug: 'rm_raw_dark_denim',
      category: 'pants',
      tier: 'core',
      label: 'Raw or dark indigo straight-cut jeans',
      guidance_base:
        'Heavyweight denim, straight cut (not slim), full break at the boot',
    },
    {
      slug: 'rm_brown_leather_boots',
      category: 'sneakers',
      tier: 'core',
      label: 'Brown leather lace-up boots',
      guidance_base:
        'Work-boot or chukka silhouette in tobacco or chestnut leather',
    },
    {
      slug: 'rm_canvas_field_jacket',
      category: 'jacket',
      tier: 'core',
      label: 'Canvas or waxed-cotton field jacket',
      guidance_base:
        'Olive, brown, or tan — utility pockets, no logos, lived-in look earned not bought',
      dress_code_deprioritized: ['corporate'],
      dress_code_deprioritized_note:
        'Lower priority for corporate — your weekday floor is an overcoat or blazer. The field jacket is the off-work statement piece.',
    },
    {
      slug: 'rm_flannel_overshirt',
      category: 'extra',
      tier: 'core',
      label: 'Flannel or heavyweight overshirt',
      guidance_base:
        'Earth-tone plaid or solid heavyweight cotton, layers cleanly over henley',
    },
    {
      slug: 'rm_field_watch',
      category: 'accessory',
      tier: 'optional',
      label: 'Field watch on leather or NATO',
      guidance_base:
        '38–42mm case, matte or brushed finish, brown leather or olive/black NATO strap. The rugged register rejects polished steel and white-dial dress watches',
    },
    {
      slug: 'rm_aviator_sunglasses',
      category: 'accessory',
      tier: 'optional',
      label: 'Aviator or acetate square sunglasses',
      guidance_base:
        'Metal aviator (matte or gunmetal, not shiny gold) or tortoise acetate square — both anchor the rugged face frame',
    },
    {
      slug: 'rm_cap_or_flat_cap',
      category: 'accessory',
      tier: 'optional',
      label: 'Dad cap, flat cap, or beanie',
      guidance_base:
        'Wool flat cap, washed canvas dad cap, or knit beanie depending on climate. Solid earth tones, no logos. Adds head architecture without breaking register',
      dress_code_deprioritized: ['corporate', 'business_casual'],
      dress_code_deprioritized_note:
        'Lower priority for corporate / business casual — hats read out of place in those weekly contexts. Higher leverage on casual / off-work days.',
    },
  ],
  mature_professional: [
    {
      slug: 'mp_white_oxford_or_fine_knit',
      category: 'tee',
      tier: 'core',
      label: 'Fine-gauge merino crew or white oxford',
      guidance_base:
        'Merino crewneck or non-iron oxford, fits cleanly under a blazer',
    },
    {
      slug: 'mp_grey_wool_trousers',
      category: 'pants',
      tier: 'core',
      label: 'Mid-grey wool trousers',
      guidance_base:
        'Tailored, sits at natural waist, slight taper, no pleats',
    },
    {
      slug: 'mp_brown_leather_loafers',
      category: 'sneakers',
      tier: 'core',
      label: 'Brown leather loafers or minimal leather sneakers',
      guidance_base:
        'Either penny loafers in chestnut or low-top white leather sneakers — choose for occasion',
    },
    {
      slug: 'mp_unstructured_navy_blazer',
      category: 'jacket',
      tier: 'core',
      label: 'Unstructured navy blazer',
      guidance_base:
        'The single highest-leverage piece. Navy wool or cotton-blend, no shoulder pads',
    },
    {
      slug: 'mp_dark_denim_or_chinos',
      category: 'extra',
      tier: 'core',
      label: 'Dark denim or fine-twill chinos',
      guidance_base:
        'For casual register — dark indigo or olive, tailored not slim',
    },
    {
      slug: 'mp_dress_watch_steel',
      category: 'accessory',
      tier: 'optional',
      label: 'Steel-bracelet dress watch or leather-strap classic',
      guidance_base:
        '38–40mm round dial, clean face, steel bracelet for daily-driver or leather strap for dressier register. Quiet over loud — proportion matters more than brand',
    },
    {
      slug: 'mp_acetate_sunglasses',
      category: 'accessory',
      tier: 'optional',
      label: 'Acetate square sunglasses',
      guidance_base:
        'Tortoise or black acetate, square or rounded-square silhouette. Mid-tier (Persol / Ray-Ban-and-up) is the right spend — luxury here is not ROI-positive',
    },
  ],
  streetwear: [
    {
      slug: 'sw_premium_oversized_tee',
      category: 'tee',
      tier: 'core',
      label: 'Premium oversized tee with structured shoulders',
      guidance_base:
        'Heavyweight cotton, boxy through body, structured at the shoulder, no graphics',
    },
    {
      slug: 'sw_wide_leg_dark_denim',
      category: 'pants',
      tier: 'core',
      label: 'Wide-leg or relaxed straight dark denim',
      guidance_base:
        'Dark indigo, full leg with slight crop or full break, modern silhouette',
    },
    {
      slug: 'sw_chunky_clean_sneakers',
      category: 'sneakers',
      tier: 'core',
      label: 'Chunky clean-silhouette sneakers',
      guidance_base:
        'White or cream upper, intentional sole volume, low-key branding',
      dress_code_deprioritized: ['corporate'],
      dress_code_deprioritized_note:
        'Lower priority for corporate — your weekday rotation needs a leather option. Save the chunky sneaker for off-work.',
    },
    {
      slug: 'sw_chore_or_workwear_jacket',
      category: 'jacket',
      tier: 'core',
      label: 'Chore jacket or workwear overshirt',
      guidance_base:
        'Black, ecru, or washed indigo canvas — boxy, structured, layers over the tee',
    },
    {
      slug: 'sw_one_statement_piece',
      category: 'extra',
      tier: 'core',
      label: 'One statement piece (jewelry or accessory)',
      guidance_base:
        'Pick ONE — thin gold chain, distinctive ring, or visible-but-restrained accent. Keep the rest grounded',
      dress_code_deprioritized: ['corporate'],
      dress_code_deprioritized_note:
        'Lower priority for corporate — visible statement pieces read out of place in that context. Restrict to off-work or casual days.',
    },
    {
      slug: 'sw_statement_watch',
      category: 'accessory',
      tier: 'optional',
      label: 'Statement or vintage-leaning watch',
      guidance_base:
        'Digital cult-classic, chunky steel diver, or vintage-style integrated bracelet — pick one that reads intentional. Streetwear tolerates more case size than other archetypes',
    },
    {
      slug: 'sw_acetate_sunglasses',
      category: 'accessory',
      tier: 'optional',
      label: 'Square or wayfarer sunglasses',
      guidance_base:
        'Acetate, slightly oversized works here, tortoise or black. Skip rimless / thin-metal in this archetype',
    },
    {
      slug: 'sw_fitted_or_dad_cap',
      category: 'accessory',
      tier: 'optional',
      label: 'Fitted cap or dad cap',
      guidance_base:
        'Unbranded or low-key branded, washed canvas or wool. Forward worn for the considered look; backward only if under 30 and the rest of the outfit carries it',
      dress_code_deprioritized: ['corporate', 'business_casual'],
      dress_code_deprioritized_note:
        'Lower priority for corporate / business casual — caps don’t fit either weekday context. Off-work or weekend use is where they earn their place.',
    },
  ],
  creative_eclectic: [
    {
      slug: 'ce_loose_knit_sweater',
      category: 'tee',
      tier: 'core',
      label: 'Loose-knit crewneck or cardigan',
      guidance_base:
        'Earth tone (cream, oatmeal, rust, slate), texture visible, layers over an oxford',
    },
    {
      slug: 'ce_pleated_wool_trousers',
      category: 'pants',
      tier: 'core',
      label: 'Pleated or wide-leg trousers',
      guidance_base:
        'Wool or cotton-twill, earth-toned, vintage-leaning silhouette',
    },
    {
      slug: 'ce_leather_derbies',
      category: 'sneakers',
      tier: 'core',
      label: 'Leather derbies or unlined loafers',
      guidance_base:
        'Brown or oxblood leather, slightly worn-in feel, no athletic crossover',
    },
    {
      slug: 'ce_oxford_layer',
      category: 'jacket',
      tier: 'core',
      label: 'Oxford shirt or overshirt as layer',
      guidance_base:
        'Slate-blue, white, or stripe — collar visible above the knit, lightweight cotton',
    },
    {
      slug: 'ce_textural_accessory_or_glasses',
      category: 'extra',
      tier: 'core',
      label: 'Textural scarf or distinctive glasses',
      guidance_base:
        'One element doing visual work — a wool scarf, kerchief, or thin-frame glasses',
    },
    {
      slug: 'ce_vintage_watch',
      category: 'accessory',
      tier: 'optional',
      label: 'Vintage or vintage-styled watch',
      guidance_base:
        'Smaller case (34–38mm), leather strap (cordovan, brown, or oxblood), clean dial. Vintage pieces work; new pieces in vintage style work. Skip modern oversized sport',
    },
    {
      slug: 'ce_round_or_geometric_sunglasses',
      category: 'accessory',
      tier: 'optional',
      label: 'Round or geometric sunglasses',
      guidance_base:
        'Round metal, panto, or geometric acetate — the creative register tolerates frame shapes the safer archetypes shouldn’t use. Commit fully or skip entirely',
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

    // Mig 0102 — surface the dress_code_deprioritized note when the
    // user's context matches. Empty/undefined deprioritized list means
    // the piece is generally load-bearing; no note fires.
    const dress_code_note =
      inputs.dress_code_context &&
      piece.dress_code_deprioritized?.includes(inputs.dress_code_context) &&
      piece.dress_code_deprioritized_note
        ? piece.dress_code_deprioritized_note
        : undefined;

    return {
      slug: piece.slug,
      category: piece.category,
      tier: piece.tier,
      label: piece.label,
      guidance,
      modifier_note,
      dress_code_note,
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

// Returns the slug list that gates Stage 2 auto-completion.
// Core-tier only — optional accessories are elevation, not blockers,
// so they don't count toward the all-acquired threshold.
export function allSlugsFor(archetype: StyleArchetype): string[] {
  return ARCHETYPE_PIECES[archetype]
    .filter((p) => p.tier === 'core')
    .map((p) => p.slug);
}
