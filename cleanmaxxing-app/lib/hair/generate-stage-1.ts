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
import { kindForAnthropicModel, logCostEvent } from '@/lib/cost-events/log';
import { getFacialHairAssessment } from '@/lib/facial-hair/service';
import {
  CUT_FAMILIES,
  type CutFamily,
  type HairAssessment,
} from './types';
import { buildStage1SystemPrompt } from './stage-1-prompt';
import { cutsForDensity } from './cut-by-density';
import { cutsForAge } from './cut-by-age';
import { saveHairStage1 } from './service';

const STAGE_1_MODEL = 'claude-sonnet-4-6';

export async function generateAndSaveHairStage1(
  supabase: SupabaseClient,
  userId: string,
  assessment: HairAssessment,
  age: number | null,
  // User-override path (May 8 — 5-cut alternates). When provided, the
  // model is constrained to this cut and only writes the barber
  // instructions. The cut still has to be inside the density+age
  // allowed set; the API layer validates that before getting here.
  forcedCut: CutFamily | null = null,
): Promise<{ cut_family: CutFamily; barber_text: string }> {
  if (!assessment.report_text) {
    // Stage 1 reads the report as primary input; without it we'd be
    // generating against assessment alone and producing something the
    // user hasn't seen the rationale for. Hard fail.
    throw new Error('Stage 1 requires a personal report to be generated first.');
  }

  // Final allowed list = density-appropriate ∩ age-appropriate. The
  // density filter is the load-bearing constraint (a thinning user
  // shouldn't be recommended a curtains cut regardless of age); the
  // age filter strips youth-coded options for older users and
  // stuffy-mature options for younger ones.
  const densityCuts = cutsForDensity(
    assessment.density_state,
    assessment.balding_pattern,
    assessment.balding_severity,
  );
  const allowedCuts = cutsForAge(age, densityCuts);
  const system = buildStage1SystemPrompt(assessment.report_text, allowedCuts);
  const ageLine = age != null ? `Age: ${age}.` : 'Age: not on file.';
  const baseLines = [
    `Density state on file: ${assessment.density_state}.`,
    `Face shape: ${assessment.face_shape}.`,
    ageLine,
  ];
  // Migration 0099 — append expanded precision variables when the
  // user filled them in. Each is one short clause so the prompt stays
  // tight. Skip silently when null (nothing to add).
  if (assessment.head_shape) {
    baseLines.push(`Head shape: ${assessment.head_shape}.`);
  }
  if (assessment.head_size) {
    baseLines.push(`Head size: ${assessment.head_size}.`);
  }
  if (assessment.ear_prominence) {
    baseLines.push(`Ears: ${assessment.ear_prominence}.`);
  }
  if (assessment.graying_level) {
    baseLines.push(`Graying: ${assessment.graying_level}.`);
  }
  if (assessment.balding_pattern) {
    baseLines.push(`Balding pattern: ${assessment.balding_pattern}.`);
  }
  if (assessment.balding_severity !== null) {
    baseLines.push(`Balding severity (0-4): ${assessment.balding_severity}.`);
  }
  // D1/D2 — facial-hair state for cut coordination. Read in parallel
  // with stage 1 generation so it doesn't slow the main path; a null
  // facial-hair assessment (user hasn't taken it yet) is the fall-back
  // case where the prompt's coordination rules don't fire.
  const facialHair = await getFacialHairAssessment(supabase, userId);
  if (facialHair) {
    baseLines.push(`Beard state: ${facialHair.current_state}.`);
    if (
      facialHair.density_cheeks ||
      facialHair.density_chin ||
      facialHair.density_mustache
    ) {
      const parts: string[] = [];
      if (facialHair.density_cheeks) {
        parts.push(`cheeks=${facialHair.density_cheeks}`);
      }
      if (facialHair.density_chin) {
        parts.push(`chin=${facialHair.density_chin}`);
      }
      if (facialHair.density_mustache) {
        parts.push(`mustache=${facialHair.density_mustache}`);
      }
      baseLines.push(`Beard density: ${parts.join(', ')}.`);
    } else if (facialHair.growth_quality) {
      baseLines.push(`Beard growth quality: ${facialHair.growth_quality}.`);
    }
  }
  const userPrompt = forcedCut
    ? `Generate Stage 1 for this user. The user has explicitly chosen the ${forcedCut} cut family — DO NOT pick a different one. ${baseLines.join(' ')} Output: CUT_FAMILY: ${forcedCut} on the first line, then BARBER_INSTRUCTIONS: with the barber text below. Write the barber-instructions block calibrated to this exact cut and the user's diagnosis. Stay under 180 words.`
    : `Generate Stage 1 for this user. The report above is the diagnosis. Your job is to translate it into one cut family and a short barber-instructions block. ${baseLines.join(' ')} Pick exactly one cut family from the ALLOWED list in the system prompt — that list has already been filtered for the user's density and age cohort. Stay under 180 words across both sections.`;

  const { text, usage } = await generateText({
    model: anthropic(STAGE_1_MODEL),
    system,
    prompt: userPrompt,
    temperature: 0.4,
  });

  logCostEvent({
    user_id: userId,
    kind: kindForAnthropicModel(STAGE_1_MODEL),
    tokens_input: usage?.inputTokens,
    tokens_output: usage?.outputTokens,
    feature: 'hair_stage_1',
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
