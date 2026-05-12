// One-shot: convert near-white pixels in public/cleanmaxxing-logo.png
// to alpha-transparent. The original is a PNG saved with an opaque
// white background; the homepage hides the white via a CSS blend-mode
// hack (mix-blend-multiply dark:invert dark:mix-blend-screen) but that
// hack breaks at edges + leaves artifacts in some browsers. Preprocess
// the file the same way logo2.png was done (PIL pipeline noted in
// components/cm-logo.tsx header).
//
// Strategy:
//   - Per pixel: if average luminance > THRESHOLD_HIGH → fully transparent
//   - Between THRESHOLD_LOW and THRESHOLD_HIGH → semi-transparent
//     (linear ramp; preserves anti-aliased mark edges)
//   - Below THRESHOLD_LOW → fully opaque, RGB unchanged
//   - All "transparent enough" pixels also get RGB pushed to black
//     so dark:invert can flip the mark to white cleanly in dark mode
//
// Usage:
//   npx tsx scripts/strip-logo-bg.ts                          (defaults to logo.png)
//   npx tsx scripts/strip-logo-bg.ts public/cleanmaxxing-logo2.png

import sharp from 'sharp';
import path from 'path';

const argPath = process.argv[2] ?? 'public/cleanmaxxing-logo.png';
const INPUT = path.resolve(process.cwd(), argPath);
const OUTPUT = INPUT; // overwrite in place

const THRESHOLD_HIGH = 245; // luminance ≥ this → fully transparent
const THRESHOLD_LOW = 200; // luminance ≤ this → fully opaque

async function main() {
  const { data, info } = await sharp(INPUT)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 4) {
    throw new Error(`Expected 4-channel RGBA buffer, got ${info.channels}`);
  }

  let transparentCount = 0;
  let edgeCount = 0;
  let opaqueCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luminance = (r + g + b) / 3;

    if (luminance >= THRESHOLD_HIGH) {
      // Pure background — fully transparent
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
      transparentCount++;
    } else if (luminance >= THRESHOLD_LOW) {
      // Anti-aliased edge — semi-transparent. Linear ramp from
      // alpha=0 at THRESHOLD_HIGH to alpha=255 at THRESHOLD_LOW.
      const ramp = (THRESHOLD_HIGH - luminance) / (THRESHOLD_HIGH - THRESHOLD_LOW);
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = Math.round(ramp * 255);
      edgeCount++;
    } else {
      // Mark pixel — push RGB toward pure black so dark:invert
      // produces clean white in dark mode (vs. flipping a near-black
      // gray to a near-white gray).
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 255;
      opaqueCount++;
    }
  }

  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png({ compressionLevel: 9 })
    .toFile(OUTPUT);

  console.log(`Wrote ${OUTPUT}`);
  console.log(`  ${info.width}x${info.height}, ${info.width * info.height} pixels`);
  console.log(`  transparent: ${transparentCount}`);
  console.log(`  edge:        ${edgeCount}`);
  console.log(`  opaque:      ${opaqueCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
