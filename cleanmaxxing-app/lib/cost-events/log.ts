/**
 * Variable-cost telemetry helper (F2 unit economics).
 *
 * Append a row to public.cost_events for every billable API call
 * (Anthropic chat, OpenAI embedding, image generation, etc.).
 * Pricing lookup lives here so rate changes are a one-line code edit
 * rather than a migration.
 *
 * Pricing table source: each provider's published rate page as of
 * 2026-05-07. Rates are date-stamped in the constants below — when
 * a provider changes pricing, update the constants and the
 * pricing_version constant; the historical estimated_cents column
 * preserves the cost-as-known-at-log-time.
 *
 * Failures are non-fatal — telemetry must NEVER block a user-facing
 * request. Wrap the insert in a try/catch and swallow.
 */

import { createServiceClient } from '@/lib/supabase/server';

// Pricing as of 2026-05-07 (snapshotted in commit message). Rates
// in cents per million tokens (or per unit) so the math fits in
// integers and there's no floating-point loss.
const PRICING_VERSION = '2026-05-07';

const PRICING_PER_MILLION_TOKENS: Record<
  string,
  { input_cents: number; output_cents: number }
> = {
  // Anthropic Claude Sonnet 4.6 — official $3/MTok in, $15/MTok out
  // ($300 cents in, $1500 cents out per 1M tokens).
  anthropic_sonnet_4_6: { input_cents: 300, output_cents: 1500 },
  // Claude Opus 4.7 (1M context) — $15 in / $75 out per MTok ($1500/$7500 cents).
  anthropic_opus_4_7: { input_cents: 1500, output_cents: 7500 },
  // Haiku 4.5 — much cheaper; $0.80 in / $4 out per MTok ($80/$400 cents).
  anthropic_haiku_4_5: { input_cents: 80, output_cents: 400 },
  // OpenAI text-embedding-3-small — $0.02/MTok ($2 cents per 1M).
  openai_embedding_small: { input_cents: 2, output_cents: 0 },
  // OpenAI text-embedding-3-large — $0.13/MTok.
  openai_embedding_large: { input_cents: 13, output_cents: 0 },
};

const PRICING_PER_UNIT_CENTS: Record<string, number> = {
  // OpenAI gpt-image-1 / DALL-E 3 standard 1024x1024 — ~$0.04 per
  // image = 4 cents.
  openai_image_dalle3_1024: 4,
  // OpenAI gpt-image-1 HD 1024x1024 — ~$0.08 per image.
  openai_image_dalle3_hd: 8,
  // OpenAI Whisper transcription — $0.006/minute. Rate stored per
  // minute; caller passes minutes as units.
  openai_whisper_per_minute: 1,
  // Imagen 3 standard — ~$0.04 per image.
  imagen_3_standard: 4,
};

export type CostEventKind = string; // open string to allow new keys without typing churn

export type LogCostEventArgs = {
  user_id: string | null;
  kind: CostEventKind;
  tokens_input?: number;
  tokens_output?: number;
  units?: number;
  feature?: string;
};

/**
 * Estimate cents for the given event. Returns 0 when pricing is
 * unknown — caller still gets a row (token counts are still useful
 * for forensics) but the cents column reads 0 until pricing is
 * added.
 */
export function estimateCostCents(args: {
  kind: CostEventKind;
  tokens_input?: number;
  tokens_output?: number;
  units?: number;
}): number {
  const tokenRate = PRICING_PER_MILLION_TOKENS[args.kind];
  if (tokenRate) {
    const inCents =
      ((args.tokens_input ?? 0) * tokenRate.input_cents) / 1_000_000;
    const outCents =
      ((args.tokens_output ?? 0) * tokenRate.output_cents) / 1_000_000;
    return Math.round(inCents + outCents);
  }
  const unitRate = PRICING_PER_UNIT_CENTS[args.kind];
  if (unitRate != null) {
    return Math.round((args.units ?? 0) * unitRate);
  }
  return 0;
}

/**
 * Log a cost event. Non-fatal — swallows any error so this NEVER
 * blocks a user-facing request. Uses the service client because
 * RLS denies all inserts (writes only happen via this helper).
 */
export async function logCostEvent(args: LogCostEventArgs): Promise<void> {
  try {
    const cents = estimateCostCents({
      kind: args.kind,
      tokens_input: args.tokens_input,
      tokens_output: args.tokens_output,
      units: args.units,
    });
    const service = createServiceClient();
    await service.from('cost_events').insert({
      user_id: args.user_id,
      kind: args.kind,
      tokens_input: args.tokens_input ?? null,
      tokens_output: args.tokens_output ?? null,
      units: args.units ?? null,
      estimated_cents: cents,
      feature: args.feature ?? null,
    });
  } catch {
    // Telemetry failures are silent. The product surface continues
    // working even if cost_events writes fail.
  }
}

export const COST_EVENTS_PRICING_VERSION = PRICING_VERSION;
