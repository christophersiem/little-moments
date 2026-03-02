ALTER TABLE memories
    ADD COLUMN IF NOT EXISTS parent_memory_id UUID NULL REFERENCES memories(id) ON DELETE CASCADE;

ALTER TABLE memories
    ADD COLUMN IF NOT EXISTS source_transcript TEXT;

ALTER TABLE memories
    ADD COLUMN IF NOT EXISTS is_parent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_memories_parent_memory_id ON memories(parent_memory_id);
CREATE INDEX IF NOT EXISTS idx_memories_visible_recorded_created ON memories(is_parent, recorded_at DESC, created_at DESC);
