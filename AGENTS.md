# AGENTS.md — Little Moments (Current MVP Guardrails)

## Goal
Ship and stabilize the current MVP flow:
record -> save -> processing -> list -> detail,
with family sharing (owner/member roles) and invite links.

## Scope Guardrails
Build only what supports the current MVP directly.

Out of scope unless explicitly requested:
- social/public sharing
- analytics dashboards
- medical/diagnostic interpretation
- large architectural rewrites

## Current Runtime Architecture
- Frontend: React + Vite + TypeScript
- Backend: Spring Boot REST
- Auth: frontend talks directly to Supabase Auth
- App data: frontend -> backend `/api` -> Supabase Postgres/RPC
- Audio: uploaded to backend for transcription; not stored in default flow

## Current Core Flows
- Record: idle -> recording -> stopped -> save/discard
- Save: starts upload only after explicit save, then navigates to `/memories`
- Memories page: shows processing banner/pending item and polls status
- Detail page: owner can edit title/date/transcript/tags and delete; member is read-only
- Family page: owner manages invites and member roles; member can only view

## Routes
- `/record`
- `/memories`
- `/memories/:id`
- `/onboarding`
- `/invite/accept`
- `/settings`
- `/settings/account`
- `/settings/family`
- `/settings/privacy`

## Repo Structure
- `frontend/`
- `backend/`
- `docs/`
- `AGENTS.md`

## Commands

### Frontend
- Install: `cd frontend && npm install`
- Dev: `cd frontend && npm run dev`
- Build: `cd frontend && npm run build`
- Test: `cd frontend && npm run test`
- Lint: `cd frontend && npm run lint`

### Backend
- Build: `cd backend && ./mvnw -q clean package`
- Dev: `cd backend && ./mvnw spring-boot:run`
- Test: `cd backend && ./mvnw test`

## Engineering Conventions

### Frontend
- Keep `App.tsx` focused on routing/bootstrap/layout; feature logic belongs in `features/*` and pages.
- New code in TypeScript only (`.ts` / `.tsx`).
- Keep feature boundaries typed (API responses, hooks, component props).
- Use existing structure:
  - `src/app/`
  - `src/pages/`
  - `src/components/`
  - `src/features/*`
  - `src/lib/`
  - `src/styles/`

### Backend
- Layered architecture:
  - `controller/`
  - `service/`
  - `repository/`
  - `model/`
  - `dto/`
  - `config/`
  - `exception/`
- Controllers do not access repositories directly.
- Constructor injection only.

## Data and Security Rules
- Supabase SQL files in `docs/sql/*.sql` are schema/RLS/RPC source of truth.
- RLS is authoritative for data access.
- Owner/member checks must be enforced server-side (RPC/RLS/backend), not only UI-side.

## Docs Maintenance Rule
When behavior changes, update docs in the same PR:
- API changes -> `docs/api.md`
- schema/RLS/RPC changes -> `docs/sql/*` + `docs/data-model.md`
- UX flow changes -> `docs/ui-flows.md` and relevant `docs/specs/*`
- architecture/env changes -> `docs/tech.md`

See `docs/README.md` for documentation ownership and source-of-truth mapping.

## Definition of Done
- Frontend and backend compile.
- Happy path works end-to-end.
- Failure states are handled with user-facing feedback.
- No undocumented behavior drift between code and docs.
