// POST /api/plan/procedures/fit-check
// Vision + structured-output run that produces a personalized
// procedural-fit recommendation for the caller.
//
// Pro-gated. Reads the user's baseline face photo + structured state
// (age, age-feel, budget tier, hair journey state, skincare baseline)
// and persists one row in procedural_fit_analyses on each run.
// Mirrors the facial-analysis route pattern: service-role insert,
// authed read, daily rate cap, system-prompt cache.

import { NextResponse } from 'next/server';
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { requirePremium } from '@/lib/billing/is-premium';
import { getUserProfile } from '@/lib/profile/service';
import { getSkincareAssessment } from '@/lib/skincare/service';
import { getHairAssessment } from '@/lib/hair/service';
import {
  PROCEDURAL_FIT_MODEL,
  PROCEDURAL_FIT_SYSTEM_PROMPT,
  ProceduralFitOutputSchema,
  formatProceduralFitState,
  leakedFromProceduralOutput,
  type ProceduralFitInputState,
  type ProceduralFitOutput,
} from '@/lib/procedural-fit/prompt';
import { logCostEvent } from '@/lib/cost-events/log';

const BUCKET = 'progress-photos';

// Per-user daily cap. Vision is the cost driver and the analysis
// won't meaningfully change day to day — three runs covers the
// "I changed my answer to a screening question" retry pattern
// without burning budget on impulsive re-clicks.
const RATE_LIMIT_PER_DAY = 3;

// Categorical age-feel labels. Mirrors lib/confidence/context.ts —
// kept inline to avoid the extra import for a single render.
function ageFeelLabel(value: number | null): string | null {
  if (value === null) return null;
  if (value <= 2) return 'Much older than my age';
  if (value <= 4) return 'A bit older than my age';
  if (value <= 6) return 'About my age';
  if (value <= 8) return 'A bit younger than my age';
  return 'Much younger than my age';
}

export async function POST() {
  const auth = await requirePremium();
  if (!auth.ok) return auth.response;
  const userId = auth.userId;

  const supabase = await createClient();
  const service = createServiceClient();

  // Daily rate limit. Cheap count over a bounded window.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: rateCount } = await supabase
    .from('procedural_fit_analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since);
  if ((rateCount ?? 0) >= RATE_LIMIT_PER_DAY) {
    return NextResponse.json(
      {
        error: 'rate_limited',
        limit: RATE_LIMIT_PER_DAY,
        window: '24h',
        message:
          "You've already run this a few times today. The read won't change much in 24 hours — come back tomorrow.",
      },
      { status: 429 },
    );
  }

  // Baseline face photo is required. Same hard category='face'
  // filter as the facial-analysis route (POLICY: scoring-adjacent
  // surface, body photos must never reach this prompt).
  const { data: photoRow, error: photoErr } = await supabase
    .from('progress_photos')
    .select('storage_path, captured_at')
    .eq('user_id', userId)
    .eq('slot', 'baseline')
    .eq('angle', 'front')
    .eq('category', 'face')
    .maybeSingle();

  if (photoErr) {
    return NextResponse.json(
      { error: 'photo_lookup_failed', message: photoErr.message },
      { status: 500 },
    );
  }
  if (!photoRow) {
    return NextResponse.json(
      {
        error: 'baseline_photo_required',
        message:
          'Capture your baseline face photo first — this analysis needs something to read.',
      },
      { status: 400 },
    );
  }

  // Structured state snapshot — mirrors what the prompt expects.
  // Fetched in parallel; absent rows resolve to null fields rather
  // than blocking the run (the prompt prints "not provided" for them).
  const [
    { data: userRow },
    profile,
    skincareAssessment,
    hairAssessment,
    { data: ageFeelRow },
  ] = await Promise.all([
    supabase.from('users').select('age').eq('id', userId).maybeSingle(),
    getUserProfile(supabase, userId),
    getSkincareAssessment(supabase, userId),
    getHairAssessment(supabase, userId),
    supabase
      .from('survey_responses')
      .select('response_value')
      .eq('user_id', userId)
      .eq('question_key', 'confidence_appearance')
      .maybeSingle(),
  ]);

  const age =
    userRow?.age != null && Number.isFinite(Number(userRow.age))
      ? Number(userRow.age)
      : null;
  const ageFeelRaw = ageFeelRow?.response_value
    ? Number(ageFeelRow.response_value as string)
    : null;
  const ageFeel = ageFeelLabel(ageFeelRaw);

  const inputState: ProceduralFitInputState = {
    age,
    ageFeel,
    budgetTier: profile.budget_tier,
    hairStatus: profile.hair_status,
    hairBaldingPattern:
      (hairAssessment as { balding_pattern?: string | null } | null)
        ?.balding_pattern ?? null,
    hairBaldingSeverity:
      (hairAssessment as { balding_severity?: number | null } | null)
        ?.balding_severity ?? null,
    skincareBaselineEstablished:
      skincareAssessment?.baseline_established_at != null,
    skincareRetinoidStarted:
      (skincareAssessment as { retinoid_started_at?: string | null } | null)
        ?.retinoid_started_at != null,
    currentInterventions: profile.current_interventions,
  };

  // Download the baseline face photo. Service client bypass the auth
  // RLS for storage; the path was looked up via the user's auth
  // client above so cross-user access is impossible.
  let imageBuffer: Buffer;
  try {
    const { data, error } = await service.storage
      .from(BUCKET)
      .download(photoRow.storage_path);
    if (error || !data) {
      throw new Error(error?.message ?? 'no data');
    }
    imageBuffer = Buffer.from(await data.arrayBuffer());
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

  const stateText = formatProceduralFitState(inputState);

  const content: ContentPart[] = [
    {
      type: 'text',
      text: `User's structured state snapshot:\n\n${stateText}`,
    },
    { type: 'text', text: `Baseline face photo (front, captured ${photoRow.captured_at}):` },
    { type: 'image', image: imageBuffer },
    {
      type: 'text',
      text: `Read the photo against the state above and produce a procedural-fit recommendation per the system prompt's rules. Default to fewer recommendations if the photo + state don't clearly call for any. Honest "no procedure yet, here's why" is a strong primary_lever=null answer.`,
    },
  ];

  let result;
  try {
    result = await generateObject({
      model: anthropic(PROCEDURAL_FIT_MODEL),
      schema: ProceduralFitOutputSchema,
      // Cache the static system prompt on Anthropic's side via an
      // ephemeral cache breakpoint — same pattern as the facial-
      // analysis route. ~90% input-token cost reduction on cache hits.
      messages: [
        {
          role: 'system',
          content: PROCEDURAL_FIT_SYSTEM_PROMPT,
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

  let output: ProceduralFitOutput = result.object;

  // Belt-and-suspenders: suppress output if it leaked a numeric
  // attractiveness score / tier / decile. Persist as refused so the
  // user sees the refusal copy rather than a leaked rating.
  if (leakedFromProceduralOutput(output)) {
    output = {
      primary_lever: null,
      secondary_levers: [],
      not_yet: [],
      foundations_check: null,
      budget_reality: '',
      refused: true,
      refusal_reason:
        'Output contained a scoring or ranking pattern; suppressed.',
    };
  }

  const { data: insertedRow, error: insertErr } = await service
    .from('procedural_fit_analyses')
    .insert({
      user_id: userId,
      baseline_photo_path: photoRow.storage_path,
      baseline_captured_at: photoRow.captured_at,
      input_state: inputState,
      output,
      refused: output.refused,
      refusal_reason: output.refusal_reason,
      model: PROCEDURAL_FIT_MODEL,
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

  // F2 cost telemetry. Non-fatal — failures here don't affect the
  // analysis response. Vision call kind matches the pricing table
  // key in lib/cost-events/log.ts.
  logCostEvent({
    user_id: userId,
    kind: 'anthropic_sonnet_4_6',
    tokens_input: result.usage?.inputTokens,
    tokens_output: result.usage?.outputTokens,
    feature: 'procedural_fit_analysis',
  });

  return NextResponse.json({
    id: insertedRow.id,
    created_at: insertedRow.created_at,
    input_state: inputState,
    output,
    model: PROCEDURAL_FIT_MODEL,
  });
}
