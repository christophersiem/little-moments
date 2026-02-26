# Data Model

## Table: users

id (uuid, pk)
email (text, nullable)
created_at (timestamp)

---

## Table: memories

id (uuid, pk)
user_id (uuid, fk -> users.id)
created_at (timestamp)
updated_at (timestamp)
recorded_at (timestamp)
transcript (text, nullable)
status (enum text)
error_message (text, nullable)

---

## Status Enum

PROCESSING
READY
FAILED

---

## Storage

No audio storage in reduced MVP. Audio is uploaded to backend, forwarded to transcription, and discarded.

---

## Indexing Strategy

- Index on created_at (newest first)
- Index on (user_id, created_at)

---

## Removed From Reduced MVP

- audio_path
- metadata fields (title, summary, tags, mood, child age)
- embeddings / vector search
created_at (timestamp)
