// Facial hair personal report generator. Single Sonnet call, mirrors
// the hair / style report shape: load POV 09-facial-hair as context,
// pull profile-level modifiers, generate a 4-section markdown report,
// persist to the assessment row.
//
// v0 single-shot. Re-generation triggered via the Edit answers flow on
// the page (which goes through saveFacialHairAssessment → generate again).

import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { StreamTextResult, ToolSet } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { kindForAnthropicModel, logCostEvent } from '@/lib/cost-events/log';
import { povFor } from '@/lib/content/pov';
import { getUserProfile } from '@/lib/profile/service';
import {
  CURRENT_STATE_LABEL,
  DENSITY_AREA_LABEL,
  FACIAL_HAIR_GOAL_LABEL,
  GROWTH_QUALITY_LABEL,
  TIME_COMMITMENT_LABEL,
  type FacialHairAssessment,
  type FacialHairReportInputModifiers,
} from './types';
import { buildFacialHairReportSystemPrompt } from './report-prompt';
import { saveFacialHairReport } from './service';

const REPORT_MODEL = 'claude-sonnet-4-6';
const POV_SLUG = '09-facial-hair';

// Streaming entrypoint — see lib/nutrition/generate-report.ts for the
// pattern + rationale.
export async function streamFacialHairReport(
  supabase: SupabaseClient,
  userId: string,
  assessment: FacialHairAssessment,
): Promise<StreamTextResult<ToolSet, never>> {
  const profile = await getUserProfile(supabase, userId);

  // Read age from users and the relevant hair_assessments fields in
  // parallel. The hair fields drive face-frame coordination (D1/D2
  // reverse direction): how much face-framing the hair is doing
  // shapes whether the beard is load-bearing or stylistic.
  const [{ data: userRow }, { data: hairRow }] = await Promise.all([
    supabase.from('users').select('age').eq('id', userId).maybeSingle(),
    supabase
      .from('hair_assessments')
      .select(
        'face_shape, density_state, balding_pattern, balding_severity, head_shape, graying_level',
      )
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const hair = hairRow as {
    face_shape: string | null;
    density_state: string | null;
    balding_pattern: string | null;
    balding_severity: number | null;
    head_shape: string | null;
    graying_level: string | null;
  } | null;

  const modifiers: FacialHairReportInputModifiers = {
    current_interventions: profile.current_interventions,
    age: (userRow as { age: number | null } | null)?.age ?? null,
    face_shape: hair?.face_shape ?? null,
    bf_pct_self_estimate: profile.bf_pct_self_estimate,
    density_cheeks: assessment.density_cheeks,
    density_chin: assessment.density_chin,
    density_mustache: assessment.density_mustache,
    growout_test_started_at: assessment.growout_test_started_at,
    growout_test_completed_at: assessment.growout_test_completed_at,
    minoxidil_for_beard_started_at: assessment.minoxidil_for_beard_started_at,
    hair_density_state: hair?.density_state ?? null,
    hair_balding_pattern: hair?.balding_pattern ?? null,
    hair_balding_severity: hair?.balding_severity ?? null,
    hair_head_shape: hair?.head_shape ?? null,
    hair_graying_level: hair?.graying_level ?? null,
  };

  const pov = await povFor(POV_SLUG);
  if (!pov) {
    throw new Error(
      `Facial hair report requires POV "${POV_SLUG}" but it was not found.`,
    );
  }
  const povContext = `# ${pov.title}\n\n${pov.body}`;
  const system = buildFacialHairReportSystemPrompt(povContext);

  const userPrompt = formatAssessmentForPrompt(assessment, modifiers);

  return streamText({
    model: anthropic(REPORT_MODEL),
    system,
    prompt: userPrompt,
    temperature: 0.5,
    onFinish: async ({ text, usage }) => {
      logCostEvent({
        user_id: userId,
        kind: kindForAnthropicModel(REPORT_MODEL),
        tokens_input: usage?.inputTokens,
        tokens_output: usage?.outputTokens,
        feature: 'facial_hair_report',
      });
      await saveFacialHairReport(supabase, userId, {
        report_text: text.trim(),
        report_model: REPORT_MODEL,
        report_input_modifiers: modifiers,
      });
    },
  });
}

export async function generateAndSaveFacialHairReport(
  supabase: SupabaseClient,
  userId: string,
  assessment: FacialHairAssessment,
): Promise<{ report_text: string }> {
  const result = await streamFacialHairReport(supabase, userId, assessment);
  const text = await result.text;
  return { report_text: text.trim() };
}

function formatAssessmentForPrompt(
  assessment: FacialHairAssessment,
  modifiers: FacialHairReportInputModifiers,
): string {
  const modifierLines: string[] = [];
  modifierLines.push(
    `- current_interventions (profile): ${
      modifiers.current_interventions.length === 0
        ? 'none'
        : modifiers.current_interventions.join(', ')
    }`,
  );
  modifierLines.push(`- age (users): ${modifiers.age ?? 'not set'}`);
  modifierLines.push(
    `- face_shape (hair_assessments): ${modifiers.face_shape ?? 'not set'}`,
  );
  modifierLines.push(
    `- bf_pct_self_estimate (profile — jaw-definition proxy): ${
      modifiers.bf_pct_self_estimate ?? 'not set'
    }`,
  );
  modifierLines.push(
    `- density_cheeks (assessment): ${modifiers.density_cheeks ?? 'not screened (legacy assessment, use growth_quality below)'}`,
  );
  modifierLines.push(
    `- density_chin (assessment): ${modifiers.density_chin ?? 'not screened (legacy assessment, use growth_quality below)'}`,
  );
  modifierLines.push(
    `- density_mustache (assessment): ${modifiers.density_mustache ?? 'not screened (legacy assessment, use growth_quality below)'}`,
  );
  modifierLines.push(
    `- growout_test_started_at (stage milestone): ${
      modifiers.growout_test_started_at ?? 'not started'
    }`,
  );
  modifierLines.push(
    `- growout_test_completed_at (stage milestone): ${
      modifiers.growout_test_completed_at ?? 'not completed'
    }`,
  );
  modifierLines.push(
    `- minoxidil_for_beard_started_at (stage milestone): ${
      modifiers.minoxidil_for_beard_started_at ??
      'not started — user is not on minoxidil specifically for beard'
    }`,
  );

  // 2026-05-09 reverse coordination — hair fields. Only emit lines for
  // fields the user actually populated; hair journey may not be taken
  // yet, in which case all of these are null and the prompt falls back
  // to face_shape alone.
  if (modifiers.hair_density_state) {
    modifierLines.push(
      `- hair_density_state (hair_assessments): ${modifiers.hair_density_state}`,
    );
  }
  if (modifiers.hair_balding_pattern) {
    modifierLines.push(
      `- hair_balding_pattern (hair_assessments): ${modifiers.hair_balding_pattern}`,
    );
  }
  if (modifiers.hair_balding_severity !== null) {
    modifierLines.push(
      `- hair_balding_severity (0-4): ${modifiers.hair_balding_severity}`,
    );
  }
  if (modifiers.hair_head_shape) {
    modifierLines.push(
      `- hair_head_shape (hair_assessments): ${modifiers.hair_head_shape}`,
    );
  }
  if (modifiers.hair_graying_level) {
    modifierLines.push(
      `- hair_graying_level (hair_assessments): ${modifiers.hair_graying_level}`,
    );
  }

  // Density block: prefer per-area when populated, fall back to
  // overall growth_quality for legacy rows. The prompt has rules for
  // both shapes.
  const densityLines: string[] = [];
  if (
    assessment.density_cheeks ||
    assessment.density_chin ||
    assessment.density_mustache
  ) {
    densityLines.push(
      `- Density (cheeks): ${
        assessment.density_cheeks
          ? DENSITY_AREA_LABEL[assessment.density_cheeks]
          : 'not screened'
      }`,
    );
    densityLines.push(
      `- Density (chin): ${
        assessment.density_chin
          ? DENSITY_AREA_LABEL[assessment.density_chin]
          : 'not screened'
      }`,
    );
    densityLines.push(
      `- Density (mustache): ${
        assessment.density_mustache
          ? DENSITY_AREA_LABEL[assessment.density_mustache]
          : 'not screened'
      }`,
    );
  } else if (assessment.growth_quality) {
    densityLines.push(
      `- Growth quality (legacy overall read): ${GROWTH_QUALITY_LABEL[assessment.growth_quality]}`,
    );
  } else {
    densityLines.push('- Density: not screened');
  }

  return `Here is the user's facial-hair assessment.

--- ASSESSMENT ---
- Current state: ${CURRENT_STATE_LABEL[assessment.current_state]}
${densityLines.join('\n')}
- Goal: ${FACIAL_HAIR_GOAL_LABEL[assessment.goal]}
- Time commitment: ${TIME_COMMITMENT_LABEL[assessment.time_commitment]}

What the user said they want:
${assessment.facial_hair_goal_text ? `"${assessment.facial_hair_goal_text}"` : '(nothing volunteered)'}
--- END ASSESSMENT ---

--- MODIFIERS ---
${modifierLines.join('\n')}
--- END MODIFIERS ---

Write the four-section facial-hair plan now. 240 words maximum. Use the exact H2 headings specified in the system prompt. When you recommend a named style, use one of the 12 names from the catalog in the system prompt verbatim. Do not narrate the modifiers back to the user — let them shape what you emphasize.`;
}
