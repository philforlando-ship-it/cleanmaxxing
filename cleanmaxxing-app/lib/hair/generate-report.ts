// Hair plan personal report generator. One-shot LLM call: takes the
// user's saved assessment + their profile-level modifiers (hair_status,
// current_interventions), pulls the relevant POV docs from disk, and
// asks Sonnet for a 220-word four-section report in Mister P's voice.
//
// Synchronous from the user's perspective: the route handler awaits
// this and returns once the report is saved. v0 single-shot — when we
// add re-generation triggers later, this is the function they call.

import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { StreamTextResult, ToolSet } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { kindForAnthropicModel, logCostEvent } from '@/lib/cost-events/log';
import { povFor } from '@/lib/content/pov';
import { getUserProfile } from '@/lib/profile/service';
import { getFacialHairAssessment } from '@/lib/facial-hair/service';
import {
  CURRENT_STATE_LABEL as FACIAL_HAIR_STATE_LABEL,
  DENSITY_AREA_LABEL as FACIAL_HAIR_DENSITY_AREA_LABEL,
  GROWTH_QUALITY_LABEL as FACIAL_HAIR_GROWTH_LABEL,
  type FacialHairAssessment,
} from '@/lib/facial-hair/types';
import {
  BALDING_PATTERN_LABEL,
  BALDING_SEVERITY_LABEL,
  DENSITY_STATE_LABEL,
  EAR_PROMINENCE_LABEL,
  FACE_SHAPE_LABEL,
  GRAYING_LEVEL_LABEL,
  HAIR_TYPE_DENSITY_LABEL,
  HAIR_TYPE_PATTERN_LABEL,
  HAIR_TYPE_STRAND_LABEL,
  HEAD_SHAPE_LABEL,
  HEAD_SIZE_LABEL,
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

// Streaming entrypoint — returns the StreamTextResult so the
// route can call .toTextStreamResponse() for progressive client
// rendering. onFinish handles save + cost logging once the stream
// completes. See lib/nutrition/generate-report.ts for the canonical
// pattern + rationale.
export async function streamHairReport(
  supabase: SupabaseClient,
  userId: string,
  assessment: HairAssessment,
): Promise<StreamTextResult<ToolSet, never>> {
  const [profile, facialHair] = await Promise.all([
    getUserProfile(supabase, userId),
    // D1/D2 (May 9 brain dump) — hair × facial-hair coordination.
    // Read facial-hair state when present so the cut recommendation
    // accounts for whether the beard is doing face-frame work or the
    // cut needs to carry it alone. Null when the user hasn't taken
    // the facial-hair assessment yet.
    getFacialHairAssessment(supabase, userId),
  ]);

  const modifiers: ReportInputModifiers = {
    hair_status: profile.hair_status,
    current_interventions: profile.current_interventions,
  };

  const povContext = await loadPovContext();
  const system = buildHairReportSystemPrompt(povContext);

  const userPrompt = formatAssessmentForPrompt(
    assessment,
    modifiers,
    facialHair,
  );

  return streamText({
    model: anthropic(REPORT_MODEL),
    system,
    prompt: userPrompt,
    // Slightly cooler than the weekly letter (which is 0.6) — the four
    // section structure benefits from less drift between sections.
    temperature: 0.5,
    onFinish: async ({ text, usage }) => {
      logCostEvent({
        user_id: userId,
        kind: kindForAnthropicModel(REPORT_MODEL),
        tokens_input: usage?.inputTokens,
        tokens_output: usage?.outputTokens,
        feature: 'hair_report',
      });
      await saveHairReport(supabase, userId, {
        report_text: text.trim(),
        report_model: REPORT_MODEL,
        report_input_modifiers: modifiers,
      });
    },
  });
}

// Backward-compat wrapper for non-streaming callers. Drains the
// stream internally; onFinish (set above) still fires and handles
// save + cost.
export async function generateAndSaveHairReport(
  supabase: SupabaseClient,
  userId: string,
  assessment: HairAssessment,
): Promise<{ report_text: string }> {
  const result = await streamHairReport(supabase, userId, assessment);
  const text = await result.text;
  return { report_text: text.trim() };
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
  facialHair: FacialHairAssessment | null,
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

  // D1/D2 — facial-hair state as a face-framing modifier on the cut
  // recommendation. Only emitted when the user has taken the
  // facial-hair assessment. Per-area density preferred when present
  // (newer rows); growth_quality fallback for legacy rows.
  const facialHairLines: string[] = [];
  if (facialHair) {
    facialHairLines.push(
      `- Current state: ${FACIAL_HAIR_STATE_LABEL[facialHair.current_state]}`,
    );
    if (
      facialHair.density_cheeks ||
      facialHair.density_chin ||
      facialHair.density_mustache
    ) {
      const parts: string[] = [];
      if (facialHair.density_cheeks) {
        parts.push(
          `cheeks: ${FACIAL_HAIR_DENSITY_AREA_LABEL[facialHair.density_cheeks]}`,
        );
      }
      if (facialHair.density_chin) {
        parts.push(
          `chin: ${FACIAL_HAIR_DENSITY_AREA_LABEL[facialHair.density_chin]}`,
        );
      }
      if (facialHair.density_mustache) {
        parts.push(
          `mustache: ${FACIAL_HAIR_DENSITY_AREA_LABEL[facialHair.density_mustache]}`,
        );
      }
      facialHairLines.push(`- Density by area: ${parts.join('; ')}`);
    } else if (facialHair.growth_quality) {
      facialHairLines.push(
        `- Growth quality: ${FACIAL_HAIR_GROWTH_LABEL[facialHair.growth_quality]}`,
      );
    }
  }
  const facialHairBlock =
    facialHairLines.length > 0
      ? `\n\n--- FACIAL HAIR (for cut coordination) ---\n${facialHairLines.join(
          '\n',
        )}\n--- END FACIAL HAIR ---`
      : '';

  // Migration 0099 — expanded precision variables. Each rendered
  // only when the user actually answered (all are optional). Keeps
  // the prompt budget tight and prevents the LLM from inventing
  // values for fields it wasn't told about.
  const expandedLines: string[] = [];
  if (assessment.head_shape) {
    expandedLines.push(
      `- Head shape: ${HEAD_SHAPE_LABEL[assessment.head_shape]}`,
    );
  }
  if (assessment.head_size) {
    expandedLines.push(
      `- Head size: ${HEAD_SIZE_LABEL[assessment.head_size]}`,
    );
  }
  if (assessment.ear_prominence) {
    expandedLines.push(
      `- Ear prominence: ${EAR_PROMINENCE_LABEL[assessment.ear_prominence]}`,
    );
  }
  if (assessment.graying_level) {
    expandedLines.push(
      `- Graying: ${GRAYING_LEVEL_LABEL[assessment.graying_level]}`,
    );
  }
  if (assessment.balding_pattern) {
    expandedLines.push(
      `- Balding pattern: ${BALDING_PATTERN_LABEL[assessment.balding_pattern]}`,
    );
  }
  if (assessment.balding_severity !== null) {
    expandedLines.push(
      `- Balding severity: ${BALDING_SEVERITY_LABEL[assessment.balding_severity]}`,
    );
  }
  const expandedBlock =
    expandedLines.length > 0
      ? `\n\nMore precision (user-provided where they were sure):\n${expandedLines.join('\n')}`
      : '';

  return `Here is the user's hair assessment.

--- ASSESSMENT ---
- Face shape: ${FACE_SHAPE_LABEL[assessment.face_shape]}
- Density state: ${DENSITY_STATE_LABEL[assessment.density_state]}
- Hair strand: ${HAIR_TYPE_STRAND_LABEL[assessment.hair_type_strand]}
- Hair pattern: ${HAIR_TYPE_PATTERN_LABEL[assessment.hair_type_pattern]}
- Hair density on the head: ${HAIR_TYPE_DENSITY_LABEL[assessment.hair_type_density]}${expandedBlock}

Current routine:
${routineLines.join('\n')}

What the user said they want:
${assessment.hair_goal_text ? `"${assessment.hair_goal_text}"` : '(nothing volunteered)'}
--- END ASSESSMENT ---

--- MODIFIERS ---
${modifierLines.join('\n')}
--- END MODIFIERS ---${facialHairBlock}

Write the four-section hair plan now. 220 words maximum. Use the exact H2 headings specified in the system prompt. Do not narrate the modifiers back to the user — let them shape what you emphasize.`;
}
