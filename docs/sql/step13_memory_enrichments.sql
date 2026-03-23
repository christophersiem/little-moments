-- Step 13: Memory enrichment storage for n8n AI pipeline
-- Adds enrichment metadata for search, highlights, analytics, provenance, and compliance.

create extension if not exists pgcrypto;

alter table public.memories
  add column if not exists enriched boolean not null default false,
  add column if not exists enrichment_status text not null default 'PENDING';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_memories_enrichment_status'
  ) then
    alter table public.memories
      add constraint chk_memories_enrichment_status
      check (enrichment_status in ('PENDING','SUCCESS','FAILED'));
  end if;
end
$$;

create index if not exists idx_memories_enriched_status
  on public.memories(enriched, enrichment_status, created_at desc);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'memory_enrichment_category') then
    create type memory_enrichment_category as enum ('milestone', 'funny', 'behavior', 'health', 'other');
  end if;

  if not exists (select 1 from pg_type where typname = 'memory_enrichment_emotion') then
    create type memory_enrichment_emotion as enum ('joy', 'neutral', 'sadness', 'surprise', 'anger', 'fear', 'other');
  end if;
end
$$;

create table if not exists public.memory_enrichments (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  owner_id uuid references auth.users(id),
  child_id uuid references public.children(id),
  created_by_user_id uuid references auth.users(id),

  summary text not null,
  category memory_enrichment_category not null,
  emotion memory_enrichment_emotion not null default 'neutral',
  sentiment_score numeric(4,3),
  keywords jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  importance_score smallint not null,
  is_highlight boolean not null default false,
  milestone_hint text,
  embedding_id text,

  model_name text not null,
  model_version text,
  prompt_version text not null,
  schema_version text not null,
  confidence_score numeric(4,3) not null,
  model_cost_usd numeric(10,6),
  raw_response jsonb,
  processed_at timestamptz not null,
  run_status text not null default 'SUCCESS',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_memory_enrichments_memory_id unique (memory_id),
  constraint chk_memory_enrichments_importance check (importance_score between 1 and 10),
  constraint chk_memory_enrichments_confidence check (confidence_score between 0 and 1),
  constraint chk_memory_enrichments_sentiment check (sentiment_score is null or sentiment_score between -1 and 1),
  constraint chk_memory_enrichments_keywords_array check (jsonb_typeof(keywords) = 'array'),
  constraint chk_memory_enrichments_keywords_limit check (jsonb_array_length(keywords) <= 6),
  constraint chk_memory_enrichments_tags_array check (jsonb_typeof(tags) = 'array'),
  constraint chk_memory_enrichments_run_status check (run_status in ('SUCCESS','FAILED'))
);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'children'
  ) and not exists (
    select 1
    from pg_constraint
    where conname = 'fk_memory_enrichments_child_id'
  ) then
    alter table public.memory_enrichments
      add constraint fk_memory_enrichments_child_id
      foreign key (child_id) references public.children(id);
  end if;
end
$$;

create index if not exists idx_memory_enrichments_owner_id
  on public.memory_enrichments(owner_id);

create index if not exists idx_memory_enrichments_child_id
  on public.memory_enrichments(child_id);

create index if not exists idx_memory_enrichments_memory_id
  on public.memory_enrichments(memory_id);

create index if not exists idx_memory_enrichments_importance_highlight
  on public.memory_enrichments(is_highlight, importance_score desc, processed_at desc);

create index if not exists idx_memory_enrichments_keywords_gin
  on public.memory_enrichments using gin (keywords);

create index if not exists idx_memory_enrichments_tags_gin
  on public.memory_enrichments using gin (tags);

create index if not exists idx_memory_enrichments_raw_response_gin
  on public.memory_enrichments using gin (raw_response jsonb_path_ops);

create or replace function public.set_memory_enrichments_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_memory_enrichments_set_updated_at on public.memory_enrichments;
create trigger trg_memory_enrichments_set_updated_at
before update on public.memory_enrichments
for each row
execute function public.set_memory_enrichments_updated_at();
