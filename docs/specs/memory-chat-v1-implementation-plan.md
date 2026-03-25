# Memory Chat V1 Implementation Plan

## Current Architecture Findings

### Frontend
- Stack: React + Vite + TypeScript + styled-components.
- Routing is custom in [`frontend/src/app/router.tsx`](/Users/christopher/projects/little-moments/frontend/src/app/router.tsx), not React Router.
- Memories entry point is [`frontend/src/pages/MemoriesPage.tsx`](/Users/christopher/projects/little-moments/frontend/src/pages/MemoriesPage.tsx), with a sticky header and modular timeline components.
- Backend API calls go through [`frontend/src/lib/backendApi.ts`](/Users/christopher/projects/little-moments/frontend/src/lib/backendApi.ts) and use Supabase access token as `Authorization: Bearer ...`.
- Memory API layer is [`frontend/src/features/memories/api/memoriesApi.ts`](/Users/christopher/projects/little-moments/frontend/src/features/memories/api/memoriesApi.ts).
- Test setup: Vitest + Testing Library.

### Backend
- Stack: Spring Boot (webmvc), layered controller/service style.
- Memory endpoints are in [`backend/src/main/java/de/csiem/backend/controller/MemoryController.java`](/Users/christopher/projects/little-moments/backend/src/main/java/de/csiem/backend/controller/MemoryController.java), delegating to `SupabaseMemoryService` when Supabase mode is enabled.
- Auth scope is enforced via Supabase bearer token; backend resolves current user via `/auth/v1/user`.
- Data access in Supabase mode uses REST calls through [`SupabaseGatewayService`](/Users/christopher/projects/little-moments/backend/src/main/java/de/csiem/backend/service/SupabaseGatewayService.java).
- Existing AI flow for title/summary exists in [`MemoryInsightsService`](/Users/christopher/projects/little-moments/backend/src/main/java/de/csiem/backend/service/MemoryInsightsService.java) with structured JSON extraction and validation-like post-processing.
- Existing vector foundation exists:
  - `memory_enrichments` + `embeddings` schema and indexes (`V7`, `V20`, `V21`, `V22` migrations).
  - embedding generation runner in [`EmbeddingRunnerService`](/Users/christopher/projects/little-moments/backend/src/main/java/de/csiem/backend/service/EmbeddingRunnerService.java).
- RLS hardening exists for `memory_enrichments` and `embeddings` (`can_access_memory(...)` policy path), enabling scoped retrieval via authenticated Supabase requests.
- Test setup: JUnit 5 + Mockito + MockMvc.

### Data Model Relevant for Chat V1
- `memories`: id, child scope, title/summary/transcript, status, recorded_at.
- `memory_enrichments`: summary/category/emotion/keywords/tags/importance plus enrichment status fields.
- `embeddings`: vector(1536) tied to `memory_id` and optional `enrichment_id`.
- Retrieval-ready foundation is present but no user-facing memory-chat endpoint/UI exists yet.

## Proposed Approach

### 1) Backend endpoint and harness
- Add `POST /api/memories/chat` endpoint under `MemoryController`.
- Create `MemoryChatService` to handle:
  1. input validation (question length/non-empty),
  2. lightweight intent routing (`memory_question`, `summary_request`, `out_of_scope`, `unsafe_request`),
  3. retrieval (scoped, embedding-based + chronological fallback),
  4. structured answer generation via LLM,
  5. schema validation + response normalization,
  6. graceful statuses (`success`, `insufficient_evidence`, `out_of_scope`, `unsafe`).
- Enforce server-side scope by keeping retrieval paths on authenticated Supabase calls (no unrestricted querying from chat).

### 2) Retrieval flow
- Add Supabase RPC migration for vector retrieval over embeddings joined with memories/enrichments.
- Call RPC with authenticated bearer token using `SupabaseGatewayService`.
- For milestone/date-like questions (`first`, `earliest`, `last`, `latest`), apply chronological ordering over retrieved candidates before answer generation.
- Add fallback retrieval from recent memories if embeddings are missing/weak.

### 3) Structured model output + validation
- Add dedicated prompt + DTO schema contract for chat answer:
  - `answer`, `confidence`, `sourceMemoryIds`, `notes`, `status`.
- Parse model JSON response and validate required fields/enums server-side.
- Refuse or redirect out-of-scope/unsafe intents before generation where possible.

### 4) Frontend integration in Memories page
- Add a subtle “Ask your memories” entry point in memories header area.
- Open a calm bottom-sheet chat panel (mobile-first), aligned with current visual style.
- Render:
  - empty state with example questions,
  - chat answer card,
  - source memory cards with date/title/snippet + open-memory action,
  - uncertainty/failure messages.
- Keep it explicitly memory-assistant UX, not generic chatbot branding.

### 5) Tests and docs
- Backend tests:
  - intent routing behavior (out-of-scope/unsafe),
  - structured-output validation fallbacks,
  - scoped retrieval only / no cross-user leakage path (service-level guard + gateway contract),
  - no-result/insufficient-evidence behavior.
- Frontend tests:
  - entry button opens panel,
  - empty state examples render,
  - answer + sources render correctly,
  - source click navigates to memory detail.
- Update concise docs in `docs/api.md` and `docs/tech.md`.

## Files Likely to Change

### Backend (expected)
- `backend/src/main/java/de/csiem/backend/controller/MemoryController.java`
- `backend/src/main/java/de/csiem/backend/service/SupabaseMemoryService.java`
- `backend/src/main/java/de/csiem/backend/service/SupabaseGatewayService.java`
- `backend/src/main/java/de/csiem/backend/service/MemoryChatService.java` (new)
- `backend/src/main/java/de/csiem/backend/dto/MemoryChatRequest.java` (new)
- `backend/src/main/java/de/csiem/backend/dto/MemoryChatResponse.java` (new)
- `backend/src/main/java/de/csiem/backend/dto/MemoryChatSourceResponse.java` (new)
- `backend/src/main/resources/application.properties`
- `backend/src/main/resources/db/migration/V23__memory_chat_retrieval_rpc.sql` (new)
- tests under `backend/src/test/java/de/csiem/backend/...`

### Frontend (expected)
- `frontend/src/pages/MemoriesPage.tsx`
- `frontend/src/features/memories/api/memoriesApi.ts`
- `frontend/src/features/memories/types.ts`
- `frontend/src/features/memories/components/MemoryChatSheet.tsx` (new)
- `frontend/src/features/memories/components/MemoryChatEntry.tsx` (new, optional)
- `frontend/src/pages/MemoriesPage.test.tsx`

### Docs
- `docs/api.md`
- `docs/tech.md`

## Main Risks
- Vector retrieval may return weak/empty results for memories without embeddings; requires robust fallback.
- Prompt-only safety is insufficient; intent routing + strict backend gating must be explicit.
- Structured output from LLM can drift; strict parser/validator needed with safe fallback response.
- Supabase RPC query complexity (vector similarity + scoped joins) can introduce subtle bugs if not validated with realistic test data assumptions.

## Testing Strategy
- Unit-test chat harness logic (intent routing, validation, response normalization).
- Service tests with mocked gateway/LLM for:
  - success path,
  - insufficient evidence,
  - out-of-scope and unsafe refusal,
  - structured output invalid -> fallback.
- Controller test for `/api/memories/chat` auth header and response mapping.
- Frontend component/page tests for open/send/render/source navigation behavior.
- Run full regression commands after implementation:
  - `cd frontend && npm run test`
  - `cd frontend && npm run build`
  - `cd backend && ./mvnw test`
  - `cd backend && ./mvnw -q clean package`
