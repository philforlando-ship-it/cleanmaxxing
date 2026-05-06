# Cut family reference images

Ten reference images, one per `CutFamily` value in `lib/hair/types.ts`.
The Stage 1 card renders these so the user can see what Mister P is
recommending instead of just reading "Textured Crop / French Crop"
and having to know what that looks like.

## File names (must match exactly)

- `textured_crop.png` (or .jpg / .webp)
- `ivy_league.png`
- `textured_quiff.png`
- `mid_length_textured.png`
- `crew_cut.png`
- `buzz_cut.png`
- `slick_back.png`
- `curtains.png`
- `bald_track.png`
- `clean_shave.png`

The Stage 1 card's image lookup tries `.png` first, then `.jpg`, then
`.webp`. If no image exists, the card stays text-only.

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

## Licensing

Same as face-shapes README. DALL-E 3 / Imagen 3 standard tier grants
commercial rights. Avoid pulling from Google Image Search.

## Image specs

- ~768×768 px or 1024×1024 px (these are larger so detail reads)
- JPG or WebP; PNG fine but heavier
- Keep them under 250 KB each
