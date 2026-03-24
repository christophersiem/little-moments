-- EMBEDDING_DIM = 1536

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'embedding_status_enum') THEN
        CREATE TYPE embedding_status_enum AS ENUM ('pending', 'ready', 'failed');
    END IF;
END
$$;

ALTER TABLE public.memory_enrichments
    ADD COLUMN IF NOT EXISTS embedding_status embedding_status_enum NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS embedding_model_version text,
    ADD COLUMN IF NOT EXISTS embedding_error text,
    ADD COLUMN IF NOT EXISTS model_cost_usd numeric(12,6),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS public.embeddings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id uuid NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
    enrichment_id uuid NULL REFERENCES public.memory_enrichments(id) ON DELETE SET NULL,
    embedding vector(1536) NOT NULL,
    model_name text NOT NULL,
    model_version text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_embeddings_memory_model_version'
    ) THEN
        ALTER TABLE public.embeddings
            ADD CONSTRAINT uq_embeddings_memory_model_version
            UNIQUE (memory_id, model_name, model_version);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_embeddings_memory_id
    ON public.embeddings(memory_id);

CREATE INDEX IF NOT EXISTS idx_embeddings_enrichment_id
    ON public.embeddings(enrichment_id);

CREATE INDEX IF NOT EXISTS idx_embeddings_created_at
    ON public.embeddings(created_at DESC);

-- Tune ivfflat lists based on corpus size (e.g. sqrt(row_count)) and latency/recall benchmarks.
CREATE INDEX IF NOT EXISTS idx_embeddings_embedding_ivfflat
    ON public.embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
