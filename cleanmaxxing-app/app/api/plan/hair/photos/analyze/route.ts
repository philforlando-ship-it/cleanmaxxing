// POST /api/plan/hair/photos/analyze
// AI comparison of two hair photo sessions. Premium-gated, opt-in,
// 5/day rate-limit. Mirrors the facial-analysis pipeline:
// - generateObject with anthropic + ephemeral cacheControl on the
//   system prompt
// - "front" or "top_down" must be present at both sessions
// - leak detection on the output (any score / ranking pattern → suppress)
// - persist to hair_photo_analyses

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePremium } from '@/lib/billing/is-premium';
import {
  HAIR_PHOTO_ANALYSIS_MODEL,
  HAIR_PHOTO_ANALYSIS_SYSTEM_PROMPT,
  HairPhotoAnalysisOutputSchema,
  leakedFromOutput,
  type HairPhotoAnalysisOutput,
} from '@/lib/hair/photos/analysis-prompt';
import {
  HAIR_PHOTO_ANGLE_LABEL,
  type HairPhoto,
  type HairPhotoAngle,
} from '@/lib/hair/photos/types';

const BUCKET = 'progress-photos';
const RATE_LIMIT_PER_DAY = 5;

const RequestSchema = z
  .object({
    before_session_id: z.string().uuid(),
    after_session_id: z.string().uuid(),
  })
  .refine((d) => d.before_session_id !== d.after_session_id, {
    message: 'before_session_id and after_session_id must differ',
  });

const ANGLE_PRIORITY: HairPhotoAngle[] = [
  'front',
  'top_down',
  'crown',
  'hairline',
  'side_left',
  'side_right',
  'styled',
];

export async function POST(req: NextRequest) {
  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { before_session_id, after_session_id } = parsed.data;

  const auth = await requirePremium();
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  const supabase = await createClient();
  const service = createServiceClient();

  // Rate limit (last 24h).
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: rateCount } = await supabase
    .from('hair_photo_analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  if ((rateCount ?? 0) >= RATE_LIMIT_PER_DAY) {
    return NextResponse.json(
      { error: 'rate_limited', limit: RATE_LIMIT_PER_DAY, window: '24h' },
      { status: 429 },
    );
  }

  // Verify both sessions belong to the user AND are completed. RLS
  // already restricts to own rows; the completed_at check ensures we
  // don't analyze an in-progress session that may still be missing
  // angles.
  const { data: sessions, error: sessionErr } = await supabase
    .from('hair_photo_sessions')
    .select('id, captured_at, completed_at')
    .in('id', [before_session_id, after_session_id]);
  if (sessionErr) {
    return NextResponse.json(
      { error: 'session_lookup_failed', message: sessionErr.message },
      { status: 500 },
    );
  }
  type SessionRow = {
    id: string;
    captured_at: string;
    completed_at: string | null;
  };
  const sessionRows = (sessions ?? []) as SessionRow[];
  if (sessionRows.length !== 2) {
    return NextResponse.json(
      { error: 'sessions_not_found' },
      { status: 404 },
    );
  }
  const before = sessionRows.find((s) => s.id === before_session_id);
  const after = sessionRows.find((s) => s.id === after_session_id);
  if (!before || !after) {
    return NextResponse.json({ error: 'sessions_not_found' }, { status: 404 });
  }
  if (!before.completed_at || !after.completed_at) {
    return NextResponse.json(
      { error: 'session_not_completed' },
      { status: 400 },
    );
  }

  // Pull all photos for both sessions.
  const { data: photoRows, error: photoErr } = await supabase
    .from('hair_photos')
    .select('id, session_id, angle, storage_path, captured_at, user_id')
    .eq('user_id', userId)
    .in('session_id', [before_session_id, after_session_id]);
  if (photoErr) {
    return NextResponse.json(
      { error: 'photo_lookup_failed', message: photoErr.message },
      { status: 500 },
    );
  }
  const rows = (photoRows ?? []) as HairPhoto[];

  const beforeByAngle = new Map<HairPhotoAngle, HairPhoto>();
  const afterByAngle = new Map<HairPhotoAngle, HairPhoto>();
  for (const r of rows) {
    if (r.session_id === before_session_id) beforeByAngle.set(r.angle, r);
    else if (r.session_id === after_session_id) afterByAngle.set(r.angle, r);
  }

  // Anchor angle: front for hair track, top_down for bald track. At
  // least one of those must be present at both sessions for the
  // comparison to be meaningful.
  const hasAnchor =
    (beforeByAngle.has('front') && afterByAngle.has('front')) ||
    (beforeByAngle.has('top_down') && afterByAngle.has('top_down'));
  if (!hasAnchor) {
    return NextResponse.json(
      {
        error: 'anchor_photo_required',
        message:
          'Both sessions need at least a Front (hair) or Top-down (bald) photo to compare.',
      },
      { status: 400 },
    );
  }

  // Use any angle present at BOTH sessions, in priority order.
  const anglesUsed: HairPhotoAngle[] = ANGLE_PRIORITY.filter(
    (a) => beforeByAngle.has(a) && afterByAngle.has(a),
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
    angle: HairPhotoAngle;
    row: HairPhoto;
    buffer: Buffer;
  };
  let beforeImages: ImagePayload[];
  let afterImages: ImagePayload[];
  try {
    [beforeImages, afterImages] = await Promise.all([
      Promise.all(
        anglesUsed.map(async (a): Promise<ImagePayload> => {
          const row = beforeByAngle.get(a)!;
          const buffer = await download(row.storage_path);
          return { angle: a, row, buffer };
        }),
      ),
      Promise.all(
        anglesUsed.map(async (a): Promise<ImagePayload> => {
          const row = afterByAngle.get(a)!;
          const buffer = await download(row.storage_path);
          return { angle: a, row, buffer };
        }),
      ),
    ]);
  } catch (e) {
    return NextResponse.json(
      {
        error: 'photo_fetch_failed',
        message: e instanceof Error ? e.message : 'unknown',
      },
      { status: 500 },
    );
  }

  type ContentPart =
    | { type: 'text'; text: string }
    | { type: 'image'; image: Buffer };

  const beforeAngleNames = anglesUsed
    .map((a) => HAIR_PHOTO_ANGLE_LABEL[a])
    .join(', ');

  const content: ContentPart[] = [
    {
      type: 'text',
      text: `EARLIER session — captured ${before.captured_at}. Angles included: ${beforeAngleNames}.`,
    },
    ...beforeImages.flatMap<ContentPart>((img) => [
      { type: 'text', text: `Earlier — ${HAIR_PHOTO_ANGLE_LABEL[img.angle]}:` },
      { type: 'image', image: img.buffer },
    ]),
    {
      type: 'text',
      text: `LATER session — captured ${after.captured_at}. Angles included: ${beforeAngleNames}.`,
    },
    ...afterImages.flatMap<ContentPart>((img) => [
      { type: 'text', text: `Later — ${HAIR_PHOTO_ANGLE_LABEL[img.angle]}:` },
      { type: 'image', image: img.buffer },
    ]),
    {
      type: 'text',
      text: `Compare the later session against the earlier one. Follow the system prompt's rules exactly.`,
    },
  ];

  let result;
  try {
    result = await generateObject({
      model: anthropic(HAIR_PHOTO_ANALYSIS_MODEL),
      schema: HairPhotoAnalysisOutputSchema,
      messages: [
        {
          role: 'system',
          content: HAIR_PHOTO_ANALYSIS_SYSTEM_PROMPT,
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

  let output: HairPhotoAnalysisOutput = result.object;
  if (leakedFromOutput(output)) {
    output = {
      observations: [],
      summary: null,
      refused: true,
      refusal_reason:
        'Output contained a scoring or ranking pattern; suppressed.',
    };
  }

  const { data: insertedRow, error: insertErr } = await service
    .from('hair_photo_analyses')
    .insert({
      user_id: userId,
      before_session_id,
      after_session_id,
      before_captured_at: before.captured_at,
      after_captured_at: after.captured_at,
      angles_used: anglesUsed,
      observations: output,
      refused: output.refused,
      refusal_reason: output.refusal_reason,
      model: HAIR_PHOTO_ANALYSIS_MODEL,
      input_tokens: result.usage?.inputTokens ?? null,
      output_tokens: result.usage?.outputTokens ?? null,
    })
    .select('id, created_at')
    .single();
  if (insertErr || !insertedRow) {
    return NextResponse.json(
      {
        error: 'persist_failed',
        message: insertErr?.message ?? 'no row returned',
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id: insertedRow.id,
    created_at: insertedRow.created_at,
    before_session_id,
    after_session_id,
    before_captured_at: before.captured_at,
    after_captured_at: after.captured_at,
    angles_used: anglesUsed,
    observations: output,
    model: HAIR_PHOTO_ANALYSIS_MODEL,
  });
}
