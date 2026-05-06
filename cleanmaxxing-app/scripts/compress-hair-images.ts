/**
 * Compress the face shape + cut family reference PNGs in place.
 *
 * Walks both image directories, runs each PNG through sharp's pngquant
 * codepath (palette + lossy quantization at quality 80) which typically
 * drops file size by 70–90% with no visually meaningful loss. The
 * filename and extension stay the same, so neither the FallbackImage
 * component nor the QC script need to change.
 *
 * Idempotent enough — re-running on already-compressed files just makes
 * them slightly smaller still (or stays the same once the codec has
 * converged). The --dry-run flag prints the projected savings without
 * writing anything.
 *
 * Usage:
 *   npm run compress-hair-images
 *   npm run compress-hair-images -- --dry-run
 *   npm run compress-hair-images -- --quality=70
 */

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const DIRS = [
  join(process.cwd(), 'public', 'images', 'face-shapes'),
  join(process.cwd(), 'public', 'images', 'cut-families'),
];

type Args = { dryRun: boolean; quality: number };

function parseArgs(argv: readonly string[]): Args {
  const args: Args = { dryRun: false, quality: 80 };
  for (const a of argv) {
    if (a === '--dry-run') args.dryRun = true;
    else if (a.startsWith('--quality=')) {
      const n = Number(a.slice('--quality='.length));
      if (Number.isFinite(n) && n >= 1 && n <= 100) args.quality = n;
    }
  }
  return args;
}

type Result = {
  path: string;
  beforeBytes: number;
  afterBytes: number;
  ok: boolean;
  error?: string;
};

async function compressOne(path: string, quality: number): Promise<Result> {
  const beforeBytes = (await stat(path)).size;
  try {
    const input = await readFile(path);
    // pngquant codepath: palette PNG with lossy quantization. The
    // `effort` knob trades CPU time for compression ratio (max 10).
    // `compressionLevel` is the lossless deflate level.
    const output = await sharp(input)
      .png({
        quality,
        compressionLevel: 9,
        palette: true,
        effort: 10,
      })
      .toBuffer();
    return {
      path,
      beforeBytes,
      afterBytes: output.length,
      ok: true,
    };
  } catch (err) {
    return {
      path,
      beforeBytes,
      afterBytes: beforeBytes,
      ok: false,
      error: (err as Error).message,
    };
  }
}

async function compressDir(dir: string, args: Args): Promise<Result[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    console.log(`  (directory ${dir} not found, skipping)`);
    return [];
  }

  const pngs = entries.filter((f) => f.toLowerCase().endsWith('.png'));
  const results: Result[] = [];
  for (const filename of pngs) {
    const path = join(dir, filename);
    const result = await compressOne(path, args.quality);
    results.push(result);

    const before = (result.beforeBytes / 1024).toFixed(0);
    const after = (result.afterBytes / 1024).toFixed(0);
    const dropPct =
      result.beforeBytes > 0
        ? Math.round(
            ((result.beforeBytes - result.afterBytes) / result.beforeBytes) *
              100,
          )
        : 0;

    if (!result.ok) {
      console.log(`  ✗ ${filename}  ${result.error}`);
      continue;
    }

    if (result.afterBytes >= result.beforeBytes) {
      console.log(
        `  — ${filename}  ${before} KB (already optimal, no rewrite)`,
      );
      continue;
    }

    if (args.dryRun) {
      console.log(
        `  ⋯ ${filename}  ${before} KB → ${after} KB (-${dropPct}%) [dry-run]`,
      );
    } else {
      // Re-read the compressed buffer and write to disk. Reading via
      // sharp().toBuffer() then re-applying via writeFile keeps things
      // simple — sharp doesn't write back to the same path natively
      // when the input is a buffer rather than a stream.
      const input = await readFile(path);
      const output = await sharp(input)
        .png({
          quality: args.quality,
          compressionLevel: 9,
          palette: true,
          effort: 10,
        })
        .toBuffer();
      await writeFile(path, output);
      console.log(`  ✓ ${filename}  ${before} KB → ${after} KB (-${dropPct}%)`);
    }
  }
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(
    `quality=${args.quality}, palette=true, effort=10${args.dryRun ? ', dry-run' : ''}`,
  );

  let totalBefore = 0;
  let totalAfter = 0;

  for (const dir of DIRS) {
    console.log(`\n━━━ ${dir.split('public').pop()?.replace(/\\/g, '/')} ━━━`);
    const results = await compressDir(dir, args);
    for (const r of results) {
      totalBefore += r.beforeBytes;
      totalAfter += r.ok ? r.afterBytes : r.beforeBytes;
    }
  }

  const beforeMb = (totalBefore / 1024 / 1024).toFixed(2);
  const afterMb = (totalAfter / 1024 / 1024).toFixed(2);
  const droppedPct =
    totalBefore > 0
      ? Math.round(((totalBefore - totalAfter) / totalBefore) * 100)
      : 0;

  console.log(
    `\nTotal: ${beforeMb} MB → ${afterMb} MB (-${droppedPct}%)${args.dryRun ? ' [projected]' : ''}`,
  );
  if (!args.dryRun) {
    console.log('Re-run npm run qc-hair-images to confirm sizes are within caps.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
