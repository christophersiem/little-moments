# Enrichment Workflow (Staging-Ready)

## 1) Webhook Node
- Node: `Webhook - Memory Created`
- Method: `POST`
- Path: `/webhook/smart-memory-enrichment`
- Expected payload:
```json
{
  "entry_id": "uuid",
  "child_id": "uuid",
  "owner_id": "uuid",
  "created_by_user_id": "uuid",
  "transcription": "text",
  "summary": "Backend-generated factual summary",
  "title": "Backend-generated title",
  "summary_source": "backend",
  "audio_url": "https://...|null",
  "created_at": "2026-03-22T08:15:00Z",
  "language": "en"
}
```

## 2) LLM Node
- Node: `Call OpenAI`
- `Content-Type: application/json`
- Output must be strict JSON matching `docs/n8n/enrichment.schema.json`.

### Prompt (exact)
```text
You are a structured enrichment engine for parenting memory transcripts.
Return ONLY valid JSON, no markdown, no commentary, no extra keys.
Your output MUST conform to enrichment.schema.json.

Rules:
- Ground every field in the transcript.
- Never mention transcript/recording/AI in summary.
- If `summary_source=backend` and `summary` is provided, reuse that exact summary text in `summary`.
- category must be one of: milestone, funny, behavior, health, other.
- emotion must be one of: joy, neutral, sadness, surprise, anger, fear, other.
- importance_score must be an integer 1..10.
- confidence_score must be 0..1.
- keywords max 6 short strings.
- Always include schema_version.
- Always include processed_at as ISO datetime.

Few-shot example 1:
Input transcript:
Yesterday at breakfast he asked for more bananas using a full sentence for the first time.
Output JSON:
{"summary":"At breakfast, the child asked for more bananas in a full sentence.","category":"milestone","emotion":"joy","sentiment_score":0.7,"keywords":["breakfast","bananas","full sentence"],"tags":["language","milestone"],"importance_score":9,"is_highlight":true,"milestone_hint":"first full sentence request","embedding_id":null,"model_name":"gpt-4o-mini","model_version":"2026-03","prompt_version":"enrichment-v2","schema_version":"1.0.0","confidence_score":0.88,"model_cost_usd":0.0015,"processed_at":"2026-03-23T12:00:00Z"}

Few-shot example 2:
Input transcript:
He laughed when the soap bubbles popped in the bath and asked for more.
Output JSON:
{"summary":"During bath time, the child laughed at popping soap bubbles and asked for more.","category":"funny","emotion":"joy","sentiment_score":0.6,"keywords":["bath","bubbles","laugh"],"tags":["play"],"importance_score":6,"is_highlight":false,"milestone_hint":null,"embedding_id":null,"model_name":"gpt-4o-mini","model_version":"2026-03","prompt_version":"enrichment-v2","schema_version":"1.0.0","confidence_score":0.81,"model_cost_usd":0.0012,"processed_at":"2026-03-23T12:00:00Z"}
```

## 3) Transform / Function Node
- Use code from [transform-enrichment.js](./transform-enrichment.js).
- Behavior:
1. Parse LLM JSON.
2. Validate against `enrichment.schema.json` rules.
3. Normalize enums and text.
4. Clamp `importance_score` to `1..10`.
5. Compute deterministic highlight if missing:
   - `is_highlight = (importance_score >= 8) || (category === 'milestone')`
6. Use backend summary as source of truth when provided in webhook payload.
7. Route:
   - `valid_upsert`
   - `raw_save` (invalid JSON/schema failure)

## 4) Switch / Routing
- `if route == 'valid_upsert'` -> Upsert path
- `if route == 'raw_save'` -> Raw-save failure path

## 5) Postgres Nodes (parameterized SQL)

### Valid upsert
```sql
insert into public.memory_enrichments (
  memory_id, owner_id, child_id, created_by_user_id,
  summary, category, emotion, sentiment_score,
  keywords, tags, importance_score, is_highlight,
  milestone_hint, embedding_id,
  model_name, model_version, prompt_version, schema_version,
  confidence_score, model_cost_usd, raw_response,
  processed_at, run_status, updated_at
)
values (
  :memory_id, :owner_id, :child_id, :created_by_user_id,
  :summary, :category, :emotion, :sentiment_score,
  cast(:keywords as jsonb), cast(:tags as jsonb), :importance_score, :is_highlight,
  :milestone_hint, :embedding_id,
  :model_name, :model_version, :prompt_version, :schema_version,
  :confidence_score, :model_cost_usd, cast(:raw_response as jsonb),
  :processed_at, 'SUCCESS', now()
)
on conflict (memory_id) do update set
  owner_id = excluded.owner_id,
  child_id = excluded.child_id,
  created_by_user_id = excluded.created_by_user_id,
  summary = excluded.summary,
  category = excluded.category,
  emotion = excluded.emotion,
  sentiment_score = excluded.sentiment_score,
  keywords = excluded.keywords,
  tags = excluded.tags,
  importance_score = excluded.importance_score,
  is_highlight = excluded.is_highlight,
  milestone_hint = excluded.milestone_hint,
  embedding_id = excluded.embedding_id,
  model_name = excluded.model_name,
  model_version = excluded.model_version,
  prompt_version = excluded.prompt_version,
  schema_version = excluded.schema_version,
  confidence_score = excluded.confidence_score,
  model_cost_usd = excluded.model_cost_usd,
  raw_response = excluded.raw_response,
  processed_at = excluded.processed_at,
  run_status = 'SUCCESS',
  updated_at = now();

update public.memories
set enriched = true,
    enrichment_status = 'SUCCESS',
    updated_at = now()
where id = :memory_id;
```

### Raw-save fallback
```sql
insert into public.memory_enrichments (
  memory_id, owner_id, child_id, created_by_user_id,
  summary, category, emotion, sentiment_score,
  keywords, tags, importance_score, is_highlight,
  milestone_hint, embedding_id,
  model_name, model_version, prompt_version, schema_version,
  confidence_score, model_cost_usd, raw_response,
  processed_at, run_status, updated_at
)
values (
  :memory_id, :owner_id, :child_id, :created_by_user_id,
  'Enrichment failed validation.', 'other', 'neutral', null,
  '[]'::jsonb, '[]'::jsonb, 1, false,
  null, null,
  :model_name, :model_version, :prompt_version, :schema_version,
  0, null, cast(:raw_response as jsonb),
  :processed_at, 'FAILED', now()
)
on conflict (memory_id) do update set
  raw_response = excluded.raw_response,
  run_status = 'FAILED',
  processed_at = excluded.processed_at,
  updated_at = now();

update public.memories
set enriched = false,
    enrichment_status = 'FAILED',
    updated_at = now()
where id = :memory_id;
```

## 6) Trigger backend embedding run (new HTTP node)
- Method: `POST`
- URL: `https://<backend-domain>/api/internal/embeddings/run`
- Headers:
  - `X-Internal-Api-Key: <EMBEDDING_TRIGGER_API_KEY>`
  - `Content-Type: application/json`
- Body: none
- Expected response:
  - `202` started
  - `200` already running

## 7) Unit test stubs
- See [transform-enrichment.test.js](./transform-enrichment.test.js).

## 8) Runbook notes
- Log per enrichment call: `memory_id`, `model_name`, `model_version`, `prompt_version`, `schema_version`, `processed_at`, `model_cost_usd`, `run_status` and `raw_response` on failure.
- Keep GIN indexes on `keywords`, `tags`, and `raw_response` for search/RAG support.
- Retention: keep `raw_response` for 90 days, then redact/archive.
- CI minimum: JSON schema validation tests, transform tests, prompt output-shape regression checks, cost guard checks.
