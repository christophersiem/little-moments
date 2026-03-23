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
- `owner_id uuid` (nullable, RBAC-ready owner scope)
- `created_at timestamptz`
- `recorded_at timestamptz`
- `status text` (`PROCESSING` | `READY` | `FAILED`)
- `enriched boolean` (default `false`)
- `enrichment_status text` (`PENDING` | `SUCCESS` | `FAILED`)
- `title text` (nullable)
- `summary text` (nullable)
- `transcript text` (nullable)
- `error_message text` (nullable)
- `tags text[]` (nullable/empty)

Optional split-tracking fields may also exist in some environments:
- `parent_memory_id uuid` (self FK)
- `source_transcript text`
- `is_parent boolean`

### `public.memory_enrichments`
- `id uuid` (PK)
- `memory_id uuid` (FK -> `memories.id`, unique: one enrichment row per memory)
- `owner_id uuid` (RBAC-ready ownership scope)
- `child_id uuid` (FK -> `children.id`, nullable)
- `created_by_user_id uuid` (audit actor scope)
- `summary text`
- `category enum` (`milestone` | `funny` | `behavior` | `health` | `other`)
- `emotion enum` (`joy` | `neutral` | `sadness` | `surprise` | `anger` | `fear` | `other`)
- `sentiment_score numeric` (optional)
- `keywords jsonb` (array, max 6 in validation layer)
- `tags jsonb` (optional array)
- `importance_score smallint` (1..10)
- `is_highlight boolean`
- `milestone_hint text` (nullable)
- `embedding_id text` (nullable, vector DB reference)
- `model_name text`
- `model_version text` (nullable)
- `prompt_version text`
- `schema_version text`
- `confidence_score numeric` (0..1)
- `model_cost_usd numeric` (nullable)
- `raw_response jsonb` (nullable)
- `processed_at timestamptz`
- `run_status text` (`SUCCESS` | `FAILED`)
- `created_at timestamptz`
- `updated_at timestamptz`

## Key Indexes
- `family_members(user_id)`
- `family_members(family_id)`
- `families(created_by)`
- `children(family_id)`
- `memories(child_id, created_at desc)`
- `memories(recorded_at desc, created_at desc)`
- `memories(enriched, enrichment_status, created_at desc)`
- `memory_enrichments(memory_id)` unique
- `memory_enrichments(owner_id)`
- `memory_enrichments(child_id)`
- `memory_enrichments(is_highlight, importance_score desc, processed_at desc)`
- `memory_enrichments.keywords` GIN (`jsonb`)
- `memory_enrichments.tags` GIN (`jsonb`)
- `memory_enrichments.raw_response` GIN (`jsonb_path_ops`)

## Status Values
- `PROCESSING`
- `READY`
- `FAILED`

## Audio Handling
- No persistent audio storage in current default flow.
- Audio blob is uploaded to backend for transcription and discarded afterward.
