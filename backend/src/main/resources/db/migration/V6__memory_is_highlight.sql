ALTER TABLE memories
    ADD COLUMN IF NOT EXISTS is_highlight BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE memories
SET is_highlight = FALSE
WHERE is_highlight IS NULL;

CREATE INDEX IF NOT EXISTS idx_memories_is_highlight_recorded_created
    ON memories(is_highlight, recorded_at DESC, created_at DESC);
