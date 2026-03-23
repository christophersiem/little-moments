package de.csiem.backend.service;

import de.csiem.backend.config.AppProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class MemoryEnrichmentWebhookService {

    private static final Logger log = LoggerFactory.getLogger(MemoryEnrichmentWebhookService.class);

    private final AppProperties appProperties;

    public MemoryEnrichmentWebhookService(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    public void publishCreatedEntry(UUID entryId, String childId, String transcription, Instant createdAt) {
        AppProperties.EnrichmentWebhook config = appProperties.getEnrichmentWebhook();
        if (!config.isEnabled() || !StringUtils.hasText(config.getUrl())) {
            return;
        }
        if (!StringUtils.hasText(childId) || !StringUtils.hasText(transcription)) {
            return;
        }

        String language = StringUtils.hasText(config.getDefaultLanguage())
            ? config.getDefaultLanguage().trim()
            : "en";

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("entry_id", entryId.toString());
        payload.put("child_id", childId);
        payload.put("transcription", transcription);
        payload.put("audio_url", null);
        payload.put("created_at", createdAt.toString());
        payload.put("language", language);

        try {
            RestClient.Builder builder = RestClient.builder();
            int timeoutMs = Math.max(config.getTimeoutMs(), 1000);
            SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
            requestFactory.setConnectTimeout(timeoutMs);
            requestFactory.setReadTimeout(timeoutMs);
            builder.requestFactory(requestFactory);

            builder.build()
                .post()
                .uri(config.getUrl().trim())
                .contentType(MediaType.APPLICATION_JSON)
                .headers(headers -> applyHeaders(headers, config))
                .body(payload)
                .retrieve()
                .toBodilessEntity();
        } catch (Exception ex) {
            // Webhook enrichment is optional and must never block record/save UX.
            log.warn("Could not send n8n enrichment webhook for memory {}: {}", entryId, ex.getMessage());
        }
    }

    private void applyHeaders(HttpHeaders headers, AppProperties.EnrichmentWebhook config) {
        if (StringUtils.hasText(config.getApiKey())) {
            headers.set("X-API-Key", config.getApiKey().trim());
        }
    }
}
