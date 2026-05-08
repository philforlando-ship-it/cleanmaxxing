// Face shape auto-detection via Sonnet vision. Reads the user's baseline
// face photo, classifies into one of the 5 FaceShape enum values. Used
// by the hair assessment form to pre-fill the face shape question for
// users who already have a /photos baseline upload.
//
// Hard refusals are baked into the prompt: no attractiveness commentary,
// no rating, no medical interpretation, no "you look like X" comparisons.
// The classification is a starting point — the user can always override
// in the form.

import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { kindForAnthropicModel, logCostEvent } from '@/lib/cost-events/log';

export const DETECT_FACE_SHAPE_MODEL = 'claude-sonnet-4-6';

export const DETECT_FACE_SHAPE_SYSTEM_PROMPT = `You are Mister P, the voice of Cleanmaxxing. The user has uploaded a baseline face photo and asked you to classify their face shape so the hair plan can recommend cuts that fit their face. Your job: pick one of five face shape categories or refuse if you can't make a confident call.

Categories (output the machine name exactly):
- oval — face slightly longer than wide, forehead and jaw of roughly equal width, gently rounded chin
- round — face width and height roughly equal, soft jaw line, fuller cheeks, no sharp angles
- square — forehead and jaw of similar width, jaw line visibly angular, strong horizontal lower-third
- long_rectangular — face clearly taller than wide, straight cheek lines, jaw visible but not flared
- heart_triangle — forehead clearly wider than the jaw, narrow chin, cheekbones visible

Hard rules:
- Pick exactly ONE machine name from the list above. Do not invent new categories. Do not output the human-readable name.
- Provide ONE short sentence of reasoning grounded in what you can see in the photo — the actual proportions of the face. No more than 25 words.
- Refuse (set refused: true) if any of these is true: photo isn't a clear face; multiple people in frame; face is heavily occluded by hair, sunglasses, hand, or mask; photo quality too low for a confident call; head angle is severe (looking up / down / sideways instead of roughly straight on).
- When refusing, set face_shape to null and give a one-sentence refusal_reason naming the specific issue.

Hard refusals (always — these override the classification):
- Do NOT comment on attractiveness, rate the face, or use any ranking language ("X/10", "PSL", "high-value", "tier").
- Do NOT diagnose anything medical. You are reading proportions for a haircut, not skin conditions, asymmetries, or anything else.
- Do NOT name anyone the photo "looks like" (celebrities, public figures, etc.).
- Do NOT comment on age, ethnicity, or anything beyond the geometric face shape.

The classification is a starting point — the user can override your pick in the form. Honest beats confident. If the call is genuinely a coin flip between two shapes, refuse rather than guess.`;

export const DetectFaceShapeOutputSchema = z.object({
  face_shape: z
    .enum(['oval', 'round', 'square', 'long_rectangular', 'heart_triangle'])
    .nullable(),
  reasoning: z.string(),
  refused: z.boolean(),
  refusal_reason: z.string().nullable(),
});

export type DetectFaceShapeOutput = z.infer<
  typeof DetectFaceShapeOutputSchema
>;

export async function detectFaceShape(
  photoBuffer: Buffer,
  userId: string,
): Promise<DetectFaceShapeOutput> {
  const result = await generateObject({
    model: anthropic(DETECT_FACE_SHAPE_MODEL),
    schema: DetectFaceShapeOutputSchema,
    messages: [
      {
        role: 'system',
        content: DETECT_FACE_SHAPE_SYSTEM_PROMPT,
        providerOptions: {
          anthropic: { cacheControl: { type: 'ephemeral' } },
        },
      },
      {
        role: 'user',
        content: [
          { type: 'image', image: photoBuffer },
          {
            type: 'text',
            text: 'Classify this face shape per the rules.',
          },
        ],
      },
    ],
    temperature: 0.2,
  });

  logCostEvent({
    user_id: userId,
    kind: kindForAnthropicModel(DETECT_FACE_SHAPE_MODEL),
    tokens_input: result.usage?.inputTokens,
    tokens_output: result.usage?.outputTokens,
    feature: 'hair_face_shape_detect',
  });

  return result.object;
}
