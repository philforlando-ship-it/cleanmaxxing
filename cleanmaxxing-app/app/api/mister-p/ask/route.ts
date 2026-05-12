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
  formatJourneyStateBlock,
  formatUserStateBlock,
  formatConversationHistoryBlock,
  type JourneyFilterKey,
} from '@/lib/mister-p/prompt';
import { getPremiumStatus } from '@/lib/billing/is-premium';
import {
  analyzeTopicCluster,
  shouldTriggerCircuitBreaker,
  shouldTriggerProactiveSuggestion,
} from '@/lib/mister-p/topic';
import { getMisterPUserState } from '@/lib/mister-p/user-state';
import { getMisterPJourneyState } from '@/lib/mister-p/journey-state';
import { getRecentConversation } from '@/lib/mister-p/conversation';
import { logCostEvent } from '@/lib/cost-events/log';
import { JOURNEYS } from '@/lib/today/journeys';

const VALID_JOURNEY_SLUGS = new Set<string>(JOURNEYS.map((j) => j.slug));

const RequestSchema = z.object({
  question: z.string().min(1).max(2000),
  // Journey-scoped chat thread (mig 0104). Validated app-side against
  // the JOURNEYS catalog. Omit for the General thread.
  journey_slug: z.string().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = RequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const {
    question,
    journey_slug: requestedJourneySlug = null,
  } = parsed.data;

  // Require auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit. Mister P calls Sonnet on every turn — without a cap,
  // a misbehaving client (or a malicious one) can burn the Anthropic
  // budget unbounded. Three windows:
  //   - 30 requests per hour (conversational pace; protects bursts)
  //   - 200 requests per day (longer-horizon cap; covers a sustained
  //     attack across hours without throttling power-users)
  //   - 10 SUBSTANTIVE requests per calendar month FOR FREE USERS ONLY
  //     (pricing differentiation; Pro / trial bypass it). The /pricing
  //     matrix promises 10/month free, unlimited Pro.
  //
  // Fairness rule on the free monthly cap: only substantive answers
  // count toward the 10. A query is "substantive" iff
  //   - was_refused = false (the model didn't fire one of the
  //     refusal phrases — out-of-scope, under-18, lab data,
  //     hard-no compounds), AND
  //   - the answer is at least MIN_SUBSTANTIVE_CHARS long (filters
  //     out clarifying questions, brief acknowledgments, and stream
  //     errors that wrote a partial answer before bailing).
  // Errors that throw BEFORE onFinish never insert a row, so they're
  // naturally free. The substantive query runs only for free users —
  // premium gets a fast path with no extra DB read.
  //
  // Counts use the same auth-scoped supabase client so they respect
  // the user's RLS view of mister_p_queries (own rows only). The
  // hourly + daily counts are cheap HEAD aggregates; the monthly
  // substantive read pulls bounded row data (≤200 rows/day × 30
  // days; near-cap free user typically ≤30 rows).
  const RATE_LIMIT_HOURLY = 30;
  const RATE_LIMIT_DAILY = 200;
  const FREE_MONTHLY_LIMIT = 10;
  const MIN_SUBSTANTIVE_CHARS = 150;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  // Calendar-month boundary in UTC — same convention as the rest of the
  // app's monthly resets. A user near a timezone boundary may see the
  // counter roll over slightly off-local-midnight; acceptable.
  const monthStartUtc = new Date();
  monthStartUtc.setUTCDate(1);
  monthStartUtc.setUTCHours(0, 0, 0, 0);
  const monthStart = monthStartUtc.toISOString();
  const [
    { count: hourCount },
    { count: dayCount },
    premium,
  ] = await Promise.all([
    supabase
      .from('mister_p_queries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', oneHourAgo),
    supabase
      .from('mister_p_queries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', oneDayAgo),
    getPremiumStatus(user.id),
  ]);
  if ((hourCount ?? 0) >= RATE_LIMIT_HOURLY) {
    return NextResponse.json(
      {
        error: 'rate_limited',
        limit: RATE_LIMIT_HOURLY,
        window: '1h',
        message:
          "You've sent a lot of questions in the last hour. Take a beat — Mister P will be here when you come back.",
      },
      { status: 429 },
    );
  }
  if ((dayCount ?? 0) >= RATE_LIMIT_DAILY) {
    return NextResponse.json(
      {
        error: 'rate_limited',
        limit: RATE_LIMIT_DAILY,
        window: '24h',
        message:
          "You've hit the daily limit. Come back tomorrow — that's a lot of conversation already.",
      },
      { status: 429 },
    );
  }
  if (!premium.isPremium) {
    const { data: monthRows } = await supabase
      .from('mister_p_queries')
      .select('was_refused, answer')
      .eq('user_id', user.id)
      .gte('created_at', monthStart);
    const substantiveCount = (monthRows ?? []).filter((row) => {
      const r = row as { was_refused: boolean | null; answer: string | null };
      if (r.was_refused === true) return false;
      const answerText = r.answer ?? '';
      return answerText.length >= MIN_SUBSTANTIVE_CHARS;
    }).length;
    if (substantiveCount >= FREE_MONTHLY_LIMIT) {
      return NextResponse.json(
        {
          error: 'free_monthly_limit_reached',
          limit: FREE_MONTHLY_LIMIT,
          window: 'calendar_month',
          message:
            "You've used your 10 substantive Mister P queries for this month on the free plan. Brief clarifying questions and refusals don't count — only full answers do. Upgrade to Pro for unlimited chat, or come back when the counter resets at the start of next month.",
          upgrade_href: '/pricing',
        },
        { status: 402 },
      );
    }
  }

  // Resolve thread scope. Unknown journey slugs fall back to the
  // General thread silently — the chat still works, just unscoped.
  let journeySlug: string | null = null;
  if (
    requestedJourneySlug &&
    VALID_JOURNEY_SLUGS.has(requestedJourneySlug)
  ) {
    journeySlug = requestedJourneySlug;
  }

  // Embed the question once — used for retrieval and topic clustering.
  const questionEmbedding = await embedQuestion(question);

  // Semantic-context augmentation. If the user has a specific_thing
  // set or recent reflection notes, embed that text separately and
  // pass it into retrieval as a secondary query vector. The retrieval
  // layer finds relevant chunks automatically — Mister P does not need
  // to be told "the user is struggling with evening routines."
  const contextText = await getSemanticContextText(supabase, user.id);
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

  // Personalized retrieval: question + optional context embedding
  // merged with dedupe, then reranked by slug citation counts
  // (unseen +0.04, 3+-cited decays down to -0.15). Returns the top 5
  // for the prompt's retrieved-context block.
  const chunks = await retrievePersonalized(questionEmbedding, {
    contextEmbedding,
    focusEmbedding: null,
    focusedSlug: null,
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

  // Advisory selection — at most one advisory per turn. Circuit
  // breaker takes priority because it signals an obsessive loop. The
  // proactive-suggestion advisory previously gated on whether the top
  // citation matched one of the user's accepted goals; with goals
  // retired, it now fires on any familiar-topic + relevant-chunk
  // combination.
  let advisory: string | null = null;
  if (triggerCircuitBreaker) {
    advisory = CIRCUIT_BREAKER_ADVISORY;
  } else if (
    shouldTriggerProactiveSuggestion(topicAnalysis) &&
    chunks.length > 0
  ) {
    advisory = buildProactiveSuggestionAdvisory(chunks[0].doc_title, chunks[0].doc_slug);
  }

  // Behavioral state — specific_thing, tenure, weekly completion,
  // confidence trajectory, stuck dimensions. Cheap to fetch alongside
  // everything else already on this request; the prompt-side copy
  // enforces "context only, don't narrate it back."
  // Behavioral state + per-journey snapshot fetched in parallel —
  // both are "who is this user" context. Adding journey state lets
  // Mister P handle adaptive-intelligence questions (workout
  // soreness, skincare reactions, GLP-1 ongoing support, equipment
  // upgrade prompts) without going generic.
  //
  // Cross-journey gate: Pro/trial users see every journey with a
  // report; Free users only see the journeys in their focus_areas.
  // The restriction is computed from survey_responses.focus_areas;
  // active_protocols + photos are always emitted (they're universal
  // context, not journey-specific). Pricing-page wording matches:
  // Free Mister P sees state for the 3 journeys you picked; Pro sees
  // all 10. Mapped focus_area → journey-state key: body_composition →
  // nutrition; sleep has no journey-state line (lives in user-state);
  // every other slug maps 1:1.
  const [userState, journeyState, focusAreasRow] = await Promise.all([
    getMisterPUserState(supabase, user.id),
    getMisterPJourneyState(supabase, user.id),
    supabase
      .from('survey_responses')
      .select('response_value')
      .eq('user_id', user.id)
      .eq('question_key', 'focus_areas')
      .maybeSingle(),
  ]);
  const userStateBlock = formatUserStateBlock(userState);

  let journeyRestriction: ReadonlySet<JourneyFilterKey> | null = null;
  if (!premium.isPremium) {
    const FOCUS_TO_JOURNEY: Record<string, JourneyFilterKey> = {
      hair: 'hair',
      style: 'style',
      body_composition: 'nutrition',
      strength: 'strength',
      cardio: 'cardio',
      skincare: 'skincare',
      facial_hair: 'facial_hair',
      facial_structure: 'facial_structure',
      // 'sleep' intentionally omitted — sleep state lives in the
      // user-state block, not the journey-state block.
      // 'presentation' intentionally omitted — content hub, no
      // assessment / state worth surfacing in the journey block.
    };
    const raw = focusAreasRow.data?.response_value as string | null | undefined;
    const allowed = new Set<JourneyFilterKey>();
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const v of parsed) {
            const mapped = FOCUS_TO_JOURNEY[v as string];
            if (mapped) allowed.add(mapped);
          }
        }
      } catch {
        // Malformed focus_areas row — treat as no allow-list. The
        // journey block will render no per-journey lines but
        // active_protocols + photos still emit.
      }
    }
    journeyRestriction = allowed;
  }
  const journeyStateBlock = formatJourneyStateBlock(
    journeyState,
    journeyRestriction,
  );

  // Rolling conversation history — scoped to the current thread.
  // journeySlug picks the journey-scoped thread; null picks the
  // General thread. Per-scope histories are kept disjoint so
  // unrelated topic context doesn't bleed across journeys. Uses the
  // authed client so RLS on mister_p_queries applies.
  const recentPairs = await getRecentConversation(supabase, user.id, {
    journeySlug,
  });
  const conversationHistoryBlock = formatConversationHistoryBlock(recentPairs);

  const systemPrompt = buildSystemPromptFull(
    contextBlock,
    advisory,
    userStateBlock,
    conversationHistoryBlock,
    journeyStateBlock,
  );

  // If the user has uploaded photos, attach them as image content
  // parts on the user message. Up to five images, ordered: baseline
  // face / latest face progress / latest body / latest fit / latest
  // hair anchor. Mister P's system prompt tells him how to use them.
  // Failure to download any single photo is non-fatal — we keep going
  // with whatever loaded, falling back to text-only when nothing did.
  //
  // Photo-aware chat is Pro-only. Free users get the same chat with
  // no images attached — vision tokens are ~1700 input tokens per
  // image regardless of whether the user asked about appearance, and
  // /pricing markets photo-aware as a Pro feature. Skipping the
  // download for free users also avoids the storage round-trip.
  const PHOTO_BUCKET = 'progress-photos';
  async function downloadIfPresent(path: string | null): Promise<Buffer | null> {
    if (!path) return null;
    try {
      const { data } = await service.storage.from(PHOTO_BUCKET).download(path);
      if (!data) return null;
      return Buffer.from(await data.arrayBuffer());
    } catch {
      return null;
    }
  }
  const imagesToAttach: Buffer[] = [];
  if (premium.isPremium) {
    const [
      baselineFaceImage,
      latestFaceProgressImage,
      latestBodyProgressImage,
      latestFitImage,
      latestHairImage,
    ] = await Promise.all([
      downloadIfPresent(userState.baselineFacePhotoPath),
      downloadIfPresent(userState.latestFaceProgressPhotoPath),
      downloadIfPresent(userState.latestBodyProgressPhotoPath),
      downloadIfPresent(userState.latestFitPhotoPath),
      downloadIfPresent(userState.latestHairAnchorPhotoPath),
    ]);
    if (baselineFaceImage) imagesToAttach.push(baselineFaceImage);
    if (latestFaceProgressImage) imagesToAttach.push(latestFaceProgressImage);
    if (latestBodyProgressImage) imagesToAttach.push(latestBodyProgressImage);
    if (latestFitImage) imagesToAttach.push(latestFitImage);
    if (latestHairImage) imagesToAttach.push(latestHairImage);
  }

  const result = streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: systemPrompt,
    ...(imagesToAttach.length > 0
      ? {
          messages: [
            {
              role: 'user' as const,
              content: [
                ...imagesToAttach.map((image) => ({
                  type: 'image' as const,
                  image,
                })),
                { type: 'text' as const, text: question },
              ],
            },
          ],
        }
      : { prompt: question }),
    temperature: 0.3,
    onFinish: async ({ text, usage }) => {
      const citations = chunks.map((c) => ({ slug: c.doc_slug, title: c.doc_title }));
      const wasRefused =
        /That's not something I cover yet|That's not something I cover|Not something I'll help with|can't help|hard line|off-limits|off the table/i.test(text);

      await service.from('mister_p_queries').insert({
        user_id: user.id,
        journey_slug: journeySlug,
        question,
        answer: text,
        citations,
        was_refused: wasRefused,
        refusal_reason: wasRefused ? 'out_of_scope_or_hard_refusal' : null,
        topic_embedding: questionEmbedding as unknown as string,
      });

      // F2 cost telemetry. Non-fatal — failures here don't affect
      // the chat response. Token counts come from the SDK's usage
      // payload; the kind matches the pricing table key in
      // lib/cost-events/log.ts.
      logCostEvent({
        user_id: user.id,
        kind: 'anthropic_sonnet_4_6',
        tokens_input: usage?.inputTokens,
        tokens_output: usage?.outputTokens,
        feature: 'mister_p_chat',
      });
    },
  });

  return result.toTextStreamResponse();
}
