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
  buildSystemPromptFull,
  buildProactiveSuggestionAdvisory,
  CIRCUIT_BREAKER_ADVISORY,
  formatGoalsBlock,
  type GoalContext,
} from '@/lib/mister-p/prompt';
import {
  analyzeTopicCluster,
  shouldTriggerCircuitBreaker,
  shouldTriggerProactiveSuggestion,
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

  // Active goals for the user — injected into the system prompt so Mister P
  // can anchor answers to what they're actually working on.
  const { data: activeGoalRows } = await supabase
    .from('goals')
    .select('title, description, source_slug, goal_type, created_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  // Prior citation history — count how many past answers cited each slug.
  // Lets Mister P calibrate depth (user has seen this doc 4 times, skip the
  // foundations) without needing to re-explain from scratch.
  const { data: priorQueries } = await service
    .from('mister_p_queries')
    .select('citations')
    .eq('user_id', user.id)
    .not('citations', 'is', null);

  const citationCounts = new Map<string, number>();
  for (const row of priorQueries ?? []) {
    const citations = row.citations as Array<{ slug?: string }> | null;
    if (!Array.isArray(citations)) continue;
    // Count each slug once per query so a single answer citing 5 chunks of
    // doc 21 doesn't inflate the count artificially.
    const seenThisQuery = new Set<string>();
    for (const c of citations) {
      if (c?.slug && !seenThisQuery.has(c.slug)) {
        seenThisQuery.add(c.slug);
        citationCounts.set(c.slug, (citationCounts.get(c.slug) ?? 0) + 1);
      }
    }
  }

  const nowMs = Date.now();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const goals: GoalContext[] = (activeGoalRows ?? []).map((g) => {
    const createdAt = g.created_at ? new Date(g.created_at).getTime() : nowMs;
    const daysActive = Math.max(0, Math.floor((nowMs - createdAt) / MS_PER_DAY));
    const priorCitationCount = g.source_slug
      ? citationCounts.get(g.source_slug) ?? 0
      : 0;
    return {
      title: g.title,
      description: g.description ?? null,
      source_slug: g.source_slug ?? null,
      goal_type: (g.goal_type ?? 'process') as 'process' | 'outcome',
      daysActive,
      priorCitationCount,
    };
  });

  // Set of POV slugs the user has actually accepted as goals. Mister P
  // should only point to a full POV doc when it backs one of the user's
  // own goals — otherwise the /povs index wouldn't have it listed and
  // the nudge would dead-end.
  const userGoalSlugs = new Set<string>();
  for (const g of goals) {
    if (g.source_slug) userGoalSlugs.add(g.source_slug);
  }

  // Advisory selection — at most one advisory per turn. Circuit breaker
  // takes priority because it signals an obsessive loop that overrides the
  // proactive-suggestion nudge. In practice the two are mutually exclusive
  // (circuit breaker needs a familiar topic; proactive suggestion needs a
  // new one), but the explicit priority defends against overlap.
  let advisory: string | null = null;
  if (triggerCircuitBreaker) {
    advisory = CIRCUIT_BREAKER_ADVISORY;
  } else if (
    shouldTriggerProactiveSuggestion(topicAnalysis) &&
    chunks.length > 0 &&
    userGoalSlugs.has(chunks[0].doc_slug)
  ) {
    advisory = buildProactiveSuggestionAdvisory(chunks[0].doc_title, chunks[0].doc_slug);
  }

  const goalsBlock = formatGoalsBlock(goals);
  const systemPrompt = buildSystemPromptFull(contextBlock, advisory, goalsBlock);

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
