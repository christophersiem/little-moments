-- Step 14: Embedding dead-letter queue (DLQ)

create table if not exists public.embedding_dlq (
  id uuid primary key default gen_random_uuid(),
  enrichment_id uuid not null references public.memory_enrichments(id) on delete cascade,
  memory_id uuid not null references public.memories(id) on delete cascade,
  error_text text not null,
  attempts integer not null default 1,
  last_attempted_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'uq_embedding_dlq_enrichment_id'
  ) then
    alter table public.embedding_dlq
      add constraint uq_embedding_dlq_enrichment_id
      unique (enrichment_id);
  end if;
end
$$;

create index if not exists idx_embedding_dlq_memory_id
  on public.embedding_dlq(memory_id);

create index if not exists idx_embedding_dlq_last_attempted_at
  on public.embedding_dlq(last_attempted_at desc);

create index if not exists idx_embedding_dlq_created_at
  on public.embedding_dlq(created_at desc);
