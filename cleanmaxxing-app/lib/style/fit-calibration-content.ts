// Stage 3 fit-calibration principles. Authored, modifier-conditional
// at render time. Returns the 2-3 most relevant proportion principles
// for the user's frame, age, body fat, and target archetype.
//
// Principles are short — each is a concrete fit rule the user can
// apply across what they already own. The point of Stage 3 is the
// principle stays after the closet audit and the foundation buy:
// every future purchase should pass these rules.

import type { BodyFatEstimate } from '@/lib/profile/service';
import type {
  ArmLength,
  FrameEstimate,
  LegLength,
  SkinUndertone,
  StyleArchetype,
} from './types';

export type FitPrinciple = {
  slug: string;
  title: string;
  body: string;
};

type Inputs = {
  archetype: StyleArchetype;
  frame: FrameEstimate;
  bf_pct: BodyFatEstimate | null;
  age: number | null;
};

// Universal principles — always present regardless of modifiers.
const UNIVERSAL: ReadonlyArray<FitPrinciple> = [
  {
    slug: 'shoulder_seam',
    title: 'The shoulder seam is the most important measurement',
    body:
      'A garment fits or doesn\'t at the shoulder. Sleeve length, body length, taper — those can be tailored. A shoulder seam that lands an inch off the actual shoulder cannot. When you\'re trying anything on, check the shoulder first; if it\'s wrong, the rest of the fit doesn\'t matter.',
  },
  {
    slug: 'sleeve_to_wrist',
    title: 'Sleeves end at the wrist bone',
    body:
      'For long-sleeve tops, sleeves should hit the bony point of the wrist — not above (looks short), not pooling at the hand (looks borrowed). For tees, sleeves should hit roughly mid-bicep on most builds. This single rule pulls 70% of casual outfits into a sharper register.',
  },
];

// Frame-specific principles. Each frame gets one tuned to its
// silhouette risk.
const FRAME_PRINCIPLES: Record<FrameEstimate, FitPrinciple> = {
  slim: {
    slug: 'slim_v_taper',
    title: 'Build the V-taper through structure, not skin-tight cuts',
    body:
      'A slim build benefits from structured shoulders (jackets, henleys with weight) and a taper through the waist. The trap is going skin-tight to "show the build" — that reads as overdressed for the body. Fitted, not compressed. Let the shoulder work do the talking.',
  },
  athletic: {
    slug: 'athletic_no_compression',
    title: 'Fitted, never compressed',
    body:
      'A defined build needs clothes that follow shoulders and chest without straining. If a button pulls, if a tee shows every contour, you\'ve gone too far. Half-size up from "performance fit" is usually right for street wear; performance gear stays at the gym.',
  },
  regular: {
    slug: 'regular_proportion',
    title: 'Proportion is your edge',
    body:
      'A regular build wins on proportion, not extremes. Slim-tapered (not skinny) bottoms, fitted (not tight) tops, clean shoulder lines. The benchmark: clothes look made for you, not chosen to compensate. Avoid both billowing and clinging.',
  },
  broader: {
    slug: 'broader_clean_lines',
    title: 'Clean lines through the chest, taper at the leg',
    body:
      'A broader frame reads sharpest in tops with a straight clean line through the chest (no straining, no boxiness) and bottoms with a slight taper to the ankle. The contrast — broad up top, narrowing down — is the silhouette working with your build, not fighting it.',
  },
  heavier: {
    slug: 'heavier_vertical_lines',
    title: 'Vertical lines lengthen, horizontal breaks shorten',
    body:
      'Heavier builds read leaner in vertical-line clothing — monochromatic outfits, dark wash bottoms, unbroken color blocks from chest to ankle. Avoid horizontal stripes, contrast cuffs, sharp top-bottom color breaks at the waist. Solid dark tones do real visual work here.',
  },
};

// Style Past 45 principle — only fires when age >= 45.
const STYLE_PAST_45: FitPrinciple = {
  slug: 'past_45_register',
  title: 'Past 45: relaxed but considered, not slim or oversized',
  body:
    'The cuts that worked at 32 don\'t at 48 — even on the same body. The slim-cut trap reads as trying-too-hard; the dad-fit trap reads as resignation. The right register is a half-size up from "slim fit," trousers at the natural waist with room through seat and thigh tapering slightly to ankle, and the blazer or unstructured jacket as the default third layer. A tee and jeans alone usually need a layer at this age to read as deliberate.',
};

// Early Style Past 45 warning — fires for 35-44 with athletic_casual
// target.
const EARLY_45_WARNING: FitPrinciple = {
  slug: 'early_45_warning',
  title: 'Calibration shift starts now',
  body:
    'Athletic-casual cuts that work in the early 30s start reading as try-too-hard around 38-40. Half-size up on slim-fit tops over the next few years isn\'t giving up — it\'s staying ahead of the slim-cut trap. Begin recalibrating before the cuts visibly date you.',
};

// Glasses framing principle — fires for users at 45+ in archetypes
// where face frame matters most (clean_minimalist, mature_professional,
// creative_eclectic).
const GLASSES_PRINCIPLE: FitPrinciple = {
  slug: 'glasses_face_frame',
  title: 'Glasses are now a face-frame variable',
  body:
    'If you wear glasses, frame selection past 45 matters as much as facial hair. Frames should oppose the face shape — round face goes angular, angular face softens. A default-prescription pick from the eye doctor without consideration drags down an otherwise-strong presentation. This is one of the quiet high-leverage variables at this age.',
};

// Wardrobe-anticipates-change principle — fires when archetype is
// any of the dressy/structured ones AND no specific frame issue is
// dominant. Noted here as a guidance principle but body-comp specific
// guidance lives in the report's modifier block, not Stage 3.
// (This is intentionally cut from Stage 3 — it's a planning principle,
// not a fit principle.)

// v2 granular axes — exported individually so the BodyAxesPanel
// (always-visible, renders before Stage 1) can show the same principle
// text without duplication. Stage 3 also includes the relevant ones in
// its principles list once the user reaches it.

export const LEG_LENGTH_PRINCIPLES: Record<
  Exclude<LegLength, 'proportional'>,
  FitPrinciple
> = {
  short: {
    slug: 'leg_length_short',
    title: 'High-rise trousers are the highest-leverage proportion lever',
    body:
      'Long-torso/short-legs is one of the most common men\'s proportions and the easiest to dress around. Trousers at the natural waist (or higher) lengthen the leg line visually. Match shoe color to pant color whenever possible — it extends the line uninterrupted from waist to floor. Shorter shirt and jacket hems help; no break or slight break on pants. This rule fires regardless of build.',
  },
  long: {
    slug: 'leg_length_long',
    title: 'Lower rises are tolerable; use horizontal breaks deliberately',
    body:
      'Short-torso/long-legs gives you the latitude most other proportions don\'t — lower-rise pants work, contrasting belt or shoe color is a tool rather than a mistake (it creates the missing horizontal break), and longer shirt hems and jacket lengths help re-balance the silhouette. The trap is treating this as "easy mode" — the proportions still need intention, just from the opposite direction.',
  },
};

export const ARM_LENGTH_PRINCIPLES: Record<
  Exclude<ArmLength, 'proportional'>,
  FitPrinciple
> = {
  short: {
    slug: 'arm_length_short',
    title: 'Sleeves run long off the rack — name the recurring problem',
    body:
      'If sleeves regularly drape over your wrist bone or hand, the off-the-rack assumption is wrong for your build. Two paths: shop "slim/short" sized when available (most brand size grids include them), or budget for sleeve shortening at the tailor — usually 1 to 1.5" of fabric is inside the cuff for adjustment, and the work is cheap and quick on most shirts and tees.',
  },
  long: {
    slug: 'arm_length_long',
    title: 'Sleeves run short — adjust visible cuff length deliberately',
    body:
      'Wrist bone exposure under jackets reads as growing-out-of-the-suit unless deliberate. Show only about 1/4" of shirt cuff under jackets — half the standard half-inch — and the deliberate compression makes the arms appear less long. Buy "long" sizes when offered. Most tailors can let out 0.5-1" via the inside-cuff allowance on shirts that look short.',
  },
};

export const SKIN_UNDERTONE_PRINCIPLES: Record<SkinUndertone, FitPrinciple> = {
  cool: {
    slug: 'undertone_cool',
    title: 'Cool undertone — anchor the palette in the cool family',
    body:
      'Charcoal, navy, true white, slate grey, and jewel tones (sapphire, emerald, deep purple) flatter you near the face. Warm reds, oranges, mustard yellows, and warm browns fight the undertone — keep them away from the collarline (a warm-toned belt or shoe is fine). The jewelry test holds up: silver and platinum suit you more than gold and brass.',
  },
  warm: {
    slug: 'undertone_warm',
    title: 'Warm undertone — anchor the palette in the warm family',
    body:
      'Olive, rust, ochre, warm browns, cream, and earth tones flatter you near the face. Icy blues, cool greys, and stark whites fight the undertone — soften toward off-white or ecru when possible. The jewelry test holds up: gold and brass suit you more than silver. This is the default warm-archetype palette (rugged, creative_eclectic) by coincidence — they line up.',
  },
  neutral: {
    slug: 'undertone_neutral',
    title: 'Neutral undertone — most colors work, lean toward your hair',
    body:
      'You can wear most palettes credibly, which is the easy mode of color. The tiebreak when in doubt: lean toward whichever direction your hair and beard color naturally lean. Warm beard or auburn hair → warm tones near the face. Cool/silver/grey → cool tones. The flexibility is real but pick a direction per outfit so the look doesn\'t feel undecided.',
  },
};

export function fitPrinciplesFor(inputs: Inputs): FitPrinciple[] {
  const principles: FitPrinciple[] = [];

  // Always include the universals first — these never get cut.
  principles.push(...UNIVERSAL);

  // Frame-specific principle.
  principles.push(FRAME_PRINCIPLES[inputs.frame]);

  // v2 axes (leg_length / arm_length / skin_undertone) deliberately
  // NOT pushed into Stage 3. They're handled by BodyAxesPanel above
  // Stage 1 (in-shopping reminder) + Stage 2 per-piece modifier_notes
  // (next-to-the-buy actionable). Putting them here too caused the
  // same principle to surface 3x on one page; we kept the actionable
  // placements and dropped the consolidated-list redundancy. The
  // exported *_PRINCIPLES records below are still the single source
  // of truth — BodyAxesPanel imports from here.

  // Age-conditional layers.
  if (inputs.age != null && inputs.age >= 45) {
    principles.push(STYLE_PAST_45);

    // Glasses principle for archetypes where face-frame is most
    // load-bearing.
    if (
      inputs.archetype === 'clean_minimalist' ||
      inputs.archetype === 'mature_professional' ||
      inputs.archetype === 'creative_eclectic'
    ) {
      principles.push(GLASSES_PRINCIPLE);
    }
  } else if (
    inputs.age != null &&
    inputs.age >= 35 &&
    inputs.archetype === 'athletic_casual'
  ) {
    principles.push(EARLY_45_WARNING);
  }

  return principles;
}
