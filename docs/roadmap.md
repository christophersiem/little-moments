# Little Moments Roadmap (Historical Snapshot)

As of February 27, 2026. This file is a historical planning snapshot and is not the source of truth for current runtime behavior.

For current implemented behavior, use:
- `docs/api.md`
- `docs/data-model.md`
- `docs/tech.md`
- `docs/specs/*`

## Top 5 next steps
1. **R1: Add strict audio upload validation and limits (frontend + backend).**  
   Highest reliability risk today: unsupported file/type/oversized payloads fail late and unclearly.
2. **R2: Add idempotent create-memory flow with safe retry semantics.**  
   Reduces duplicate memories and ambiguous failures during unstable network conditions.
3. **R3: Make processing/error recovery resilient across navigation and refresh.**  
   Protects the “tired evening parent” flow when requests are slow or fail mid-way.
4. **R4: Add production-grade observability for memory creation/update failures.**  
   Needed to debug real-world failures quickly without exposing technical details to parents.
5. **R5: Close core test gaps (frontend flow + backend validation/service logic + migration confidence).**  
   Current tests cover happy paths but not the highest-risk failure modes.

## Current state inventory

### Frontend
- **Framework/structure:** React + Vite + TypeScript, styled-components theme/token setup (`src/styles/*`), app shell routing in `src/app/App.tsx`.
- **Routes implemented:** `/record`, `/memories`, `/memories/:id`, `/settings`, `/settings/account`, `/settings/privacy`.
- **Recording flow states in code (`RecordPage.tsx`):**
  - `idle` -> `recording` -> `stopped` (Save/Discard sheet + Discard confirm) -> `saving` -> detail page.
  - `error` state supports retry using in-memory blob reference.
- **Flow behavior today:**
  - Upload/transcription only starts after explicit Save.
  - Discard clears local recording ref/chunks.
  - On successful create, app navigates directly to memory detail.
- **Memories list/detail:**
  - Timeline-style list with local month/tag filtering.
  - Detail supports editing title/transcript/tags and deleting memory.
  - Summary shown read-only and regenerated on transcript update (backend).
- **Error handling:**
  - API errors mapped to user-friendly text via `getApiErrorMessage`.
  - No global request timeout/abort strategy.
  - No offline detection banner/flow.
- **Design system usage:**
  - Tokens + theme widely used.
  - Consistent warm palette and minimum touch targets mostly respected.

### Backend
- **Layering:** `controller/service/repository/model/dto/exception/config` is in place; constructor injection used.
- **Endpoints available:**
  - `POST /api/memories` (multipart audio + optional recordedAt)
  - `GET /api/memories` (pagination + optional `month` and `tags`)
  - `GET /api/memories/{id}`
  - `PATCH /api/memories/{id}`
  - `DELETE /api/memories/{id}`
- **Persistence model:**
  - `users`, `memories`, `memory_tags`; status enum `PROCESSING|READY|FAILED`.
  - Additional columns beyond strict reduced docs: `title`, `summary`.
- **Processing model:**
  - Synchronous in request thread: transcribe -> insights (title/summary) -> tag detection -> save.
  - On exception: memory marked `FAILED` with `error_message`.
- **Error handling:**
  - `GlobalExceptionHandler` for `ResponseStatusException` and generic `500`.
  - No structured correlation IDs across logs/response.
- **Migrations:**
  - Flyway `V1` (base schema), `V2` (tags), `V3` (title/summary).

### Tests and quality gates
- **Frontend tests:** only `stopDecisionMachine.test.ts` (3 assertions around stop/save/discard transitions).
- **Backend tests:**
  - `MemoryControllerIntegrationTests` cover create/list/detail, FAILED status, filter query, patch update, delete.
  - `BackendApplicationTests` context load.
- **Missing tests:**
  - Frontend integration tests for `RecordPage`, retries, and navigation locking.
  - Backend unit tests for `MemoryService`, `MemoryInsightsService`, validation boundaries.
  - Flyway migration tests against real Postgres behavior.
- **Validation status (run on February 27, 2026):**
  - `cd frontend && npm run build` ✅
  - `cd frontend && npm run lint` ✅
  - `cd frontend && npm run test` ✅
  - `cd backend && ./mvnw clean package` ✅
- **Lint caveat:** ESLint config currently targets JS/JSX globs only; TS/TSX rule coverage is effectively minimal.

### Operational setup
- **Env vars present:** `.env.example` includes OpenAI + datasource + CORS + server port.
- **Backend env loading:** `spring.config.import` reads local `.env` and `../.env`.
- **Docker/dev infra:** no `docker-compose`/Dockerfile in repo.
- **Logging:** default Spring logging; no explicit request/processing audit schema.

## Biggest Reduced MVP gaps/risks
- **Upload guardrails are weak:** no explicit size/type/duration limits before calling transcription.
- **Create-memory idempotency is missing:** retries may create duplicate memories under flaky networks.
- **Resilience is memory-local only:** retry depends on in-memory blob; page refresh loses recovery path.
- **Synchronous processing latency risk:** long transcription/insight calls can degrade UX and increase timeout risk.
- **Observability is too shallow for production support:** no correlation IDs and limited structured error context.
- **Validation coverage is incomplete:** `UpdateMemoryRequest` and multipart metadata have little boundary validation.
- **Test coverage is narrow at failure boundaries:** core unhappy-path scenarios are under-tested.
- **Docs drift from implementation:** reduced MVP docs still describe “no title/summary/tags” while code actively uses them.

## Backlog (prioritized, MVP-aligned)

| ID | Priority | Scope | User value | Implementation approach | Complexity | Risk | Dependencies | Acceptance criteria | Suggested PR split |
|---|---|---|---|---|---|---|---|---|---|
| R1 | P0 | Reduced MVP | Parents get clear, immediate feedback when recording format/size is invalid instead of silent/late failure. | Add backend multipart validation (type whitelist, max bytes, recordedAt sanity) and matching frontend preflight checks/messages before upload. | M | Med | None | Reject unsupported MIME with 400 + friendly message; enforce max payload; frontend blocks invalid upload before POST; error copy is non-technical. | PR1 backend validation + API errors; PR2 frontend preflight + UI copy |
| R2 | P0 | Reduced MVP | Retry becomes safe; no accidental duplicate memories during bad connectivity. | Introduce idempotency key on `POST /memories` (header/form field), persist key hash and dedupe within window; frontend reuses key on retry for same blob. | M | High | R1 recommended | Same retry returns same memory id/status; duplicate POST with same key does not create new row; integration tests cover duplicate retry. | PR1 backend idempotency storage/logic; PR2 frontend retry key wiring + tests |
| R3 | P0 | Reduced MVP | If app is interrupted, parent can still recover instead of losing progress/confidence. | Persist pending create state in `sessionStorage` (recording metadata + request key + transient state), show recoverable “Continue saving/Start over” prompt. | M | Med | R2 | Refresh during saving shows recover option; retry path works after navigation back; no auto-upload before explicit confirmation when stopped. | PR1 state persistence/recovery UI; PR2 edge-case hardening |
| R4 | P1 | Reduced MVP | Faster support/debug means fewer unresolved “Could not save” incidents. | Add structured logs around create/update/delete with request id, memory id, status transition, provider latency/failure class; expose request id in error response. | S | Low | None | Every failed create/update includes request id in logs and API error body; successful create logs duration + status. | Single PR |
| R5 | P1 | Reduced MVP | Core path confidence before shipping increases and regressions are caught earlier. | Add frontend tests for RecordPage transitions and retry logic; backend unit tests for validation/normalization/insights fallback; migration smoke test. | M | Med | R1-R4 partially | Tests cover invalid audio, save/discard transitions, duplicate retry behavior, summary regeneration; CI pass criteria documented. | PR1 frontend tests; PR2 backend tests |
| R6 | P1 | Reduced MVP | Prevents long waits and confusion for 60s voice entries. | Add request timeout and cancellation handling (frontend `AbortController`, backend provider timeout config), with clear timeout-specific error message. | M | Med | R4 | Timeout produces stable user message and retry option; hung request does not leave UI stuck in saving. | PR1 backend timeout config; PR2 frontend abort + messaging |
| R7 | P1 | Reduced MVP | Better data quality and safer edits in detail view. | Validate `PATCH /memories/{id}` fields: title length bounds, transcript max length/non-empty trimmed, tags whitelist + max count. | S | Low | R1 | Invalid patch payload returns 400 with clear reason; UI surfaces inline save error; tests cover all invalid cases. | Single PR |
| R8 | P2 | Reduced MVP | List behavior remains reliable as memory count grows. | Move month/tag filtering to backend query usage from frontend-only local filtering; keep UI unchanged but fetch server-filtered list. | M | Med | R7 preferred | Filter UI sends query params; list reflects backend-filtered pagination; no client-side mismatch with >50 items. | PR1 API/hook changes; PR2 UI wiring + regression tests |
| R9 | P2 | Reduced MVP | Parents see predictable states for FAILED/PROCESSING entries in list/detail. | Standardize state copy/components for `PROCESSING`, `READY`, `FAILED` in list card and detail page; unify retry CTA behavior. | S | Low | R4 | Status badges/copy consistent across pages; FAILED entry clearly offers retry path; no technical jargon shown. | Single PR |
| R10 | P2 | Reduced MVP | Fewer local setup issues for developers means faster bug turnaround. | Add root-level setup doc: DB creation, `.env` keys, migration expectations, run order; include troubleshooting for common startup failures. | S | Low | None | New developer can run frontend/backend on first attempt using docs; startup error cases documented with fixes. | Single PR |
| R11 | P2 | Reduced MVP | Better resilience for unsupported browser media combinations. | Detect supported `MediaRecorder` MIME types at runtime; choose best supported type and filename extension consistently. | S | Med | R1 | Recording works on Safari/Chrome fallback types where available; unsupported environments show explicit guidance. | Single PR |
| R12 | P2 | Reduced MVP | Avoids accidental navigation breakpoints during record/save flow. | Tighten navigation lock rules to include `saving` and modal states; ensure lock messaging is single, consistent component. | S | Low | R3 | User cannot trigger conflicting navigation during save; lock hint appears once and disappears predictably. | Single PR |
| R13 | P3 | Reduced MVP | Keeps product and engineering aligned, preventing scope drift. | Update `/docs` to reflect current implemented behavior (title/summary/tags/edit/delete/settings/privacy routes) and mark deviations from strict reduced baseline. | S | Low | R5 optional | Docs match actual endpoints and UI routes; explicit “current MVP variant” vs “strict reduced” section exists. | Single PR |

## Post-MVP (explicitly out of scope)
- **Full async job pipeline with queue/worker orchestration.** Valuable later for scale, but current reduced target can ship with bounded synchronous flow after guardrails.
- **Audio playback and long-term audio storage controls.** Not required for minimal “capture -> transcript -> review” promise.
- **Semantic/vector search and embeddings-based retrieval UX.** Higher complexity than current stability goals.
- **Monthly summaries and reflection assistant features.** Useful but not blocking reduced MVP reliability.
- **Multi-user auth/household profiles/subscriptions/paywall enforcement.** Significant product and security scope beyond reduced MVP.

## PR description summary (copy-ready)
### Why these top 5 are prioritized
- They directly reduce failed or duplicate saves in the core evening flow (`record -> save -> transcribe -> detail`).
- They target the highest current production risks seen in code: weak input guardrails, no idempotency, limited recovery after interruption, low observability, and thin failure-path tests.
- They are incremental and compatible with current architecture, so they can be shipped as small PRs without destabilizing the app.

### Top 5 next steps
1. Strict upload validation and limits.  
2. Idempotent create-memory retry flow.  
3. Recoverable processing state across refresh/navigation.  
4. Structured observability with request correlation.  
5. Expanded tests for core failure paths and migrations.
