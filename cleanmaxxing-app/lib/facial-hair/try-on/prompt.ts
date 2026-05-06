// Facial hair try-on transformation prompt. One prompt builder that
// branches on target_style — each of the 12 styles gets explicit
// styling guidance so the image model produces a recognizable result.
//
// Hard constraints embedded in the prompt:
//   - SAME face: skin tone, eye color, age, identity preserved exactly
//   - SAME head hair: don't touch the user's hair on top; this is a
//     facial-hair preview, not a haircut preview
//   - Photoreal portrait, neutral framing, even lighting
//   - No artistic interpretation, no "glow up" enhancement of the face
//   - Single subject, no diptych

import {
  FACIAL_HAIR_STYLES,
  type FacialHairStyleSlug,
} from '../types';

// Per-style explicit description. The image model needs more than
// "circle beard" — it needs the geometry described. These are tuned
// for gpt-image-1 / Responses API.
const STYLE_DESCRIPTION: Record<FacialHairStyleSlug, string> = {
  clean_shaven:
    'Cleanly shaved face — no facial hair anywhere. Smooth skin across the upper lip, cheeks, jaw, and chin. The shave should look intentional and recent (no stubble shadow).',
  light_stubble:
    'Light stubble across the entire lower face — roughly 2-3 days of growth. Even, soft shadow on cheeks, jaw, upper lip, and chin. Not patchy, not dark — just visible light texture. No defined edges.',
  heavy_stubble:
    'Heavy stubble across the entire lower face — roughly 5-7 days of growth. Visibly dense, well-defined cheek line and jaw line. The hair should look held in place rather than wild. Connects under the chin.',
  chevron_mustache:
    'A thick, full mustache covering the entire upper lip from corner to corner. Hair extends slightly past the corners of the mouth. No beard, no goatee — completely clean shaven on cheeks, chin, and jaw.',
  classic_mustache:
    'A neat, trimmed mustache sitting cleanly above the upper lip. Smaller and more refined than a chevron — does not extend past the corners of the mouth. No beard, no goatee — completely clean shaven on cheeks, chin, and jaw.',
  goatee_with_mustache:
    'A connected mustache and small chin patch. The mustache goes across the upper lip and connects down to a small triangular patch of hair on the chin (not covering the full chin). Cheeks and jaw are completely clean shaven.',
  circle_beard:
    'A connected mustache and rounded chin patch. The mustache joins down both sides of the mouth into a rounded patch covering the chin (more substantial than a goatee). Cheeks and jaw are completely clean shaven. Compact and well-defined.',
  chinstrap_beard:
    'A thin line of beard hair tracing the jawline from one sideburn to the other, going under the chin but NOT covering the chin or upper lip. Cheeks above the line are clean shaven, upper lip is clean shaven. Sharp, defined edges.',
  short_boxed_beard:
    'A short, even beard covering the cheeks, chin, jaw, and upper lip. Roughly 1-2 weeks of trimmed growth — not stubble but not long. Clean cheek line slightly above the natural hairline. Mustache connects to the beard.',
  medium_full_beard:
    'A medium-length full beard covering the cheeks, chin, jaw, and upper lip — roughly 2-3 months of growth, shaped and maintained. Substantial coverage but tidy edges. Mustache connects to the beard.',
  corporate_beard:
    'A short beard covering the cheeks, chin, jaw, and upper lip — kept very short and crisply lined. Sharp cheek line, sharp neck line. Looks intentional and conservative. Mustache connects to the beard.',
  ducktail_beard:
    'A longer beard that tapers to a defined point at the chin. Cheeks have meaningful coverage, the chin extends downward into a clear taper. Mustache connects to the beard. Older / patriarchal aesthetic.',
};

export function buildFacialHairTryOnPrompt(
  targetStyle: FacialHairStyleSlug,
): string {
  const styleEntry = FACIAL_HAIR_STYLES.find((s) => s.slug === targetStyle);
  const styleLabel = styleEntry?.label ?? targetStyle;
  const description = STYLE_DESCRIPTION[targetStyle];

  return `Generate a photoreal portrait of the person in the reference image with a different facial hair style. This is a facial-hair preview.

CRITICAL — preserve identity:
- Same face geometry, same skin tone, same eye color, same age
- Same head hair: do NOT touch the hair on top of the head. Same length, same style, same texture.
- Same overall identity. The output must clearly read as the SAME PERSON.

ONLY change the facial hair. The new facial hair style is:

${styleLabel}

Specific styling:
${description}

Composition:
- Photoreal portrait, head and upper shoulders only, looking forward
- Neutral light gray studio background
- Even soft lighting (no harsh shadows)
- Standard headshot framing — head occupies the upper-middle third
- Single subject, single image, no diptych or split frame
- No text, no labels, no watermarks, no UI annotations

Quality:
- Output should look like a professional consultation preview
- Do NOT enhance, smooth, or stylize the face — keep it naturalistic
- The facial hair texture should match the description; everything else from the reference is preserved`;
}
