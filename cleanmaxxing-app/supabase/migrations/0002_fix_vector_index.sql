-- Replace IVFFlat index with HNSW for better recall on small datasets.
-- IVFFlat with default probes=1 can return zero results on small corpora.
-- HNSW gives much better recall out of the box and scales well past 10k rows.

drop index if exists public.pov_chunks_embedding_idx;

create index pov_chunks_embedding_idx
  on public.pov_chunks
  using hnsw (embedding vector_cosine_ops);
