-- valid_upsert path
insert into public.memory_enrichments (
  memory_id, owner_id, child_id, created_by_user_id,
  summary, category, emotion, sentiment_score,
  keywords, tags, importance_score, is_highlight,
  milestone_hint, embedding_id,
  model_name, model_version, prompt_version, schema_version,
  confidence_score, model_cost_usd, raw_response,
  processed_at, run_status, updated_at
)
values (
  :memory_id, :owner_id, :child_id, :created_by_user_id,
  :summary, :category, :emotion, :sentiment_score,
  cast(:keywords as jsonb), cast(:tags as jsonb), :importance_score, :is_highlight,
  :milestone_hint, :embedding_id,
  :model_name, :model_version, :prompt_version, :schema_version,
  :confidence_score, :model_cost_usd, cast(:raw_response as jsonb),
  :processed_at, 'SUCCESS', now()
)
on conflict (memory_id) do update set
  owner_id = excluded.owner_id,
  child_id = excluded.child_id,
  created_by_user_id = excluded.created_by_user_id,
  summary = excluded.summary,
  category = excluded.category,
  emotion = excluded.emotion,
  sentiment_score = excluded.sentiment_score,
  keywords = excluded.keywords,
  tags = excluded.tags,
  importance_score = excluded.importance_score,
  is_highlight = excluded.is_highlight,
  milestone_hint = excluded.milestone_hint,
  embedding_id = excluded.embedding_id,
  model_name = excluded.model_name,
  model_version = excluded.model_version,
  prompt_version = excluded.prompt_version,
  schema_version = excluded.schema_version,
  confidence_score = excluded.confidence_score,
  model_cost_usd = excluded.model_cost_usd,
  raw_response = excluded.raw_response,
  processed_at = excluded.processed_at,
  run_status = 'SUCCESS',
  updated_at = now();

update public.memories
set enriched = true,
    enrichment_status = 'SUCCESS',
    updated_at = now()
where id = :memory_id;

-- raw_save path
insert into public.memory_enrichments (
  memory_id, owner_id, child_id, created_by_user_id,
  summary, category, emotion, sentiment_score,
  keywords, tags, importance_score, is_highlight,
  milestone_hint, embedding_id,
  model_name, model_version, prompt_version, schema_version,
  confidence_score, model_cost_usd, raw_response,
  processed_at, run_status, updated_at
)
values (
  :memory_id, :owner_id, :child_id, :created_by_user_id,
  'Enrichment failed validation.', 'other', 'neutral', null,
  '[]'::jsonb, '[]'::jsonb, 1, false,
  null, null,
  :model_name, :model_version, :prompt_version, :schema_version,
  0, null, cast(:raw_response as jsonb),
  :processed_at, 'FAILED', now()
)
on conflict (memory_id) do update set
  raw_response = excluded.raw_response,
  run_status = 'FAILED',
  processed_at = excluded.processed_at,
  updated_at = now();

update public.memories
set enriched = false,
    enrichment_status = 'FAILED',
    updated_at = now()
where id = :memory_id;
