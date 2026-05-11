// Stage 1 closet audit chip catalogs, keyed by target archetype.
//
// Each archetype gets ~8 chips covering items common in adult male
// wardrobes that are *diagnostic* of alignment with that target. The
// user marks each chip keep / cut / replace. Unmarked chips are
// treated as not applicable.
//
// Authored content, not LLM-generated — the chip catalog should be
// stable across users so the LLM Stage 1 recommendation has a fixed
// vocabulary to react to. Add chips sparingly; every chip is a small
// cognitive load on the user.

import type { StyleArchetype } from './types';

export type ClosetAuditChip = {
  slug: string;
  label: string;
  // Optional context shown beneath the chip label when it's likely to
  // be misread. Keep under ~80 chars.
  hint?: string;
};

// Slugs are kept globally unique across archetypes so any future
// cross-archetype migration (a user changes target_archetype) doesn't
// require slug remapping. Prefix is the archetype.
const CHIPS: Record<StyleArchetype, ReadonlyArray<ClosetAuditChip>> = {
  clean_minimalist: [
    {
      slug: 'cm_plain_crew_tees',
      label: 'Plain crew-neck tees in white / black / grey',
      hint: 'The foundation of this archetype.',
    },
    {
      slug: 'cm_dark_indigo_jeans',
      label: 'Dark indigo or black slim jeans',
    },
    {
      slug: 'cm_white_minimal_sneakers',
      label: 'White minimal leather sneakers',
    },
    {
      slug: 'cm_logo_or_graphic_tees',
      label: 'Logo or graphic tees',
      hint: 'Pulls against clean minimalist; consider cutting or replacing with plain.',
    },
    {
      slug: 'cm_distressed_jeans',
      label: 'Distressed / ripped jeans',
      hint: 'Off-register for clean minimalist.',
    },
    {
      slug: 'cm_chunky_or_branded_sneakers',
      label: 'Chunky or visibly branded sneakers',
    },
    {
      slug: 'cm_oversized_hoodies',
      label: 'Oversized hoodies',
    },
    {
      slug: 'cm_unstructured_blazer_neutral',
      label: 'Unstructured blazer in navy / black / charcoal',
      hint: 'High-leverage layer if you have one.',
    },
  ],
  athletic_casual: [
    {
      slug: 'ac_fitted_performance_tees',
      label: 'Fitted performance / cotton-blend tees',
    },
    {
      slug: 'ac_athletic_chinos_or_joggers',
      label: 'Athletic-cut chinos or tapered joggers',
    },
    {
      slug: 'ac_minimal_low_top_sneakers',
      label: 'Minimal low-top sneakers',
    },
    {
      slug: 'ac_dress_shirts_baggy',
      label: 'Boxy dress shirts that don’t taper',
      hint: 'Athletic casual reads sharper in fitted layers.',
    },
    {
      slug: 'ac_loose_baggy_tees',
      label: 'Loose baggy tees that hide the build',
      hint: 'Defeats the V-taper read this archetype is built around.',
    },
    {
      slug: 'ac_zip_athletic_jacket',
      label: 'Fitted athletic zip-up or bomber',
    },
    {
      slug: 'ac_track_pants_brand_loud',
      label: 'Loud-branded track pants',
      hint: 'Tilts toward gym wear, not athletic casual.',
    },
    {
      slug: 'ac_dark_slim_jeans',
      label: 'Dark slim jeans',
      hint: 'The cross-over piece into casual settings.',
    },
  ],
  rugged_masculine: [
    {
      slug: 'rm_heavy_henley_or_flannel',
      label: 'Heavyweight henleys or flannels',
    },
    {
      slug: 'rm_raw_or_dark_denim',
      label: 'Raw / selvage / dark denim, straight cut',
    },
    {
      slug: 'rm_leather_work_boots',
      label: 'Leather work boots or chukkas',
    },
    {
      slug: 'rm_fashion_distressed_denim',
      label: 'Fashion-distressed denim with pre-made tears',
      hint: 'Reads bought-distressed, not lived-in. Off-archetype.',
    },
    {
      slug: 'rm_thin_cotton_tees_basics',
      label: 'Thin lightweight cotton tees',
      hint: 'Wrong weight for this archetype; need heavier cottons.',
    },
    {
      slug: 'rm_techwear_synthetic_pieces',
      label: 'Technical / synthetic pieces (nylon shells, joggers)',
      hint: 'Cross-archetype — pulls toward streetwear or athletic.',
    },
    {
      slug: 'rm_canvas_or_waxed_jacket',
      label: 'Canvas or waxed-cotton field jacket',
    },
    {
      slug: 'rm_leather_belt_strap_watch',
      label: 'Leather belt + leather-strap watch',
    },
  ],
  mature_professional: [
    {
      slug: 'mp_unstructured_blazer',
      label: 'Unstructured navy or charcoal blazer',
      hint: 'The single highest-leverage piece for this archetype.',
    },
    {
      slug: 'mp_fitted_oxford_shirts',
      label: 'Fitted oxford / fine knit shirts',
    },
    {
      slug: 'mp_tailored_wool_trousers',
      label: 'Tailored wool or fine cotton trousers',
    },
    {
      slug: 'mp_leather_loafers_or_derbys',
      label: 'Leather loafers or derbies',
    },
    {
      slug: 'mp_loud_pattern_shirts',
      label: 'Loud-pattern dress shirts',
      hint: 'Reads as trying-too-hard at this register.',
    },
    {
      slug: 'mp_skinny_fit_old_chinos',
      label: 'Skinny-fit chinos from 5+ years ago',
      hint: 'Slim-cut trap territory; recalibrate to relaxed-but-considered.',
    },
    {
      slug: 'mp_logo_polo_shirts',
      label: 'Logo polo shirts',
      hint: 'Lean toward unbranded knits or fine cotton crews.',
    },
    {
      slug: 'mp_branded_athletic_sneakers',
      label: 'Branded athletic sneakers as default footwear',
      hint: 'Out of register; minimal leather sneakers cross over better.',
    },
  ],
  streetwear: [
    {
      slug: 'sw_premium_oversized_tees',
      label: 'Premium oversized tees with structured shoulders',
    },
    {
      slug: 'sw_wide_leg_or_cropped_denim',
      label: 'Wide-leg or slightly cropped denim',
    },
    {
      slug: 'sw_chunky_clean_sneakers',
      label: 'Chunky clean-silhouette sneakers',
    },
    {
      slug: 'sw_classic_slim_chinos',
      label: 'Classic slim-fit chinos',
      hint: 'Wrong silhouette for current streetwear register.',
    },
    {
      slug: 'sw_blank_basics_only',
      label: 'Only plain blank basics, no statement pieces',
      hint: 'Streetwear needs at least one piece doing the talking.',
    },
    {
      slug: 'sw_loud_logo_overload',
      label: 'Multiple loud-logo pieces worn together',
      hint: 'Pick one statement, ground the rest in neutrals.',
    },
    {
      slug: 'sw_workwear_chore_jacket',
      label: 'Chore jacket / workwear overshirt',
      hint: 'Crosses cleanly into streetwear when fit is right.',
    },
    {
      slug: 'sw_thin_gold_jewelry',
      label: 'Thin gold chain or simple jewelry',
    },
  ],
  creative_eclectic: [
    {
      slug: 'ce_loose_knit_sweater',
      label: 'Loose-knit crewneck or cardigan in earth tone',
    },
    {
      slug: 'ce_pleated_or_wide_trousers',
      label: 'Pleated or wide-leg trousers',
    },
    {
      slug: 'ce_leather_derby_or_loafer',
      label: 'Leather derbies or unlined loafers',
    },
    {
      slug: 'ce_oxford_or_overshirt_layer',
      label: 'Oxford shirt or overshirt as a layer piece',
    },
    {
      slug: 'ce_uniform_basics_only',
      label: 'Only uniform basics, no textural variety',
      hint: 'Creative reads through fabric and silhouette mixing.',
    },
    {
      slug: 'ce_skinny_jeans_default',
      label: 'Skinny jeans as the default bottom',
      hint: 'Wrong silhouette for this archetype’s register.',
    },
    {
      slug: 'ce_textural_scarf_or_kerchief',
      label: 'Textural scarf, kerchief, or accessory layer',
    },
    {
      slug: 'ce_thin_frame_glasses',
      label: 'Thin-frame or distinctive glasses',
      hint: 'High-leverage face-frame variable for this archetype.',
    },
  ],
};

export function chipsForArchetype(
  archetype: StyleArchetype,
): ReadonlyArray<ClosetAuditChip> {
  return CHIPS[archetype];
}

// Validates that every slug in a submitted chip_selections record
// belongs to the user's target archetype. Returns the offending slug
// or null if all slugs are valid. The route handler uses this to
// reject malformed submissions before persisting them.
export function validateChipSelections(
  archetype: StyleArchetype,
  selections: Record<string, unknown>,
): string | null {
  const valid = new Set(CHIPS[archetype].map((c) => c.slug));
  for (const slug of Object.keys(selections)) {
    if (!valid.has(slug)) return slug;
  }
  return null;
}

// Drops slugs orphaned by a target_archetype change. The DB row keeps
// the raw selections (so a user toggling back to the prior archetype
// recovers their taps), but the form should only seed with slugs that
// match the chip catalog being rendered. Without this, submitting
// after an archetype change throws "Unknown chip slug" server-side.
export function filterValidChipSelections<T>(
  archetype: StyleArchetype,
  selections: Record<string, T> | null,
): Record<string, T> {
  if (!selections) return {};
  const valid = new Set(CHIPS[archetype].map((c) => c.slug));
  const out: Record<string, T> = {};
  for (const [slug, value] of Object.entries(selections)) {
    if (valid.has(slug)) out[slug] = value;
  }
  return out;
}
