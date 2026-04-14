-- ==========================================
-- Migration 0004 — Goal source linkage + Mister P topic embedding
-- ==========================================
-- Two additive schema changes bundled into one migration since they
-- ship together in Slice B of Week 3:
--
-- 1. goals.source_slug — links an accepted goal back to the POV doc it
--    was derived from. Enables goal detail pages, Mister P
--    goal-awareness, and retrieval boosts. Nullable because existing
--    rows pre-date this column and because user-created goals (v2) may
--    have no source doc.
--
-- 2. mister_p_queries.topic_embedding — stores the embedding of the
--    user's question so we can cluster topics for the §13
--    circuit-breaker ("notices when a user asks 5+ questions about
--    the same insecurity in 7 days") and stickiness 5c ("proactive
--    suggestions when a user explores a new topic"). HNSW index for
--    fast cosine similarity against prior questions.

alter table public.goals
  add column if not exists source_slug text;

create index if not exists goals_source_slug_idx
  on public.goals(source_slug)
  where source_slug is not null;

alter table public.mister_p_queries
  add column if not exists topic_embedding vector(1536);

-- HNSW index for cosine similarity. Matches the strategy used for
-- pov_chunks in migration 0002 — HNSW gives better recall than IVFFlat
-- on small-to-medium datasets and doesn't require tuning probes.
create index if not exists mister_p_queries_topic_embedding_idx
  on public.mister_p_queries
  using hnsw (topic_embedding vector_cosine_ops);
