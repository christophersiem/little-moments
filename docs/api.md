# API Specification (Reduced MVP)

Base path: /api

---

## POST /memories

Creates a memory from uploaded audio and transcribes it.

Request:
- `multipart/form-data`
- field `audio`: audio blob
- optional field `recordedAt`: ISO timestamp

Response:
{
"id": "uuid",
"status": "PROCESSING | READY | FAILED",
"errorMessage": "optional failure message",
"transcriptPreview": "short preview"
}

---

## GET /memories

Returns paginated memory list.

Query params:
- page
- size

Response:
{
  "items": [{ "id": "...", "createdAt": "...", "recordedAt": "...", "status": "READY", "transcriptSnippet": "..." }],
  "page": 0,
  "size": 20,
  "totalElements": 12,
  "totalPages": 1
}

---

## GET /memories/{id}

Returns full memory including transcript.

---

## Error Handling

- 400 validation error
- 404 not found
- 500 internal error
