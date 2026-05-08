// Hair plan personal report generator. One-shot LLM call: takes the
// user's saved assessment + their profile-level modifiers (hair_status,
// current_interventions), pulls the relevant POV docs from disk, and
// asks Sonnet for a 220-word four-section report in Mister P's voice.
//
// Synchronous from the user's perspective: the route handler awaits
// this and returns once the report is saved. v0 single-shot — when we
// add re-generation triggers later, this is the function they call.

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { SupabaseClient } from '@supabase/supabase-js';
import { kindForAnthropicModel, logCostEvent } from '@/lib/cost-events/log';
import { povFor } from '@/lib/content/pov';
import { getUserProfile } from '@/lib/profile/service';
import {
  DENSITY_STATE_LABEL,
  FACE_SHAPE_LABEL,
  HAIR_TYPE_DENSITY_LABEL,
  HAIR_TYPE_PATTERN_LABEL,
  HAIR_TYPE_STRAND_LABEL,
  WHO_CUTS_LABEL,
  type HairAssessment,
  type ReportInputModifiers,
} from './types';
import { buildHairReportSystemPrompt } from './report-prompt';
import { saveHairReport } from './service';

// Sonnet 4.6 — same model the weekly letter pipeline uses. The hair
// report is short and stylistic; we don't need Opus depth here.
const REPORT_MODEL = 'claude-sonnet-4-6';

// Slugs to pull into the system prompt. POV 08 carries the cut/style
// framework + balding decision content; POV 27 carries the
// fin/min-in-depth content the report cites for the treat/monitor
// decision. Concatenated rather than RAG-retrieved because both are
// fully relevant for every hair report — there's nothing to retrieve.
const POV_SLUGS = ['08-head-hair-balding', '27-hair-loss-treatments'];

export async function generateAndSaveHairReport(
  supabase: SupabaseClient,
  userId: string,
  assessment: HairAssessment,
): Promise<{ report_text: string }> {
  const profile = await getUserProfile(supabase, userId);

  const modifiers: ReportInputModifiers = {
    hair_status: profile.hair_status,
    current_interventions: profile.current_interventions,
  };

  const povContext = await loadPovContext();
  const system = buildHairReportSystemPrompt(povContext);

  const userPrompt = formatAssessmentForPrompt(assessment, modifiers);

  const { text, usage } = await generateText({
    model: anthropic(REPORT_MODEL),
    system,
    prompt: userPrompt,
    // Slightly cooler than the weekly letter (which is 0.6) — the four
    // section structure benefits from less drift between sections.
    temperature: 0.5,
  });

  logCostEvent({
    user_id: userId,
    kind: kindForAnthropicModel(REPORT_MODEL),
    tokens_input: usage?.inputTokens,
    tokens_output: usage?.outputTokens,
    feature: 'hair_report',
  });

  const reportText = text.trim();

  await saveHairReport(supabase, userId, {
    report_text: reportText,
    report_model: REPORT_MODEL,
    report_input_modifiers: modifiers,
  });

  return { report_text: reportText };
}

async function loadPovContext(): Promise<string> {
  const docs = await Promise.all(POV_SLUGS.map((slug) => povFor(slug)));
  // Fail loud if a POV is missing — the report quality depends on the
  // grounding content. Better to error here than to silently produce a
  // less-grounded report.
  const sections: string[] = [];
  for (let i = 0; i < POV_SLUGS.length; i++) {
    const doc = docs[i];
    if (!doc) {
      throw new Error(
        `Hair report generation requires POV "${POV_SLUGS[i]}" but it was not found.`,
      );
    }
    sections.push(`# ${doc.title}\n\n${doc.body}`);
  }
  return sections.join('\n\n---\n\n');
}

function formatAssessmentForPrompt(
  assessment: HairAssessment,
  modifiers: ReportInputModifiers,
): string {
  const r = assessment.current_routine;
  const routineLines: string[] = [];
  if (r.cut_cadence_weeks !== null) {
    routineLines.push(`- Cut cadence: every ${r.cut_cadence_weeks} weeks`);
  } else {
    routineLines.push('- Cut cadence: no fixed schedule');
  }
  if (r.products_used) {
    routineLines.push(`- Products currently used: ${r.products_used}`);
  } else {
    routineLines.push('- Products currently used: none reported');
  }
  routineLines.push(`- Blow dries hair: ${r.uses_blow_dry ? 'yes' : 'no'}`);
  if (r.who_cuts) {
    routineLines.push(`- Who cuts: ${WHO_CUTS_LABEL[r.who_cuts]}`);
  }

  const modifierLines: string[] = [];
  modifierLines.push(`- hair_status (profile): ${modifiers.hair_status ?? 'not set'}`);
  modifierLines.push(
    `- current_interventions (profile): ${
      modifiers.current_interventions.length === 0
        ? 'none'
        : modifiers.current_interventions.join(', ')
    }`,
  );

  return `Here is the user's hair assessment.

--- ASSESSMENT ---
- Face shape: ${FACE_SHAPE_LABEL[assessment.face_shape]}
- Density state: ${DENSITY_STATE_LABEL[assessment.density_state]}
- Hair strand: ${HAIR_TYPE_STRAND_LABEL[assessment.hair_type_strand]}
- Hair pattern: ${HAIR_TYPE_PATTERN_LABEL[assessment.hair_type_pattern]}
- Hair density on the head: ${HAIR_TYPE_DENSITY_LABEL[assessment.hair_type_density]}

Current routine:
${routineLines.join('\n')}

What the user said they want:
${assessment.hair_goal_text ? `"${assessment.hair_goal_text}"` : '(nothing volunteered)'}
--- END ASSESSMENT ---

--- MODIFIERS ---
${modifierLines.join('\n')}
--- END MODIFIERS ---

Write the four-section hair plan now. 220 words maximum. Use the exact H2 headings specified in the system prompt. Do not narrate the modifiers back to the user — let them shape what you emphasize.`;
}
