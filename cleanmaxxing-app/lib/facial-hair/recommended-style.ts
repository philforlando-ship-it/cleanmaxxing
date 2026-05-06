// Extract the style Mister P recommended from a generated facial-hair
// report. The report-prompt.ts vocabulary block instructs the model to
// pick by label from FACIAL_HAIR_STYLES — so finding the EARLIEST
// occurrence of any of the 12 labels in the report text reliably
// identifies the recommendation. The report's structure puts the
// recommendation in "The next move" section which precedes "What we're
// not doing right now", so first-mention wins isn't a heuristic, it's
// a direct read of the prompt's intent.

import { FACIAL_HAIR_STYLES, type FacialHairStyleSlug } from './types';

export function extractRecommendedStyleSlug(
  reportText: string | null | undefined,
): FacialHairStyleSlug | null {
  if (!reportText) return null;
  const lower = reportText.toLowerCase();

  // Find the earliest occurrence of any style label. When two labels
  // share the same starting index (e.g. "mustache" is a substring of
  // "Chevron mustache"), prefer the LONGEST label so "Chevron mustache"
  // wins over "Classic mustache" in a hypothetically ambiguous match.
  let bestSlug: FacialHairStyleSlug | null = null;
  let bestIndex = Infinity;
  let bestLength = 0;

  for (const style of FACIAL_HAIR_STYLES) {
    const idx = lower.indexOf(style.label.toLowerCase());
    if (idx === -1) continue;
    if (idx < bestIndex || (idx === bestIndex && style.label.length > bestLength)) {
      bestSlug = style.slug;
      bestIndex = idx;
      bestLength = style.label.length;
    }
  }

  return bestSlug;
}
