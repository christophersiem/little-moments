-- 1) Claim pending enrichments with safe locking
SELECT
  me.id,
  me.memory_id,
  me.summary,
  COALESCE(to_jsonb(me)->>'transcription', to_jsonb(me)->>'transcript') AS transcription,
  me.keywords,
  me.tags,
  me.processed_at,
  me.model_name,
  me.model_version,
  me.prompt_version,
  me.schema_version,
  me.embedding_id,
  me.embedding_status
FROM public.memory_enrichments me
WHERE me.embedding_status = 'pending'
ORDER BY me.processed_at NULLS FIRST, me.created_at NULLS FIRST
LIMIT $1
FOR UPDATE SKIP LOCKED;

-- 2) Idempotent embedding upsert
INSERT INTO public.embeddings (
  memory_id, enrichment_id, embedding, model_name, model_version, metadata, created_at
) VALUES (
  $1, $2, $3::vector, $4, $5, $6::jsonb, now()
)
ON CONFLICT (memory_id, model_name, model_version)
DO UPDATE SET
  embedding = EXCLUDED.embedding,
  enrichment_id = EXCLUDED.enrichment_id,
  metadata = EXCLUDED.metadata,
  created_at = now()
RETURNING id;

-- 3) Mark enrichment as ready
UPDATE public.memory_enrichments
SET
  embedding_id = $2,
  embedding_status = 'ready',
  embedding_model_version = $3,
  embedding_error = NULL,
  processed_at = $4,
  model_cost_usd = COALESCE(model_cost_usd, 0) + $5,
  updated_at = now()
WHERE id = $1;

-- 4) Mark enrichment as failed
UPDATE public.memory_enrichments
SET
  embedding_status = 'failed',
  embedding_error = $2,
  processed_at = $3,
  updated_at = now()
WHERE id = $1;

-- 5) DLQ upsert
INSERT INTO public.embedding_dlq (
  enrichment_id, memory_id, error_text, attempts, last_attempted_at, payload, created_at
) VALUES (
  $1, $2, $3, 1, now(), $4::jsonb, now()
)
ON CONFLICT (enrichment_id)
DO UPDATE SET
  attempts = public.embedding_dlq.attempts + 1,
  error_text = EXCLUDED.error_text,
  payload = EXCLUDED.payload,
  last_attempted_at = now()
RETURNING attempts;

-- Requeue DLQ items
WITH moved AS (
  UPDATE public.memory_enrichments me
  SET
    embedding_status = 'pending',
    embedding_error = NULL,
    updated_at = now()
  FROM public.embedding_dlq d
  WHERE me.id = d.enrichment_id
  RETURNING d.id
)
DELETE FROM public.embedding_dlq d
USING moved m
WHERE d.id = m.id;
