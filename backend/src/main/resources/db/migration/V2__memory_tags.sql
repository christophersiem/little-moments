CREATE TABLE IF NOT EXISTS memory_tags (
    memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    tag VARCHAR(32) NOT NULL,
    PRIMARY KEY (memory_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_memory_tags_tag ON memory_tags(tag);
