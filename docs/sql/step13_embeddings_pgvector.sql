-- Step 13: pgvector embeddings storage for enriched memories
-- EMBEDDING_DIM = 1536

create extension if not exists pgcrypto;
create extension if not exists vector;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'embedding_status_enum') then
    create type embedding_status_enum as enum ('pending', 'ready', 'failed');
  end if;
end
$$;

alter table public.memory_enrichments
  add column if not exists embedding_status embedding_status_enum not null default 'pending',
  add column if not exists embedding_model_version text,
  add column if not exists embedding_error text,
  add column if not exists model_cost_usd numeric(12,6),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.embeddings (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  enrichment_id uuid null references public.memory_enrichments(id) on delete set null,
  embedding vector(1536) not null,
  model_name text not null,
  model_version text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'uq_embeddings_memory_model_version'
  ) then
    alter table public.embeddings
      add constraint uq_embeddings_memory_model_version
      unique (memory_id, model_name, model_version);
  end if;
end
$$;

create index if not exists idx_embeddings_memory_id
  on public.embeddings(memory_id);

create index if not exists idx_embeddings_enrichment_id
  on public.embeddings(enrichment_id);

create index if not exists idx_embeddings_created_at
  on public.embeddings(created_at desc);

-- Tune ivfflat lists based on corpus size (e.g. sqrt(row_count)) and latency/recall benchmarks.
create index if not exists idx_embeddings_embedding_ivfflat
  on public.embeddings using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
