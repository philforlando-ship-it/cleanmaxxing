// POST /api/plan/facial-hair/try-on
// Generates a "see yourself with this facial-hair style" preview.
// Premium-gated, rate-limited to 3 generations per 24h (separate from
// the hair try-on budget). Reads the user's onboarding baseline face
// photo, calls the OpenAI Responses API, persists a facial_hair_try_ons
// row + storage object.
//
// Request body:
//   { target_style: FacialHairStyleSlug }
//
// Response:
//   { id, signed_url, target_style, created_at }
//
// Errors:
//   401 unauthorized
//   402 premium_required
//   400 invalid_request | no_baseline_photo
//   429 rate_limited
//   500 generation_failed | persist_failed | photo_fetch_failed

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePremium } from '@/lib/billing/is-premium';
import { generateTryOnImage } from '@/lib/hair/try-on/generate';
import { buildFacialHairTryOnPrompt } from '@/lib/facial-hair/try-on/prompt';
import { countFacialHairTryOnsLast24h } from '@/lib/facial-hair/try-on/service';

const BUCKET = 'progress-photos';
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const RATE_LIMIT_PER_DAY = 3;

const RequestSchema = z.object({
  target_style: z.enum([
    'clean_shaven',
    'light_stubble',
    'heavy_stubble',
    'chevron_mustache',
    'classic_mustache',
    'goatee_with_mustache',
    'circle_beard',
    'chinstrap_beard',
    'short_boxed_beard',
    'medium_full_beard',
    'corporate_beard',
    'ducktail_beard',
  ]),
});

export async function POST(req: NextRequest) {
  const auth = await requirePremium();
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  const body = await req.json().catch(() => null);
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const targetStyle = parsed.data.target_style;

  const supabase = await createClient();
  const service = createServiceClient();

  const recent = await countFacialHairTryOnsLast24h(supabase, userId);
  if (recent >= RATE_LIMIT_PER_DAY) {
    return NextResponse.json(
      { error: 'rate_limited', limit: RATE_LIMIT_PER_DAY, window: '24h' },
      { status: 429 },
    );
  }

  // Source photo: the same baseline (slot=baseline, angle=front,
  // category=face) that hair try-ons use. Captured during onboarding;
  // user can recapture from /photos.
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

  const prompt = buildFacialHairTryOnPrompt(targetStyle);

  let result;
  try {
    result = await generateTryOnImage({
      baselinePhotoBuffer: photoBuffer,
      baselinePhotoMime: photoMime,
      prompt,
    });
  } catch (err) {
    console.error('facial_hair_try_on_generation_failed', err);
    return NextResponse.json(
      {
        error: 'generation_failed',
        message: (err as Error).message,
      },
      { status: 500 },
    );
  }

  const timestamp = Date.now();
  const storagePath = `${userId}/facial-hair-tryons/${targetStyle}-${timestamp}.png`;
  const { error: uploadErr } = await service.storage
    .from(BUCKET)
    .upload(storagePath, result.imageBuffer, {
      contentType: 'image/png',
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
    .from('facial_hair_try_ons')
    .insert({
      user_id: userId,
      target_style: targetStyle,
      storage_path: storagePath,
      model: result.modelUsed,
      source_photo_path: baselinePath,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
    })
    .select('id, created_at')
    .single();
  if (insertErr || !insertedRow) {
    await service.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    return NextResponse.json(
      {
        error: 'persist_failed',
        message: insertErr?.message ?? 'no row returned',
      },
      { status: 500 },
    );
  }

  const { data: signed } = await service.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  return NextResponse.json({
    id: (insertedRow as { id: string }).id,
    signed_url: signed?.signedUrl ?? null,
    target_style: targetStyle,
    created_at: (insertedRow as { created_at: string }).created_at,
  });
}
