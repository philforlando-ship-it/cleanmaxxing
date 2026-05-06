/**
 * Batch-generate the face shape + cut family reference images via the
 * OpenAI Images API.
 *
 * Generates only files that don't already exist. Re-run safely — finished
 * images are never overwritten unless you pass --force or delete them
 * yourself first.
 *
 * Usage:
 *   npm run generate-hair-images
 *   npm run generate-hair-images -- --only=face-shapes
 *   npm run generate-hair-images -- --only=cut-families
 *   npm run generate-hair-images -- --force            # re-generate existing
 *   npm run generate-hair-images -- --model=gpt-image-1 --quality=high
 *
 * Cost (default DALL-E 3 standard, 1024x1024):
 *   $0.04 per image × 14 images = ~$0.56 total for the full set.
 *
 * Cost (gpt-image-1 medium):
 *   $0.042 per image × 14 = ~$0.59. Better at consistency across the
 *   series — worth the marginal cost for the cut family portraits.
 *
 * Reads OPENAI_API_KEY from .env.local (loaded via dotenv preload in the
 * package.json script command).
 */

import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import OpenAI from 'openai';

// ==========================================
// Prompts — kept in lockstep with the README files in
// public/images/face-shapes/ and public/images/cut-families/. If you
// edit one, edit the other so docs and behavior don't drift.
// ==========================================

// All five face shapes are independent gpt-image-1 generations using
// this prefix — sharing one prefix is what gives the series whatever
// consistency it has. (Reference-based generation via images.edit was
// blocked by an org-verification gate on this account; see the runBatch
// call in main().) Avoid framing words like "blueprint" or "engineering
// diagram" — DALL-E interprets those as a license to add construction
// lines, grid marks, axes, and rulers.
const FACE_SHAPE_PREFIX = `Clean line illustration of a male face outline viewed straight on. Black 2-pixel uniform stroke weight on pure white background. Wireframe-style outline only — no fill, no shading.

Draw exactly these elements as outlines:
- Head shape (the dominant feature — this is what differs across the series)
- Hairline
- Eyebrows (simple short curves)
- Simple centered nose outline (bridge + tip only, two short lines)
- Jawline

Do NOT draw: eyes, mouth, ears, neck, hair texture, any shading or fill.

Do NOT include any of: grid lines, construction lines, measurement marks, ruler ticks, axes, diagonal reference lines, horizontal reference lines, dashed reference lines, dimension annotations, labels, text, watermarks. The background is pure white with NOTHING on it except the centered face outline.

Symmetrical. Centered horizontally and vertically with even margin on all sides. Style is a vector character outline or self-assessment reference, not a technical drawing.`;

// (Reference-based edit prompt removed. The runFaceShapesWithReference
// path was removed because images.edit with gpt-image-1 requires org
// verification this account doesn't have. See runBatch comment in
// main() for the current generation flow.)

const FACE_SHAPES: ReadonlyArray<{ filename: string; suffix: string }> = [
  {
    filename: 'oval.png',
    suffix:
      'Face slightly longer than wide, forehead and jaw roughly equal width, gently rounded chin, balanced proportions.',
  },
  {
    filename: 'round.png',
    suffix:
      'Face width and height roughly equal, soft jaw line, fuller cheeks, no sharp angles.',
  },
  {
    filename: 'square.png',
    suffix:
      'Forehead and jaw roughly the same width, jaw line visibly angular, strong horizontal lower-third, vertical and horizontal proportions roughly equal.',
  },
  {
    filename: 'long_rectangular.png',
    suffix:
      'Face clearly taller than wide, straight cheek lines, jaw line visible but not flared.',
  },
  {
    filename: 'heart_triangle.png',
    suffix:
      'Forehead clearly wider than the jaw, narrow pointed chin, cheekbones visible.',
  },
];

const CUT_FAMILY_PREFIX = `Photoreal portrait of a SINGLE male model in his late 20s with neutral expression, head and upper shoulders only, looking forward, plain neutral gray studio background, even soft lighting, no styling products visible in frame, hair as the only focus.

Composition rules (strict):
- Subject is centered horizontally in the frame.
- Head occupies the upper-middle third of the composition.
- Head and shoulders together fill roughly 60% of the image area — not a tight zoom, not a distant shot.
- Camera distance: standard portrait headshot, like a professional ID photo.

Frame rules (strict):
- ONE photograph fills the entire output.
- No diptych, no split frame, no before/after, no comparison shot, no side-by-side, no grid, no collage, no multiple poses.
- No text, no labels, no annotations, no watermarks.
- Single subject, single composition, single image.`;

const CUT_FAMILIES: ReadonlyArray<{ filename: string; suffix: string }> = [
  {
    filename: 'textured_crop.png',
    suffix:
      'Short textured top about 1.5 inches, light forward movement and texture, low taper on the sides, slightly fringed front, matte finish.',
  },
  {
    filename: 'ivy_league.png',
    suffix:
      'Short-to-medium top about 2 inches, deep clean side part with a defined parted line, classic taper on the sides, low-shine matte finish, conservative business cut. Avoid any college campus or graduation imagery context.',
  },
  {
    filename: 'textured_quiff.png',
    suffix:
      'Top swept up and back with visible volume and texture, about 2.5 inches on top, tapered sides, modern men\'s salon styling.',
  },
  {
    filename: 'mid_length_textured.png',
    suffix:
      'Top length 3 to 4 inches with visible texture and a controlled fringe, longer and shaggier than a crop, natural fall.',
  },
  {
    filename: 'crew_cut.png',
    suffix:
      'Short structured top about half an inch, clean tight taper on the sides, athletic and uniform, no fringe.',
  },
  {
    filename: 'buzz_cut.png',
    suffix:
      'Even short clipper length all over, about a number 2 guard, clean and uniform, no fade.',
  },
  {
    filename: 'slick_back.png',
    suffix:
      'Medium length top, hair smoothly pushed back and slightly up, low-shine to glossy finish, mature professional look.',
  },
  {
    filename: 'curtains.png',
    suffix:
      'Medium length top with a center part, hair falling evenly to either side, soft and slightly youthful look, no taper.',
  },
  {
    filename: 'bald_track.png',
    suffix:
      'Cleanly shaved head, scalp visible, well-groomed short beard or stubble, intentional bald presentation rather than in-progress hair loss.',
  },
  {
    filename: 'clean_shave.png',
    suffix:
      'Razor-smooth shaved head, scalp completely smooth and reflective with no visible stubble or hair length, well-groomed beard or short stubble for face-frame contrast, decisive committed bald aesthetic, sharp and intentional rather than transitional.',
  },
];

// ==========================================
// CLI args
// ==========================================

type Args = {
  only: 'face-shapes' | 'cut-families' | 'all';
  force: boolean;
  model: string;
  quality: string;
  size: string;
};

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {
    only: 'all',
    force: false,
    model: 'dall-e-3',
    quality: 'standard',
    size: '1024x1024',
  };
  for (const arg of argv) {
    if (arg === '--force') args.force = true;
    else if (arg.startsWith('--only=')) {
      const v = arg.slice('--only='.length);
      if (v === 'face-shapes' || v === 'cut-families') args.only = v;
    } else if (arg.startsWith('--model=')) {
      args.model = arg.slice('--model='.length);
    } else if (arg.startsWith('--quality=')) {
      args.quality = arg.slice('--quality='.length);
    } else if (arg.startsWith('--size=')) {
      args.size = arg.slice('--size='.length);
    }
  }
  return args;
}

// ==========================================
// Generation
// ==========================================

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

type GenerationResult =
  | { ok: true; filename: string; bytes: number }
  | { ok: false; filename: string; error: string }
  | { ok: 'skipped'; filename: string };

async function generateOne(
  client: OpenAI,
  args: Args,
  outDir: string,
  prefix: string,
  item: { filename: string; suffix: string },
): Promise<GenerationResult> {
  const outPath = join(outDir, item.filename);
  if (!args.force && (await fileExists(outPath))) {
    return { ok: 'skipped', filename: item.filename };
  }

  const prompt = `${prefix}\n\n${item.suffix}`;

  try {
    // gpt-image-1 always returns base64; dall-e-3 needs the explicit
    // response_format. The SDK accepts both transparently when we ask
    // for b64_json, so use it uniformly.
    type ImageRequest = {
      model: string;
      prompt: string;
      size: string;
      n: number;
      quality?: string;
      response_format?: string;
    };
    const requestParams: ImageRequest = {
      model: args.model,
      prompt,
      size: args.size,
      n: 1,
    };
    if (args.model === 'dall-e-3') {
      requestParams.quality = args.quality; // 'standard' | 'hd'
      requestParams.response_format = 'b64_json';
    } else if (args.model === 'gpt-image-1') {
      requestParams.quality = args.quality; // 'low' | 'medium' | 'high' | 'auto'
    }
    const result = (await client.images.generate(
      requestParams as Parameters<typeof client.images.generate>[0],
    )) as { data?: Array<{ b64_json?: string | null }> };

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return {
        ok: false,
        filename: item.filename,
        error: 'No b64_json in response',
      };
    }
    const buffer = Buffer.from(b64, 'base64');
    await writeFile(outPath, buffer);
    return { ok: true, filename: item.filename, bytes: buffer.length };
  } catch (err) {
    return {
      ok: false,
      filename: item.filename,
      error: (err as Error).message,
    };
  }
}

// We TRIED a reference-based approach (anchor + images.edit variants)
// for face shape consistency, but the edit endpoint requires either
// org verification for gpt-image-1 or a downgrade to dall-e-2 (which
// produces lower-quality output). For accounts without that access,
// the next-best approach is independent generation via gpt-image-1
// with a tight schematic-diagram prompt — the model follows specific
// style instructions much more reliably than dall-e-3, even without
// reference images. Cut families stay on dall-e-3 since model identity
// across cuts isn't a useful kind of consistency.

async function runBatch(
  client: OpenAI,
  args: Args,
  label: string,
  outDir: string,
  prefix: string,
  items: ReadonlyArray<{ filename: string; suffix: string }>,
): Promise<void> {
  console.log(`\n━━━ ${label} (${items.length}) ━━━`);
  await mkdir(outDir, { recursive: true });

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    process.stdout.write(`  ${item.filename} … `);
    const result = await generateOne(client, args, outDir, prefix, item);
    if (result.ok === true) {
      console.log(`✓ saved (${(result.bytes / 1024).toFixed(0)} KB)`);
      generated++;
    } else if (result.ok === 'skipped') {
      console.log('— exists, skipped');
      skipped++;
    } else {
      console.log(`✗ ${result.error}`);
      failed++;
    }
    // 1-second pause between requests to stay well clear of any
    // per-second rate-limit boundary on the images endpoint.
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(
    `  → generated ${generated}, skipped ${skipped}, failed ${failed}`,
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!process.env.OPENAI_API_KEY) {
    console.error(
      'OPENAI_API_KEY not set. Add it to .env.local (the package.json script preloads dotenv).',
    );
    process.exit(1);
  }

  const client = new OpenAI();
  const repoRoot = process.cwd();

  console.log(
    `model=${args.model}, quality=${args.quality}, size=${args.size}, force=${args.force}`,
  );

  if (args.only === 'face-shapes' || args.only === 'all') {
    // Face shapes use gpt-image-1 (medium quality) regardless of the
    // --model arg, because the schematic-diagram style needs the
    // newer model's stronger prompt adherence. Cut families honor the
    // CLI arg.
    await runBatch(
      client,
      { ...args, model: 'gpt-image-1', quality: 'medium' },
      'Face shapes',
      join(repoRoot, 'public', 'images', 'face-shapes'),
      FACE_SHAPE_PREFIX,
      FACE_SHAPES,
    );
  }

  if (args.only === 'cut-families' || args.only === 'all') {
    await runBatch(
      client,
      args,
      'Cut families',
      join(repoRoot, 'public', 'images', 'cut-families'),
      CUT_FAMILY_PREFIX,
      CUT_FAMILIES,
    );
  }

  console.log('\nDone. Reload /plan/hair to see the images render.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
