// Style personal report generator. Single Sonnet call, mirrors the hair
// report shape: load POV 12 as context, pull profile-level modifiers,
// generate a 4-section markdown report, persist to the assessment row.
//
// v0 single-shot. Re-generation triggered via the Edit answers flow on
// the page (which goes through saveStyleAssessment → generate again).

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { SupabaseClient } from '@supabase/supabase-js';
import { kindForAnthropicModel, logCostEvent } from '@/lib/cost-events/log';
import { povFor } from '@/lib/content/pov';
import { getUserProfile } from '@/lib/profile/service';
import {
  ARCHETYPE_LABEL,
  ARM_LENGTH_LABEL,
  BUILD_LABEL,
  CLOSET_STATE_LABEL,
  FRAME_ESTIMATE_LABEL,
  LEG_LENGTH_LABEL,
  SHOULDER_WIDTH_LABEL,
  SKIN_UNDERTONE_LABEL,
  type StyleAssessment,
  type StyleReportInputModifiers,
} from './types';
import { buildStyleReportSystemPrompt } from './report-prompt';
import { saveStyleReport } from './service';
import { computeArchetypeFeasibility } from './aesthetic-feasibility';

const REPORT_MODEL = 'claude-sonnet-4-6';
const POV_SLUG = '12-style-clothing';

export async function generateAndSaveStyleReport(
  supabase: SupabaseClient,
  userId: string,
  assessment: StyleAssessment,
): Promise<{ report_text: string }> {
  const profile = await getUserProfile(supabase, userId);

  const { data: userRow } = await supabase
    .from('users')
    .select('age')
    .eq('id', userId)
    .maybeSingle();

  const ageForFeasibility =
    (userRow as { age: number | null } | null)?.age ?? null;

  // Phase 2b — compute per-user feasibility for the PICKED archetype
  // and snapshot the tier + rationale into modifiers. The prompt
  // branches on tier; rationale is included so the prompt can quote
  // it back to the user honestly when feasibility is contested.
  const feasibilityMap = computeArchetypeFeasibility({
    shoulder_width: assessment.shoulder_width,
    build: assessment.build,
    height_inches: profile.height_inches,
    age: ageForFeasibility,
  });
  const pickedFeasibility = feasibilityMap[assessment.target_archetype];

  const modifiers: StyleReportInputModifiers = {
    bf_pct_self_estimate: profile.bf_pct_self_estimate,
    budget_tier: profile.budget_tier,
    current_interventions: profile.current_interventions,
    age: ageForFeasibility,
    shoulder_width: assessment.shoulder_width,
    arm_length: assessment.arm_length,
    leg_length: assessment.leg_length,
    build: assessment.build,
    skin_undertone: assessment.skin_undertone,
    target_archetype_feasibility_tier:
      // Only snapshot a tier when the body data was sufficient to
      // compute one (i.e. shoulder_width + build are both set).
      assessment.shoulder_width && assessment.build
        ? pickedFeasibility.tier
        : null,
    target_archetype_feasibility_rationale:
      assessment.shoulder_width && assessment.build
        ? pickedFeasibility.rationale
        : null,
  };

  const pov = await povFor(POV_SLUG);
  if (!pov) {
    throw new Error(`Style report requires POV "${POV_SLUG}" but it was not found.`);
  }
  const povContext = `# ${pov.title}\n\n${pov.body}`;
  const system = buildStyleReportSystemPrompt(povContext);

  const userPrompt = formatAssessmentForPrompt(assessment, modifiers);

  const { text, usage } = await generateText({
    model: anthropic(REPORT_MODEL),
    system,
    prompt: userPrompt,
    temperature: 0.5,
  });

  logCostEvent({
    user_id: userId,
    kind: kindForAnthropicModel(REPORT_MODEL),
    tokens_input: usage?.inputTokens,
    tokens_output: usage?.outputTokens,
    feature: 'style_report',
  });

  const reportText = text.trim();

  await saveStyleReport(supabase, userId, {
    report_text: reportText,
    report_model: REPORT_MODEL,
    report_input_modifiers: modifiers,
  });

  return { report_text: reportText };
}

function formatAssessmentForPrompt(
  assessment: StyleAssessment,
  modifiers: StyleReportInputModifiers,
): string {
  const modifierLines: string[] = [];
  modifierLines.push(
    `- bf_pct_self_estimate (profile): ${modifiers.bf_pct_self_estimate ?? 'not set'}`,
  );
  modifierLines.push(
    `- budget_tier (profile): ${modifiers.budget_tier ?? 'not set'}`,
  );
  modifierLines.push(
    `- current_interventions (profile): ${
      modifiers.current_interventions.length === 0
        ? 'none'
        : modifiers.current_interventions.join(', ')
    }`,
  );
  modifierLines.push(`- age (users): ${modifiers.age ?? 'not set'}`);
  modifierLines.push(
    `- shoulder_width (v2 granular axis): ${modifiers.shoulder_width ?? 'null — fall back to frame_estimate'}`,
  );
  modifierLines.push(
    `- arm_length (v2 granular axis): ${modifiers.arm_length ?? 'null'}`,
  );
  modifierLines.push(
    `- leg_length (v2 granular axis — highest-leverage proportion lever): ${modifiers.leg_length ?? 'null'}`,
  );
  modifierLines.push(
    `- build (v2 granular axis): ${modifiers.build ?? 'null'}`,
  );
  modifierLines.push(
    `- skin_undertone (v2 color framework axis): ${modifiers.skin_undertone ?? 'null'}`,
  );
  modifierLines.push(
    `- target_archetype_feasibility_tier (Phase 2b — per-user computed read on whether the picked archetype fits / works / fights this user's frame): ${
      modifiers.target_archetype_feasibility_tier ?? 'null — body data insufficient to compute'
    }`,
  );
  modifierLines.push(
    `- target_archetype_feasibility_rationale (1-sentence per-user rationale; quote-friendly): ${
      modifiers.target_archetype_feasibility_rationale
        ? `"${modifiers.target_archetype_feasibility_rationale}"`
        : 'null'
    }`,
  );

  // V2 granular dimensions (migration 0093). Render only when set;
  // pre-migration assessments fall back to the legacy frame label.
  const granularLines: string[] = [];
  if (assessment.shoulder_width) {
    granularLines.push(
      `- Shoulder width: ${SHOULDER_WIDTH_LABEL[assessment.shoulder_width]}`,
    );
  }
  if (assessment.arm_length) {
    granularLines.push(
      `- Arm length: ${ARM_LENGTH_LABEL[assessment.arm_length]}`,
    );
  }
  if (assessment.leg_length) {
    granularLines.push(
      `- Leg length: ${LEG_LENGTH_LABEL[assessment.leg_length]}`,
    );
  }
  if (assessment.build) {
    granularLines.push(`- Build: ${BUILD_LABEL[assessment.build]}`);
  }
  if (assessment.skin_undertone) {
    granularLines.push(
      `- Skin undertone: ${SKIN_UNDERTONE_LABEL[assessment.skin_undertone]}`,
    );
  }
  const granularBlock =
    granularLines.length > 0
      ? `\n${granularLines.join('\n')}`
      : `\n- Frame (legacy single-axis read; v2 granular fields not yet captured): ${FRAME_ESTIMATE_LABEL[assessment.frame_estimate]}`;

  return `Here is the user's style assessment.

--- ASSESSMENT ---${granularBlock}
- Current archetype: ${ARCHETYPE_LABEL[assessment.current_archetype]}
- Target archetype: ${ARCHETYPE_LABEL[assessment.target_archetype]}
- Closet state: ${CLOSET_STATE_LABEL[assessment.closet_state]}

What the user said they want:
${assessment.style_goal_text ? `"${assessment.style_goal_text}"` : '(nothing volunteered)'}
--- END ASSESSMENT ---

--- MODIFIERS ---
${modifierLines.join('\n')}
--- END MODIFIERS ---

Write the four-section style plan now. 240 words maximum. Use the exact H2 headings specified in the system prompt. Do not narrate the modifiers back to the user — let them shape what you emphasize.`;
}
