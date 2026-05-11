// Facial structure personal report generator. Single Sonnet call,
// mirrors the other Pattern A reports. Loads POV 16 primary + 8
// secondary POVs as context, pulls profile-level + cross-journey
// modifiers, generates a 4-section markdown report, persists to the
// assessment row.
//
// Cross-journey reads:
//   - user_profile (bf_pct_self_estimate, budget_tier, current_interventions)
//   - users.age
//   - sleep_logs avg hours last 28 nights
//   - hair_assessments.density_state + balding_pattern
//   - facial_hair_assessments.current_state
//
// These let the report coordinate without those journeys having to be
// re-loaded at render time — the snapshot lives in report_input_modifiers.

import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { StreamTextResult, ToolSet } from 'ai';
import type { SupabaseClient } from '@supabase/supabase-js';
import { kindForAnthropicModel, logCostEvent } from '@/lib/cost-events/log';
import { povFor } from '@/lib/content/pov';
import { getUserProfile } from '@/lib/profile/service';
import {
  BODY_FAT_LABEL,
  CHIN_JAW_CONCERN_LABEL,
  COSMETIC_PROCEDURE_OPENNESS_LABEL,
  FACE_FIRST_DISTRIBUTION_LABEL,
  FACIAL_PUFF_BASELINE_LABEL,
  POSTURAL_PATTERN_LABEL,
  type FacialStructureAssessment,
  type FacialStructureReportInputModifiers,
} from './types';
import { buildFacialStructureReportSystemPrompt } from './report-prompt';
import { saveFacialStructureReport } from './service';

const REPORT_MODEL = 'claude-sonnet-4-6';

// POV stack — order matters for context budget. POV 16 is primary; 50
// + 13 + 28 carry the cross-lever framework; 38 / 44 / 18 / 33 / 06
// layer in modifier-relevant slices. All loaded unconditionally — the
// prompt picks what's relevant per user.
const POV_SLUGS = [
  '16-facial-definition-jawline',
  '50-posture',
  '13-body-physical-foundation',
  '28-cosmetic-procedures',
  '38-aging-appearance',
  '44-water-retention',
  '18-tanning',
  '33-niche-enhancements',
  '06-bone-smashing',
];

const DAYS_MS = 24 * 60 * 60 * 1000;

export async function streamFacialStructureReport(
  supabase: SupabaseClient,
  userId: string,
  assessment: FacialStructureAssessment,
): Promise<StreamTextResult<ToolSet, never>> {
  const profile = await getUserProfile(supabase, userId);

  const twentyEightDaysAgo = new Date(Date.now() - 28 * DAYS_MS)
    .toISOString()
    .slice(0, 10);

  const [
    { data: userRow },
    { data: sleepRows },
    { data: hairRow },
    { data: facialHairRow },
  ] = await Promise.all([
    supabase.from('users').select('age').eq('id', userId).maybeSingle(),
    supabase
      .from('sleep_logs')
      .select('hours')
      .eq('user_id', userId)
      .gte('night_of', twentyEightDaysAgo),
    supabase
      .from('hair_assessments')
      .select('density_state, balding_pattern')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('facial_hair_assessments')
      .select('current_state')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const sleepHours = ((sleepRows ?? []) as Array<{ hours: number | string }>)
    .map((r) => (typeof r.hours === 'string' ? Number(r.hours) : r.hours))
    .filter((h): h is number => Number.isFinite(h));
  const avgSleep =
    sleepHours.length >= 7
      ? Math.round(
          (sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length) * 10,
        ) / 10
      : null;

  const modifiers: FacialStructureReportInputModifiers = {
    age: (userRow as { age: number | null } | null)?.age ?? null,
    bf_pct_self_estimate: profile.bf_pct_self_estimate,
    budget_tier: profile.budget_tier,
    current_interventions: profile.current_interventions,
    avg_sleep_hours_last_28: avgSleep,
    hair_density_state:
      (hairRow as { density_state: string | null } | null)?.density_state ??
      null,
    hair_balding_pattern:
      (hairRow as { balding_pattern: string | null } | null)
        ?.balding_pattern ?? null,
    facial_hair_current_state:
      (facialHairRow as { current_state: string | null } | null)
        ?.current_state ?? null,
  };

  const povs = await Promise.all(POV_SLUGS.map((slug) => povFor(slug)));
  const missingIdx = povs.findIndex((p) => !p);
  if (missingIdx !== -1) {
    throw new Error(
      `Facial structure report requires POV "${POV_SLUGS[missingIdx]}" but it was not found.`,
    );
  }
  const povContext = povs
    .map((p) => `# ${p!.title}\n\n${p!.body}`)
    .join('\n\n---\n\n');
  const system = buildFacialStructureReportSystemPrompt(povContext);

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
        feature: 'facial_structure_report',
      });
      await saveFacialStructureReport(
        supabase,
        userId,
        text.trim(),
        REPORT_MODEL,
        modifiers,
        usage
          ? {
              input: usage.inputTokens ?? 0,
              output: usage.outputTokens ?? 0,
            }
          : null,
      );
    },
  });
}

function formatAssessmentForPrompt(
  assessment: FacialStructureAssessment,
  modifiers: FacialStructureReportInputModifiers,
): string {
  const posturalLines =
    assessment.postural_pattern.length === 0
      ? '(none selected)'
      : assessment.postural_pattern
          .map((p) => `  - ${POSTURAL_PATTERN_LABEL[p]}`)
          .join('\n');

  const modifierLines: string[] = [];
  modifierLines.push(`- age (users): ${modifiers.age ?? 'not set'}`);
  modifierLines.push(
    `- bf_pct_self_estimate (profile): ${
      modifiers.bf_pct_self_estimate ?? 'not set'
    }`,
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
  modifierLines.push(
    `- avg_sleep_hours_last_28 (sleep journey): ${
      modifiers.avg_sleep_hours_last_28 ?? 'not tracked / too few logs'
    }`,
  );
  modifierLines.push(
    `- hair_density_state (hair journey): ${
      modifiers.hair_density_state ?? 'not assessed'
    }`,
  );
  modifierLines.push(
    `- hair_balding_pattern (hair journey): ${
      modifiers.hair_balding_pattern ?? 'not assessed'
    }`,
  );
  modifierLines.push(
    `- facial_hair_current_state (facial hair journey): ${
      modifiers.facial_hair_current_state ?? 'not assessed'
    }`,
  );

  return `Here is the user's facial structure assessment.

--- ASSESSMENT ---
- Body fat estimate: ${BODY_FAT_LABEL[assessment.body_fat_estimate]}
- Face-first distribution self-test: ${FACE_FIRST_DISTRIBUTION_LABEL[assessment.face_first_distribution]}
- Postural pattern (multi-select):
${posturalLines}
- Chin / jaw concern (multi-select, 'no_specific_concern' is exclusive): ${assessment.chin_jaw_concern.map((c) => CHIN_JAW_CONCERN_LABEL[c]).join('; ')}
- Facial puff baseline: ${FACIAL_PUFF_BASELINE_LABEL[assessment.facial_puff_baseline]}
- Cosmetic procedure openness: ${COSMETIC_PROCEDURE_OPENNESS_LABEL[assessment.cosmetic_procedure_openness]}

Notes from the user:
${assessment.notes ? `"${assessment.notes}"` : '(nothing volunteered)'}
--- END ASSESSMENT ---

--- MODIFIERS ---
${modifierLines.join('\n')}
--- END MODIFIERS ---

Write the four-section facial structure plan now. 280 words maximum. Use the exact H2 headings specified in the system prompt. Anchor on a SINGLE primary lever in "The next move". Do not narrate modifiers back. Do not name specific cosmetic procedure providers or clinics. Apply the cosmetic_procedure_openness gate strictly. If age < 30 AND chin_jaw_concern *includes* 'submental_fullness' or 'overall_softness' AND openness is 'actively_considering', explicitly warn against buccal fat removal.`;
}
