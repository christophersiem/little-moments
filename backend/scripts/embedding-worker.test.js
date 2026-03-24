const { processEnrichmentRow } = require('./embedding-worker');

describe('embedding-worker', () => {
  test('A: successful embedding path updates enrichment to ready and sets embedding_id', async () => {
    const client = { query: jest.fn() };
    const row = {
      id: 'enrich-1',
      memory_id: 'mem-1',
      summary: 'Asked for more bananas in a full sentence.',
      transcription: '',
      keywords: ['breakfast', 'bananas'],
      tags: ['language']
    };

    const fakeCreateEmbedding = jest.fn().mockResolvedValue({
      vector: new Array(1536).fill(0.01),
      tokensEstimate: 120
    });

    client.query
      .mockResolvedValueOnce({ rows: [{ id: 'vec-1' }] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const metrics = { processed: 0, failed: 0, latencyMs: 0, costUsd: 0 };
    await processEnrichmentRow(client, row, {
      createEmbeddingFn: fakeCreateEmbedding,
      logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
      metrics
    });

    expect(fakeCreateEmbedding).toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledTimes(2);
    expect(metrics.processed).toBe(1);
    expect(metrics.failed).toBe(0);
  });

  test('B: transient API failures then success retries and completes', async () => {
    const client = { query: jest.fn() };
    const row = {
      id: 'enrich-2',
      memory_id: 'mem-2',
      summary: 'Climbed the ladder alone.',
      transcription: '',
      keywords: ['playground'],
      tags: ['milestone']
    };

    let calls = 0;
    const fakeCreateEmbedding = jest.fn().mockImplementation(async () => {
      calls += 1;
      if (calls < 3) {
        const err = new Error('429 rate limit');
        err.status = 429;
        err.transient = true;
        throw err;
      }
      return { vector: new Array(1536).fill(0.02), tokensEstimate: 90 };
    });

    client.query
      .mockResolvedValueOnce({ rows: [{ id: 'vec-2' }] })
      .mockResolvedValueOnce({ rowCount: 1 });

    const metrics = { processed: 0, failed: 0, latencyMs: 0, costUsd: 0 };
    await processEnrichmentRow(client, row, {
      createEmbeddingFn: fakeCreateEmbedding,
      logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
      metrics
    });

    expect(calls).toBe(3);
    expect(metrics.processed).toBe(1);
    expect(metrics.failed).toBe(0);
  });

  test('C: permanent API failure marks failed and creates DLQ entry', async () => {
    const client = { query: jest.fn() };
    const row = {
      id: 'enrich-3',
      memory_id: 'mem-3',
      summary: 'First full sentence at breakfast.',
      transcription: '',
      keywords: ['breakfast'],
      tags: ['language']
    };

    const fakeCreateEmbedding = jest.fn().mockRejectedValue(new Error('400 bad request'));

    client.query
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ attempts: 1 }] });

    const metrics = { processed: 0, failed: 0, latencyMs: 0, costUsd: 0 };
    await processEnrichmentRow(client, row, {
      createEmbeddingFn: fakeCreateEmbedding,
      logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
      metrics
    });

    expect(metrics.failed).toBe(1);
    expect(metrics.processed).toBe(0);
    expect(client.query).toHaveBeenCalledTimes(2);
  });
});
