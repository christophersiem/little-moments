# Spec — Record Save and Processing Synchronization

## Goal
Define what happens after the user saves a recording, including upload state, list placeholder behavior, and processing polling.

## Scope
- Record page save action
- Upload session store
- Memories page processing banner and placeholder row
- Polling and retry behavior

## Preconditions
- User is in recording stopped state and chose Save in stop decision flow.
- `childId` exists and recording blob is available.

## Flow
1. User taps Save.
2. Frontend creates an upload session (`uploading`) and starts backend `POST /api/memories`.
3. Frontend navigates immediately to `/memories` and appends `?pending=<clientId>`.
4. Memories list inserts a temporary top item if backend id is not known yet.
5. Once backend returns:
   - `PROCESSING` -> session status becomes `processing`
   - `READY` -> session status becomes `ready`
   - `FAILED` -> session status becomes `failed`
6. While processing:
   - show non-blocking banner at top
   - poll `GET /api/memories/{id}` every 2500ms
   - stop polling on `READY`, `FAILED`, or timeout (60s)
7. On `READY`:
   - refresh list
   - remove pending query param
8. On `FAILED`:
   - show error banner with retry
   - retry can re-upload original blob if still cached locally.

## State Machine
- Upload store statuses:
  - `uploading`
  - `processing`
  - `ready`
  - `failed`
- Polling statuses:
  - `IDLE`
  - `PROCESSING`
  - `READY`
  - `FAILED`
  - `TIMEOUT`

## UX Rules
- Saving is non-blocking and happens on `/memories`.
- Banner copy is calm and unobtrusive.
- User can continue scrolling while processing.
- No audio file is stored after successful upload handling.

## Failure Handling
- Upload failure: error banner with retry action.
- Poll timeout: "still saving" banner with refresh/retry action.
- Backend errors are surfaced in banner detail text.

## Acceptance Criteria
- Save always navigates directly to `/memories`.
- New entry appears as pending or processing at top.
- Processing status eventually resolves to READY or FAILED.
- Retry path exists for failed upload/processing.

## Implementation References
- `frontend/src/pages/RecordPage.tsx`
- `frontend/src/features/memories/hooks/uploadSessionStore.ts`
- `frontend/src/pages/MemoriesPage.tsx`
- `frontend/src/features/memories/hooks/useProcessingMemory.ts`
- `frontend/src/features/memories/api/memoriesApi.ts`
