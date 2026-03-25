# Technical Architecture (Current)

## Stack

Frontend:
- React + Vite + TypeScript
- styled-components
- Supabase Auth client (`@supabase/supabase-js`)

Backend:
- Spring Boot (REST)
- Service-layer gateway to Supabase PostgREST + Supabase RPC
- OpenAI integration for transcription + title/summary generation + splitting support

Database:
- Supabase Postgres (`public.*`, `auth.users`)
- RLS and RPC for authorization-critical operations

## Runtime Data Flow

Auth:
- Frontend <-> Supabase Auth (direct)

App data (memories/families/profiles):
- Frontend -> Spring Boot `/api/*` -> Supabase DB/RPC

Memory create path:
1. Frontend uploads audio blob (`multipart/form-data`) to backend.
2. Backend inserts PROCESSING memory row.
3. Backend transcribes audio via OpenAI.
4. Backend enriches content (title/summary/tags, optional split handling).
5. Backend persists READY/FAILED.
6. Backend returns response.
7. Optional async step: backend triggers n8n webhook for created READY entries.
8. n8n validates structured enrichment output and upserts `public.memory_enrichments`.
9. n8n updates `public.memories.enriched` + `public.memories.enrichment_status`.
10. n8n triggers backend internal endpoint `POST /api/internal/embeddings/run`.
11. Backend embedding runner processes `pending` enrichment rows and writes vectors to `public.embeddings`.
12. Backend embedding runner marks enrichment rows `ready`/`failed` and writes DLQ entries for triage.
13. Memory Chat V1 retrieves scoped candidates from embeddings via `rpc_memory_chat_search` and composes grounded answers.
14. Frontend polls memory status from `/api/memories/{id}` while needed.

Audio handling:
- Audio is ephemeral in backend request flow; no storage bucket in default path.

## Processing States
- `PROCESSING`
- `READY`
- `FAILED`

## Environment Variables

Frontend:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_URL` (default `/api`)

Backend:
- `PORT` (platform-assigned runtime port, e.g. Railway)
- `SERVER_PORT`
- `SPRING_DATASOURCE_URL` / `DB_URL`
- `SPRING_DATASOURCE_USERNAME` / `DB_USER`
- `SPRING_DATASOURCE_PASSWORD` / `DB_PASSWORD`
- `CORS_ALLOWED_ORIGINS`
- `OPENAI_API_KEY` (also supports `OPEN_AI_API_KEY`, `APP_OPENAI_API_KEY` fallback)
- `OPENAI_BASE_URL`
- `OPENAI_TRANSCRIPTION_MODEL`
- `OPENAI_INSIGHTS_ENABLED`
- `OPENAI_INSIGHTS_MODEL`
- `OPENAI_SPLITTER_ENABLED`
- `OPENAI_SPLITTER_MODEL`
- `MEMORY_SPLITTER_MAX`
- `MEMORY_SPLITTER_MIN_EXCERPT_CHARS`
- `SUPABASE_URL` (or `VITE_SUPABASE_URL` fallback)
- `SUPABASE_ANON_KEY` (or `VITE_SUPABASE_ANON_KEY` fallback)
- `N8N_WEBHOOK_ENABLED` (default `false`)
- `N8N_WEBHOOK_URL`
- `N8N_WEBHOOK_API_KEY` (optional, sent as `X-API-Key`)
- `N8N_WEBHOOK_DEFAULT_LANGUAGE` (default `en`)
- `N8N_WEBHOOK_TIMEOUT_MS` (default `5000`)
- `EMBEDDING_RUNNER_ENABLED` (default `false`)
- `EMBEDDING_TRIGGER_API_KEY` (required for `/api/internal/embeddings/run`)
- `EMBEDDING_API_KEY` (fallback to OpenAI key chain)
- `EMBEDDING_MODEL` (default `text-embedding-3-small`)
- `EMBEDDING_MODEL_VERSION` (optional, defaults to current date)
- `EMBEDDING_DIM` (default `1536`)
- `EMBEDDING_BATCH_SIZE` (default `25`)
- `EMBEDDING_MAX_RETRIES` (default `3`)
- `EMBEDDING_TIMEOUT_MS` (default `30000`)
- `EMBEDDING_COST_PER_TOKEN` (default `0.00000002`)
- `MEMORY_CHAT_ENABLED` (default `true`)
- `MEMORY_CHAT_API_KEY` (fallback to OpenAI key chain)
- `MEMORY_CHAT_MODEL` (default `gpt-4o-mini`)
- `MEMORY_CHAT_EMBEDDING_MODEL` (default `text-embedding-3-small`)
- `MEMORY_CHAT_RETRIEVAL_LIMIT` (default `12`)
- `MEMORY_CHAT_CONTEXT_LIMIT` (default `8`)
- `MEMORY_CHAT_MIN_SIMILARITY` (default `0.18`)

Embedding worker:
- `DATABASE_URL`
- `EMBEDDING_API_KEY`
- `EMBEDDING_MODEL`
- `EMBEDDING_MODEL_VERSION`
- `EMBEDDING_DIM`
- `BATCH_SIZE`
- `MAX_RETRIES`
- `EMBEDDING_API_URL` (optional, defaults to OpenAI embeddings endpoint)
- `EMBEDDING_COST_PER_TOKEN` (for `model_cost_usd` estimation)

## Deployment (Railway Demo)
- Deploy frontend and backend as two separate Railway services from this monorepo.
- Frontend must set `VITE_API_URL` to the backend public URL (`https://<backend-domain>/api`).
- Backend CORS must allow the frontend Railway domain via `CORS_ALLOWED_ORIGINS`.
- Detailed setup steps: `docs/deploy-railway.md`.

## Security Model
- JWT access token is passed from frontend to backend as Bearer token.
- Backend forwards token to Supabase data endpoints.
- Supabase RLS is the source of truth for read/write permissions.
- Owner-only operations are additionally guarded via RPC/backend checks.
