-- ==========================================
-- Cleanmaxxing MVP — Initial Schema
-- ==========================================
-- Matches cleanmaxxing_mvp_spec section 5.
-- Run: supabase db push (or paste into SQL editor)

-- Required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- ==========================================
-- users
-- ==========================================
-- Supabase Auth creates auth.users automatically.
-- This table extends it with app-specific profile data.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  age int,
  age_segment text check (age_segment in ('18-24', '25-32', '33-40')),
  onboarding_completed_at timestamptz,
  subscription_status text check (subscription_status in ('trial', 'active', 'canceled', 'past_due')) default 'trial',
  stripe_customer_id text,
  rewardful_referral_id text,
  -- Psychological safety: clinical screening result
  clinical_screen_flagged boolean default false,
  -- Step-away mode (section 13 of spec)
  tracking_paused_at timestamptz
);

-- ==========================================
-- goals
-- ==========================================
create table if not exists public.goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  category text,
  priority_tier text check (priority_tier in ('S', 'A', 'B', 'C')),
  -- Process vs outcome distinction (spec section 13)
  goal_type text check (goal_type in ('process', 'outcome')) default 'process',
  status text check (status in ('active', 'completed', 'abandoned')) default 'active',
  created_at timestamptz default now(),
  completed_at timestamptz,
  source text check (source in ('user_created', 'system_suggested'))
);

create index if not exists goals_user_id_idx on public.goals(user_id);
create index if not exists goals_status_idx on public.goals(status);

-- ==========================================
-- check_ins (daily habit completion)
-- ==========================================
-- Per spec section 13: NO confidence_score here.
-- Confidence is weekly-only. This is the daily goal-completion loop.
create table if not exists public.check_ins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  date date not null,
  created_at timestamptz default now(),
  unique (user_id, date)
);

create index if not exists check_ins_user_date_idx on public.check_ins(user_id, date desc);

-- ==========================================
-- goal_check_ins
-- ==========================================
create table if not exists public.goal_check_ins (
  id uuid primary key default uuid_generate_v4(),
  check_in_id uuid not null references public.check_ins(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  completed boolean default false
);

-- ==========================================
-- weekly_reflections (psychological safety: weekly, not daily)
-- ==========================================
-- Per spec section 13: confidence is tracked WEEKLY across 3-4 contextual
-- dimensions, NOT as a daily global self-worth rating.
create table if not exists public.weekly_reflections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  week_start date not null,
  -- Contextual dimensions, 1-10
  social_confidence int check (social_confidence between 1 and 10),
  work_confidence int check (work_confidence between 1 and 10),
  physical_confidence int check (physical_confidence between 1 and 10),
  appearance_confidence int check (appearance_confidence between 1 and 10),
  notes text,
  created_at timestamptz default now(),
  unique (user_id, week_start)
);

create index if not exists weekly_reflections_user_idx on public.weekly_reflections(user_id, week_start desc);

-- ==========================================
-- survey_responses
-- ==========================================
create table if not exists public.survey_responses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  question_key text not null,
  response_value text,
  created_at timestamptz default now()
);

create index if not exists survey_responses_user_idx on public.survey_responses(user_id);

-- ==========================================
-- pov_docs (the corpus)
-- ==========================================
create table if not exists public.pov_docs (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  category text,
  age_segments text[],
  priority_tier text,
  content text not null,
  faqs jsonb,
  updated_at timestamptz default now()
);

-- ==========================================
-- pov_chunks (vector search)
-- ==========================================
create table if not exists public.pov_chunks (
  id uuid primary key default uuid_generate_v4(),
  pov_doc_id uuid not null references public.pov_docs(id) on delete cascade,
  chunk_index int not null,
  content text not null,
  embedding vector(1536)
);

-- HNSW index: better recall than IVFFlat, especially on small datasets (<10k rows).
-- Rebuild with `lists`-style IVFFlat or scale up only if corpus grows past ~50k chunks.
create index if not exists pov_chunks_embedding_idx
  on public.pov_chunks
  using hnsw (embedding vector_cosine_ops);

-- ==========================================
-- mister_p_queries (RAG chat log, also feeds roadmap)
-- ==========================================
create table if not exists public.mister_p_queries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete set null,
  question text not null,
  answer text,
  citations jsonb,
  was_refused boolean default false,
  refusal_reason text,
  -- Per spec section 13: tag questions for circuit-breaker detection
  topic_category text,
  created_at timestamptz default now()
);

create index if not exists mister_p_queries_user_idx on public.mister_p_queries(user_id, created_at desc);
create index if not exists mister_p_queries_refused_idx on public.mister_p_queries(was_refused) where was_refused = true;

-- ==========================================
-- confidence_dimensions (baseline from onboarding)
-- ==========================================
create table if not exists public.confidence_dimensions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  dimension text check (dimension in ('appearance', 'social', 'career', 'physical', 'overall')),
  baseline_score int check (baseline_score between 1 and 10),
  captured_at timestamptz default now()
);

-- ==========================================
-- Row Level Security
-- ==========================================
alter table public.users enable row level security;
alter table public.goals enable row level security;
alter table public.check_ins enable row level security;
alter table public.goal_check_ins enable row level security;
alter table public.weekly_reflections enable row level security;
alter table public.survey_responses enable row level security;
alter table public.mister_p_queries enable row level security;
alter table public.confidence_dimensions enable row level security;

-- Users can only see/modify their own rows
create policy "users_own_profile" on public.users
  for all using (auth.uid() = id);

create policy "goals_own" on public.goals
  for all using (auth.uid() = user_id);

create policy "check_ins_own" on public.check_ins
  for all using (auth.uid() = user_id);

create policy "goal_check_ins_own" on public.goal_check_ins
  for all using (
    exists (select 1 from public.check_ins where check_ins.id = goal_check_ins.check_in_id and check_ins.user_id = auth.uid())
  );

create policy "weekly_reflections_own" on public.weekly_reflections
  for all using (auth.uid() = user_id);

create policy "survey_responses_own" on public.survey_responses
  for all using (auth.uid() = user_id);

create policy "mister_p_queries_own" on public.mister_p_queries
  for select using (auth.uid() = user_id);

create policy "confidence_dimensions_own" on public.confidence_dimensions
  for all using (auth.uid() = user_id);

-- pov_docs and pov_chunks are read-only for all authenticated users
alter table public.pov_docs enable row level security;
alter table public.pov_chunks enable row level security;

create policy "pov_docs_read" on public.pov_docs
  for select using (auth.role() = 'authenticated');

create policy "pov_chunks_read" on public.pov_chunks
  for select using (auth.role() = 'authenticated');

-- ==========================================
-- Vector search function
-- ==========================================
create or replace function match_pov_chunks(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id uuid,
  pov_doc_id uuid,
  content text,
  similarity float,
  doc_slug text,
  doc_title text
)
language sql stable
as $$
  select
    pc.id,
    pc.pov_doc_id,
    pc.content,
    1 - (pc.embedding <=> query_embedding) as similarity,
    pd.slug as doc_slug,
    pd.title as doc_title
  from public.pov_chunks pc
  join public.pov_docs pd on pd.id = pc.pov_doc_id
  order by pc.embedding <=> query_embedding
  limit match_count;
$$;

-- ==========================================
-- Trigger: auto-create public.users row on signup
-- ==========================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
