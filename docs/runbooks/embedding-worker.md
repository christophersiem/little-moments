# Embedding Worker Runbook

- Preferred trigger in current MVP: n8n calls `POST /api/internal/embeddings/run` after enrichment upsert; backend then runs a one-shot embedding pass.
- Monitor queue backlog (`memory_enrichments.embedding_status='pending'`), average embedding latency, failed jobs (`embedding_status='failed'`), and daily `sum(model_cost_usd)`.
- Tune `ivfflat` `lists` based on corpus growth (start near `sqrt(row_count)`), then benchmark recall vs latency; rebuild index (`REINDEX INDEX idx_embeddings_embedding_ivfflat`) after major data growth.
- DLQ triage: inspect newest `embedding_dlq` rows, fix root cause, run requeue SQL from `backend/scripts/embedding-worker.sql`, then rerun worker.
- Retry policy: transient API failures retry with exponential backoff up to `MAX_RETRIES`; repeated failures are marked `failed` and moved to DLQ.
- Privacy/deletion: `embeddings.memory_id` cascades on memory delete; if an external vector store is used, call provider delete API for the same `embedding_id` during delete flow.
