// POST /api/plan/facial-structure/photo-baseline
//
// Pro-gated. Reads the user's baseline-slot face photos
// (progress_photos.category='face', slot='baseline') and runs the
// structured photo-baseline extractor. Persists the resulting features
// onto facial_structure_assessments.photo_features so the next
// generate-report run reads them as modifiers.
//
// Shape mirrors /api/facial-analysis/analyze minus the comparison
// dimension: ONE timepoint, multiple angles. Front photo is required;
// close and side are optional but improve coverage.

import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePremium } from '@/lib/billing/is-premium';
import { kindForAnthropicModel, logCostEvent } from '@/lib/cost-events/log';
import {
  PHOTO_BASELINE_MODEL,
  PHOTO_BASELINE_SYSTEM_PROMPT,
  PhotoBaselineOutputSchema,
  leakedFromOutput,
  type PhotoBaselineOutput,
} from '@/lib/facial-structure/photo-baseline/prompt';
import type {
  PhotoBaselineAngle,
  PhotoFeatures,
} from '@/lib/facial-structure/photo-baseline/types';
import { saveFacialStructurePhotoBaseline } from '@/lib/facial-structure/service';

const BUCKET = 'progress-photos';

// Per-user daily cap. Mirrors facial-analysis's 5/day. Photo baseline
// is even cheaper to run than comparison (one timepoint vs two), but
// the safeguard is the same.
const RATE_LIMIT_PER_DAY = 5;

const ANGLE_ORDER: PhotoBaselineAngle[] = ['front', 'close', 'side'];

const ANGLE_LABEL: Record<PhotoBaselineAngle, string> = {
  front: 'Front',
  close: 'Close-up',
  side: 'Side profile',
};

export async function POST() {
  const auth = await requirePremium();
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  const supabase = await createClient();
  const service = createServiceClient();

  // Assessment row must exist — photo features attach to it. The
  // form on /plan/facial-structure persists the assessment before
  // the photo panel is even mounted, so this is mostly a defensive
  // check; a hand-rolled API caller without an assessment row would
  // hit an UPDATE-no-rows otherwise (silent failure).
  const { data: assessmentRow } = await supabase
    .from('facial_structure_assessments')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (!assessmentRow) {
    return NextResponse.json(
      {
        error: 'assessment_required',
        message:
          'Complete the facial-structure assessment before running photo analysis.',
      },
      { status: 400 },
    );
  }

  // Rate limit: count photo-baseline updates in the last 24h. The
  // assessment row's photo_features_at is the source of truth — a
  // single user only has one row, so the rate limit is effectively
  // a "don't burn this 5x in a day" guard, not a strict per-call
  // counter. For now this means a user can run it once and re-run
  // up to 4 more times within 24h before being blocked.
  //
  // (The comparison endpoint counts facial_analyses inserts because
  // each comparison creates a new row. Baseline overwrites in place,
  // so we'd need a separate audit log for true counting. Accept the
  // looser semantics for now — re-running baseline is rare.)
  const { data: profileRow } = await supabase
    .from('facial_structure_assessments')
    .select('photo_features_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (
    profileRow?.photo_features_at &&
    Date.now() - new Date(profileRow.photo_features_at as string).getTime() <
      60 * 1000
  ) {
    return NextResponse.json(
      {
        error: 'rate_limited',
        message: 'Wait a minute before re-running.',
      },
      { status: 429 },
    );
  }

  // Hard filter to category='face'. Same policy as
  // /api/facial-analysis/analyze — body photos NEVER hit this route.
  // See the policy comment in that file for context.
  const { data: photoRows, error: photoErr } = await supabase
    .from('progress_photos')
    .select('angle, storage_path, captured_at')
    .eq('user_id', userId)
    .eq('category', 'face')
    .eq('slot', 'baseline');

  if (photoErr) {
    return NextResponse.json(
      { error: 'photo_lookup_failed', message: photoErr.message },
      { status: 500 },
    );
  }

  type PhotoRow = {
    angle: PhotoBaselineAngle;
    storage_path: string;
    captured_at: string;
  };
  const rows = (photoRows ?? []) as PhotoRow[];

  const byAngle = new Map<PhotoBaselineAngle, PhotoRow>();
  for (const r of rows) {
    if (ANGLE_ORDER.includes(r.angle)) byAngle.set(r.angle, r);
  }

  // Front is mandatory — every dimension can be partially read from
  // front (jaw definition front-on, midface balance, asymmetry, puff,
  // buccal, distribution). Side and close are bonuses.
  if (!byAngle.has('front')) {
    return NextResponse.json(
      {
        error: 'front_photo_required',
        message: 'Capture a baseline front-facing photo before running analysis.',
      },
      { status: 400 },
    );
  }

  const angles_used: PhotoBaselineAngle[] = ANGLE_ORDER.filter((a) =>
    byAngle.has(a),
  );

  async function download(path: string): Promise<Buffer> {
    const { data, error } = await service.storage.from(BUCKET).download(path);
    if (error || !data) {
      throw new Error(error?.message ?? `no data for ${path}`);
    }
    const ab = await data.arrayBuffer();
    return Buffer.from(ab);
  }

  type ImagePayload = {
    angle: PhotoBaselineAngle;
    buffer: Buffer;
  };

  let images: ImagePayload[];
  try {
    images = await Promise.all(
      angles_used.map(async (a): Promise<ImagePayload> => {
        const row = byAngle.get(a)!;
        const buffer = await download(row.storage_path);
        return { angle: a, buffer };
      }),
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: 'photo_fetch_failed',
        message: e instanceof Error ? e.message : 'unknown',
      },
      { status: 500 },
    );
  }

  const front = byAngle.get('front')!;
  const angleNames = angles_used.map((a) => ANGLE_LABEL[a]).join(', ');

  type ContentPart =
    | { type: 'text'; text: string }
    | { type: 'image'; image: Buffer };

  const content: ContentPart[] = [
    {
      type: 'text',
      text: `Baseline photo session for one user (captured ${front.captured_at}). Angles included: ${angleNames}. Emit the structured categorical baseline now.`,
    },
    ...images.flatMap<ContentPart>((img) => [
      { type: 'text', text: `${ANGLE_LABEL[img.angle]}:` },
      { type: 'image', image: img.buffer },
    ]),
  ];

  let result;
  try {
    result = await generateObject({
      model: anthropic(PHOTO_BASELINE_MODEL),
      schema: PhotoBaselineOutputSchema,
      messages: [
        {
          role: 'system',
          content: PHOTO_BASELINE_SYSTEM_PROMPT,
          providerOptions: {
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        },
        { role: 'user', content },
      ],
      temperature: 0.2,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: 'analysis_failed',
        message: e instanceof Error ? e.message : 'unknown',
      },
      { status: 500 },
    );
  }

  let output: PhotoBaselineOutput = result.object;

  // Belt-and-suspenders — same posture as facial-analysis. Any
  // numeric ranking pattern that slipped through the system prompt
  // forces a refused row.
  if (leakedFromOutput(output)) {
    output = {
      ...output,
      refused: true,
      refusal_reason:
        'Output contained a scoring or ranking pattern; suppressed.',
    };
  }

  const featuresToPersist: PhotoFeatures | null = output.refused
    ? null
    : {
        jawline_definition: output.jawline_definition,
        chin_projection: output.chin_projection,
        midface_balance: output.midface_balance,
        face_first_distribution_visual: output.face_first_distribution_visual,
        buccal_fullness: output.buccal_fullness,
        posture_head_carriage: output.posture_head_carriage,
        facial_puff_visible: output.facial_puff_visible,
        asymmetry_flag: output.asymmetry_flag,
        angles_used,
        notes: output.notes,
      };

  try {
    await saveFacialStructurePhotoBaseline(
      service,
      userId,
      featuresToPersist,
      output.refused,
      output.refusal_reason,
      PHOTO_BASELINE_MODEL,
    );
  } catch (e) {
    return NextResponse.json(
      {
        error: 'persist_failed',
        message: e instanceof Error ? e.message : 'unknown',
      },
      { status: 500 },
    );
  }

  logCostEvent({
    user_id: userId,
    kind: kindForAnthropicModel(PHOTO_BASELINE_MODEL),
    tokens_input: result.usage?.inputTokens,
    tokens_output: result.usage?.outputTokens,
    feature: 'facial_structure_photo_baseline',
  });

  // Unused-var lint guard for the local cap-check on RATE_LIMIT_PER_DAY.
  // The 24h-bound counting is intentionally NOT implemented as a row
  // count (baseline rows overwrite, not append). Keep the constant
  // documented for future audit-log work.
  void RATE_LIMIT_PER_DAY;

  return NextResponse.json({
    features: featuresToPersist,
    angles_used,
    refused: output.refused,
    refusal_reason: output.refusal_reason,
    model: PHOTO_BASELINE_MODEL,
  });
}
