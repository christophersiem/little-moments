# API Specification (Current Implementation)

Base path: `/api`

All `/api/*` endpoints require `Authorization: Bearer <supabase_access_token>`.

## Health

### GET `/health`
Response:
```json
{ "status": "ok" }
```

## Memories

### POST `/memories`
Creates a memory from recorded audio and processes transcription + metadata.

Request:
- `multipart/form-data`
- `audio` (required file)
- `childId` (required uuid)
- `recordedAt` (optional ISO timestamp)

Response (`CreateMemoryResponse`):
```json
{
  "id": "uuid",
  "ids": ["uuid"],
  "count": 1,
  "status": "PROCESSING | READY | FAILED",
  "errorMessage": "string | null",
  "transcriptPreview": "string | null",
  "title": "string | null",
  "summary": "string | null",
  "tags": ["Language", "Growth"]
}
```

Notes:
- Backend may split one transcript into multiple memories (`ids`, `count`).
- Processing failures return `FAILED` with `errorMessage`.

### GET `/memories`
Returns paginated memories, newest first.

Query params:
- `page` (default `0`)
- `size` (default `20`)
- `familyId` (optional)
- `month` (optional `YYYY-MM`)
- `tags` (optional, repeatable, e.g. `?tags=Language&tags=Play`)

Response (`MemoryListResponse`):
```json
{
  "items": [
    {
      "id": "uuid",
      "createdAt": "2026-03-01T10:00:00Z",
      "recordedAt": "2026-03-01T09:55:00Z",
      "status": "PROCESSING | READY | FAILED",
      "title": "string | null",
      "transcriptSnippet": "string | null",
      "tags": ["Language"]
    }
  ],
  "page": 0,
  "size": 5,
  "totalElements": 12,
  "totalPages": 3
}
```

### GET `/memories/{id}`
Returns full memory detail.

Response (`MemoryResponse`):
```json
{
  "id": "uuid",
  "createdAt": "2026-03-01T10:00:00Z",
  "recordedAt": "2026-03-01T09:55:00Z",
  "status": "PROCESSING | READY | FAILED",
  "title": "string | null",
  "summary": "string | null",
  "transcript": "string | null",
  "errorMessage": "string | null",
  "tags": ["Language", "Milestone"]
}
```

### PATCH `/memories/{id}`
Updates memory fields.

Request JSON (`UpdateMemoryRequest`):
```json
{
  "title": "string (optional)",
  "transcript": "string (optional)",
  "tags": ["Language", "Play"],
  "recordedAt": "2026-03-01T09:55:00Z"
}
```

### DELETE `/memories/{id}`
Deletes one memory.
Response: `204 No Content`.

## Families, Children, Members, Invites

### GET `/families`
Returns families where current user is a member.

### POST `/families/with-owner`
Creates a family and owner membership for current user (via RPC gateway).
Request:
```json
{ "name": "My Family" }
```
Response:
```json
{ "familyId": "uuid" }
```

### GET `/families/{familyId}/children/first`
Returns first child id for the family (or null).

### POST `/families/{familyId}/children/default`
Ensures a default child for family and returns child id.

### GET `/families/{familyId}/members`
Returns member list with display names and roles.

### POST `/families/{familyId}/invitations`
Creates invitation token.
Request:
```json
{ "email": "user@example.com", "role": "OWNER | MEMBER" }
```
Response:
```json
{ "token": "raw-invite-token" }
```

### POST `/invitations/accept`
Accepts invite token for authenticated user.
Request:
```json
{ "token": "raw-invite-token" }
```
Response:
```json
{ "familyId": "uuid" }
```

### PATCH `/families/{familyId}/members/{userId}/role`
Request:
```json
{ "role": "OWNER | MEMBER" }
```
Response: `204 No Content`.

### DELETE `/families/{familyId}/members/{userId}`
Removes member (last-owner guard enforced server-side/RPC).
Response: `204 No Content`.

## Profiles

### POST `/profiles/ensure`
Ensures profile row for current user.
Request:
```json
{ "displayName": "Chris" }
```
Response: `204 No Content`.

### GET `/profiles/me`
Response:
```json
{ "userId": "uuid", "displayName": "Chris" }
```

### PATCH `/profiles/me`
Request:
```json
{ "displayName": "Chris" }
```
Response: `204 No Content`.

## Error Handling

Common status codes:
- `400` invalid request payload / validation
- `401` missing or invalid bearer token
- `403` forbidden (role/RLS guard)
- `404` not found
- `500` internal server error
