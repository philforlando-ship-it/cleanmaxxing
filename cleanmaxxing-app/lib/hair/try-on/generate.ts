// Hair try-on generation via OpenAI Responses API with the
// image_generation tool. Takes the user's baseline face photo + the
// transformation prompt, returns a generated image as a Buffer.
//
// Why Responses API not images.edit: edit endpoint with gpt-image-1 was
// blocked on this account (org verification). The Responses API uses the
// same gpt-image-1 backend but through a different surface — so far the
// only path that accepts image inputs without the verification gate.
//
// Cost rough estimate per call: $0.04-0.10 depending on output quality.
// The orchestrating text model (gpt-4.1-mini) adds negligible cost.

import OpenAI from 'openai';

const ORCHESTRATION_MODEL = 'gpt-4.1-mini';

export type TryOnGenerationResult = {
  imageBuffer: Buffer;
  modelUsed: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

export async function generateTryOnImage(args: {
  baselinePhotoBuffer: Buffer;
  baselinePhotoMime: string;
  prompt: string;
}): Promise<TryOnGenerationResult> {
  const client = new OpenAI();

  // Encode the baseline photo as a data URL so the Responses API can
  // accept it as an input image without a separate upload step.
  const base64 = args.baselinePhotoBuffer.toString('base64');
  const dataUrl = `data:${args.baselinePhotoMime};base64,${base64}`;

  // The OpenAI Responses API shape varies between SDK versions. Cast
  // to the broader request type — we know the image_generation tool
  // and input_image content part are the right shapes; TypeScript
  // narrowing on the response side is what matters more.
  const response = (await client.responses.create({
    model: ORCHESTRATION_MODEL,
    tools: [{ type: 'image_generation' }],
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_image', image_url: dataUrl, detail: 'high' },
          { type: 'input_text', text: args.prompt },
        ],
      },
    ],
  } as unknown as Parameters<typeof client.responses.create>[0])) as unknown as {
    output?: Array<{
      type?: string;
      result?: string | null;
    }>;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
    };
  };

  // Pull the first image_generation_call output. The Responses API
  // returns each tool invocation as an output item; the result is a
  // base64 image string.
  const imageItem = response.output?.find(
    (o) => o.type === 'image_generation_call',
  );
  const b64 = imageItem?.result ?? null;
  if (!b64) {
    throw new Error(
      'Responses API returned no image (image_generation_call missing or empty)',
    );
  }

  const imageBuffer = Buffer.from(b64, 'base64');

  return {
    imageBuffer,
    modelUsed: 'gpt-image-1 (via responses)',
    inputTokens: response.usage?.input_tokens ?? null,
    outputTokens: response.usage?.output_tokens ?? null,
  };
}
