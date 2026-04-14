// Topic clustering for Mister P — feeds spec §13 circuit breakers and
// stickiness 5c (proactive suggestions on new topics).
//
// Approach: every question gets embedded with text-embedding-3-small.
// On each new query we pull the user's recent question embeddings,
// compute cosine similarity in memory, and return a small analysis.
//
// Threshold: 0.82 cosine similarity for "same topic" on this embedding
// model. Chosen as a reasonable default; tune once real query data exists.
//
// Scale: fetching up to 200 prior rows per request is fine at MVP scale
// (< 50 queries per user per week). If usage grows past a few thousand
// queries per user, migrate the similarity check to a Postgres RPC.

export const TOPIC_SIMILARITY_THRESHOLD = 0.82;
export const CIRCUIT_BREAKER_WINDOW_DAYS = 7;
export const CIRCUIT_BREAKER_COUNT = 5;

// Minimum total prior questions before proactive suggestions fire. First-
// session users would otherwise get a "want a deeper dive?" offer on every
// question because every topic is technically "new" when there are no
// priors to compare against. Gating on 2+ priors makes the suggestion feel
// earned and like Mister P "noticing" a pattern.
export const PROACTIVE_SUGGESTION_MIN_PRIORS = 2;

type PriorQuery = {
  topic_embedding: number[] | string | null;
  created_at: string;
};

function parseEmbedding(raw: unknown): number[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw as number[];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as number[];
    } catch {
      // fall through
    }
  }
  return null;
}

function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

export type TopicAnalysis = {
  isNewTopic: boolean;
  maxSimilarity: number;
  // Count of prior questions (within the window) whose similarity to the new
  // one is above the threshold. Does NOT include the new question itself.
  recentSimilarCount: number;
  // Total prior questions the user has asked (up to the 200-row cap), used
  // to gate proactive suggestions behind a minimum-history threshold.
  totalPriorCount: number;
};

type SupabaseLike = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        not: (col: string, op: string, val: null) => {
          order: (col: string, opts: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: PriorQuery[] | null }>;
          };
        };
      };
    };
  };
};

export async function analyzeTopicCluster(
  supabase: SupabaseLike,
  userId: string,
  newEmbedding: number[]
): Promise<TopicAnalysis> {
  const windowStartIso = new Date(
    Date.now() - CIRCUIT_BREAKER_WINDOW_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: priors } = await supabase
    .from('mister_p_queries')
    .select('topic_embedding, created_at')
    .eq('user_id', userId)
    .not('topic_embedding', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200);

  if (!priors || priors.length === 0) {
    return { isNewTopic: true, maxSimilarity: 0, recentSimilarCount: 0, totalPriorCount: 0 };
  }

  let maxSim = 0;
  let recentCount = 0;

  for (const p of priors) {
    const embedding = parseEmbedding(p.topic_embedding);
    if (!embedding) continue;
    const sim = cosineSim(newEmbedding, embedding);
    if (sim > maxSim) maxSim = sim;
    if (sim >= TOPIC_SIMILARITY_THRESHOLD && p.created_at >= windowStartIso) {
      recentCount += 1;
    }
  }

  return {
    isNewTopic: maxSim < TOPIC_SIMILARITY_THRESHOLD,
    maxSimilarity: maxSim,
    recentSimilarCount: recentCount,
    totalPriorCount: priors.length,
  };
}

// Trigger when the new query would make the 5th+ similar question in the
// window (so recentSimilarCount >= COUNT - 1 before adding this one).
export function shouldTriggerCircuitBreaker(analysis: TopicAnalysis): boolean {
  return analysis.recentSimilarCount >= CIRCUIT_BREAKER_COUNT - 1;
}

// Trigger when (a) this is a new topic for the user — no prior question
// clusters with it — AND (b) the user has enough history for the nudge
// to feel earned rather than spammy. Stickiness 5c per spec §2.5.
export function shouldTriggerProactiveSuggestion(analysis: TopicAnalysis): boolean {
  return analysis.isNewTopic && analysis.totalPriorCount >= PROACTIVE_SUGGESTION_MIN_PRIORS;
}
