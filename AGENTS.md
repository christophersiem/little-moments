# AGENTS.md — Little Moments (Reduced MVP)

## Goal (Reduced MVP)
Ship the smallest usable version:
User records audio → app shows “Saving your moment…” → transcript saved → list + detail view.
No feature beyond that until this is stable.

Reference: Reduced MVP Scope – Little Moments (internal doc). Keep scope strictly aligned. :contentReference[oaicite:1]{index=1}

## Non-goals (Deliberately NOT building in this phase)
- No audio playback
- No audio file storage (no Supabase Storage bucket for audio)
- No AI categorization / tags
- No visual timeline
- No semantic search / RAG
- No monthly summaries
- No sharing
- No complex authentication (single-user mode only)

## Product flow (must match)
Essential screens:
1) Record Screen (one-tap start/stop, visible timer, no metadata)
2) Processing State (“Saving your moment…”, clear loading)
3) Saved Confirmation (short message + 1–2 lines transcript preview + CTA)
4) Memories List (reverse chronological, date + 1–2 line snippet)
5) Entry Detail (full transcript, timestamp, read-only)
   :contentReference[oaicite:2]{index=2}

## Repo structure (expected)
- frontend/   (React + Vite)
- backend/    (Spring Boot)
- docs/       (spec + decisions)
- AGENTS.md

## Commands

### Frontend (Vite + React)
- Install: cd frontend && npm install
- Dev: cd frontend && npm run dev
- Build: cd frontend && npm run build
- Test: cd frontend && npm run test
- Lint: cd frontend && npm run lint

## Architecture & Conventions

### Frontend (React + Vite)
- No feature logic in App.jsx. App.jsx only defines routes/layout.
- Use folder structure:
  - src/app/ (routing, providers)
  - src/pages/ (route-level screens)
  - src/components/ (reusable UI)
  - src/features/memories/ (feature module: api, hooks, components)
  - src/lib/ (http client, utils)
  - src/styles/ (global styles)
- New pages must be in src/pages and imported via router.
### Frontend language
- Migrate frontend to TypeScript.
- New code must be TypeScript (.ts/.tsx). Do not add new .js/.jsx files.
- Add strict-ish typing (at least noImplicitAny), and type public boundaries (API responses, props, hooks).

### Backend (Spring Boot)
- Enforce layered architecture:
  - controller/ (REST endpoints, DTO mapping, validation)
  - service/ (business logic)
  - repository/ (Spring Data JPA)
  - model/ (entities)
  - dto/ (request/response DTOs)
  - config/ (CORS, security, beans)
  - exception/ (error handling, ProblemDetails)
- Controllers must not access repositories directly.
- Services are the only layer allowed to call repositories.
- Use constructor injection only.

### Naming
- MemoryController, MemoryService, MemoryRepository
- DTOs: CreateMemoryRequest, MemoryResponse

### Backend (Spring Boot)
- Build: cd backend && ./mvnw -q clean package
- Dev: cd backend && ./mvnw spring-boot:run
- Test: cd backend && ./mvnw test

## Backend responsibilities (Reduced MVP)
1) Ephemeral audio handling
- Client sends audio blob to backend
- Backend forwards audio directly to Speech-to-Text API
- Audio is not stored; discarded after transcription

2) Entry lifecycle
- On upload: create memory with status=PROCESSING
- On success: store transcript, status=READY
- On failure: status=FAILED + error_message

3) Retrieval
- GET /memories (paginated, newest first)
- GET /memories/:id

Auth: single-user mode (no full auth flows).
:contentReference[oaicite:3]{index=3}

## Minimal data model (Postgres)
users:
- id (uuid)
- email (optional)
- created_at

memories:
- id (uuid)
- user_id (uuid)
- created_at
- recorded_at
- transcript (text)
- status (PROCESSING | READY | FAILED)
- error_message (nullable text)
  :contentReference[oaicite:4]{index=4}

[//]: # (## API contract &#40;Reduced MVP&#41;)
- POST /memories
  - multipart/form-data with audio blob OR raw bytes (implementation choice)
  - response: { id, status }
- GET /memories?page=&size=
- GET /memories/{id}

## Frontend routes (Reduced MVP)
- /record (default)
- /memories
- /memories/:id
  :contentReference[oaicite:5]{index=5}

## Implementation rules for Codex
- Keep PRs small and vertical-slice oriented (end-to-end per feature).
- Prefer explicit status handling over cleverness.
- Any new feature must be justified by the Reduced MVP doc; otherwise reject it.
- Add basic error states + retry where needed (especially on upload/transcription).
- Update docs/ if any assumption changes.

## Definition of Done (for any task)
- Compiles (frontend build + backend package)
- Basic happy path works end-to-end:
  record → processing → saved → list → detail
- Handles failure states (FAILED + error message)
- No audio stored server-side or in DB/storage