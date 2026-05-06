// Try-on transformation prompts. Branches on cut family — the bald-track
// variant uses a different framing (clean-shaved head, beard preserved)
// than the cut-style variants (specific haircut applied, face preserved).
//
// Hard constraints embedded in the prompt:
//   - SAME face: skin tone, eye color, age, identity preserved exactly
//   - Photoreal portrait, neutral framing, even lighting
//   - No artistic interpretation, no "glow up" enhancement of the face
//   - Single subject, no diptych

import { CUT_FAMILY_LABEL, type CutFamily } from '../types';

export function buildTryOnPrompt(args: {
  cutFamily: CutFamily;
  barberText: string;
}): string {
  if (args.cutFamily === 'bald_track' || args.cutFamily === 'clean_shave') {
    // Both bald presentations route to the bald-track prompt (the
    // image generator can't meaningfully distinguish "razor smooth"
    // from "tight buzz" at preview resolution; what matters is "no
    // hair on top, preserve everything else").
    return buildBaldTrackPrompt(args.barberText);
  }
  return buildCutFamilyPrompt(args.cutFamily, args.barberText);
}

function buildCutFamilyPrompt(
  cutFamily: CutFamily,
  barberText: string,
): string {
  const familyLabel = CUT_FAMILY_LABEL[cutFamily];
  return `Generate a photoreal portrait of the person in the reference image with a different hairstyle. This is a haircut consultation preview.

CRITICAL — preserve identity:
- Same face geometry, same skin tone, same eye color, same age
- Same facial hair (beard / stubble / clean-shaven — match the reference exactly)
- Same overall identity. The output must clearly read as the SAME PERSON.

ONLY change the hair on top of the head. The new hairstyle is:

${familyLabel}

Specific styling:
${barberText}

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
- The hair texture should match the cut description; everything else from the reference is preserved`;
}

function buildBaldTrackPrompt(barberText: string): string {
  return `Generate a photoreal portrait of the person in the reference image with a cleanly shaved head. This is a "what would the bald look look like" preview.

CRITICAL — preserve identity:
- Same face geometry, same skin tone, same eye color, same age
- Same overall identity. The output must clearly read as the SAME PERSON.

Hair:
- Cleanly shaved head, scalp visible, no hair on top
- The shave should look intentional and well-groomed (clean lines, no patchiness)

Facial hair:
- If the reference photo shows a beard or stubble, KEEP it. Match the existing facial hair exactly.
- If the reference photo is clean-shaven, KEEP that — do not add facial hair.
- The bald-track guidance from the cut recommendation is informational only; do not alter the facial hair from what's in the photo.

Reference cut guidance (informational — preserve the photo's actual facial hair regardless):
${barberText}

Composition:
- Photoreal portrait, head and upper shoulders only, looking forward
- Neutral light gray studio background
- Even soft lighting (no harsh shadows that exaggerate scalp shape)
- Standard headshot framing — head occupies the upper-middle third
- Single subject, single image, no diptych or split frame
- No text, no labels, no watermarks, no UI annotations

Quality:
- Output should look like a professional consultation preview
- Do NOT enhance, smooth, or stylize the face — keep it naturalistic`;
}
