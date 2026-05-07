/**
 * Server-side image processing for upload routes (E1 + E4).
 *
 * Two reasons we touch every uploaded photo:
 *   E1 — resize. Modern phone cameras produce 5-10MB JPEGs at 4032px
 *        long edge. Storage scales with users × photos × time and
 *        downstream consumers (Mister P chat attachments, AI analysis,
 *        progress grid) don't need that resolution. Resizing to 1600px
 *        max + JPEG quality 85 cuts storage by ~85% with no perceptible
 *        loss for our use cases.
 *   E4 — EXIF strip. Phone photos contain GPS coordinates, camera
 *        model, and timestamp metadata. PII at scale; not load-bearing
 *        for any feature. sharp's default rotate() flow strips
 *        metadata unless we explicitly preserve it.
 *
 * Output is always JPEG. PNG → JPEG conversion is fine for
 * progress/comparison photos; the alpha channel isn't load-bearing
 * and JPEG compresses substantially better. The route handler can
 * still accept PNG/WebP uploads — they get re-encoded here.
 *
 * Sharp is included in the dependency tree already (used by Next.js
 * for next/image at runtime in dev). No new install needed.
 */

import sharp from 'sharp';

// Long-edge max. 1600px is plenty for face photos at typical phone
// viewing distance + AI analysis routes; goes higher would be
// optimization theater.
const MAX_LONG_EDGE_PX = 1600;

// JPEG quality. 85 is the perceptual sweet spot — past 90 returns
// diminish; below 80 introduces visible artifacts on skin tones.
const JPEG_QUALITY = 85;

export type ProcessedUpload = {
  buffer: Buffer;
  contentType: 'image/jpeg';
  // Always 'jpg' since we re-encode to JPEG.
  ext: 'jpg';
  // Bytes after processing. Useful for logging.
  bytes: number;
};

/**
 * Resize + strip metadata + re-encode as JPEG. Throws on invalid
 * image input — the route handler should treat that as a 400.
 */
export async function processPhotoUpload(
  inputBuffer: Buffer,
): Promise<ProcessedUpload> {
  // .rotate() with no arg honors EXIF orientation BEFORE we strip
  // metadata — otherwise iPhone portrait shots come out sideways.
  // .withMetadata() with no args (or omitted) drops everything by
  // default in sharp's pipeline, which is exactly what E4 wants.
  const buffer = await sharp(inputBuffer)
    .rotate()
    .resize({
      width: MAX_LONG_EDGE_PX,
      height: MAX_LONG_EDGE_PX,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return {
    buffer,
    contentType: 'image/jpeg',
    ext: 'jpg',
    bytes: buffer.byteLength,
  };
}
