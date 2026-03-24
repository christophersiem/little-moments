package de.csiem.backend.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.csiem.backend.config.AppProperties;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class EmbeddingRunnerService {

    public enum TriggerState {
        STARTED,
        ALREADY_RUNNING,
        DISABLED
    }

    private static final Logger log = LoggerFactory.getLogger(EmbeddingRunnerService.class);

    private static final String SQL_SELECT_PENDING = """
        SELECT
          me.id::text AS id,
          me.memory_id::text AS memory_id,
          me.summary,
          COALESCE(to_jsonb(me)->>'transcription', to_jsonb(me)->>'transcript') AS transcription,
          COALESCE(me.keywords, '[]'::jsonb)::text AS keywords_json,
          COALESCE(me.tags, '[]'::jsonb)::text AS tags_json
        FROM public.memory_enrichments me
        WHERE me.embedding_status = 'pending'
        ORDER BY me.processed_at NULLS FIRST, me.created_at NULLS FIRST
        LIMIT ?
        """;

    private static final String SQL_UPSERT_EMBEDDING = """
        INSERT INTO public.embeddings (
          memory_id, enrichment_id, embedding, model_name, model_version, metadata, created_at
        ) VALUES (
          ?::uuid, ?::uuid, ?::vector, ?, ?, ?::jsonb, now()
        )
        ON CONFLICT (memory_id, model_name, model_version)
        DO UPDATE SET
          embedding = EXCLUDED.embedding,
          enrichment_id = EXCLUDED.enrichment_id,
          metadata = EXCLUDED.metadata,
          created_at = now()
        RETURNING id::text
        """;

    private static final String SQL_UPDATE_READY = """
        UPDATE public.memory_enrichments
        SET
          embedding_id = ?,
          embedding_status = 'ready',
          embedding_model_version = ?,
          embedding_error = NULL,
          processed_at = now(),
          model_cost_usd = COALESCE(model_cost_usd, 0) + ?,
          updated_at = now()
        WHERE id = ?::uuid
        """;

    private static final String SQL_UPDATE_FAILED = """
        UPDATE public.memory_enrichments
        SET
          embedding_status = 'failed',
          embedding_error = ?,
          processed_at = now(),
          updated_at = now()
        WHERE id = ?::uuid
        """;

    private static final String SQL_UPSERT_DLQ = """
        INSERT INTO public.embedding_dlq (
          enrichment_id, memory_id, error_text, attempts, last_attempted_at, payload, created_at
        ) VALUES (
          ?::uuid, ?::uuid, ?, 1, now(), ?::jsonb, now()
        )
        ON CONFLICT (enrichment_id)
        DO UPDATE SET
          attempts = public.embedding_dlq.attempts + 1,
          error_text = EXCLUDED.error_text,
          payload = EXCLUDED.payload,
          last_attempted_at = now()
        """;

    private final AppProperties appProperties;
    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestClient restClient;
    private final AtomicBoolean running = new AtomicBoolean(false);
    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread thread = new Thread(r, "embedding-runner");
        thread.setDaemon(true);
        return thread;
    });

    public EmbeddingRunnerService(
        AppProperties appProperties,
        JdbcTemplate jdbcTemplate
    ) {
        this.appProperties = appProperties;
        this.jdbcTemplate = jdbcTemplate;

        int timeoutMs = Math.max(appProperties.getEmbeddingRunner().getTimeoutMs(), 1000);
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(timeoutMs);
        requestFactory.setReadTimeout(timeoutMs);
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    public boolean isEnabled() {
        return appProperties.getEmbeddingRunner().isEnabled();
    }

    public boolean isAuthorized(String providedApiKey) {
        String expectedApiKey = appProperties.getEmbeddingRunner().getTriggerApiKey();
        return StringUtils.hasText(expectedApiKey) && expectedApiKey.trim().equals(providedApiKey);
    }

    public TriggerState triggerAsyncRun() {
        if (!isEnabled()) {
            return TriggerState.DISABLED;
        }
        if (!running.compareAndSet(false, true)) {
            return TriggerState.ALREADY_RUNNING;
        }

        executor.submit(() -> {
            try {
                runPendingEmbeddings();
            } catch (Exception ex) {
                log.error("Embedding runner crashed", ex);
            } finally {
                running.set(false);
            }
        });

        return TriggerState.STARTED;
    }

    @PreDestroy
    void shutdownExecutor() {
        executor.shutdownNow();
    }

    void runPendingEmbeddings() {
        int claimed = 0;
        int success = 0;
        int failed = 0;

        int batchSize = Math.max(appProperties.getEmbeddingRunner().getBatchSize(), 1);

        while (true) {
            List<PendingEnrichmentRow> pendingRows = jdbcTemplate.query(
                SQL_SELECT_PENDING,
                (rs, ignored) -> new PendingEnrichmentRow(
                    rs.getString("id"),
                    rs.getString("memory_id"),
                    rs.getString("summary"),
                    rs.getString("transcription"),
                    rs.getString("keywords_json"),
                    rs.getString("tags_json")
                ),
                batchSize
            );

            if (pendingRows.isEmpty()) {
                break;
            }

            claimed += pendingRows.size();
            for (PendingEnrichmentRow row : pendingRows) {
                if (processRow(row)) {
                    success += 1;
                } else {
                    failed += 1;
                }
            }
        }

        log.info(
            "Embedding runner finished: claimed={}, success={}, failed={}",
            claimed,
            success,
            failed
        );
    }

    private boolean processRow(PendingEnrichmentRow row) {
        String input = buildEmbeddingInput(row);
        if (!StringUtils.hasText(input)) {
            markFailed(row, "No summary/transcription available for embedding input", 1);
            return false;
        }

        int maxRetries = Math.max(appProperties.getEmbeddingRunner().getMaxRetries(), 0);
        int attempts = 0;
        while (attempts <= maxRetries) {
            attempts += 1;
            try {
                EmbeddingResult result = createEmbedding(input);
                String embeddingId = upsertEmbedding(row, result, input);
                markReady(row, embeddingId, result);
                return true;
            } catch (Exception ex) {
                boolean transientError = isTransient(ex);
                if (attempts <= maxRetries && transientError) {
                    sleepBackoff(attempts);
                    continue;
                }

                markFailed(row, sanitizeError(ex), attempts);
                return false;
            }
        }
        return false;
    }

    private String upsertEmbedding(PendingEnrichmentRow row, EmbeddingResult result, String input) throws Exception {
        String model = appProperties.getEmbeddingRunner().getModel();
        String modelVersion = resolvedModelVersion();
        List<String> keywords = parseStringList(row.keywordsJson());
        List<String> tags = parseStringList(row.tagsJson());

        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("summary", row.summary());
        metadata.put("keywords", keywords);
        metadata.put("tags", tags);
        metadata.put("processed_at", java.time.Instant.now().toString());
        metadata.put("model_name", model);
        metadata.put("model_version", modelVersion);
        metadata.put("input_chars", input.length());

        Object embeddingId = jdbcTemplate.queryForObject(
            SQL_UPSERT_EMBEDDING,
            Object.class,
            row.memoryId(),
            row.id(),
            toVectorLiteral(result.vector()),
            model,
            modelVersion,
            objectMapper.writeValueAsString(metadata)
        );
        if (embeddingId == null) {
            throw new IllegalStateException("Embedding upsert returned null id");
        }
        return embeddingId.toString();
    }

    private void markReady(PendingEnrichmentRow row, String embeddingId, EmbeddingResult result) {
        jdbcTemplate.update(
            SQL_UPDATE_READY,
            embeddingId,
            resolvedModelVersion(),
            estimateCostUsd(result.totalTokens()),
            row.id()
        );
    }

    private void markFailed(PendingEnrichmentRow row, String errorText, int attempts) {
        try {
            jdbcTemplate.update(SQL_UPDATE_FAILED, errorText, row.id());

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("enrichment_id", row.id());
            payload.put("memory_id", row.memoryId());
            payload.put("summary", row.summary());
            payload.put("transcription", row.transcription());
            payload.put("keywords", parseStringList(row.keywordsJson()));
            payload.put("tags", parseStringList(row.tagsJson()));
            payload.put("attempts", attempts);
            payload.put("model_name", appProperties.getEmbeddingRunner().getModel());
            payload.put("model_version", resolvedModelVersion());
            payload.put("failed_at", java.time.Instant.now().toString());

            jdbcTemplate.update(
                SQL_UPSERT_DLQ,
                row.id(),
                row.memoryId(),
                errorText,
                objectMapper.writeValueAsString(payload)
            );
        } catch (Exception dlqEx) {
            log.error("Failed to write embedding failure/DLQ for enrichment {}", row.id(), dlqEx);
        }
    }

    private EmbeddingResult createEmbedding(String input) throws Exception {
        String apiKey = appProperties.getEmbeddingRunner().getOpenaiApiKey();
        if (!StringUtils.hasText(apiKey)) {
            throw new IllegalStateException("Missing embedding OpenAI API key");
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", appProperties.getEmbeddingRunner().getModel());
        body.put("input", input);

        JsonNode response = restClient.post()
            .uri(resolveEmbeddingsUrl())
            .contentType(MediaType.APPLICATION_JSON)
            .headers(headers -> headers.setBearerAuth(apiKey.trim()))
            .body(body)
            .retrieve()
            .body(JsonNode.class);

        if (response == null) {
            throw new IllegalStateException("Embedding API response was empty");
        }

        JsonNode embeddingNode = response.path("data").path(0).path("embedding");
        if (!embeddingNode.isArray()) {
            throw new IllegalStateException("Embedding API returned invalid vector payload");
        }

        List<Double> vector = new ArrayList<>();
        for (JsonNode value : embeddingNode) {
            if (!value.isNumber()) {
                throw new IllegalStateException("Embedding vector contains non-numeric values");
            }
            vector.add(value.asDouble());
        }

        int expectedDim = Math.max(appProperties.getEmbeddingRunner().getDim(), 1);
        if (vector.size() != expectedDim) {
            throw new IllegalStateException(
                "Embedding dimension mismatch: expected " + expectedDim + ", got " + vector.size()
            );
        }

        int estimatedTokens = Math.max(1, input.length() / 4);
        int totalTokens = response.path("usage").path("total_tokens").asInt(estimatedTokens);
        return new EmbeddingResult(vector, Math.max(totalTokens, 1));
    }

    private String resolveEmbeddingsUrl() {
        String baseUrl = appProperties.getEmbeddingRunner().getOpenaiBaseUrl();
        String normalizedBase = StringUtils.hasText(baseUrl) ? baseUrl.trim() : "https://api.openai.com";
        if (normalizedBase.endsWith("/")) {
            normalizedBase = normalizedBase.substring(0, normalizedBase.length() - 1);
        }
        return normalizedBase + "/v1/embeddings";
    }

    private String buildEmbeddingInput(PendingEnrichmentRow row) {
        String summary = row.summary() == null ? "" : row.summary().trim();
        List<String> keywords = parseStringList(row.keywordsJson());

        if (StringUtils.hasText(summary)) {
            return keywords.isEmpty()
                ? summary
                : summary + "\n\nKeywords: " + String.join(", ", keywords);
        }

        String transcription = row.transcription() == null ? "" : row.transcription().trim();
        return transcription;
    }

    private List<String> parseStringList(String rawJson) {
        if (!StringUtils.hasText(rawJson)) {
            return List.of();
        }
        try {
            List<String> parsed = objectMapper.readValue(rawJson, new TypeReference<>() {
            });
            return parsed.stream().map(String::trim).filter(StringUtils::hasText).toList();
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private String toVectorLiteral(List<Double> vector) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.size(); i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append(vector.get(i));
        }
        sb.append(']');
        return sb.toString();
    }

    private String resolvedModelVersion() {
        String configured = appProperties.getEmbeddingRunner().getModelVersion();
        return StringUtils.hasText(configured) ? configured.trim() : LocalDate.now().toString();
    }

    private BigDecimal estimateCostUsd(int totalTokens) {
        double cost = totalTokens * appProperties.getEmbeddingRunner().getCostPerToken();
        return BigDecimal.valueOf(cost).setScale(6, RoundingMode.HALF_UP);
    }

    private boolean isTransient(Exception ex) {
        if (ex instanceof RestClientResponseException responseException) {
            int status = responseException.getStatusCode().value();
            return status == 429 || status >= 500;
        }
        String message = String.valueOf(ex.getMessage()).toLowerCase();
        return message.contains("timeout") || message.contains("temporar") || message.contains("connection");
    }

    private void sleepBackoff(int attempt) {
        long delayMs = 300L * (long) Math.pow(2, Math.max(0, attempt - 1));
        try {
            Thread.sleep(delayMs);
        } catch (InterruptedException interruptedException) {
            Thread.currentThread().interrupt();
        }
    }

    private String sanitizeError(Exception ex) {
        String message = ex.getMessage();
        if (!StringUtils.hasText(message)) {
            return ex.getClass().getSimpleName();
        }
        String compact = message.replaceAll("\\s+", " ").trim();
        return compact.length() <= 1000 ? compact : compact.substring(0, 1000);
    }

    private record PendingEnrichmentRow(
        String id,
        String memoryId,
        String summary,
        String transcription,
        String keywordsJson,
        String tagsJson
    ) {
    }

    private record EmbeddingResult(
        List<Double> vector,
        int totalTokens
    ) {
    }
}
