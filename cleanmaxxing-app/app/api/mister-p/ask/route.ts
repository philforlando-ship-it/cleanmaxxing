import { NextRequest, NextResponse } from 'next/server';
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  embedQuestion,
  retrievePersonalized,
  formatChunksForPrompt,
} from '@/lib/mister-p/retrieve';
import { getSemanticContextText } from '@/lib/mister-p/semantic-context';
import {
  buildSystemPromptFull,
  buildProactiveSuggestionAdvisory,
  CIRCUIT_BREAKER_ADVISORY,
  formatGoalsBlock,
  formatActiveGoalFocusBlock,
  formatUserStateBlock,
  formatConversationHistoryBlock,
  type GoalContext,
} from '@/lib/mister-p/prompt';
import {
  analyzeTopicCluster,
  shouldTriggerCircuitBreaker,
  shouldTriggerProactiveSuggestion,
} from '@/lib/mister-p/topic';
import { getMisterPUserState } from '@/lib/mister-p/user-state';
import { getRecentConversation } from '@/lib/mister-p/conversation';

const RequestSchema = z.object({
  question: z.string().min(1).max(2000),
  // Optional goal_id binds this turn (and the persisted row) to a
  // specific goal's chat thread. Omit for the /today global chat.
  goal_id: z.string().uuid().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { question, goal_id: requestedGoalId = null } = parsed.data;

  // Require auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate goal_id ownership before we let it scope anything. A
  // goal_id from another user must never write into this user's
  // thread or read their per-goal history. Set to null on any miss
  // rather than 400ing — the chat still works, just unscoped.
  let goalId: string | null = null;
  if (requestedGoalId) {
    const { data: ownedGoal } = await supabase
      .from('goals')
      .select('id')
      .eq('id', requestedGoalId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (ownedGoal) goalId = requestedGoalId;
  }

  // Embed the question once — used for retrieval and topic clustering.
  const questionEmbedding = await embedQuestion(question);

  // Semantic-context augmentation. If the user has a specific_thing
  // set or recent reflection notes, embed that text separately and
  // pass it into retrieval as a secondary query vector. The retrieval
  // layer finds relevant chunks automatically — Mister P does not need
  // to be told "the user is struggling with evening routines."
  //
  // Skipped for goal-scoped chats. The user explicitly opened the
  // thread from a specific goal; the focused goal's embedding (built
  // below) is the right secondary signal there. Pulling in broad
  // life-context retrieval too lets reflection-note language bleed
  // across topic boundaries — e.g. a passing peptide reference in a
  // weekly note keeps surfacing in the jawline thread, even after
  // the chat is cleared, because the note text persists outside
  // mister_p_queries.
  const contextText = goalId
    ? null
    : await getSemanticContextText(supabase, user.id);
  const contextEmbedding = contextText
    ? await embedQuestion(contextText)
    : null;

  const service = createServiceClient();

  // Prior citation history — feeds the retrieval reranker (de-ranks
  // docs the user has been shown 3+ times, boosts unseen docs) and the
  // active-goals block (so Mister P can calibrate depth on familiar
  // source docs).
  const { data: priorQueries } = await service
    .from('mister_p_queries')
    .select('citations')
    .eq('user_id', user.id)
    .not('citations', 'is', null);

  const citationCounts = new Map<string, number>();
  for (const row of priorQueries ?? []) {
    const citations = row.citations as Array<{ slug?: string }> | null;
    if (!Array.isArray(citations)) continue;
    // Count each slug once per query so a single answer citing 5 chunks
    // of doc 21 doesn't inflate the count artificially.
    const seenThisQuery = new Set<string>();
    for (const c of citations) {
      if (c?.slug && !seenThisQuery.has(c.slug)) {
        seenThisQuery.add(c.slug);
        citationCounts.set(c.slug, (citationCounts.get(c.slug) ?? 0) + 1);
      }
    }
  }

  // Active goals for the user — injected into the system prompt so Mister P
  // can anchor answers to what they're actually working on. We pull `id`
  // alongside the rest because when the chat is opened from a goal page
  // we need to match the request's goal_id back to the right entry to
  // build the focus block below.
  //
  // Loaded BEFORE retrieval so the focused goal's title + description
  // can seed a third query vector (focus embedding) and its
  // source_slug can drive the per-slug rerank bonus. Prior structure
  // ran retrieval first and goals second; that order meant retrieval
  // had no goal context, so vague questions ("tell me more about
  // this") drifted to whatever happened to land near a generic
  // question vector.
  const { data: activeGoalRows } = await supabase
    .from('goals')
    .select('id, title, description, source_slug, goal_type, created_at')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true });

  const nowMs = Date.now();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // Build goals + parallel id array. GoalContext deliberately omits id
  // (the goals block is for prompt context, not for routing decisions
  // downstream), so the id mapping lives here only.
  const goalIds: string[] = [];
  const goals: GoalContext[] = (activeGoalRows ?? []).map((g) => {
    goalIds.push(g.id as string);
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

  // Identify the focused goal (if any) BEFORE retrieval. Used twice:
  // once to seed retrieval (focus embedding + slug-bonus reranking),
  // once to inject the prompt's USER'S CURRENT FOCUS block further
  // down. Goals query above is filtered to active; a goalId pointing
  // to a completed/abandoned goal won't match here, which is fine.
  const focusedGoalIndex = goalId ? goalIds.indexOf(goalId) : -1;
  const focusedGoal: GoalContext | null =
    focusedGoalIndex >= 0 ? goals[focusedGoalIndex] : null;

  // Focus embedding: vector representation of "what this goal is
  // about" so vague questions still anchor to relevant chunks.
  // Combined with focusedSlug bonus in retrieve, this prevents the
  // "tell me more about this" → unrelated drift that the prompt-only
  // focus block alone couldn't fix.
  const focusText = focusedGoal
    ? focusedGoal.description
      ? `${focusedGoal.title}. ${focusedGoal.description}`
      : focusedGoal.title
    : null;
  const focusEmbedding = focusText ? await embedQuestion(focusText) : null;

  // Personalized retrieval: question + optional context + optional
  // focus embeddings merged with dedupe, then reranked by slug
  // citation counts (unseen +0.04, 3+-cited decays down to -0.15)
  // and a focused-slug bonus (+0.10) when the chat is goal-scoped.
  // Returns the top 5 for the prompt's retrieved-context block.
  const chunks = await retrievePersonalized(questionEmbedding, {
    contextEmbedding,
    focusEmbedding,
    focusedSlug: focusedGoal?.source_slug ?? null,
    citationCounts,
    returnCount: 5,
  });
  const contextBlock = formatChunksForPrompt(chunks);

  // Topic cluster analysis — feeds §13 circuit breaker.
  const topicAnalysis = await analyzeTopicCluster(
    service as unknown as Parameters<typeof analyzeTopicCluster>[0],
    user.id,
    questionEmbedding
  );
  const triggerCircuitBreaker = shouldTriggerCircuitBreaker(topicAnalysis);

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

  // The focused goal was already resolved above (before retrieval) so
  // both the retrieval bias and this prompt block use the same source
  // of truth. If no goal is in focus, the block returns null and is
  // dropped from the assembled prompt.
  const activeGoalFocusBlock = formatActiveGoalFocusBlock(focusedGoal);

  // Behavioral state — specific_thing, tenure, weekly completion,
  // confidence trajectory, stuck dimensions. Cheap to fetch alongside
  // everything else already on this request; the prompt-side copy
  // enforces "context only, don't narrate it back."
  const userState = await getMisterPUserState(supabase, user.id);
  const userStateBlock = formatUserStateBlock(userState);

  // Rolling conversation history — scoped to the current thread.
  // When goalId is set, we load up to 15 prior Q&A pairs from that
  // goal's thread; otherwise we load up to 8 pairs from the global
  // (goal_id IS NULL) /today thread. Per-goal and global histories
  // are kept disjoint so Mister P doesn't bleed unrelated topic
  // context into a focused goal conversation. Uses the authed client
  // so RLS on mister_p_queries applies; the service client would
  // bypass it.
  const recentPairs = await getRecentConversation(supabase, user.id, {
    goalId,
  });
  const conversationHistoryBlock = formatConversationHistoryBlock(recentPairs);

  const systemPrompt = buildSystemPromptFull(
    contextBlock,
    advisory,
    goalsBlock,
    userStateBlock,
    conversationHistoryBlock,
    activeGoalFocusBlock,
  );

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
        goal_id: goalId,
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
