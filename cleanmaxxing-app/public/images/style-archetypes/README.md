# Style archetype reference images

Twelve reference images — one per `StyleArchetype` value in
`lib/style/types.ts`, doubled across two age cohorts (`young` ~28,
`mature` ~45). The Stage cards on `/plan/style` render these so the
user can see what their `target_archetype` looks like in real life
instead of just reading "Clean minimalist."

The component picks the right cohort based on the user's age. The
mature cohort is the default at 45+, the young cohort otherwise.
This mirrors the planned older-man variant set for cut-families
(see `project_age_diverse_cut_family_photos.md` in memory): the
audience for any aesthetic plan skews older than the reference
photos imply, and visual representation matters for the user's
"is this for me?" read.

## File names (must match exactly)

Pattern: `{archetype}_{cohort}.png` where cohort is `young` or `mature`.

Young cohort (~28):
- `clean_minimalist_young.png`
- `athletic_casual_young.png`
- `rugged_masculine_young.png`
- `mature_professional_young.png`
- `streetwear_young.png`
- `creative_eclectic_young.png`

Mature cohort (~45):
- `clean_minimalist_mature.png`
- `athletic_casual_mature.png`
- `rugged_masculine_mature.png`
- `mature_professional_mature.png`
- `streetwear_mature.png`
- `creative_eclectic_mature.png`

The Stage card's image lookup tries `.png` first, then `.jpg`, then
`.webp`. If no image exists, the card stays text-only.

## Generation

Run `npm run generate-style-images` to generate the full set
(~$0.48 on DALL-E 3 standard). The script reads `OPENAI_API_KEY`
from `.env.local` and skips files that already exist. See
`scripts/generate-style-images.ts` for prompt details.

Cohort flags:
- `npm run generate-style-images -- --only=young`
- `npm run generate-style-images -- --only=mature`

The prompts are kept in lockstep with this file. If you edit one,
edit the other so docs and behavior don't drift.

## Composition

Three-quarter length (head to mid-thigh visible) on a plain neutral
light-grey studio background. The outfit is the focus, not the face
or hair — distinct from the cut-families set, which is head and
shoulders only.

## Licensing

DALL-E 3 / gpt-image-1 standard tier grants commercial rights. Avoid
pulling images from Google Image Search.

## Image specs

- 1024×1024 px square (default)
- PNG returned by the API; compress if size matters
