/**
 * Batch-generate the food catalog reference images via the OpenAI
 * Images API. Mirrors generate-hair-images.ts in shape and behavior.
 *
 * Generates only files that don't already exist. Re-run safely —
 * finished images are never overwritten unless you pass --force.
 *
 * Usage:
 *   npm run generate-food-images
 *   npm run generate-food-images -- --force
 *   npm run generate-food-images -- --model=dall-e-3 --quality=standard
 *
 * Cost (default gpt-image-1 medium, 1024x1024):
 *   ~$0.042 per image × ~75 images ≈ $3.15 total for the full set.
 *
 * Reads OPENAI_API_KEY from .env.local (loaded via dotenv preload in
 * the package.json script command).
 *
 * The food slugs are imported from lib/nutrition/types.ts so this
 * script stays in lockstep with the catalog. Adding a new food to
 * the catalog is sufficient — re-running this script picks it up.
 */

import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import OpenAI from 'openai';
import { FOODS } from '../lib/nutrition/types';

// ==========================================
// Prompts
// ==========================================
//
// One stable prefix shared across the catalog gives the series
// whatever consistency it has. Per-food suffix names the food
// concretely so the model produces the right item.
//
// Avoid framing words that DALL-E / gpt-image-1 over-interprets:
//   "stylized" → adds illustration; "minimal" → adds white space
//   that isn't centered; "studio shot" → adds floor seamless
//   horizon line that fights tight compositions.
// ==========================================

const FOOD_PREFIX = `Photoreal close-up product photography of a single food item on a clean light-gray seamless backdrop. Shot from a slight three-quarter angle from above. Professional food photography lighting — soft, even, no harsh shadows. Color-accurate, appetizing but unstyled. The food is centered horizontally and vertically and fills roughly 60% of the frame with even margin on all sides.

Composition rules (strict):
- ONE photograph fills the entire output.
- No diptych, no split frame, no comparison shot, no side-by-side, no grid, no collage.
- No text, no labels, no packaging, no brand markings, no watermarks, no nutrition facts panels.
- No hands, no people, no cutlery interacting with the food.
- No plates with text or pattern; if a plate is needed, plain white ceramic only.

Single food item, single composition, single image.`;

// Per-food suffix. Where the slug is ambiguous or could read as
// raw vs. cooked / packaged vs. plated, the suffix says explicitly.
const FOOD_SUFFIX: Record<string, string> = {
  // ============ Proteins
  chicken_breast: 'A grilled boneless skinless chicken breast, sliced once across the grain, cooked golden, no sauce or garnish.',
  chicken_thigh: 'Two grilled boneless skinless chicken thighs, golden-brown sear marks visible, no sauce.',
  turkey_breast: 'Sliced roasted turkey breast, several thin slices fanned slightly, no gravy or garnish.',
  lean_ground_turkey: 'Cooked lean ground turkey, browned and crumbled, served plain in a small white bowl.',
  sirloin_steak: 'A medium-rare sirloin steak, seared crust visible, sliced into three pieces.',
  lean_ground_beef: 'Cooked browned ground beef, crumbled, served plain in a small white bowl.',
  bison: 'A medium-rare grilled bison steak, sliced into three pieces, deep red interior visible.',
  salmon: 'A pan-seared salmon fillet with crispy skin, no sauce, no lemon, no garnish.',
  tuna: 'A small mound of canned tuna chunks in a small white bowl, plain, no mayo or dressing.',
  white_fish: 'A pan-seared white fish fillet (cod or tilapia), plain, no sauce or garnish.',
  shrimp: 'Six grilled cooked shrimp, peeled, arranged in a small cluster, no sauce.',
  whole_eggs: 'Three sunny-side-up whole eggs on a plain white plate, yolks intact and bright, no toast or garnish.',
  egg_whites: 'Cooked plain scrambled egg whites in a small white bowl, no garnish.',
  greek_yogurt_nonfat: 'A small bowl of plain thick Greek yogurt, no toppings, surface smooth and matte.',
  cottage_cheese: 'A small bowl of plain cottage cheese, distinct curds visible, no toppings.',
  whey_protein: 'A clear glass mixing shaker with chocolate-colored protein shake, no labeled bottle in frame, no scoop.',
  tofu: 'Several pan-seared cubes of firm tofu with a light golden crust, plain, no sauce.',
  tempeh: 'Several pan-seared slices of tempeh, golden-brown, plain, no sauce.',
  edamame: 'A small bowl of steamed edamame pods, lightly salted, no other ingredients.',
  lentils: 'A small bowl of plain cooked brown lentils, no spices or garnish visible.',
  black_beans: 'A small bowl of plain cooked black beans, no sauce or seasoning visible.',
  pea_protein: 'A clear glass mixing shaker with off-white pea protein shake, no labeled bottle in frame.',

  // ============ Complex carbs
  white_rice: 'A small bowl of plain cooked white jasmine rice, fluffy and separate grains.',
  brown_rice: 'A small bowl of plain cooked brown rice, distinct grains visible.',
  rolled_oats: 'A small bowl of plain cooked rolled oats, creamy texture, no toppings or garnish.',
  sweet_potato: 'A baked sweet potato cut in half, orange flesh visible, no butter or topping.',
  white_potato: 'A baked russet potato cut in half, white flesh visible, no butter or topping.',
  quinoa: 'A small bowl of plain cooked quinoa, fluffy and pale, no garnish.',
  whole_grain_pasta: 'A small bowl of plain cooked whole grain penne pasta, no sauce.',
  sourdough_bread: 'Two slices of sourdough bread on a plain white plate, no butter or topping.',
  corn_tortillas: 'A small stack of three plain corn tortillas on a plain white plate.',
  whole_wheat_tortillas: 'A small stack of three plain whole wheat tortillas on a plain white plate.',
  farro: 'A small bowl of plain cooked farro, distinct chewy grains visible, no garnish.',
  chickpeas: 'A small bowl of plain cooked chickpeas, no sauce or seasoning.',

  // ============ Fruits
  banana: 'A single ripe yellow banana, slightly curved, on a plain light-gray surface.',
  apple: 'A single red apple, stem visible, on a plain light-gray surface.',
  berries: 'A small bowl of mixed fresh berries — blueberries, raspberries, strawberries — no whipped cream or garnish.',
  orange: 'A single whole navel orange, on a plain light-gray surface.',
  grapes: 'A small bunch of fresh red grapes, stems visible, on a plain light-gray surface.',
  melon: 'Several cubes of fresh cantaloupe melon in a small white bowl.',
  pineapple: 'Several fresh pineapple chunks in a small white bowl.',
  mango: 'Several fresh mango cubes in a small white bowl, vivid orange color.',
  kiwi: 'A single kiwi cut in half showing green flesh, on a plain light-gray surface.',
  dates: 'Six whole medjool dates in a small cluster, dark brown and slightly wrinkled.',

  // ============ Veggies
  broccoli: 'Several florets of plain steamed broccoli on a plain white plate, vivid green, no sauce.',
  cauliflower: 'Several florets of plain steamed cauliflower on a plain white plate, no sauce.',
  spinach: 'A small mound of fresh raw baby spinach leaves on a plain white plate.',
  kale: 'A small mound of fresh raw kale leaves on a plain white plate.',
  mixed_greens: 'A small mound of mixed salad greens (arugula, romaine, baby greens) on a plain white plate, no dressing.',
  bell_peppers: 'Three whole bell peppers — red, yellow, green — on a plain light-gray surface.',
  onions: 'A single whole yellow onion next to one half-cut showing rings, on a plain light-gray surface.',
  zucchini: 'Two whole green zucchini, on a plain light-gray surface.',
  asparagus: 'A small bundle of fresh green asparagus spears, on a plain light-gray surface.',
  mushrooms: 'A small pile of whole white button mushrooms on a plain light-gray surface.',
  cucumber: 'A whole cucumber next to several round slices, on a plain light-gray surface.',
  tomatoes: 'Three ripe red tomatoes on a plain light-gray surface.',
  green_beans: 'A small mound of fresh green beans on a plain white plate, no sauce.',
  brussels_sprouts: 'A small mound of plain roasted Brussels sprouts on a plain white plate, no sauce.',
  carrots: 'Three whole orange carrots with green tops trimmed short, on a plain light-gray surface.',

  // ============ Fats
  olive_oil: 'A small clear glass cruet of golden-green extra-virgin olive oil, no label, on a plain light-gray surface.',
  avocado_oil: 'A small clear glass cruet of pale yellow-green avocado oil, no label, on a plain light-gray surface.',
  avocado: 'A whole ripe avocado next to one half-cut showing green flesh and the pit, on a plain light-gray surface.',
  almonds: 'A small bowl of whole raw almonds.',
  walnuts: 'A small bowl of shelled walnut halves.',
  peanut_butter: 'A small spoonful of natural peanut butter on a plain white plate, no jar in frame, no label.',
  almond_butter: 'A small spoonful of natural almond butter on a plain white plate, no jar in frame, no label.',
  cheese: 'Three small cubes of yellow cheddar cheese on a plain white plate.',
  butter: 'A small white ramekin with a pat of golden butter inside, no bread or knife in frame.',
  tahini: 'A small bowl of pale beige tahini paste, smooth surface, no garnish.',
  dark_chocolate: 'Three squares of dark chocolate (85% cacao), on a plain light-gray surface, no wrapper.',

  // ============ Snacks
  snack_greek_yogurt: 'A small white ceramic cup of plain thick Greek yogurt with a sprinkle of fresh berries on top.',
  snack_jerky: 'Five strips of dark brown beef jerky on a plain light-gray surface, no packaging.',
  snack_hard_boiled_eggs: 'Three peeled hard-boiled eggs on a plain white plate, one cut in half showing yolk.',
  snack_cottage_cheese: 'A small white bowl of cottage cheese topped with a few fresh berries.',
  snack_mixed_nuts: 'A small bowl of mixed nuts — almonds, walnuts, cashews — no salt visible.',
  snack_trail_mix: 'A small bowl of trail mix — mixed nuts, raisins, dark chocolate chips.',
  snack_fruit_nut_butter: 'Three apple slices arranged next to a small ramekin of peanut butter, on a plain white plate.',
  snack_hummus_veggies: 'A small white bowl of plain hummus surrounded by carrot sticks and cucumber slices on a plain white plate.',
  snack_protein_bar: 'A single unwrapped chocolate-coated protein bar on a plain light-gray surface, no packaging visible.',
  snack_protein_shake: 'A clear glass with chocolate-colored protein shake, no labeled bottle in frame.',
  snack_smoothie: 'A clear glass with a thick mixed-berry smoothie, vivid pink-purple color, no straw, no garnish.',
  snack_edamame: 'A small white bowl of steamed edamame pods, lightly salted.',
};

// ==========================================
// CLI args (mirrors generate-hair-images.ts)
// ==========================================

type Args = {
  force: boolean;
  model: string;
  quality: string;
  size: string;
  // Optional comma-separated slug filter, e.g. --only=salmon,chicken_breast
  // Useful for re-rolling a specific food whose first generation came
  // out wrong without re-running the whole catalog.
  only: string[] | null;
};

function parseArgs(argv: readonly string[]): Args {
  const args: Args = {
    force: false,
    model: 'gpt-image-1',
    quality: 'medium',
    size: '1024x1024',
    only: null,
  };
  for (const arg of argv) {
    if (arg === '--force') args.force = true;
    else if (arg.startsWith('--model=')) {
      args.model = arg.slice('--model='.length);
    } else if (arg.startsWith('--quality=')) {
      args.quality = arg.slice('--quality='.length);
    } else if (arg.startsWith('--size=')) {
      args.size = arg.slice('--size='.length);
    } else if (arg.startsWith('--only=')) {
      args.only = arg.slice('--only='.length).split(',').map((s) => s.trim());
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
  | { ok: true; slug: string; bytes: number }
  | { ok: false; slug: string; error: string }
  | { ok: 'skipped'; slug: string };

async function generateOne(
  client: OpenAI,
  args: Args,
  outDir: string,
  food: { slug: string; label: string },
): Promise<GenerationResult> {
  const filename = `${food.slug}.png`;
  const outPath = join(outDir, filename);
  if (!args.force && (await fileExists(outPath))) {
    return { ok: 'skipped', slug: food.slug };
  }

  const suffix = FOOD_SUFFIX[food.slug];
  if (!suffix) {
    return {
      ok: false,
      slug: food.slug,
      error: `No FOOD_SUFFIX entry for slug "${food.slug}" — add one before generating.`,
    };
  }

  const prompt = `${FOOD_PREFIX}\n\n${suffix}`;

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
      return {
        ok: false,
        slug: food.slug,
        error: 'No b64_json in response',
      };
    }
    const buffer = Buffer.from(b64, 'base64');
    await writeFile(outPath, buffer);
    return { ok: true, slug: food.slug, bytes: buffer.length };
  } catch (err) {
    return {
      ok: false,
      slug: food.slug,
      error: (err as Error).message,
    };
  }
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
  const outDir = join(repoRoot, 'public', 'images', 'foods');
  await mkdir(outDir, { recursive: true });

  const items = args.only
    ? FOODS.filter((f) => args.only!.includes(f.slug))
    : FOODS;

  console.log(
    `model=${args.model}, quality=${args.quality}, size=${args.size}, force=${args.force}, count=${items.length}`,
  );
  console.log(`\n━━━ Foods (${items.length}) ━━━`);

  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const food of items) {
    process.stdout.write(`  ${food.slug.padEnd(28)} … `);
    const result = await generateOne(client, args, outDir, food);
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
    // rate limit on the images endpoint.
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(
    `\n→ generated ${generated}, skipped ${skipped}, failed ${failed}`,
  );

  if (failed > 0) {
    console.log(
      '\nRetry failed items with --only=slug1,slug2 (and --force to overwrite if needed).',
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
