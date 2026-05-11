// POST /api/plan/hair/try-on
// Generates a "see yourself with this cut" preview. Premium-gated,
// rate-limited to 3 generations per 24h. Reads the current Stage 1
// recommendation off the user's hair_assessments row + the baseline
// face photo, calls the OpenAI Responses API, saves the generated
// image to the progress-photos bucket, persists a hair_try_ons row.
//
// No request body — server picks the cut from the user's saved
// Stage 1. Re-running for the same cut adds a new row (history kept).
//
// Response shape:
//   { id, signed_url, cut_family, created_at }
//
// Errors:
//   401 unauthorized
//   402 premium_required
//   400 no_assessment | no_stage_1 | no_baseline_photo
//   429 rate_limited
//   500 generation_failed | persist_failed

import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePremium } from '@/lib/billing/is-premium';
import { getHairAssessment } from '@/lib/hair/service';
import { generateTryOnImage } from '@/lib/hair/try-on/generate';
import { buildTryOnPrompt } from '@/lib/hair/try-on/prompt';
import { countTryOnsLast24h } from '@/lib/hair/try-on/service';
import { processPhotoUpload } from '@/lib/photos/process-upload';
import { trimTryOnHistory } from '@/lib/photos/try-on-retention';

const BUCKET = 'progress-photos';
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const RATE_LIMIT_PER_DAY = 3;

export async function POST() {
  const auth = await requirePremium();
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  const supabase = await createClient();
  const service = createServiceClient();

  // Rate limit check.
  const recent = await countTryOnsLast24h(supabase, userId);
  if (recent >= RATE_LIMIT_PER_DAY) {
    return NextResponse.json(
      {
        error: 'rate_limited',
        limit: RATE_LIMIT_PER_DAY,
        window: '24h',
      },
      { status: 429 },
    );
  }

  // Need an assessment + Stage 1 to know what to generate.
  const assessment = await getHairAssessment(supabase, userId);
  if (!assessment) {
    return NextResponse.json(
      { error: 'no_assessment' },
      { status: 400 },
    );
  }
  if (!assessment.stage_1_cut_family || !assessment.stage_1_barber_text) {
    return NextResponse.json(
      { error: 'no_stage_1' },
      { status: 400 },
    );
  }

  // Need a baseline face photo as the source.
  const { data: baselinePhotoRow } = await supabase
    .from('progress_photos')
    .select('storage_path')
    .eq('user_id', userId)
    .eq('slot', 'baseline')
    .eq('angle', 'front')
    .eq('category', 'face')
    .maybeSingle();
  if (!baselinePhotoRow) {
    return NextResponse.json(
      {
        error: 'no_baseline_photo',
        message:
          "Capture a baseline face photo at /photos first — the try-on uses it as the reference for your face.",
      },
      { status: 400 },
    );
  }
  const baselinePath = (baselinePhotoRow as { storage_path: string })
    .storage_path;

  // Download the baseline photo via service client (RLS-bypass on
  // storage; the lookup above was via authed client so the path is
  // verified user-owned).
  const { data: photoData, error: dlErr } = await service.storage
    .from(BUCKET)
    .download(baselinePath);
  if (dlErr || !photoData) {
    return NextResponse.json(
      {
        error: 'photo_fetch_failed',
        message: dlErr?.message ?? 'unknown',
      },
      { status: 500 },
    );
  }
  const photoMime = photoData.type || 'image/jpeg';
  const photoBuffer = Buffer.from(await photoData.arrayBuffer());

  // Generate the try-on image via OpenAI.
  const prompt = buildTryOnPrompt({
    cutFamily: assessment.stage_1_cut_family,
    barberText: assessment.stage_1_barber_text,
  });

  let result;
  try {
    result = await generateTryOnImage({
      baselinePhotoBuffer: photoBuffer,
      baselinePhotoMime: photoMime,
      prompt,
    });
  } catch (err) {
    console.error('hair_try_on_generation_failed', err);
    return NextResponse.json(
      {
        error: 'generation_failed',
        message: (err as Error).message,
      },
      { status: 500 },
    );
  }

  // Run the OpenAI PNG through the same processor user uploads use:
  // sharp resize → JPEG q85 → EXIF strip + auto-rotate. Cuts the
  // saved file ~75% (~2MB PNG → ~400KB JPEG) without quality loss
  // a user would notice.
  const processed = await processPhotoUpload(result.imageBuffer);

  const timestamp = Date.now();
  const storagePath = `${userId}/hair-tryons/${assessment.stage_1_cut_family}-${timestamp}.${processed.ext}`;
  const { error: uploadErr } = await service.storage
    .from(BUCKET)
    .upload(storagePath, processed.buffer, {
      contentType: processed.contentType,
      upsert: false,
    });
  if (uploadErr) {
    return NextResponse.json(
      {
        error: 'persist_failed',
        message: `Storage upload failed: ${uploadErr.message}`,
      },
      { status: 500 },
    );
  }

  const { data: insertedRow, error: insertErr } = await service
    .from('hair_try_ons')
    .insert({
      user_id: userId,
      cut_family: assessment.stage_1_cut_family,
      storage_path: storagePath,
      model: result.modelUsed,
      source_photo_path: baselinePath,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
    })
    .select('id, created_at')
    .single();
  if (insertErr || !insertedRow) {
    // Storage is ahead of DB — clean up the file so we don't leak
    // an orphan the user can't see or delete.
    await service.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    return NextResponse.json(
      {
        error: 'persist_failed',
        message: insertErr?.message ?? 'no row returned',
      },
      { status: 500 },
    );
  }

  // Trim older try-ons of this same cut down to TRY_ON_KEEP_PER_KEY
  // newest. Per-cut retention so a user exploring many cut families
  // keeps a useful history per family. Best-effort — failure to trim
  // doesn't fail the user's request, just logs.
  await trimTryOnHistory(service, {
    table: 'hair_try_ons',
    keyColumn: 'cut_family',
    keyValue: assessment.stage_1_cut_family,
    userId,
  }).catch((err) => console.error('hair_try_on_retention_failed', err));

  // Mint a signed URL so the client can render the image without a
  // round-trip through a separate "get my try-ons" endpoint.
  const { data: signed } = await service.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  return NextResponse.json({
    id: (insertedRow as { id: string }).id,
    signed_url: signed?.signedUrl ?? null,
    cut_family: assessment.stage_1_cut_family,
    created_at: (insertedRow as { created_at: string }).created_at,
  });
}
