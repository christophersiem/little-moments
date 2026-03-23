CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    child_id UUID,
    owner_id UUID,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_at TIMESTAMPTZ NOT NULL,
    transcript TEXT,
    status VARCHAR(16) NOT NULL,
    error_message TEXT,
    title VARCHAR(255),
    summary TEXT,
    is_highlight BOOLEAN NOT NULL DEFAULT FALSE,
    enriched BOOLEAN NOT NULL DEFAULT FALSE,
    enrichment_status VARCHAR(16) NOT NULL DEFAULT 'PENDING'
);

ALTER TABLE memories
    ADD COLUMN IF NOT EXISTS child_id UUID,
    ADD COLUMN IF NOT EXISTS owner_id UUID,
    ADD COLUMN IF NOT EXISTS created_by UUID,
    ADD COLUMN IF NOT EXISTS title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS summary TEXT,
    ADD COLUMN IF NOT EXISTS is_highlight BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS enriched BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS enrichment_status VARCHAR(16) NOT NULL DEFAULT 'PENDING';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'chk_memories_enrichment_status'
    ) THEN
        ALTER TABLE memories
            ADD CONSTRAINT chk_memories_enrichment_status
            CHECK (enrichment_status IN ('PENDING', 'SUCCESS', 'FAILED'));
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_memories_owner_id'
        ) THEN
            ALTER TABLE memories
                ADD CONSTRAINT fk_memories_owner_id
                FOREIGN KEY (owner_id) REFERENCES users(id);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_memories_created_by'
        ) THEN
            ALTER TABLE memories
                ADD CONSTRAINT fk_memories_created_by
                FOREIGN KEY (created_by) REFERENCES users(id);
        END IF;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_memories_child_recorded_created
    ON memories(child_id, recorded_at DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memories_enriched_status
    ON memories(enriched, enrichment_status, created_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'memory_enrichment_category'
    ) THEN
        CREATE TYPE memory_enrichment_category AS ENUM ('milestone', 'funny', 'behavior', 'health', 'other');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'memory_enrichment_emotion'
    ) THEN
        CREATE TYPE memory_enrichment_emotion AS ENUM ('joy', 'neutral', 'sadness', 'surprise', 'anger', 'fear', 'other');
    END IF;
END
$$;

CREATE TABLE IF NOT EXISTS memory_enrichments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_id UUID NOT NULL,
    owner_id UUID,
    child_id UUID,
    created_by_user_id UUID,
    summary TEXT NOT NULL,
    category memory_enrichment_category NOT NULL,
    emotion memory_enrichment_emotion NOT NULL DEFAULT 'neutral',
    sentiment_score NUMERIC(4,3),
    keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    importance_score SMALLINT NOT NULL,
    is_highlight BOOLEAN NOT NULL DEFAULT FALSE,
    milestone_hint TEXT,
    embedding_id TEXT,
    model_name TEXT NOT NULL,
    model_version TEXT,
    prompt_version TEXT NOT NULL,
    schema_version TEXT NOT NULL,
    confidence_score NUMERIC(4,3) NOT NULL,
    model_cost_usd NUMERIC(10,6),
    raw_response JSONB,
    processed_at TIMESTAMPTZ NOT NULL,
    run_status VARCHAR(16) NOT NULL DEFAULT 'SUCCESS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_memory_enrichments_memory_id UNIQUE (memory_id),
    CONSTRAINT chk_memory_enrichments_importance CHECK (importance_score BETWEEN 1 AND 10),
    CONSTRAINT chk_memory_enrichments_confidence CHECK (confidence_score BETWEEN 0 AND 1),
    CONSTRAINT chk_memory_enrichments_sentiment CHECK (sentiment_score IS NULL OR sentiment_score BETWEEN -1 AND 1),
    CONSTRAINT chk_memory_enrichments_keywords_array CHECK (jsonb_typeof(keywords) = 'array'),
    CONSTRAINT chk_memory_enrichments_keywords_limit CHECK (jsonb_array_length(keywords) <= 6),
    CONSTRAINT chk_memory_enrichments_tags_array CHECK (jsonb_typeof(tags) = 'array'),
    CONSTRAINT chk_memory_enrichments_run_status CHECK (run_status IN ('SUCCESS', 'FAILED')),
    CONSTRAINT fk_memory_enrichments_memory_id FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_memory_enrichments_owner_id'
        ) THEN
            ALTER TABLE memory_enrichments
                ADD CONSTRAINT fk_memory_enrichments_owner_id
                FOREIGN KEY (owner_id) REFERENCES users(id);
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_memory_enrichments_created_by_user_id'
        ) THEN
            ALTER TABLE memory_enrichments
                ADD CONSTRAINT fk_memory_enrichments_created_by_user_id
                FOREIGN KEY (created_by_user_id) REFERENCES users(id);
        END IF;
    END IF;
END
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'children' AND table_schema = 'public') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'fk_memory_enrichments_child_id'
        ) THEN
            ALTER TABLE memory_enrichments
                ADD CONSTRAINT fk_memory_enrichments_child_id
                FOREIGN KEY (child_id) REFERENCES children(id);
        END IF;
    END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_memory_enrichments_owner_id
    ON memory_enrichments(owner_id);

CREATE INDEX IF NOT EXISTS idx_memory_enrichments_child_id
    ON memory_enrichments(child_id);

CREATE INDEX IF NOT EXISTS idx_memory_enrichments_memory_id
    ON memory_enrichments(memory_id);

CREATE INDEX IF NOT EXISTS idx_memory_enrichments_importance_highlight
    ON memory_enrichments(is_highlight, importance_score DESC, processed_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_enrichments_keywords_gin
    ON memory_enrichments USING GIN (keywords);

CREATE INDEX IF NOT EXISTS idx_memory_enrichments_tags_gin
    ON memory_enrichments USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_memory_enrichments_raw_response_gin
    ON memory_enrichments USING GIN (raw_response jsonb_path_ops);

CREATE OR REPLACE FUNCTION set_memory_enrichments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_memory_enrichments_set_updated_at ON memory_enrichments;
CREATE TRIGGER trg_memory_enrichments_set_updated_at
BEFORE UPDATE ON memory_enrichments
FOR EACH ROW
EXECUTE FUNCTION set_memory_enrichments_updated_at();
