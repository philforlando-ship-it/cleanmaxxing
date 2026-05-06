// Stage 3 generator. Single Sonnet call producing markdown product
// recommendations. No parser — stored as text and rendered by
// react-markdown on the page (same shape as the report).
//
// Requires Stage 1 to be generated (cut_family + barber_text are
// inputs). Stage 1 itself requires the report. Stage 3 also requires
// Stage 2 to be locked in (so the user has consciously said "I'm doing
// hair, here's the path") — enforced in the route handler.

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CUT_FAMILY_LABEL, type HairAssessment } from './types';
import { buildStage3SystemPrompt } from './stage-3-prompt';
import { saveHairStage3 } from './service';

const STAGE_3_MODEL = 'claude-sonnet-4-6';

export async function generateAndSaveHairStage3(
  supabase: SupabaseClient,
  userId: string,
  assessment: HairAssessment,
): Promise<{ recommendation_text: string }> {
  if (!assessment.report_text) {
    throw new Error('Stage 3 requires a personal report.');
  }
  if (!assessment.stage_1_cut_family || !assessment.stage_1_barber_text) {
    throw new Error('Stage 3 requires Stage 1 to be generated first.');
  }

  const system = buildStage3SystemPrompt({
    reportText: assessment.report_text,
    cutFamily: CUT_FAMILY_LABEL[assessment.stage_1_cut_family],
    barberText: assessment.stage_1_barber_text,
  });

  const isBald = assessment.stage_1_cut_family === 'bald_track';
  const userPrompt = `Generate Stage 3 for this user. ${
    isBald
      ? 'They are on the bald track — the 3 styling picks are scalp/skin care items, NOT hair products. The wash routine section covers face-quality cleanser, scalp moisturizer, and SPF.'
      : 'Style track — recommend 3 styling product classes matched to their hair type and density. The wash routine section covers shampoo frequency and conditioner usage tailored to their hair type.'
  } Both sections are required. Stay under 280 words across all sections.`;

  const { text } = await generateText({
    model: anthropic(STAGE_3_MODEL),
    system,
    prompt: userPrompt,
    temperature: 0.4,
  });

  const recommendation_text = text.trim();
  if (recommendation_text.length === 0) {
    throw new Error('Stage 3 LLM returned empty output.');
  }

  await saveHairStage3(supabase, userId, {
    recommendation_text,
    model: STAGE_3_MODEL,
  });

  return { recommendation_text };
}
