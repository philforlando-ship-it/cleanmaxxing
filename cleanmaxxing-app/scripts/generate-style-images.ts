/**
 * Batch-generate style archetype reference images via the OpenAI Images
 * API. One image per archetype per age cohort:
 *
 *   public/images/style-archetypes/{archetype}_young.png    (~28)
 *   public/images/style-archetypes/{archetype}_mature.png   (~45)
 *
 * The /plan/style stage cards pick the right cohort based on the user's
 * age — same pattern as the planned cut-families older-man variant set.
 *
 * Generates only files that don't already exist. Re-run safely.
 *
 * Usage:
 *   npm run generate-style-images
 *   npm run generate-style-images -- --only=young
 *   npm run generate-style-images -- --only=mature
 *   npm run generate-style-images -- --force            # re-generate existing
 *   npm run generate-style-images -- --model=gpt-image-1 --quality=high
 *
 * Cost (default DALL-E 3 standard, 1024x1024):
 *   $0.04 per image x 12 images = ~$0.48 total for the full set.
 *
 * Reads OPENAI_API_KEY from .env.local (loaded via dotenv preload in
 * the package.json script command).
 */

import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import OpenAI from 'openai';

// ==========================================
// Prompts — kept in lockstep with the README in
// public/images/style-archetypes/. If you edit one, edit the other so
// docs and behavior don't drift.
// ==========================================

// Frame rules shared across both age cohorts. Style images need to show
// the OUTFIT, not just the head — three-quarter length, neutral
// background, even lighting. Avoiding fashion-magazine framing tropes
// (severe poses, dramatic shadows) because the goal is "this is what
// the archetype looks like in real life," not aspirational editorial.
const SHARED_RULES = `Composition rules (strict):
- Subject standing relaxed and forward-facing, three-quarter length composition (head to mid-thigh visible).
- Centered horizontally in the frame.
- Plain neutral light-grey studio background, no props, no furniture.
- Even soft lighting, no dramatic shadows or backlight.

Frame rules (strict):
- ONE photograph fills the entire output.
- No diptych, no split frame, no before/after, no comparison shot, no side-by-side, no grid, no collage, no multiple poses.
- No text, no labels, no annotations, no watermarks.
- Single subject, single composition, single image.

Avoid: fashion-magazine editorial poses, runway styling, fashion-week aesthetic, exaggerated proportions, model-agency portfolio look. The image should read as a real well-dressed man, not as a fashion photograph.`;

const YOUNG_PREFIX = `Photoreal three-quarter-length portrait of a SINGLE male model in his late 20s, athletic-but-not-extreme build, neutral expression, looking forward, no visible logos or branding on any clothing.

${SHARED_RULES}`;

const MATURE_PREFIX = `Photoreal three-quarter-length portrait of a SINGLE male model in his mid-40s, naturally aging well — real-looking face, slight gray at the temples acceptable, no cosmetic enhancement, no obviously young features. Neutral expression, looking forward, no visible logos or branding on any clothing.

${SHARED_RULES}`;

type Archetype =
  | 'clean_minimalist'
  | 'athletic_casual'
  | 'rugged_masculine'
  | 'mature_professional'
  | 'streetwear'
  | 'creative_eclectic';

const ARCHETYPE_OUTFITS: ReadonlyArray<{
  archetype: Archetype;
  suffix: string;
}> = [
  {
    archetype: 'clean_minimalist',
    suffix:
      'Outfit: well-fitted plain white crew-neck t-shirt, slim dark indigo jeans tapered slightly to ankle, minimal white leather sneakers. Neutral palette only — white, dark navy, white. No accessories beyond a simple watch. The outfit reads effortless and put-together.',
  },
  {
    archetype: 'athletic_casual',
    suffix:
      'Outfit: fitted heather-grey performance crew-neck t-shirt that subtly shows defined shoulders and chest, slim charcoal athletic-cut chinos that taper, minimal black-and-white low-top sneakers. Slight visible V-taper. The outfit reads active and health-conscious without being gym wear.',
  },
  {
    archetype: 'rugged_masculine',
    suffix:
      'Outfit: heavyweight olive-green long-sleeve henley with two buttons unfastened, dark raw-denim selvage jeans straight cut, brown leather lace-up work boots. Earth-tone palette. The build is grounded and sturdy. No accessories beyond a leather strap watch. The outfit reads rooted and confident.',
  },
  {
    archetype: 'mature_professional',
    suffix:
      'Outfit: unstructured navy wool blazer over a fitted plain white t-shirt or fine-gauge merino crewneck, tailored mid-grey wool trousers with a slight taper, dark brown leather loafers or minimal leather sneakers. The blazer fits cleanly without straining at the chest. The outfit reads adult, considered, and understated. Suitable for a mid-30s-and-up register.',
  },
  {
    archetype: 'streetwear',
    suffix:
      'Outfit: contemporary urban styling — boxy but intentional fit. Black premium-cotton oversized t-shirt with structured shoulders (no graphics or logos), wide-leg dark indigo denim with a slight crop, chunky white-and-cream low-top sneakers. Possibly a thin gold chain. The outfit reads contemporary and visually deliberate without being costumey.',
  },
  {
    archetype: 'creative_eclectic',
    suffix:
      'Outfit: layered and expressive but coherent. Cream loose-knit crewneck sweater over a slate-blue oxford shirt with collar exposed, pleated wool trousers in earth-toned brown, dark leather derby shoes. Possibly a textured scarf in the hand or thin frame glasses. Mixed textures. The outfit reads as someone with a clear point of view, artistic but not chaotic.',
  },
];

// ==========================================
// CLI args
// ==========================================

type Cohort = 'young' | 'mature';

type Args = {
  only: Cohort | 'all';
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
      if (v === 'young' || v === 'mature') args.only = v;
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
  filename: string,
  suffix: string,
): Promise<GenerationResult> {
  const outPath = join(outDir, filename);
  if (!args.force && (await fileExists(outPath))) {
    return { ok: 'skipped', filename };
  }

  const prompt = `${prefix}\n\n${suffix}`;

  try {
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
      requestParams.quality = args.quality;
      requestParams.response_format = 'b64_json';
    } else if (args.model === 'gpt-image-1') {
      requestParams.quality = args.quality;
    }
    const result = (await client.images.generate(
      requestParams as Parameters<typeof client.images.generate>[0],
    )) as { data?: Array<{ b64_json?: string | null }> };

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      return { ok: false, filename, error: 'No b64_json in response' };
    }
    const buffer = Buffer.from(b64, 'base64');
    await writeFile(outPath, buffer);
    return { ok: true, filename, bytes: buffer.length };
  } catch (err) {
    return { ok: false, filename, error: (err as Error).message };
  }
}

async function runBatch(
  client: OpenAI,
  args: Args,
  cohort: Cohort,
  outDir: string,
): Promise<void> {
  const prefix = cohort === 'young' ? YOUNG_PREFIX : MATURE_PREFIX;
  const label = cohort === 'young' ? 'Archetypes (young, ~28)' : 'Archetypes (mature, ~45)';

  console.log(`\n━━━ ${label} (${ARCHETYPE_OUTFITS.length}) ━━━`);
  await mkdir(outDir, { recursive: true });

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of ARCHETYPE_OUTFITS) {
    const filename = `${item.archetype}_${cohort}.png`;
    process.stdout.write(`  ${filename} … `);
    const result = await generateOne(
      client,
      args,
      outDir,
      prefix,
      filename,
      item.suffix,
    );
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
    // 1-second pause between requests to stay clear of any per-second
    // rate-limit boundary on the images endpoint.
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
  const outDir = join(repoRoot, 'public', 'images', 'style-archetypes');

  console.log(
    `model=${args.model}, quality=${args.quality}, size=${args.size}, force=${args.force}`,
  );

  if (args.only === 'young' || args.only === 'all') {
    await runBatch(client, args, 'young', outDir);
  }
  if (args.only === 'mature' || args.only === 'all') {
    await runBatch(client, args, 'mature', outDir);
  }

  console.log('\nDone. Reload /plan/style to see the images render.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
