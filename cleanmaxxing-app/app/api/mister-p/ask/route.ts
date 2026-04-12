import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { retrieveChunks, formatChunksForPrompt } from '@/lib/mister-p/retrieve';
import { buildSystemPrompt } from '@/lib/mister-p/prompt';

const RequestSchema = z.object({
  question: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { question } = parsed.data;

  // Require auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Retrieve relevant chunks
  const chunks = await retrieveChunks(question, 5);
  const contextBlock = formatChunksForPrompt(chunks);
  const systemPrompt = buildSystemPrompt(contextBlock);

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: systemPrompt,
    prompt: question,
    temperature: 0.3,
    onFinish: async ({ text }) => {
      // Log query (fire-and-forget)
      const service = createServiceClient();
      const citations = chunks.map((c) => ({ slug: c.doc_slug, title: c.doc_title }));
      const wasRefused = /That's not something I cover yet|Not something I'll help with/.test(text);

      await service.from('mister_p_queries').insert({
        user_id: user.id,
        question,
        answer: text,
        citations,
        was_refused: wasRefused,
        refusal_reason: wasRefused ? 'out_of_scope_or_hard_refusal' : null,
      });
    },
  });

  return result.toTextStreamResponse();
}
