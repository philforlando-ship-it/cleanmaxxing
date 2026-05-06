/**
 * Quality-check the face shape + cut family reference images.
 *
 * Walks the expected file list, verifies each one, and prints a per-file
 * report with anomalies flagged. Useful immediately after running
 * `generate-hair-images` to catch dud generations (corrupt / unexpectedly
 * small / wrong format) before shipping.
 *
 * Checks per file:
 *   - Existence (info if missing — user may not have generated yet)
 *   - File size (empty if <1 KB; warns if over the per-category cap)
 *   - Format detection (png / jpg / webp by magic bytes)
 *   - Dimensions (PNG only — DALL-E's default output; JPG/WebP get a
 *     "skipped" note rather than a failure since the generator outputs
 *     PNG by default)
 *   - Square aspect ratio (warn if not 1:1)
 *   - Resolution floor (warn if either dimension < 512 px)
 *
 * Exit code 0 if no errors, 1 if any error. Warnings do not affect exit
 * code so this can later run in CI without false-failing on slightly
 * oversized files.
 *
 * Usage: npm run qc-hair-images
 */

import { readFile, stat, access } from 'node:fs/promises';
import { join } from 'node:path';

// ==========================================
// Expected file lists. Mirrors generate-hair-images.ts and the README
// files in public/images/. Edit all three together if you change the
// list of reference images.
// ==========================================

type Spec = {
  category: 'face-shapes' | 'cut-families';
  filename: string;
  /** Soft cap on file size in bytes. Warn (not error) if exceeded. */
  maxBytes: number;
};

const FACE_SHAPE_FILES: ReadonlyArray<Spec> = [
  'oval',
  'round',
  'square',
  'long_rectangular',
  'heart_triangle',
].map((name) => ({
  category: 'face-shapes' as const,
  filename: `${name}.png`,
  maxBytes: 200 * 1024, // 200 KB — README says target <100, warn at 2x
}));

const CUT_FAMILY_FILES: ReadonlyArray<Spec> = [
  'textured_crop',
  'ivy_league',
  'textured_quiff',
  'mid_length_textured',
  'crew_cut',
  'buzz_cut',
  'slick_back',
  'curtains',
  'bald_track',
  'clean_shave',
].map((name) => ({
  category: 'cut-families' as const,
  filename: `${name}.png`,
  maxBytes: 500 * 1024, // 500 KB — README says target <250, warn at 2x
}));

// Files smaller than this are almost certainly broken (corrupt download,
// API error response written as bytes, etc.).
const MIN_BYTES = 1024;

// Floor on usable dimensions. DALL-E's smallest size is 256x256 but the
// generate script defaults to 1024x1024. Anything under 512 is a flag.
const MIN_DIMENSION = 512;

// ==========================================
// Format detection + dimension parsing
// ==========================================

type Format = 'png' | 'jpg' | 'webp' | 'unknown';

function detectFormat(buffer: Buffer): Format {
  if (buffer.length < 12) return 'unknown';
  // PNG signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'png';
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }
  // WebP: RIFF....WEBP
  if (
    buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
    buffer.slice(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }
  return 'unknown';
}

// PNG dimensions live in the IHDR chunk, which is always the first
// chunk after the 8-byte signature. IHDR layout: 4 bytes length, 4
// bytes type ("IHDR"), 4 bytes width (big-endian), 4 bytes height
// (big-endian).
function readPngDimensions(
  buffer: Buffer,
): { w: number; h: number } | null {
  if (buffer.length < 24) return null;
  if (buffer.slice(12, 16).toString('ascii') !== 'IHDR') return null;
  const w = buffer.readUInt32BE(16);
  const h = buffer.readUInt32BE(20);
  if (w === 0 || h === 0) return null;
  return { w, h };
}

// ==========================================
// Per-file check
// ==========================================

type Severity = 'warn' | 'error';
type Issue = { severity: Severity; message: string };

type CheckResult = {
  spec: Spec;
  exists: boolean;
  sizeBytes?: number;
  format?: Format;
  dimensions?: { w: number; h: number };
  issues: Issue[];
};

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function checkOne(
  repoRoot: string,
  spec: Spec,
): Promise<CheckResult> {
  const path = join(
    repoRoot,
    'public',
    'images',
    spec.category,
    spec.filename,
  );
  const result: CheckResult = { spec, exists: false, issues: [] };

  if (!(await fileExists(path))) {
    return result;
  }
  result.exists = true;

  const stats = await stat(path);
  result.sizeBytes = stats.size;

  if (stats.size < MIN_BYTES) {
    result.issues.push({
      severity: 'error',
      message: `File is ${stats.size} bytes — almost certainly corrupt.`,
    });
    return result;
  }
  if (stats.size > spec.maxBytes) {
    result.issues.push({
      severity: 'warn',
      message: `File is ${(stats.size / 1024).toFixed(0)} KB — over the ${(spec.maxBytes / 1024).toFixed(0)} KB soft cap. Consider re-exporting at lower quality.`,
    });
  }

  // Read the first 64 bytes — enough for any of the formats we detect.
  // Avoid reading the full file when all we need is the header.
  const handle = await readFile(path);
  const headerBuffer = handle.slice(0, Math.min(64, handle.length));
  result.format = detectFormat(headerBuffer);

  if (result.format === 'unknown') {
    result.issues.push({
      severity: 'error',
      message:
        'File magic bytes do not match PNG, JPG, or WebP. The render component will not display this.',
    });
    return result;
  }

  // Extension consistency (warn only — the FallbackImage component tries
  // multiple extensions, so a mismatch isn't a hard failure, but it's
  // worth knowing about).
  const expectedFormat = spec.filename.endsWith('.png')
    ? 'png'
    : spec.filename.endsWith('.jpg') || spec.filename.endsWith('.jpeg')
      ? 'jpg'
      : spec.filename.endsWith('.webp')
        ? 'webp'
        : null;
  if (expectedFormat && result.format !== expectedFormat) {
    result.issues.push({
      severity: 'warn',
      message: `Extension says ${expectedFormat} but bytes are ${result.format}. Filename should match the actual format for the FallbackImage extension chain to find it on first try.`,
    });
  }

  if (result.format === 'png') {
    const dims = readPngDimensions(headerBuffer);
    if (!dims) {
      result.issues.push({
        severity: 'error',
        message: 'Could not read PNG dimensions from IHDR chunk.',
      });
      return result;
    }
    result.dimensions = dims;
    if (dims.w < MIN_DIMENSION || dims.h < MIN_DIMENSION) {
      result.issues.push({
        severity: 'warn',
        message: `Dimensions ${dims.w}×${dims.h} are below the ${MIN_DIMENSION}px floor. Detail will read soft on retina displays.`,
      });
    }
    if (dims.w !== dims.h) {
      result.issues.push({
        severity: 'warn',
        message: `Dimensions ${dims.w}×${dims.h} are not square. Render components crop with object-cover; non-square images may lose meaningful content.`,
      });
    }
  } else {
    // JPG / WebP dimension parsing isn't implemented — generator
    // outputs PNG by default. Note the skip but don't penalize.
    result.issues.push({
      severity: 'warn',
      message: `Dimension check skipped for ${result.format} (only PNG is parsed by this script).`,
    });
  }

  return result;
}

// ==========================================
// Reporting
// ==========================================

function formatLine(result: CheckResult): string {
  const { spec } = result;
  if (!result.exists) {
    return `  ○ ${spec.filename} — missing (not generated yet)`;
  }
  const errors = result.issues.filter((i) => i.severity === 'error');
  const warns = result.issues.filter((i) => i.severity === 'warn');
  const sizeKb = result.sizeBytes
    ? `${(result.sizeBytes / 1024).toFixed(0)} KB`
    : '—';
  const dims = result.dimensions
    ? `${result.dimensions.w}×${result.dimensions.h}`
    : result.format === 'png'
      ? '?×?'
      : `(${result.format ?? '?'})`;
  const symbol = errors.length > 0 ? '✗' : warns.length > 0 ? '⚠' : '✓';
  return `  ${symbol} ${spec.filename}  ${sizeKb}  ${dims}`;
}

function printIssues(result: CheckResult): void {
  for (const issue of result.issues) {
    const tag = issue.severity === 'error' ? 'ERROR' : 'warn ';
    console.log(`      [${tag}] ${issue.message}`);
  }
}

async function main() {
  const repoRoot = process.cwd();
  const allSpecs = [...FACE_SHAPE_FILES, ...CUT_FAMILY_FILES];

  console.log(
    `Checking ${allSpecs.length} expected reference image${allSpecs.length === 1 ? '' : 's'}.`,
  );

  // Run all checks in parallel — pure I/O, bounded set.
  const results = await Promise.all(
    allSpecs.map((spec) => checkOne(repoRoot, spec)),
  );

  console.log('\n━━━ Face shapes ━━━');
  for (const r of results.slice(0, FACE_SHAPE_FILES.length)) {
    console.log(formatLine(r));
    printIssues(r);
  }
  console.log('\n━━━ Cut families ━━━');
  for (const r of results.slice(FACE_SHAPE_FILES.length)) {
    console.log(formatLine(r));
    printIssues(r);
  }

  const totalErrors = results.reduce(
    (sum, r) => sum + r.issues.filter((i) => i.severity === 'error').length,
    0,
  );
  const totalWarns = results.reduce(
    (sum, r) => sum + r.issues.filter((i) => i.severity === 'warn').length,
    0,
  );
  const missing = results.filter((r) => !r.exists).length;
  const present = results.length - missing;

  console.log(
    `\nSummary: ${present}/${results.length} present, ${totalErrors} error${totalErrors === 1 ? '' : 's'}, ${totalWarns} warning${totalWarns === 1 ? '' : 's'}, ${missing} missing.`,
  );

  if (totalErrors > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
