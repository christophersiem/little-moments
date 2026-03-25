#!/usr/bin/env node
/*
Run locally:
  npm install pg
  DATABASE_URL=postgres://... \
  EMBEDDING_API_KEY=... \
  EMBEDDING_MODEL=text-embedding-3-small \
  EMBEDDING_DIM=1536 \
  BATCH_SIZE=25 \
  MAX_RETRIES=3 \
  node backend/scripts/embedding-worker.js
*/

'use strict';

const { Pool } = require('pg');

const CONFIG = {
  databaseUrl: process.env.DATABASE_URL,
  embeddingApiKey: process.env.EMBEDDING_API_KEY,
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  embeddingModelVersion: process.env.EMBEDDING_MODEL_VERSION || new Date().toISOString().slice(0, 10),
  embeddingDim: Number(process.env.EMBEDDING_DIM || 1536),
  batchSize: Number(process.env.BATCH_SIZE || 25),
  maxRetries: Number(process.env.MAX_RETRIES || 3),
  embeddingApiUrl: process.env.EMBEDDING_API_URL || 'https://api.openai.com/v1/embeddings',
  modelCostPerToken: Number(process.env.EMBEDDING_COST_PER_TOKEN || 0.00000002)
};

if (!CONFIG.databaseUrl) {
  throw new Error('Missing env var: DATABASE_URL');
}
if (!CONFIG.embeddingApiKey) {
  throw new Error('Missing env var: EMBEDDING_API_KEY');
}
if (!Number.isFinite(CONFIG.embeddingDim) || CONFIG.embeddingDim <= 0) {
  throw new Error('Invalid EMBEDDING_DIM');
}

const SQL = {
  pendingForUpdateSkipLocked: `
    SELECT
      me.id,
      me.memory_id,
      me.summary,
      COALESCE(to_jsonb(me)->>'transcription', to_jsonb(me)->>'transcript') AS transcription,
      me.keywords,
      me.tags,
      me.processed_at,
      me.model_name,
      me.model_version,
      me.prompt_version,
      me.schema_version,
      me.embedding_id,
      me.embedding_status
    FROM public.memory_enrichments me
    WHERE me.embedding_status = 'pending'
    ORDER BY me.processed_at NULLS FIRST, me.created_at NULLS FIRST
    LIMIT $1
    FOR UPDATE SKIP LOCKED
  `,
  upsertEmbedding: `
    INSERT INTO public.embeddings (
      memory_id, enrichment_id, embedding, model_name, model_version, metadata, created_at
    ) VALUES (
      $1, $2, $3::vector, $4, $5, $6::jsonb, now()
    )
    ON CONFLICT (memory_id, model_name, model_version)
    DO UPDATE SET
      embedding = EXCLUDED.embedding,
      enrichment_id = EXCLUDED.enrichment_id,
      metadata = EXCLUDED.metadata,
      created_at = now()
    RETURNING id
  `,
  updateEnrichmentReady: `
    UPDATE public.memory_enrichments
    SET
      embedding_id = $2,
      embedding_status = 'ready',
      embedding_model_version = $3,
      embedding_error = NULL,
      processed_at = $4,
      model_cost_usd = COALESCE(model_cost_usd, 0) + $5,
      updated_at = now()
    WHERE id = $1
  `,
  updateEnrichmentFailed: `
    UPDATE public.memory_enrichments
    SET
      embedding_status = 'failed',
      embedding_error = $2,
      processed_at = $3,
      updated_at = now()
    WHERE id = $1
  `,
  upsertDlq: `
    INSERT INTO public.embedding_dlq (
      enrichment_id, memory_id, error_text, attempts, last_attempted_at, payload, created_at
    ) VALUES (
      $1, $2, $3, 1, now(), $4::jsonb, now()
    )
    ON CONFLICT (enrichment_id)
    DO UPDATE SET
      attempts = public.embedding_dlq.attempts + 1,
      error_text = EXCLUDED.error_text,
      payload = EXCLUDED.payload,
      last_attempted_at = now()
    RETURNING attempts
  `
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v || '').trim()).filter(Boolean);
      }
    } catch (_ignored) {
      return [];
    }
  }
  return [];
}

function estimateTokens(text) {
  return Math.max(1, Math.ceil((text || '').length / 4));
}

function estimateCostUsd(tokensEstimate, modelCostPerToken) {
  return Number((tokensEstimate * modelCostPerToken).toFixed(6));
}

function buildEmbeddingInput(row) {
  const summary = String(row.summary || '').trim();
  const keywords = normalizeStringArray(row.keywords);
  if (summary) {
    return keywords.length > 0
      ? `${summary}\n\nKeywords: ${keywords.join(', ')}`
      : summary;
  }

  const transcription = String(row.transcription || '').trim();
  return transcription;
}

function toVectorLiteral(vector) {
  return `[${vector.join(',')}]`;
}

function isTransientError(error) {
  if (!error) return false;
  if (error.transient === true) return true;
  const status = Number(error.status || error.statusCode || 0);
  if (status === 429 || status >= 500) return true;
  const message = String(error.message || '').toLowerCase();
  return message.includes('timeout') || message.includes('network') || message.includes('temporarily');
}

async function withRetry(task, maxRetries, logger) {
  let attempt = 0;
  while (true) {
    try {
      return await task(attempt + 1);
    } catch (error) {
      attempt += 1;
      if (attempt > maxRetries || !isTransientError(error)) {
        throw error;
      }
      const delayMs = 300 * Math.pow(2, attempt - 1);
      logger?.warn?.({ msg: 'embedding_retry', attempt, delayMs, error: String(error.message || error) });
      await sleep(delayMs);
    }
  }
}

async function createEmbedding(text) {
  const response = await fetch(CONFIG.embeddingApiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CONFIG.embeddingApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: CONFIG.embeddingModel,
      input: text
    })
  });

  if (!response.ok) {
    const body = await response.text();
    const err = new Error(`Embedding API error ${response.status}: ${body}`);
    err.status = response.status;
    err.transient = response.status === 429 || response.status >= 500;
    throw err;
  }

  const payload = await response.json();
  const vector = payload?.data?.[0]?.embedding;
  if (!Array.isArray(vector)) {
    throw new Error('Embedding API returned invalid vector payload');
  }
  if (vector.length !== CONFIG.embeddingDim) {
    throw new Error(`Embedding dimension mismatch: expected ${CONFIG.embeddingDim}, got ${vector.length}`);
  }

  const usageTokens = Number(payload?.usage?.total_tokens || estimateTokens(text));
  return {
    vector,
    tokensEstimate: Number.isFinite(usageTokens) ? usageTokens : estimateTokens(text)
  };
}

async function markFailedAndDlq(client, row, errorText, attempts, logger) {
  const nowIso = new Date().toISOString();

  await client.query(SQL.updateEnrichmentFailed, [row.id, errorText, nowIso]);
  await client.query(SQL.upsertDlq, [
    row.id,
    row.memory_id,
    errorText,
    JSON.stringify({
      enrichment_id: row.id,
      memory_id: row.memory_id,
      summary: row.summary,
      transcription: row.transcription,
      keywords: normalizeStringArray(row.keywords),
      tags: normalizeStringArray(row.tags),
      attempts,
      model_name: CONFIG.embeddingModel,
      model_version: CONFIG.embeddingModelVersion,
      failed_at: nowIso
    })
  ]);

  logger?.error?.({ msg: 'embedding_failed', enrichment_id: row.id, memory_id: row.memory_id, attempts, error: errorText });
}

async function processEnrichmentRow(client, row, options = {}) {
  const createEmbeddingFn = options.createEmbeddingFn || createEmbedding;
  const logger = options.logger || console;
  const metrics = options.metrics;

  const startedAt = Date.now();
  const text = buildEmbeddingInput(row);

  if (!text) {
    await markFailedAndDlq(client, row, 'No summary/transcription available for embedding input', 1, logger);
    if (metrics) metrics.failed += 1;
    return;
  }

  try {
    const embeddingResult = await withRetry(
      async () => createEmbeddingFn(text),
      CONFIG.maxRetries,
      logger
    );

    const keywords = normalizeStringArray(row.keywords);
    const tags = normalizeStringArray(row.tags);
    const processedAt = new Date().toISOString();
    const metadata = {
      summary: row.summary || null,
      keywords,
      tags,
      processed_at: processedAt,
      model_name: CONFIG.embeddingModel,
      model_version: CONFIG.embeddingModelVersion
    };

    const vectorLiteral = toVectorLiteral(embeddingResult.vector);

    const upsertResult = await client.query(SQL.upsertEmbedding, [
      row.memory_id,
      row.id,
      vectorLiteral,
      CONFIG.embeddingModel,
      CONFIG.embeddingModelVersion,
      JSON.stringify(metadata)
    ]);

    const embeddingId = String(upsertResult.rows[0].id);
    const modelCostUsd = estimateCostUsd(
      embeddingResult.tokensEstimate || estimateTokens(text),
      CONFIG.modelCostPerToken
    );

    await client.query(SQL.updateEnrichmentReady, [
      row.id,
      embeddingId,
      CONFIG.embeddingModelVersion,
      processedAt,
      modelCostUsd
    ]);

    if (metrics) {
      metrics.processed += 1;
      metrics.costUsd += modelCostUsd;
      metrics.latencyMs += (Date.now() - startedAt);
    }

    logger?.log?.(JSON.stringify({
      level: 'info',
      msg: 'embedding_ready',
      enrichment_id: row.id,
      memory_id: row.memory_id,
      embedding_id: embeddingId,
      cost_usd: modelCostUsd
    }));
  } catch (error) {
    const errorText = String(error.message || error);
    await markFailedAndDlq(client, row, errorText, CONFIG.maxRetries, logger);
    if (metrics) metrics.failed += 1;
  }
}

async function processBatch(client, options = {}) {
  const logger = options.logger || console;
  const metrics = {
    claimed: 0,
    processed: 0,
    failed: 0,
    latencyMs: 0,
    costUsd: 0
  };

  await client.query('BEGIN');
  try {
    const pending = await client.query(SQL.pendingForUpdateSkipLocked, [CONFIG.batchSize]);
    metrics.claimed = pending.rows.length;

    for (const row of pending.rows) {
      await processEnrichmentRow(client, row, {
        createEmbeddingFn: options.createEmbeddingFn,
        logger,
        metrics
      });
    }

    await client.query('COMMIT');
    return metrics;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function runWorker() {
  const pool = new Pool({ connectionString: CONFIG.databaseUrl });
  const client = await pool.connect();

  try {
    while (true) {
      const batchStartedAt = Date.now();
      const metrics = await processBatch(client, { logger: console });

      console.log(JSON.stringify({
        level: 'info',
        msg: 'embedding_batch_complete',
        claimed: metrics.claimed,
        processed: metrics.processed,
        failed: metrics.failed,
        avg_latency_ms: metrics.processed > 0 ? Math.round(metrics.latencyMs / metrics.processed) : 0,
        batch_cost_usd: Number(metrics.costUsd.toFixed(6)),
        batch_duration_ms: Date.now() - batchStartedAt
      }));

      if (metrics.claimed === 0) {
        break;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  runWorker().catch((error) => {
    console.error(JSON.stringify({
      level: 'fatal',
      msg: 'embedding_worker_crashed',
      error: String(error.message || error)
    }));
    process.exit(1);
  });
}

module.exports = {
  CONFIG,
  SQL,
  buildEmbeddingInput,
  estimateTokens,
  estimateCostUsd,
  withRetry,
  processEnrichmentRow,
  processBatch,
  createEmbedding,
  runWorker
};
