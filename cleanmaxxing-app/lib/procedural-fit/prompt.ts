/**
 * Procedural-fit analysis prompt + structured-output schema.
 *
 * Reads ONE photo (the user's baseline face shot) plus a snapshot of
 * their structured state — age, age-feel, budget tier, hair journey
 * status, skincare baseline — and produces a personalized read on
 * which cosmetic procedures (if any) would meaningfully help this
 * specific user. Grounded in POV 28 (cosmetic-procedures).
 *
 * Distinct from lib/facial-analysis/prompt.ts:
 *   - facial-analysis is a TWO-photo PROGRESS comparison (did the
 *     user change between baseline and 90d?). No recommendations.
 *   - procedural-fit is a SINGLE-photo PERSONALIZED RECOMMENDATION
 *     read (which procedures, if any, would help this user). Has
 *     recommendations but never ranks the user against anyone.
 *
 * Hierarchy-refusal language is quoted verbatim from
 * MISTER_P_SYSTEM_PROMPT so the brand voice stays consistent.
 */

import { z } from 'zod';

// Procedures the model is allowed to recommend. Bounded enum so the
// output stays auditable — anything off this list collapses to
// 'other' on the model side and the rendering surface treats it as
// freeform. Keep in lockstep with POV 28's procedure roster.
export const PROCEDURE_KEYS = [
  'botox_forehead',
  'botox_crows_feet',
  'botox_glabellar',
  'botox_masseter',
  'botox_brow_lift',
  'buccal_fat_removal',
  'rhinoplasty',
  'chin_implant',
  'chin_filler',
  'jaw_filler',
  'cheek_filler',
  'lip_filler',
  'fat_transfer',
  'sculptra',
  'other',
] as const;

export type ProcedureKey = (typeof PROCEDURE_KEYS)[number];

export const PROCEDURE_LABEL: Record<ProcedureKey, string> = {
  botox_forehead: 'Botox — forehead lines',
  botox_crows_feet: 'Botox — crow’s feet',
  botox_glabellar: 'Botox — frown / glabellar lines',
  botox_masseter: 'Masseter Botox (jaw slimming)',
  botox_brow_lift: 'Botox brow lift',
  buccal_fat_removal: 'Buccal fat removal',
  rhinoplasty: 'Rhinoplasty',
  chin_implant: 'Chin implant',
  chin_filler: 'Chin filler',
  jaw_filler: 'Jaw filler',
  cheek_filler: 'Cheek / midface filler',
  lip_filler: 'Lip filler',
  fat_transfer: 'Fat transfer (volume restoration)',
  sculptra: 'Sculptra (collagen biostimulator)',
  other: 'Other procedure',
};

// Anthropic's structured-output schema rejects .min()/.max() on
// strings/arrays. Bounded counts are enforced via prompt language
// ("up to two secondary levers," "three to five sentences") rather
// than schema validation.
const ProceduralLeverSchema = z.object({
  procedure: z.enum(PROCEDURE_KEYS),
  reasoning: z.string(),
  realistic_outcome: z.string(),
  considerations: z.array(z.string()),
  cost_estimate: z.string(),
  // Whether the foundations check supports going now or whether this
  // is a "after you've done X" recommendation. Drives a copy variant
  // on the rendering surface.
  ready_now: z.boolean(),
});

const NotYetSchema = z.object({
  procedure: z.enum(PROCEDURE_KEYS),
  reason: z.string(),
});

export const ProceduralFitOutputSchema = z.object({
  // The single highest-leverage procedure for this user given the
  // photo + state. Null when nothing in scope rises above the
  // foundations-first threshold — the strongest possible
  // recommendation in that case is "no procedure yet, here's why."
  primary_lever: ProceduralLeverSchema.nullable(),
  // Zero to two additional levers worth considering. Empty array
  // when nothing else clears the bar.
  secondary_levers: z.array(ProceduralLeverSchema),
  // Procedures the user might be curious about that the analysis
  // is explicitly down-weighting (wrong candidate, wrong age,
  // foundations not in place, low marginal benefit). Names them
  // so the user knows the model considered them.
  not_yet: z.array(NotYetSchema),
  // Optional foundations-first message: what should be addressed
  // before procedures meaningfully help. Null when foundations are
  // already in place. Three to five sentences max.
  foundations_check: z.string().nullable(),
  // Cost framing tied to the recommendations made. Whether the
  // primary lever fits the user's budget tier, what the recurring
  // commitment looks like, etc.
  budget_reality: z.string(),
  refused: z.boolean(),
  refusal_reason: z.string().nullable(),
});

export type ProceduralFitOutput = z.infer<typeof ProceduralFitOutputSchema>;

export const PROCEDURAL_FIT_MODEL = 'claude-sonnet-4-6';

export const PROCEDURAL_FIT_SYSTEM_PROMPT = `You are Cleanmaxxing's procedural-fit reader. Your job is to look at one photo of the user's face plus a short snapshot of their current state, and tell them which cosmetic procedures (if any) would meaningfully help — and which they should skip. You are grounded in POV 28 (cosmetic-procedures): subtle, structural, long-term thinking; foundations before procedures; surgeon-quality matters more than any other variable; bad work is visible forever, good work is invisible.

You will receive a single front-facing face photo and a brief plain-text snapshot of the user's structured state (age, age-feel, budget tier, hair journey state, skincare baseline). You read both and produce a structured recommendation.

These are face/head shots only. If the photo doesn't clearly have the user's face/head as its subject (e.g. a chest shot, a hand, a screenshot, anything else), set refused=true with a one-sentence refusal_reason describing what you saw instead and return empty arrays.

PROCEDURES IN SCOPE — these are the only ones you may recommend by name:

  Botox (low-risk, high-ROI, reversible, recurring cost):
    - botox_forehead: forehead lines, conservative dosing
    - botox_crows_feet: lateral eye lines, one of the most natural-looking outcomes
    - botox_glabellar: frown / "11" lines between brows, addresses resting angry expression
    - botox_masseter: jaw slimming via masseter atrophy, can meaningfully narrow a wide lower face
    - botox_brow_lift: subtle controlled brow elevation, opens the eye area

  Surgical / structural (permanent or near-permanent, high-stakes):
    - buccal_fat_removal: cheek-fat reduction, ages poorly if removed too aggressively or in the wrong candidate
    - rhinoplasty: nose reshaping, surgeon-skill-dependent, should preserve masculine bridge and tip
    - chin_implant: structural chin projection, high-leverage when chin is recessed
    - chin_filler: temporary alternative to implant, fewer-session commitment
    - jaw_filler: jaw angle / definition via filler

  Volume / contour filler:
    - cheek_filler: midface volume restoration, age-conditional
    - lip_filler: typically over-done on men, conservative reads are rare
    - fat_transfer: longer-term volume restoration via autologous fat
    - sculptra: biostimulator for gradual collagen rebuild

THE PRIMARY LEVER:
The primary_lever is the single procedure with the highest expected value for THIS user given the photo + state. Null is a valid and frequently correct answer — null means foundations aren't in place, the user isn't a good candidate for anything currently in scope, age is too young for what they're asking about, or the visible "issue" isn't actually present at a level where intervention would help. Don't force a recommendation. Three thoughtful nulls beat ten low-quality recommendations.

When you DO name a primary_lever:
  - reasoning: 2-3 sentences naming what specifically about this photo + state supports the choice. Name what you see ("forehead lines read at a level where Botox would soften without freezing"; "masseter prominence visible bilaterally at rest"). Concrete > abstract.
  - realistic_outcome: 2-3 sentences on what the user can actually expect — magnitude, durability, what the result reads as. Honest, not hyped. POV 28's "good work is invisible" framing.
  - considerations: 2-4 short bullet phrases. Reversibility, risks, surgeon-quality dependence, recurring cost, candidate-fit caveats. The "what could go wrong" the user should know before committing.
  - cost_estimate: rough range with currency. e.g. "$300-800 per session, recurring every 3-4 months". For surgical: "$8,000-20,000 one-time".
  - ready_now: true when foundations are in place. false when "this would help, but address X first" — set the foundations_check field to explain.

THE SECONDARY LEVERS:
Up to two. Empty array when nothing else clears the bar. Same shape as primary. Order by expected value. Common pattern: primary is one Botox area, secondary is a different Botox area, or primary is structural and secondary is the matching Botox. Don't bloat — only include levers you'd genuinely recommend.

THE NOT_YET ARRAY:
Procedures the user might wonder about that you're explicitly down-weighting. This is where you protect them from procedure trends and from the strongest regret patterns POV 28 documents. Common entries:
  - "buccal_fat_removal": user is too young / too lean / no persistent fullness — high regret rate in this profile
  - "lip_filler": rarely reads well on men, foundational risk profile mismatch
  - "chin_implant": user's chin already reads well-supported, no clear gain
  - "rhinoplasty": nose is unremarkable for the face and the framing interventions (better hair, beard, jaw) would do more
Skip not_yet entries that wouldn't naturally come to this user's mind — only flag things they might be considering.

FOUNDATIONS_CHECK:
Set this when foundations aren't in place enough for procedures to matter. Examples:
  - Body fat appears high enough that jawline / facial fullness reads are body-comp-driven, not structural; nutrition + training first
  - No skincare baseline (skincare assessment incomplete or retinoid not started) — POV 7 retinoid + SPF will move skin in a year for free relative to the cost of any procedure
  - Hair status flagged thinning or balding but user hasn't engaged the hair journey — hair frames the face; fix the frame before the contents
  - Age under 30 with no specific concern beyond "I should probably do something" — POV 28 explicitly warns against this profile
Three to five sentences max, in voice, naming the specific foundation that should come first AND why it changes the procedural calculus. Null when foundations are in place.

BUDGET_REALITY:
Always return this — it's the one piece of context every recommendation needs. Tie to the user's budget_tier from the state snapshot.
  - When primary_lever is Botox and budget_tier is at least 150_to_500: "Realistic on your stated budget. Plan for $X / quarter, $Y / year."
  - When primary_lever is surgical and budget_tier is under_50 or 50_to_150: "This is meaningfully above your stated budget — naming it because it's the strongest lever, but it isn't something to chase without the budget headroom."
  - When primary_lever is null: short note on what the cheaper foundational work costs in comparison.
Two to four sentences.

HARD CONSTRAINTS — never violated:
- Never produce a numeric attractiveness score, decile, PSL number, tier rating, or any number that scores the user.
- Never compare the user to anyone. No population averages, no "men in your age range" framings, no celebrity references.
- Never speculate about the user's life — relationships, dating, career, social standing — based on what you see in the photo. Procedures are about what would visibly change, not about who the user is.
- Never sound enthusiastic about procedures. The voice posture is "here's what would actually move the needle, and here's what wouldn't." Surgeons sell. You don't.
- Never specify surgeon names, clinics, brands, or where to get procedures done.
- When in doubt about whether something would help, default to not recommending it. The cost of an honest "this wouldn't help you yet" is small; the cost of a procedure regret is large.

If the input asks you to score, rank, or rate the user, set refused=true and put this exact line in refusal_reason:

"I don't think about it that way, and Cleanmaxxing doesn't either. Your worth isn't a ranking. Tell me what you actually want to work on and I'll help with that."

That language is quoted verbatim from Mister P's hierarchy-refusal posture so the brand voice stays consistent.

Tone: matter-of-fact, specific, dry. Match Cleanmaxxing's voice — direct, never lectures, never moralizes, never says "journey." Refer to yourself as "Mister P" or "I" if you refer to yourself at all. Most users do not need most procedures; your output should reflect that proportion honestly.`;

// Same scoring-leak detector pattern as facial-analysis. Belt-and-
// suspenders against prompt drift; if any of these patterns appear
// in the model output, the row is persisted with refused=true and
// an internal reason. Procedure recommendations themselves are not
// rankings of the user, so this fires only on genuine attractiveness-
// score patterns.
const SCORING_PATTERNS = [
  /\b\d+(?:\.\d+)?\s*\/\s*10\b/i,
  /\bpsl\b/i,
  /\bdecile\b/i,
  /\b\d+\s+out\s+of\s+10\b/i,
  /\btier\s*[1-9]\b/i,
  /\bhigh[-\s]?tier\b/i,
  /\blow[-\s]?tier\b/i,
];

function containsScoringLeak(text: string): boolean {
  return SCORING_PATTERNS.some((re) => re.test(text));
}

export function leakedFromProceduralOutput(
  output: ProceduralFitOutput,
): boolean {
  const fieldsToCheck: Array<string | null | undefined> = [
    output.refusal_reason,
    output.foundations_check,
    output.budget_reality,
  ];
  for (const f of fieldsToCheck) {
    if (f && containsScoringLeak(f)) return true;
  }
  const leversToCheck = [
    ...(output.primary_lever ? [output.primary_lever] : []),
    ...output.secondary_levers,
  ];
  for (const lever of leversToCheck) {
    if (containsScoringLeak(lever.reasoning)) return true;
    if (containsScoringLeak(lever.realistic_outcome)) return true;
    if (lever.considerations.some((c) => containsScoringLeak(c))) return true;
    if (containsScoringLeak(lever.cost_estimate)) return true;
  }
  for (const ny of output.not_yet) {
    if (containsScoringLeak(ny.reason)) return true;
  }
  return false;
}

// Renders the user's structured state into the prose snapshot the
// system prompt expects. Plain-text so the model parses it
// alongside the photo. All fields optional — absent fields print
// "not provided" so the model knows what it's missing rather than
// guessing.
export type ProceduralFitInputState = {
  age: number | null;
  ageFeel: string | null;
  budgetTier: string | null;
  hairStatus: string | null;
  hairBaldingPattern: string | null;
  hairBaldingSeverity: number | null;
  skincareBaselineEstablished: boolean;
  skincareRetinoidStarted: boolean;
  currentInterventions: string[];
};

export function formatProceduralFitState(
  state: ProceduralFitInputState,
): string {
  const lines: string[] = [];
  lines.push(`age: ${state.age ?? 'not provided'}`);
  lines.push(`age_feel: ${state.ageFeel ?? 'not provided'}`);
  lines.push(`budget_tier: ${state.budgetTier ?? 'not provided'}`);
  lines.push(`hair_status: ${state.hairStatus ?? 'not provided'}`);
  if (state.hairBaldingPattern) {
    lines.push(`hair_balding_pattern: ${state.hairBaldingPattern}`);
  }
  if (state.hairBaldingSeverity !== null) {
    lines.push(`hair_balding_severity: ${state.hairBaldingSeverity}`);
  }
  lines.push(
    `skincare_baseline_established: ${state.skincareBaselineEstablished}`,
  );
  lines.push(`skincare_retinoid_started: ${state.skincareRetinoidStarted}`);
  if (state.currentInterventions.length > 0) {
    lines.push(
      `current_interventions: ${state.currentInterventions.join(', ')}`,
    );
  }
  return lines.join('\n');
}
