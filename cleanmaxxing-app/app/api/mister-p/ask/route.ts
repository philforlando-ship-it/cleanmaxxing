import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  embedQuestion,
  retrieveChunksWithEmbedding,
  formatChunksForPrompt,
} from '@/lib/mister-p/retrieve';
import {
  buildSystemPromptWithAdvisory,
  CIRCUIT_BREAKER_ADVISORY,
} from '@/lib/mister-p/prompt';
import {
  analyzeTopicCluster,
  shouldTriggerCircuitBreaker,
} from '@/lib/mister-p/topic';

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

  // Embed the question once — used for both chunk retrieval and topic clustering.
  const questionEmbedding = await embedQuestion(question);

  // Retrieve relevant POV chunks for RAG context.
  const chunks = await retrieveChunksWithEmbedding(questionEmbedding, 5);
  const contextBlock = formatChunksForPrompt(chunks);

  // Topic cluster analysis — feeds §13 circuit breaker.
  const service = createServiceClient();
  const topicAnalysis = await analyzeTopicCluster(
    service as unknown as Parameters<typeof analyzeTopicCluster>[0],
    user.id,
    questionEmbedding
  );
  const triggerCircuitBreaker = shouldTriggerCircuitBreaker(topicAnalysis);

  const advisory = triggerCircuitBreaker ? CIRCUIT_BREAKER_ADVISORY : null;
  const systemPrompt = buildSystemPromptWithAdvisory(contextBlock, advisory);

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: systemPrompt,
    prompt: question,
    temperature: 0.3,
    onFinish: async ({ text }) => {
      const citations = chunks.map((c) => ({ slug: c.doc_slug, title: c.doc_title }));
      const wasRefused =
        /That's not something I cover yet|That's not something I cover|Not something I'll help with|can't help|hard line|off-limits|off the table/i.test(text);

      await service.from('mister_p_queries').insert({
        user_id: user.id,
        question,
        answer: text,
        citations,
        was_refused: wasRefused,
        refusal_reason: wasRefused ? 'out_of_scope_or_hard_refusal' : null,
        topic_embedding: questionEmbedding as unknown as string,
      });
    },
  });

  return result.toTextStreamResponse();
}
