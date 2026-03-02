ALTER TABLE memories
    ADD COLUMN IF NOT EXISTS parent_memory_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_memories_parent_memory'
    ) THEN
        ALTER TABLE memories
            ADD CONSTRAINT fk_memories_parent_memory
            FOREIGN KEY (parent_memory_id)
            REFERENCES memories(id)
            ON DELETE CASCADE;
    END IF;
END
$$;

ALTER TABLE memories
    ADD COLUMN IF NOT EXISTS source_transcript TEXT;

ALTER TABLE memories
    ADD COLUMN IF NOT EXISTS is_parent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_memories_parent_memory_id ON memories(parent_memory_id);
CREATE INDEX IF NOT EXISTS idx_memories_visible_recorded_created ON memories(is_parent, recorded_at DESC, created_at DESC);
