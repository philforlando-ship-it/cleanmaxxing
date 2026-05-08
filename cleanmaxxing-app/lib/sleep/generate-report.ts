// Sleep personal report generator. Single Sonnet call. Mirrors the
// hair / style / facial-hair report shape with one key addition:
// pulls live data (getSleepState) so the report can name the user's
// actual rolling 7-night average alongside the self-report.

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { SupabaseClient } from '@supabase/supabase-js';
import { kindForAnthropicModel, logCostEvent } from '@/lib/cost-events/log';
import { povFor } from '@/lib/content/pov';
import { getUserProfile } from '@/lib/profile/service';
import {
  BIGGEST_BLOCKER_LABEL,
  PRIMARY_CONCERN_LABEL,
  SCHEDULE_CONSISTENCY_LABEL,
  WHAT_TRIED_LABEL,
  type SleepAssessment,
  type SleepReportInputModifiers,
} from './types';
import { buildSleepReportSystemPrompt } from './report-prompt';
import { getSleepState, saveSleepReport } from './service';

const REPORT_MODEL = 'claude-sonnet-4-6';
const POV_SLUG = '42-sleep';

export async function generateAndSaveSleepReport(
  supabase: SupabaseClient,
  userId: string,
  assessment: SleepAssessment,
): Promise<{ report_text: string }> {
  const profile = await getUserProfile(supabase, userId);

  // Live data + age in parallel. SleepState carries last 7 logged
  // nights' rolling average; age comes from the users table.
  const [sleepState, { data: userRow }] = await Promise.all([
    getSleepState(supabase, userId),
    supabase.from('users').select('age').eq('id', userId).maybeSingle(),
  ]);

  const modifiers: SleepReportInputModifiers = {
    rolling_avg_hours: sleepState.rollingAvgHours,
    rolling_avg_quality: sleepState.rollingAvgQuality,
    rolling_count: sleepState.rollingCount,
    profile_avg_sleep_hours: profile.avg_sleep_hours,
    current_interventions: profile.current_interventions,
    age: (userRow as { age: number | null } | null)?.age ?? null,
    otc_supplements_considered_at: assessment.otc_supplements_considered_at,
    apnea_screening_surfaced_at: assessment.apnea_screening_surfaced_at,
  };

  const pov = await povFor(POV_SLUG);
  if (!pov) {
    throw new Error(
      `Sleep report requires POV "${POV_SLUG}" but it was not found.`,
    );
  }
  const povContext = `# ${pov.title}\n\n${pov.body}`;
  const system = buildSleepReportSystemPrompt(povContext);

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
    feature: 'sleep_report',
  });

  const reportText = text.trim();

  await saveSleepReport(supabase, userId, {
    report_text: reportText,
    report_model: REPORT_MODEL,
    report_input_modifiers: modifiers,
  });

  return { report_text: reportText };
}

function formatAssessmentForPrompt(
  assessment: SleepAssessment,
  modifiers: SleepReportInputModifiers,
): string {
  const modifierLines: string[] = [];
  modifierLines.push(
    `- rolling_avg_hours (sleep_logs, last 7 nights): ${
      modifiers.rolling_avg_hours ?? 'no data'
    }`,
  );
  modifierLines.push(
    `- rolling_avg_quality (sleep_logs, 1-5 scale): ${
      modifiers.rolling_avg_quality ?? 'no data'
    }`,
  );
  modifierLines.push(
    `- rolling_count (number of logged nights in window): ${modifiers.rolling_count}`,
  );
  modifierLines.push(
    `- profile_avg_sleep_hours (self-report, fallback when sparse): ${
      modifiers.profile_avg_sleep_hours ?? 'not set'
    }`,
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
    `- otc_supplements_considered_at (stage milestone): ${
      modifiers.otc_supplements_considered_at ??
      'not yet — user is still on behavioral-only baseline'
    }`,
  );
  modifierLines.push(
    `- apnea_screening_surfaced_at (stage milestone): ${
      modifiers.apnea_screening_surfaced_at ??
      'not yet — apnea screening not surfaced'
    }`,
  );

  // Multi-select questions are rendered as bulleted lists. Order
  // preserved from the form so the user's first pick reads as the
  // most-load-bearing concern when there are multiple.
  const primaryConcernsBlock = assessment.primary_concerns
    .map((c) => `  - ${PRIMARY_CONCERN_LABEL[c]}`)
    .join('\n');
  const biggestBlockersBlock = assessment.biggest_blockers
    .map((b) => `  - ${BIGGEST_BLOCKER_LABEL[b]}`)
    .join('\n');
  const whatTriedBlock = assessment.what_tried
    .map((w) => `  - ${WHAT_TRIED_LABEL[w]}`)
    .join('\n');

  return `Here is the user's sleep assessment.

--- ASSESSMENT ---
- Primary concerns (${assessment.primary_concerns.length}, ordered by what the user picked first):
${primaryConcernsBlock}
- Biggest blockers (${assessment.biggest_blockers.length}, ordered by what the user picked first):
${biggestBlockersBlock}
- Schedule consistency: ${SCHEDULE_CONSISTENCY_LABEL[assessment.schedule_consistency]}
- What they have tried (${assessment.what_tried.length}):
${whatTriedBlock}

What the user said they want:
${assessment.sleep_goal_text ? `"${assessment.sleep_goal_text}"` : '(nothing volunteered)'}
--- END ASSESSMENT ---

--- MODIFIERS ---
${modifierLines.join('\n')}
--- END MODIFIERS ---

Write the four-section sleep plan now. 240 words maximum. Use the exact H2 headings specified in the system prompt. If rolling_count is >=3, name the rolling_avg_hours value in the "Where you actually are" section. Do not name specific prescription sleep medications. Do not narrate the modifiers back to the user — let them shape what you emphasize.`;
}
