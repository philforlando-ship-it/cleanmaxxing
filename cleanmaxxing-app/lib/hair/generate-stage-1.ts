// Stage 1 generator. Single Sonnet call producing a cut_family enum +
// barber instructions block. The user already has a personal report on
// the page, so Stage 1 reads as the "now do this in the barber chair"
// translation of the report rather than starting from scratch.
//
// Parsing strategy: the prompt enforces a strict CUT_FAMILY: <name>
// header on the first non-empty line and a BARBER_INSTRUCTIONS: header
// before the body. We split on those two markers. If parsing fails we
// throw — the route handler turns that into a 500 the user can retry.

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CUT_FAMILIES,
  type CutFamily,
  type HairAssessment,
} from './types';
import { buildStage1SystemPrompt } from './stage-1-prompt';
import { cutsForDensity } from './cut-by-density';
import { saveHairStage1 } from './service';

const STAGE_1_MODEL = 'claude-sonnet-4-6';

export async function generateAndSaveHairStage1(
  supabase: SupabaseClient,
  userId: string,
  assessment: HairAssessment,
): Promise<{ cut_family: CutFamily; barber_text: string }> {
  if (!assessment.report_text) {
    // Stage 1 reads the report as primary input; without it we'd be
    // generating against assessment alone and producing something the
    // user hasn't seen the rationale for. Hard fail.
    throw new Error('Stage 1 requires a personal report to be generated first.');
  }

  const allowedCuts = cutsForDensity(assessment.density_state);
  const system = buildStage1SystemPrompt(assessment.report_text, allowedCuts);
  const userPrompt = `Generate Stage 1 for this user. The report above is the diagnosis. Your job is to translate it into one cut family and a short barber-instructions block. Density state on file: ${assessment.density_state}. Face shape: ${assessment.face_shape}. Pick exactly one cut family from the ALLOWED list in the system prompt. Stay under 180 words across both sections.`;

  const { text } = await generateText({
    model: anthropic(STAGE_1_MODEL),
    system,
    prompt: userPrompt,
    temperature: 0.4,
  });

  const parsed = parseStage1Output(text);

  await saveHairStage1(supabase, userId, {
    cut_family: parsed.cut_family,
    barber_text: parsed.barber_text,
  });

  return parsed;
}

// Strict parser — looks for CUT_FAMILY: <name> on (effectively) the first
// non-empty line, then BARBER_INSTRUCTIONS: with the body following. If
// the model drifts off-format we throw rather than write garbage.
export function parseStage1Output(text: string): {
  cut_family: CutFamily;
  barber_text: string;
} {
  const cutFamilyMatch = text.match(/^\s*CUT_FAMILY:\s*([a-z_]+)\s*$/m);
  if (!cutFamilyMatch) {
    throw new Error('Stage 1 output missing CUT_FAMILY header.');
  }
  const rawCutFamily = cutFamilyMatch[1];
  if (!(CUT_FAMILIES as readonly string[]).includes(rawCutFamily)) {
    throw new Error(
      `Stage 1 output named an unknown cut family: ${rawCutFamily}.`,
    );
  }
  const cut_family = rawCutFamily as CutFamily;

  const barberMatch = text.match(/BARBER_INSTRUCTIONS:\s*\n?([\s\S]+)$/);
  if (!barberMatch) {
    throw new Error('Stage 1 output missing BARBER_INSTRUCTIONS section.');
  }
  const barber_text = barberMatch[1].trim();
  if (barber_text.length === 0) {
    throw new Error('Stage 1 output had an empty BARBER_INSTRUCTIONS body.');
  }

  return { cut_family, barber_text };
}
