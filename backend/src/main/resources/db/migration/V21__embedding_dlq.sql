CREATE TABLE IF NOT EXISTS public.embedding_dlq (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    enrichment_id uuid NOT NULL REFERENCES public.memory_enrichments(id) ON DELETE CASCADE,
    memory_id uuid NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
    error_text text NOT NULL,
    attempts integer NOT NULL DEFAULT 1,
    last_attempted_at timestamptz NOT NULL DEFAULT now(),
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_embedding_dlq_enrichment_id'
    ) THEN
        ALTER TABLE public.embedding_dlq
            ADD CONSTRAINT uq_embedding_dlq_enrichment_id
            UNIQUE (enrichment_id);
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_embedding_dlq_memory_id
    ON public.embedding_dlq(memory_id);

CREATE INDEX IF NOT EXISTS idx_embedding_dlq_last_attempted_at
    ON public.embedding_dlq(last_attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_embedding_dlq_created_at
    ON public.embedding_dlq(created_at DESC);
