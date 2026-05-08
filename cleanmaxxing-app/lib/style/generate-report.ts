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
  CLOSET_STATE_LABEL,
  FRAME_ESTIMATE_LABEL,
  type StyleAssessment,
  type StyleReportInputModifiers,
} from './types';
import { buildStyleReportSystemPrompt } from './report-prompt';
import { saveStyleReport } from './service';

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

  const modifiers: StyleReportInputModifiers = {
    bf_pct_self_estimate: profile.bf_pct_self_estimate,
    budget_tier: profile.budget_tier,
    current_interventions: profile.current_interventions,
    age: (userRow as { age: number | null } | null)?.age ?? null,
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

  return `Here is the user's style assessment.

--- ASSESSMENT ---
- Frame: ${FRAME_ESTIMATE_LABEL[assessment.frame_estimate]}
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
