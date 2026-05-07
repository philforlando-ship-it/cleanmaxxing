// Style Stage 1 generator. Single Sonnet call producing a short
// markdown audit recommendation from the user's chip selections +
// profile modifiers. Returns plain markdown — no parser.

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getUserProfile } from '@/lib/profile/service';
import {
  ARCHETYPE_LABEL,
  type ClosetAuditSelections,
  type StyleAssessment,
} from './types';
import { chipsForArchetype } from './closet-audit-content';
import { buildStyleStage1SystemPrompt } from './stage-1-prompt';
import { saveStyleStage1Audit } from './service';

const STAGE_1_MODEL = 'claude-sonnet-4-6';

export async function generateAndSaveStyleStage1(
  supabase: SupabaseClient,
  userId: string,
  assessment: StyleAssessment,
  selections: ClosetAuditSelections,
): Promise<{ audit_text: string }> {
  const profile = await getUserProfile(supabase, userId);
  const { data: userRow } = await supabase
    .from('users')
    .select('age')
    .eq('id', userId)
    .maybeSingle();
  const age = (userRow as { age: number | null } | null)?.age ?? null;

  const system = buildStyleStage1SystemPrompt();
  const userPrompt = formatStage1Prompt(
    assessment,
    selections,
    {
      bf_pct_self_estimate: profile.bf_pct_self_estimate,
      budget_tier: profile.budget_tier,
      current_interventions: profile.current_interventions,
      age,
    },
  );

  const { text } = await generateText({
    model: anthropic(STAGE_1_MODEL),
    system,
    prompt: userPrompt,
    temperature: 0.5,
  });

  const auditText = text.trim();
  if (auditText.length === 0) {
    throw new Error('Stage 1 generation produced empty output.');
  }

  await saveStyleStage1Audit(supabase, userId, {
    chip_selections: selections,
    audit_text: auditText,
  });

  return { audit_text: auditText };
}

function formatStage1Prompt(
  assessment: StyleAssessment,
  selections: ClosetAuditSelections,
  modifiers: {
    bf_pct_self_estimate: string | null;
    budget_tier: string | null;
    current_interventions: string[];
    age: number | null;
  },
): string {
  const chips = chipsForArchetype(assessment.target_archetype);
  const chipLookup = new Map(chips.map((c) => [c.slug, c.label]));

  // The UI now collects two states per chip — "owned" and "owned but
  // wrong" — and treats anything not in the selection as "doesn't own."
  // The wire format reuses the legacy ClosetAuditDirection: 'keep' =
  // owned, 'replace' = owned but wrong. The legacy 'cut' direction is
  // no longer emitted but pre-existing rows fold into 'owned but wrong'
  // for back-compat.
  const ownedLines: string[] = [];
  const wrongLines: string[] = [];
  const ownedSlugs = new Set<string>();
  for (const [slug, direction] of Object.entries(selections)) {
    const label = chipLookup.get(slug) ?? slug;
    const line = `- ${label}`;
    ownedSlugs.add(slug);
    if (direction === 'keep') ownedLines.push(line);
    else wrongLines.push(line); // 'replace' or legacy 'cut'
  }
  const dontOwnLines = chips
    .filter((c) => !ownedSlugs.has(c.slug))
    .map((c) => `- ${c.label}`);

  const modifierLines = [
    `- bf_pct_self_estimate: ${modifiers.bf_pct_self_estimate ?? 'not set'}`,
    `- budget_tier: ${modifiers.budget_tier ?? 'not set'}`,
    `- current_interventions: ${
      modifiers.current_interventions.length === 0
        ? 'none'
        : modifiers.current_interventions.join(', ')
    }`,
    `- age: ${modifiers.age ?? 'not set'}`,
  ];

  return `The user is moving toward archetype: ${ARCHETYPE_LABEL[assessment.target_archetype]}.

--- WHAT THEY OWN ---
${ownedLines.length === 0 ? '(none)' : ownedLines.join('\n')}
--- WHAT THEY OWN BUT FLAGGED AS WRONG (wrong fit, color, dated) ---
${wrongLines.length === 0 ? '(none)' : wrongLines.join('\n')}
--- WHAT THEY DON'T OWN (gaps in the archetype catalog) ---
${dontOwnLines.length === 0 ? '(none — they own every catalog piece)' : dontOwnLines.join('\n')}

--- MODIFIERS ---
${modifierLines.join('\n')}
--- END MODIFIERS ---

Write the audit recommendation now. Two sections, exact H2 headings as specified. 160 words maximum.`;
}
