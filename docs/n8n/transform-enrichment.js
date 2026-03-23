const schema = require('./enrichment.schema.json');

const CATEGORY_SET = new Set(schema.properties.category.enum);
const EMOTION_SET = new Set(schema.properties.emotion.enum);

function clampImportance(value) {
  const numeric = Number.parseInt(value, 10);
  if (!Number.isFinite(numeric)) {
    return 1;
  }
  return Math.max(1, Math.min(10, numeric));
}

function clampConfidence(value) {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(1, numeric));
}

function toIsoDate(value, fallbackIso) {
  const date = value ? new Date(value) : new Date(fallbackIso);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

function parseOutput(rawOutput) {
  if (rawOutput == null) {
    return {};
  }
  if (typeof rawOutput === 'object') {
    return rawOutput;
  }
  const text = String(rawOutput).trim();
  if (!text) {
    return {};
  }
  return JSON.parse(text);
}

function normalizeArray(input, maxItems) {
  if (!Array.isArray(input)) {
    return [];
  }
  return input
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function validateNormalized(enrichment) {
  const errors = [];

  if (!enrichment.summary || typeof enrichment.summary !== 'string') {
    errors.push('summary is required');
  }
  if (!CATEGORY_SET.has(enrichment.category)) {
    errors.push('category must be one of milestone|funny|behavior|health|other');
  }
  if (!Number.isInteger(enrichment.importance_score) || enrichment.importance_score < 1 || enrichment.importance_score > 10) {
    errors.push('importance_score must be integer in range 1..10');
  }
  if (!enrichment.schema_version || typeof enrichment.schema_version !== 'string') {
    errors.push('schema_version is required');
  }
  if (!enrichment.processed_at || Number.isNaN(new Date(enrichment.processed_at).getTime())) {
    errors.push('processed_at must be valid date-time');
  }
  if (typeof enrichment.confidence_score !== 'number' || enrichment.confidence_score < 0 || enrichment.confidence_score > 1) {
    errors.push('confidence_score must be number in range 0..1');
  }
  if (!EMOTION_SET.has(enrichment.emotion)) {
    errors.push('emotion must be one of joy|neutral|sadness|surprise|anger|fear|other');
  }
  if (!Array.isArray(enrichment.keywords) || enrichment.keywords.length > 6) {
    errors.push('keywords must be array with max 6 items');
  }
  if (!Array.isArray(enrichment.tags)) {
    errors.push('tags must be an array when present');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function normalizeEnrichment(parsed, defaults) {
  const nowIso = new Date().toISOString();
  const category = String(parsed.category || '').trim().toLowerCase();
  const emotion = String(parsed.emotion || 'neutral').trim().toLowerCase();
  const importance = clampImportance(parsed.importance_score);
  const confidence = clampConfidence(parsed.confidence_score);

  const normalized = {
    summary: String(parsed.summary || '').trim(),
    category: CATEGORY_SET.has(category) ? category : 'other',
    emotion: EMOTION_SET.has(emotion) ? emotion : 'neutral',
    sentiment_score: typeof parsed.sentiment_score === 'number' ? parsed.sentiment_score : null,
    keywords: normalizeArray(parsed.keywords, 6),
    tags: normalizeArray(parsed.tags, 32),
    importance_score: importance,
    is_highlight: typeof parsed.is_highlight === 'boolean'
      ? parsed.is_highlight
      : (importance >= 8 || (CATEGORY_SET.has(category) ? category : 'other') === 'milestone'),
    milestone_hint: parsed.milestone_hint == null ? null : String(parsed.milestone_hint).trim(),
    embedding_id: parsed.embedding_id == null ? null : String(parsed.embedding_id).trim(),
    model_name: String(parsed.model_name || defaults.model_name || 'unknown-model').trim(),
    model_version: parsed.model_version == null ? null : String(parsed.model_version).trim(),
    prompt_version: String(parsed.prompt_version || defaults.prompt_version || 'unknown-prompt').trim(),
    schema_version: String(parsed.schema_version || defaults.schema_version || '1.0.0').trim(),
    confidence_score: confidence,
    model_cost_usd: parsed.model_cost_usd == null ? null : Number(parsed.model_cost_usd),
    processed_at: toIsoDate(parsed.processed_at, nowIso)
  };

  return normalized;
}

function buildSuccessResult(context, normalized, rawResponse) {
  return {
    route: 'valid_upsert',
    enriched: true,
    params: {
      memory_id: context.memory_id,
      owner_id: context.owner_id || null,
      child_id: context.child_id || null,
      created_by_user_id: context.created_by_user_id || null,
      summary: normalized.summary,
      category: normalized.category,
      emotion: normalized.emotion,
      sentiment_score: normalized.sentiment_score,
      keywords: JSON.stringify(normalized.keywords),
      tags: JSON.stringify(normalized.tags),
      importance_score: normalized.importance_score,
      is_highlight: normalized.is_highlight,
      milestone_hint: normalized.milestone_hint,
      embedding_id: normalized.embedding_id,
      model_name: normalized.model_name,
      model_version: normalized.model_version,
      prompt_version: normalized.prompt_version,
      schema_version: normalized.schema_version,
      confidence_score: normalized.confidence_score,
      model_cost_usd: normalized.model_cost_usd,
      raw_response: JSON.stringify(rawResponse),
      processed_at: normalized.processed_at,
      run_status: 'SUCCESS'
    }
  };
}

function buildRawSaveResult(context, rawResponse, errors) {
  return {
    route: 'raw_save',
    enriched: false,
    errors,
    params: {
      memory_id: context.memory_id,
      owner_id: context.owner_id || null,
      child_id: context.child_id || null,
      created_by_user_id: context.created_by_user_id || null,
      summary: 'Enrichment failed validation.',
      category: 'other',
      emotion: 'neutral',
      sentiment_score: null,
      keywords: JSON.stringify([]),
      tags: JSON.stringify([]),
      importance_score: 1,
      is_highlight: false,
      milestone_hint: null,
      embedding_id: null,
      model_name: String(context.model_name || 'unknown-model'),
      model_version: null,
      prompt_version: String(context.prompt_version || 'unknown-prompt'),
      schema_version: String(context.schema_version || '1.0.0'),
      confidence_score: 0,
      model_cost_usd: null,
      raw_response: typeof rawResponse === 'string' ? rawResponse : JSON.stringify(rawResponse || {}),
      processed_at: new Date().toISOString(),
      run_status: 'FAILED'
    }
  };
}

function transformEnrichment({ rawOutput, memoryContext, defaults = {} }) {
  let parsed;
  try {
    parsed = parseOutput(rawOutput);
  } catch (error) {
    return buildRawSaveResult(memoryContext, rawOutput, ['Invalid JSON output from LLM']);
  }

  const normalized = normalizeEnrichment(parsed, defaults);
  const validation = validateNormalized(normalized);

  if (!validation.valid) {
    return buildRawSaveResult(memoryContext, parsed, validation.errors);
  }

  return buildSuccessResult(memoryContext, normalized, parsed);
}

module.exports = {
  transformEnrichment,
  clampImportance,
  validateNormalized,
  normalizeEnrichment
};
