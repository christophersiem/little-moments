# Spec — Memory Detail Owner Management

## Goal
Define read/edit/delete behavior on `/memories/:id` with clear owner/member permissions.

## Scope
- Memory detail display
- Owner edit actions (title, date, transcript, tags)
- Delete confirmation flow
- Permission and session error handling

## View Behavior
- Always show:
  - title (fallback: `Untitled Memory`)
  - recorded date/time
  - tags
  - summary card
  - transcript card
- Members (non-owners) are read-only.

## Owner Actions
- Actions are consolidated in overflow menu:
  - Edit title
  - Edit date
  - Edit transcript
  - Edit tags
  - Delete memory
- Only one edit mode is active at a time.
- Save/cancel controls are icon buttons per edit mode.

## Update Rules
- Title update sends `title`.
- Date update sends ISO `recordedAt`.
- Transcript update sends `transcript` and backend re-generates summary/title/tags according to backend rules.
- Tags update sends full tag list.
- On successful save:
  - local memory view updates
  - "Saved" feedback shown briefly
  - `lastSavedAt` is updated.

## Delete Flow
1. User opens overflow menu and selects Delete memory.
2. Confirm dialog appears:
   - title: "Delete memory?"
   - body: "This can't be undone."
3. Confirm triggers delete request.
4. On success: navigate to `/memories`.

## Error Handling
- `401`: sign out and navigate to `/record`.
- `403`: show authorization message.
- other errors: show generic or backend message inline.

## Acceptance Criteria
- Members cannot edit or delete.
- Owners can edit each supported field and persist changes.
- Delete is always gated by confirmation.
- Successful delete always returns to list.

## Implementation References
- `frontend/src/pages/MemoryDetailPage.tsx`
- `frontend/src/features/memories/api/memoriesApi.ts`
- `backend/src/main/java/de/csiem/backend/controller/MemoryController.java`
- `backend/src/main/java/de/csiem/backend/service/SupabaseMemoryService.java`
