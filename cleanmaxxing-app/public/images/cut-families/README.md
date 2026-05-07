# Cut family reference images

Reference images (one per `CutFamily` value in `lib/hair/types.ts`)
plus optional `_mature` cohort variants for the balding-friendly subset
and the cross-age modern cuts. The Stage 1 card renders these so the
user can see what Mister P is recommending instead of just reading
"Caesar / Short Forward Crop" and having to know what that looks like.

The cohort filter in `lib/hair/cut-by-age.ts` already gates the
youth-coded cuts (broccoli, wolf_cut, modern_mullet) out of the menu
for users 30+, so those don't need `_mature` variants — the user will
never see them rendered against the mature cohort. The cuts that DO
need both `_young` (default `.png`) and `_mature` variants are the
ones whose image would otherwise miscast the model's age relative to
the user looking at the page.

## File names (must match exactly)

Young cohort (default):

- `caesar.png` — Caesar / Short Forward Crop (balding-friendly)
- `high_taper_crop.png` — High Taper Crop / Modern Skin Fade (balding-friendly)
- `textured_crop.png`
- `ivy_league.png`
- `textured_quiff.png`
- `mid_length_textured.png`
- `crew_cut.png`
- `buzz_cut.png`
- `slick_back.png`
- `slick_back_undercut.png` — Slicked-Back Undercut (Darmody / Shelby) [migration 0077]
- `curtains.png`
- `textured_fringe.png` — Textured Fringe (Shelby Fringe) [migration 0077]
- `overgrown_buzz.png` — Overgrown Buzz [migration 0077]
- `broccoli.png` — Broccoli (Curly Taper) [migration 0077, young cohort only]
- `wolf_cut.png` — Wolf Cut (Shaggy Flow) [migration 0077, young cohort only]
- `modern_mullet.png` — Modern Mullet (Low-Taper) [migration 0077, young cohort only]
- `side_part_combover.png` — Side Part with Comb-Over [migration 0077, mature cohort only]
- `bald_track.png`
- `clean_shave.png`

Mature cohort (~45+) — only the balding-friendly subset, since users 45+ are
most likely to land on these cuts via the density-filtered menu in
`lib/hair/cut-by-density.ts`:

- `caesar_mature.png`
- `high_taper_crop_mature.png`
- `textured_crop_mature.png`
- `crew_cut_mature.png`
- `buzz_cut_mature.png`
- `slick_back_undercut_mature.png` — also valid for 41+; Darmody/Shelby works mature per the 25-50 cohort
- `textured_fringe_mature.png` — works 22-40; the upper edge benefits from a mature model variant
- `overgrown_buzz_mature.png` — cross-age, mature variant for the older cohort
- `side_part_combover_mature.png` — primary cohort for this cut is 35+ so the mature variant is the canonical one

The picker in `app/(app)/plan/hair/stage-1-card.tsx` prefers the
`_mature` variant for users 45+, then falls back to the un-suffixed
file. Lookup order: `.png` → `.jpg` → `.webp`. If no image exists,
the card stays text-only.

## Generation prompts (paste into DALL-E 3 or Imagen 3)

Use a consistent style across all nine so the user is comparing
**cuts**, not attractiveness or model casting. Photoreal is fine here
(unlike face shapes), but keep model framing consistent.

**Common prefix** (use for every prompt):
> Photoreal portrait of a male model in his late 20s with neutral
> expression, head and upper shoulders only, looking forward, plain
> neutral gray studio background, even soft lighting, no styling
> products visible in frame, hair as the only focus. Generate a single
> realistic image. Do not generate multiple variations or split frames.

**Per-cut suffixes:**

- `textured_crop.png`: short textured top about 1.5 inches, light
  forward movement and texture, low taper on the sides, slightly
  fringed front, matte finish.
- `ivy_league.png`: short-to-medium top about 2 inches, side part with
  a clean parted line, classic taper on the sides, low-shine finish,
  preppy / professional look.
- `textured_quiff.png`: top swept up and back with visible volume and
  texture, about 2.5 inches on top, tapered sides, modern men's salon
  styling.
- `mid_length_textured.png`: top length 3 to 4 inches with visible
  texture and a controlled fringe, longer and shaggier than a crop,
  natural fall.
- `crew_cut.png`: short structured top about half an inch, clean tight
  taper on the sides, athletic and uniform, no fringe.
- `buzz_cut.png`: even short clipper length all over, about a number
  2 guard, clean and uniform, no fade.
- `slick_back.png`: medium length top, hair smoothly pushed back and
  slightly up, low-shine to glossy finish, mature professional look.
- `curtains.png`: medium length top with a center part, hair falling
  evenly to either side, soft and slightly youthful look, no taper.
- `bald_track.png`: cleanly shaved head, scalp visible, well-groomed
  short beard or stubble, intentional bald presentation rather than
  in-progress hair loss.
- `clean_shave.png`: razor-smooth shaved head, scalp completely smooth
  and reflective (no stubble visible at all), well-groomed beard or
  short stubble for face-frame contrast, decisive committed bald
  aesthetic — should read as "Bic'd today" not "buzz-cut yesterday."

### 2026 modern set (migration 0077)

- `slick_back_undercut.png`: long top about 3 inches slicked straight
  back with light shine or matte finish, hard contrast on the sides
  with a skin fade or very tight #0/#1 clipper length, no taper line
  blend — distinct from a regular slick back which has even tapered
  sides. Vintage gangster / old-money / Boardwalk Empire register.
- `textured_fringe.png`: medium top about 2 inches with the front
  swept forward as a fringe sitting just over the brow, choppy
  texture, low-mid taper sides (NOT a skin fade), matte finish.
  Distinct from curtains (which is middle-parted with no fringe) and
  textured_crop (which is shorter and pulled higher).
- `overgrown_buzz.png`: about a #4 or #5 guard length on top — longer
  than a true military buzz, shorter than a crew — with very short
  #0/#1 sides, soft natural finish (no styling product visible),
  relaxed/low-maintenance register.
- `broccoli.png`: tight low-mid taper on the sides with curly textured
  volume on top forming a distinctive rounded silhouette, hair clearly
  curly (not just wavy), mid-20s model, neutral expression — should
  read as the cut popularized 2022-2024 without going meme-level
  exaggerated. NO mature cohort variant (age filter excludes broccoli
  for 30+).
- `wolf_cut.png`: shaggy layered top with visible texture and flow,
  mid-length sides that blend rather than fade, slight length at the
  back (mullet-adjacent but not a true mullet), mid-20s model,
  fashion-forward aesthetic. Clearly distinct from slick_back_undercut.
- `modern_mullet.png`: low-taper sides (clean blend, not a fade),
  textured medium length on top, controlled flow at the back about an
  inch longer than the top — distinctly modern, not 80s, no party-in-
  the-back exaggeration. Mid-20s model.
- `side_part_combover.png`: medium top about 2-2.5 inches with a soft
  side part combed across to one side, low taper or scissor-finish
  sides, the combed-over top sized to gently soften an early temple
  recession (the model can show a mild mature hairline). Mid-30s+
  model, professional register, low-shine finish.

## Licensing

Same as face-shapes README. DALL-E 3 / Imagen 3 standard tier grants
commercial rights. Avoid pulling from Google Image Search.

## Image specs

- ~768×768 px or 1024×1024 px (these are larger so detail reads)
- JPG or WebP; PNG fine but heavier
- Keep them under 250 KB each
