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
5. Backend persists READY/FAILED and returns response.
6. Frontend polls memory status from `/api/memories/{id}` while needed.

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

## Security Model
- JWT access token is passed from frontend to backend as Bearer token.
- Backend forwards token to Supabase data endpoints.
- Supabase RLS is the source of truth for read/write permissions.
- Owner-only operations are additionally guarded via RPC/backend checks.
