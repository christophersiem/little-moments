# Data Model (Current Implementation)

Canonical schema is Supabase Postgres (`public.*` + `auth.users`).
SQL source of truth is `docs/sql/*.sql`.

## Core Identity and Access

### `auth.users` (Supabase managed)
- user identity, email, auth lifecycle

### `public.profiles`
- `user_id uuid` (PK, FK -> `auth.users.id`)
- `display_name text`
- `created_at timestamptz`
- `updated_at timestamptz`

### `public.families`
- `id uuid` (PK)
- `name text`
- `created_at timestamptz`
- `created_by uuid` (FK -> `auth.users.id`)

### `public.family_members`
- `family_id uuid` (FK -> `families.id`)
- `user_id uuid` (FK -> `auth.users.id`)
- `role text` (`OWNER` | `MEMBER`)
- `joined_at timestamptz`
- PK: (`family_id`, `user_id`)

### `public.invitations`
- `id uuid` (PK)
- `family_id uuid` (FK -> `families.id`)
- `email text`
- `role text` (`OWNER` | `MEMBER`)
- `token_hash text`
- `expires_at timestamptz`
- `accepted_at timestamptz`
- `accepted_by uuid` (FK -> `auth.users.id`, nullable)
- `created_at timestamptz`
- `created_by uuid` (FK -> `auth.users.id`)

## Child Scope

### `public.children`
- `id uuid` (PK)
- `family_id uuid` (FK -> `families.id`)
- `name text`
- `created_at timestamptz`
- `created_by uuid` (FK -> `auth.users.id`)

## Memories

### `public.memories`
- `id uuid` (PK)
- `child_id uuid` (FK -> `children.id`)
- `created_by uuid` (FK -> `auth.users.id`)
- `created_at timestamptz`
- `recorded_at timestamptz`
- `status text` (`PROCESSING` | `READY` | `FAILED`)
- `title text` (nullable)
- `summary text` (nullable)
- `transcript text` (nullable)
- `error_message text` (nullable)
- `tags text[]` (nullable/empty)

Optional split-tracking fields may also exist in some environments:
- `parent_memory_id uuid` (self FK)
- `source_transcript text`
- `is_parent boolean`

## Key Indexes
- `family_members(user_id)`
- `family_members(family_id)`
- `families(created_by)`
- `children(family_id)`
- `memories(child_id, created_at desc)`
- `memories(recorded_at desc, created_at desc)`

## Status Values
- `PROCESSING`
- `READY`
- `FAILED`

## Audio Handling
- No persistent audio storage in current default flow.
- Audio blob is uploaded to backend for transcription and discarded afterward.
