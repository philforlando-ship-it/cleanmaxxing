import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePremium } from '@/lib/billing/is-premium';
import {
  FACIAL_ANALYSIS_SYSTEM_PROMPT,
  FACIAL_ANALYSIS_MODEL,
  FacialAnalysisOutputSchema,
  leakedFromOutput,
  type FacialAnalysisOutput,
} from '@/lib/facial-analysis/prompt';

const BUCKET = 'progress-photos';

const SLOTS = [
  'baseline',
  'progress_30d',
  'progress_90d',
  'progress_180d',
] as const;
type Slot = (typeof SLOTS)[number];

type Angle = 'front' | 'close' | 'side';
const ANGLE_ORDER: Angle[] = ['front', 'close', 'side'];

// Per-user daily cap. Premium users only — already gated above by
// requirePremium — so this is mainly a safeguard against runaway
// cost / abuse rather than a tiering control.
const RATE_LIMIT_PER_DAY = 5;

const RequestSchema = z
  .object({
    before_slot: z.enum(SLOTS),
    after_slot: z.enum(SLOTS),
  })
  .refine((d) => d.before_slot !== d.after_slot, {
    message: 'before_slot and after_slot must differ',
  });

const SLOT_LABEL: Record<Slot, string> = {
  baseline: 'Baseline',
  progress_30d: '30-day',
  progress_90d: '90-day',
  progress_180d: '180-day',
};

const ANGLE_LABEL: Record<Angle, string> = {
  front: 'Front',
  close: 'Close-up',
  side: 'Side profile',
};

export async function POST(req: NextRequest) {
  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_request', issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { before_slot, after_slot } = parsed.data;

  const auth = await requirePremium();
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  const supabase = await createClient();
  const service = createServiceClient();

  // Rate limit: count analyses created in the last 24h. The 24h
  // window is bounded by RATE_LIMIT_PER_DAY itself, so the count
  // query stays cheap.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: rateCount } = await supabase
    .from('facial_analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  if ((rateCount ?? 0) >= RATE_LIMIT_PER_DAY) {
    return NextResponse.json(
      { error: 'rate_limited', limit: RATE_LIMIT_PER_DAY, window: '24h' },
      { status: 429 },
    );
  }

  // Hard filter to category='face'. Body photos must never be sent
  // to THIS AI route, regardless of slot. The category column was
  // added in migration 0030; pre-existing rows backfilled to 'face'
  // via the column default.
  //
  // POLICY NOTE (2026-05-07): migration 0030's original comment said
  // body photos are "never sent to any AI." That blanket rule was
  // written when this route was the only AI consumer. Body photos
  // are NOW also accepted on the Mister P chat surface (where the
  // prompt's anti-attractiveness / anti-ranking / no-tier-list rules
  // govern), but they remain HARD-excluded from this route — the
  // facial-analysis surface is scoring-adjacent territory and the
  // policy posture there is the strict one. Don't relax this filter.
  // See lib/mister-p/user-state.ts for the matching policy comment
  // on the chat side.
  const { data: photoRows, error: photoErr } = await supabase
    .from('progress_photos')
    .select('slot, angle, storage_path, captured_at')
    .eq('user_id', userId)
    .eq('category', 'face')
    .in('slot', [before_slot, after_slot]);

  if (photoErr) {
    return NextResponse.json(
      { error: 'photo_lookup_failed', message: photoErr.message },
      { status: 500 },
    );
  }

  type PhotoRow = {
    slot: Slot;
    angle: Angle;
    storage_path: string;
    captured_at: string;
  };
  const rows = (photoRows ?? []) as PhotoRow[];

  const beforeByAngle = new Map<Angle, PhotoRow>();
  const afterByAngle = new Map<Angle, PhotoRow>();
  for (const r of rows) {
    if (r.slot === before_slot) beforeByAngle.set(r.angle, r);
    else if (r.slot === after_slot) afterByAngle.set(r.angle, r);
  }

  // Front must be present at both timepoints — every milestone's
  // mandatory photo. Close and side are optional and only used when
  // both timepoints have them.
  const angles_used: Angle[] = ANGLE_ORDER.filter(
    (a) => beforeByAngle.has(a) && afterByAngle.has(a),
  );
  if (!angles_used.includes('front')) {
    return NextResponse.json(
      {
        error: 'front_photo_required',
        message:
          'Both timepoints need at least a front-facing photo to compare.',
      },
      { status: 400 },
    );
  }

  const beforeFront = beforeByAngle.get('front')!;
  const afterFront = afterByAngle.get('front')!;

  // Service client used for downloads. Storage RLS scopes by the
  // first folder segment in the path; this user can only ever ask
  // about their own photos because the lookup above was via their
  // auth client.
  async function download(
    path: string,
  ): Promise<{ buffer: Buffer; mime: string }> {
    const { data, error } = await service.storage.from(BUCKET).download(path);
    if (error || !data) {
      throw new Error(error?.message ?? `no data for ${path}`);
    }
    const ab = await data.arrayBuffer();
    return { buffer: Buffer.from(ab), mime: data.type || 'image/jpeg' };
  }

  type ImagePayload = {
    angle: Angle;
    row: PhotoRow;
    buffer: Buffer;
  };

  let beforeImages: ImagePayload[];
  let afterImages: ImagePayload[];
  try {
    [beforeImages, afterImages] = await Promise.all([
      Promise.all(
        angles_used.map(async (a): Promise<ImagePayload> => {
          const row = beforeByAngle.get(a)!;
          const { buffer } = await download(row.storage_path);
          return { angle: a, row, buffer };
        }),
      ),
      Promise.all(
        angles_used.map(async (a): Promise<ImagePayload> => {
          const row = afterByAngle.get(a)!;
          const { buffer } = await download(row.storage_path);
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

  const beforeLabel = SLOT_LABEL[before_slot];
  const afterLabel = SLOT_LABEL[after_slot];
  const beforeAngleNames = beforeImages
    .map((i) => ANGLE_LABEL[i.angle])
    .join(', ');
  const afterAngleNames = afterImages
    .map((i) => ANGLE_LABEL[i.angle])
    .join(', ');

  const content: ContentPart[] = [
    {
      type: 'text',
      text: `EARLIER session — ${beforeLabel} (captured ${beforeFront.captured_at}). Angles included: ${beforeAngleNames}.`,
    },
    ...beforeImages.flatMap<ContentPart>((img) => [
      { type: 'text', text: `Earlier — ${ANGLE_LABEL[img.angle]}:` },
      { type: 'image', image: img.buffer },
    ]),
    {
      type: 'text',
      text: `LATER session — ${afterLabel} (captured ${afterFront.captured_at}). Angles included: ${afterAngleNames}.`,
    },
    ...afterImages.flatMap<ContentPart>((img) => [
      { type: 'text', text: `Later — ${ANGLE_LABEL[img.angle]}:` },
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
      model: anthropic(FACIAL_ANALYSIS_MODEL),
      schema: FacialAnalysisOutputSchema,
      // Cache the (large, static) system prompt on Anthropic's side
      // via an ephemeral cache breakpoint. Per-call input cost on
      // a cache hit drops by ~90% on the system tokens. The system
      // prompt is identical across every analysis run; cache reuse
      // is the common case once the first call warms it.
      messages: [
        {
          role: 'system',
          content: FACIAL_ANALYSIS_SYSTEM_PROMPT,
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

  let output: FacialAnalysisOutput = result.object;

  // Belt-and-suspenders: even though the system prompt forbids it, if
  // the model produced any numeric score / ranking pattern, suppress
  // the whole output and persist as refused. We'd rather show the
  // user nothing than show them a leaked rating.
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
    .from('facial_analyses')
    .insert({
      user_id: userId,
      before_slot,
      after_slot,
      before_captured_at: beforeFront.captured_at,
      after_captured_at: afterFront.captured_at,
      angles_used,
      observations: output,
      refused: output.refused,
      refusal_reason: output.refusal_reason,
      model: FACIAL_ANALYSIS_MODEL,
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
    before_slot,
    after_slot,
    before_captured_at: beforeFront.captured_at,
    after_captured_at: afterFront.captured_at,
    angles_used,
    observations: output,
    model: FACIAL_ANALYSIS_MODEL,
  });
}
