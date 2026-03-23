const { transformEnrichment } = require('./transform-enrichment');

describe('transformEnrichment', () => {
  const baseContext = {
    memory_id: '61ff67bd-a252-4264-9d6e-b12df4a88796',
    child_id: '3944e470-0d88-4174-a743-f548d13cdc3a',
    owner_id: 'user_family_1',
    created_by_user_id: 'user_abc',
    model_name: 'gpt-4o-mini',
    prompt_version: 'enrichment-v2',
    schema_version: '1.0.0'
  };

  test('valid LLM output -> returns normalized params ready for upsert', () => {
    const result = transformEnrichment({
      rawOutput: JSON.stringify({
        summary: '  Child asked for more bananas in a full sentence.  ',
        category: 'MILESTONE',
        emotion: 'JOY',
        keywords: ['breakfast', 'bananas'],
        tags: ['language'],
        importance_score: 9,
        schema_version: '1.0.0',
        processed_at: '2026-03-23T12:00:00Z',
        confidence_score: 0.84
      }),
      memoryContext: baseContext
    });

    expect(result.route).toBe('valid_upsert');
    expect(result.enriched).toBe(true);
    expect(result.params.summary).toBe('Child asked for more bananas in a full sentence.');
    expect(result.params.category).toBe('milestone');
    expect(result.params.is_highlight).toBe(true);
  });

  test('missing required field -> routes to raw_save, sets enriched=false, keeps raw_response', () => {
    const result = transformEnrichment({
      rawOutput: JSON.stringify({
        category: 'milestone',
        importance_score: 8,
        schema_version: '1.0.0',
        processed_at: '2026-03-23T12:00:00Z',
        confidence_score: 0.5
      }),
      memoryContext: baseContext
    });

    expect(result.route).toBe('raw_save');
    expect(result.enriched).toBe(false);
    expect(result.params.raw_response.category).toBe('milestone');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('missing confidence_score -> routes to raw_save', () => {
    const result = transformEnrichment({
      rawOutput: {
        summary: 'Factual summary.',
        category: 'other',
        importance_score: 5,
        schema_version: '1.0.0',
        processed_at: '2026-03-23T12:00:00Z'
      },
      memoryContext: baseContext
    });

    expect(result.route).toBe('raw_save');
    expect(result.errors).toContain('confidence_score is required');
  });

  test('missing processed_at -> routes to raw_save', () => {
    const result = transformEnrichment({
      rawOutput: {
        summary: 'Factual summary.',
        category: 'other',
        importance_score: 5,
        schema_version: '1.0.0',
        confidence_score: 0.6
      },
      memoryContext: baseContext
    });

    expect(result.route).toBe('raw_save');
    expect(result.errors).toContain('processed_at is required');
  });

  test('missing category -> routes to raw_save', () => {
    const result = transformEnrichment({
      rawOutput: {
        summary: 'Factual summary.',
        importance_score: 5,
        schema_version: '1.0.0',
        processed_at: '2026-03-23T12:00:00Z',
        confidence_score: 0.6
      },
      memoryContext: baseContext
    });

    expect(result.route).toBe('raw_save');
    expect(result.errors).toContain('category is required');
  });

  test('out-of-range importance_score -> clamped to 1..10 and still valid', () => {
    const result = transformEnrichment({
      rawOutput: {
        summary: 'A short factual summary.',
        category: 'other',
        emotion: 'neutral',
        keywords: ['test'],
        importance_score: 999,
        schema_version: '1.0.0',
        processed_at: '2026-03-23T12:00:00Z',
        confidence_score: 0.7
      },
      memoryContext: baseContext
    });

    expect(result.route).toBe('valid_upsert');
    expect(result.params.importance_score).toBe(10);
  });
});
