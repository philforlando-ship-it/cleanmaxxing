# Face shape reference images

Five reference images, one per `FaceShape` value in `lib/hair/types.ts`.
The assessment form renders these next to the labels so users can match
themselves visually rather than parsing prose definitions.

## File names (must match exactly)

- `oval.png` (or .jpg / .webp)
- `round.png`
- `square.png`
- `long_rectangular.png`
- `heart_triangle.png`

The form's image lookup tries `.png` first, then `.jpg`, then `.webp`.
If no image exists for a shape, the form falls back to text-only
(current behavior). Drop in any subset and the others stay text-only.

## Generation prompts (paste into DALL-E 3 or Imagen 3)

Use a consistent style across all five so the user is comparing
**shape**, not attractiveness. Neutral male reference, illustrated /
vector style preferred over photoreal.

**Common prefix** (use for every prompt):
> Minimalist black-and-white line illustration of a male face viewed
> straight on, head only, no neck or shoulders, neutral expression,
> short hair pulled back so the face outline is fully visible, no
> facial hair, simple line weight, white background, illustrated
> reference style suitable for a self-assessment quiz.

**Per-shape suffixes:**

- `oval.png`: face slightly longer than wide, forehead and jaw roughly
  equal width, gently rounded chin, balanced proportions.
- `round.png`: face width and height roughly equal, soft jaw line,
  fuller cheeks, no sharp angles.
- `square.png`: forehead and jaw roughly the same width, jaw line
  visibly angular, strong horizontal lower-third, vertical and
  horizontal proportions roughly equal.
- `long_rectangular.png`: face clearly taller than wide, straight
  cheek lines, jaw line visible but not flared.
- `heart_triangle.png`: forehead clearly wider than the jaw, narrow
  pointed chin, cheekbones visible.

## Licensing

If you use DALL-E 3 (OpenAI) or Imagen 3 (Google) at standard tier,
you own the output and can use commercially. Midjourney requires a
paid plan for commercial use. Avoid stock photo sites unless you have
a verified license — Getty / Adobe Stock have reverse-image-search
enforcement.

## Image specs

- ~512×512 px is plenty
- PNG with transparent background is ideal but JPG is fine
- Keep them under 100 KB each — the assessment form loads all five at
  once
