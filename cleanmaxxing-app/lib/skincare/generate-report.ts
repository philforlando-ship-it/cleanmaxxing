// Skincare personal report generator. Single Sonnet call, mirrors the
// other Pattern A reports. Loads POV 07-skincare-antiaging as context,
// pulls profile-level modifiers, generates a 4-section markdown
// report, persists to the assessment row.

import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { StreamTextResult, ToolSet } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { kindForAnthropicModel, logCostEvent } from '@/lib/cost-events/log';
import { povFor } from '@/lib/content/pov';
import { getUserProfile } from '@/lib/profile/service';
import {
  BARRIER_STATE_LABEL,
  CONCERN_LABEL,
  CURRENT_ROUTINE_LABEL,
  SENSITIVITY_HISTORY_LABEL,
  SKIN_BEHAVIOR_LABEL,
  SUN_EXPOSURE_LABEL,
  type SkincareAssessment,
  type SkincareReportInputModifiers,
} from './types';
import { buildSkincareReportSystemPrompt } from './report-prompt';
import { saveSkincareReport } from './service';

const REPORT_MODEL = 'claude-sonnet-4-6';
// Two POVs feed the skincare report. 07 is the primary antiaging /
// routine framework. 32 covers texture + scarring specifically — its
// content is most load-bearing when primary_concern is 'uneven_tone'
// or 'acne' (where atrophic scars, post-inflammatory hyperpigmentation,
// and the months-not-weeks timeline matter). Both are loaded
// unconditionally and concatenated into the POV context block — the
// prompt picks what's relevant.
const POV_SLUGS = ['07-skincare-antiaging', '32-skin-texture-scarring'];

// Streaming entrypoint — see lib/nutrition/generate-report.ts for the
// pattern + rationale.
export async function streamSkincareReport(
  supabase: SupabaseClient,
  userId: string,
  assessment: SkincareAssessment,
): Promise<StreamTextResult<ToolSet, never>> {
  const profile = await getUserProfile(supabase, userId);

  const { data: userRow } = await supabase
    .from('users')
    .select('age')
    .eq('id', userId)
    .maybeSingle();

  const modifiers: SkincareReportInputModifiers = {
    skin_type_fitzpatrick: profile.skin_type,
    current_interventions: profile.current_interventions,
    budget_tier: profile.budget_tier,
    age: (userRow as { age: number | null } | null)?.age ?? null,
    sensitivity_history: assessment.sensitivity_history,
    barrier_state: assessment.barrier_state,
    baseline_established_at: assessment.baseline_established_at,
    retinoid_started_at: assessment.retinoid_started_at,
    last_step_up_at: assessment.last_step_up_at,
  };

  const povs = await Promise.all(POV_SLUGS.map((slug) => povFor(slug)));
  const missingIdx = povs.findIndex((p) => !p);
  if (missingIdx !== -1) {
    throw new Error(
      `Skincare report requires POV "${POV_SLUGS[missingIdx]}" but it was not found.`,
    );
  }
  const povContext = povs
    .map((p) => `# ${p!.title}\n\n${p!.body}`)
    .join('\n\n---\n\n');
  const system = buildSkincareReportSystemPrompt(povContext);

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
        feature: 'skincare_report',
      });
      await saveSkincareReport(supabase, userId, {
        report_text: text.trim(),
        report_model: REPORT_MODEL,
        report_input_modifiers: modifiers,
      });
    },
  });
}

export async function generateAndSaveSkincareReport(
  supabase: SupabaseClient,
  userId: string,
  assessment: SkincareAssessment,
): Promise<{ report_text: string }> {
  const result = await streamSkincareReport(supabase, userId, assessment);
  const text = await result.text;
  return { report_text: text.trim() };
}

function formatAssessmentForPrompt(
  assessment: SkincareAssessment,
  modifiers: SkincareReportInputModifiers,
): string {
  const modifierLines: string[] = [];
  modifierLines.push(
    `- skin_type_fitzpatrick (profile, 1=very fair → 6=very deep): ${
      modifiers.skin_type_fitzpatrick ?? 'not set'
    }`,
  );
  modifierLines.push(
    `- current_interventions (profile): ${
      modifiers.current_interventions.length === 0
        ? 'none'
        : modifiers.current_interventions.join(', ')
    }`,
  );
  modifierLines.push(
    `- budget_tier (profile): ${modifiers.budget_tier ?? 'not set'}`,
  );
  modifierLines.push(`- age (users): ${modifiers.age ?? 'not set'}`);
  modifierLines.push(
    `- sensitivity_history (assessment): ${
      modifiers.sensitivity_history ?? 'not screened'
    }`,
  );
  modifierLines.push(
    `- barrier_state (assessment): ${modifiers.barrier_state ?? 'not screened'}`,
  );
  modifierLines.push(
    `- baseline_established_at (stage milestone): ${
      modifiers.baseline_established_at ??
      'not yet — floor (cleanser + moisturizer + SPF) may not be in place'
    }`,
  );
  modifierLines.push(
    `- retinoid_started_at (stage milestone): ${
      modifiers.retinoid_started_at ??
      'not yet — retinoid not in routine'
    }`,
  );
  modifierLines.push(
    `- last_step_up_at (stage milestone): ${
      modifiers.last_step_up_at ??
      'never — user has not run the 12-week step-up gate'
    }`,
  );

  return `Here is the user's skincare assessment.

--- ASSESSMENT ---
- Skin behavior: ${SKIN_BEHAVIOR_LABEL[assessment.skin_behavior]}
- Primary concern: ${CONCERN_LABEL[assessment.primary_concern]}
- Current routine: ${CURRENT_ROUTINE_LABEL[assessment.current_routine]}
- Sun exposure: ${SUN_EXPOSURE_LABEL[assessment.sun_exposure]}
- Sensitivity history: ${
    assessment.sensitivity_history
      ? SENSITIVITY_HISTORY_LABEL[assessment.sensitivity_history]
      : 'not screened (older assessment)'
  }
- Barrier state right now: ${
    assessment.barrier_state
      ? BARRIER_STATE_LABEL[assessment.barrier_state]
      : 'not screened (older assessment)'
  }

What the user said they want:
${assessment.skincare_goal_text ? `"${assessment.skincare_goal_text}"` : '(nothing volunteered)'}
--- END ASSESSMENT ---

--- MODIFIERS ---
${modifierLines.join('\n')}
--- END MODIFIERS ---

Write the four-section skincare plan now. 240 words maximum. Use the exact H2 headings specified in the system prompt. Do NOT name brand SKUs. If the user is on accutane, follow the accutane modifier rule strictly. Do not narrate the modifiers back to the user — let them shape what you emphasize.`;
}
