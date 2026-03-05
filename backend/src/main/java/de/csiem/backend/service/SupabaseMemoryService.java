package de.csiem.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import de.csiem.backend.dto.CreateMemoryRequest;
import de.csiem.backend.dto.CreateMemoryResponse;
import de.csiem.backend.dto.MemoryListItemResponse;
import de.csiem.backend.dto.MemoryListResponse;
import de.csiem.backend.dto.MemoryResponse;
import de.csiem.backend.dto.UpdateMemoryRequest;
import de.csiem.backend.model.MemoryStatus;
import de.csiem.backend.model.MemoryTag;
import de.csiem.backend.service.transcription.TranscriptionService;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;

@Service
public class SupabaseMemoryService {

    private static final int MAX_SNIPPET_LENGTH = 180;
    private static final int MAX_ERROR_LENGTH = 1000;

    private final SupabaseGatewayService supabaseGatewayService;
    private final TranscriptionService transcriptionService;
    private final MemorySplittingService memorySplittingService;
    private final MemoryTaggingService memoryTaggingService;
    private final MemoryInsightsService memoryInsightsService;

    public SupabaseMemoryService(
        SupabaseGatewayService supabaseGatewayService,
        TranscriptionService transcriptionService,
        MemorySplittingService memorySplittingService,
        MemoryTaggingService memoryTaggingService,
        MemoryInsightsService memoryInsightsService
    ) {
        this.supabaseGatewayService = supabaseGatewayService;
        this.transcriptionService = transcriptionService;
        this.memorySplittingService = memorySplittingService;
        this.memoryTaggingService = memoryTaggingService;
        this.memoryInsightsService = memoryInsightsService;
    }

    public boolean isEnabled() {
        return supabaseGatewayService.isConfigured();
    }

    public CreateMemoryResponse createMemory(String authorizationHeader, CreateMemoryRequest request) {
        if (request.audio() == null || request.audio().isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Audio file is required");
        }
        if (!StringUtils.hasText(request.childId())) {
            throw new ResponseStatusException(BAD_REQUEST, "childId is required");
        }
        supabaseGatewayService.assertOwnerCanCreateMemory(authorizationHeader, request.childId().trim());

        Instant uploadTimestamp = request.recordedAt() != null ? request.recordedAt() : Instant.now();
        JsonNode processingRow = supabaseGatewayService.createProcessingMemory(
            authorizationHeader,
            request.childId().trim(),
            uploadTimestamp
        );
        String memoryId = text(processingRow.get("id"));

        try {
            String transcript = transcriptionService.transcribe(
                request.audio().getBytes(),
                Optional.ofNullable(request.audio().getOriginalFilename()).orElse("recording.webm"),
                Optional.ofNullable(request.audio().getContentType()).orElse(MediaType.APPLICATION_OCTET_STREAM_VALUE)
            );

            List<SplitMemory> splitMemories = memorySplittingService.split(transcript, uploadTimestamp);
            if (splitMemories.size() <= 1) {
                SplitMemory splitMemory = splitMemories.isEmpty()
                    ? new SplitMemory(transcript, uploadTimestamp, 1.0)
                    : splitMemories.getFirst();
                return persistSingleMemory(authorizationHeader, memoryId, splitMemory);
            }

            return persistSplitMemories(authorizationHeader, memoryId, request.childId().trim(), splitMemories);
        } catch (Exception ex) {
            Map<String, Object> failedPatch = new java.util.LinkedHashMap<>();
            failedPatch.put("status", "FAILED");
            failedPatch.put("error_message", buildErrorMessage(ex));
            failedPatch.put("transcript", null);
            failedPatch.put("title", null);
            failedPatch.put("summary", null);
            failedPatch.put("tags", List.of());
            JsonNode failed = supabaseGatewayService.updateMemoryById(
                authorizationHeader,
                memoryId,
                failedPatch
            );

            return new CreateMemoryResponse(
                UUID.fromString(text(failed.get("id"))),
                List.of(),
                0,
                toStatus(text(failed.get("status"))),
                nullableText(failed.get("error_message")),
                null,
                null,
                null,
                List.of()
            );
        }
    }

    public MemoryListResponse getMemories(
        String authorizationHeader,
        int page,
        int size,
        String familyId,
        String month,
        List<String> tags
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        int offset = safePage * safeSize;

        Instant fromInstant = null;
        Instant toInstant = null;
        if (month != null && !month.isBlank()) {
            try {
                YearMonth yearMonth = YearMonth.parse(month);
                fromInstant = yearMonth.atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
                toInstant = yearMonth.plusMonths(1).atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC);
            } catch (DateTimeParseException ex) {
                throw new ResponseStatusException(BAD_REQUEST, "Invalid month format. Use YYYY-MM.");
            }
        }

        List<String> resolvedTags = resolveTagLabels(tags);
        String fromIso = fromInstant != null ? fromInstant.toString() : null;
        String toIso = toInstant != null ? toInstant.toString() : null;

        JsonNode rows = supabaseGatewayService.listMemories(
            authorizationHeader,
            offset,
            safeSize,
            normalizeFamilyId(familyId),
            fromIso,
            toIso,
            resolvedTags
        );
        long totalElements = supabaseGatewayService.countMemories(
            authorizationHeader,
            normalizeFamilyId(familyId),
            fromIso,
            toIso,
            resolvedTags
        );
        int totalPages = totalElements == 0 ? 0 : (int) Math.ceil((double) totalElements / safeSize);

        List<MemoryListItemResponse> items = new ArrayList<>();
        if (rows.isArray()) {
            for (JsonNode row : rows) {
                items.add(
                    new MemoryListItemResponse(
                        uuid(text(row.get("id"))),
                        instant(row.get("created_at")),
                        instantOrFallback(row.get("recorded_at"), row.get("created_at")),
                        toStatus(text(row.get("status"))),
                        nullableText(row.get("title")),
                        snippet(nullableText(row.get("transcript"))),
                        readTags(row.get("tags"))
                    )
                );
            }
        }

        return new MemoryListResponse(items, safePage, safeSize, totalElements, totalPages);
    }

    public MemoryResponse getMemory(String authorizationHeader, UUID id) {
        JsonNode row = supabaseGatewayService.getMemoryById(authorizationHeader, id.toString());
        return toMemoryResponse(row);
    }

    public MemoryResponse updateMemory(String authorizationHeader, UUID id, UpdateMemoryRequest request) {
        supabaseGatewayService.assertOwnerCanManageMemory(authorizationHeader, id.toString());
        JsonNode current = supabaseGatewayService.getMemoryById(authorizationHeader, id.toString());
        java.util.Map<String, Object> patch = new java.util.LinkedHashMap<>();

        if (request.title() != null) {
            patch.put("title", normalizeTitle(request.title()));
        }

        if (request.tags() != null) {
            patch.put("tags", resolveTagLabels(request.tags()));
        }

        if (request.recordedAt() != null) {
            patch.put("recorded_at", request.recordedAt().toString());
        }

        if (request.transcript() != null) {
            String nextTranscript = normalizeTranscript(request.transcript());
            MemoryInsightsService.MemoryInsights insights = memoryInsightsService.generate(nextTranscript);
            patch.put("transcript", nextTranscript);
            patch.put("summary", insights.summary());

            if (request.title() == null || request.title().isBlank()) {
                String currentTitle = nullableText(current.get("title"));
                if (currentTitle == null || currentTitle.isBlank()) {
                    patch.put("title", insights.title());
                }
            }

            if (request.tags() == null) {
                patch.put("tags", toTagLabels(memoryTaggingService.detectTags(nextTranscript)));
            }
        }

        if (patch.isEmpty()) {
            return toMemoryResponse(current);
        }

        JsonNode updated = supabaseGatewayService.updateMemoryById(authorizationHeader, id.toString(), patch);
        return toMemoryResponse(updated);
    }

    public void deleteMemory(String authorizationHeader, UUID id) {
        supabaseGatewayService.assertOwnerCanManageMemory(authorizationHeader, id.toString());
        supabaseGatewayService.deleteMemoryById(authorizationHeader, id.toString());
    }

    private CreateMemoryResponse persistSingleMemory(String authorizationHeader, String memoryId, SplitMemory splitMemory) {
        String excerpt = normalizeTranscript(splitMemory.excerpt());
        MemoryInsightsService.MemoryInsights insights = memoryInsightsService.generate(excerpt);
        Map<String, Object> patch = new java.util.LinkedHashMap<>();
        patch.put("status", "READY");
        patch.put("recorded_at", splitMemory.recordedAt().toString());
        patch.put("transcript", excerpt);
        patch.put("title", insights.title());
        patch.put("summary", insights.summary());
        patch.put("tags", toTagLabels(memoryTaggingService.detectTags(excerpt)));
        patch.put("error_message", null);

        JsonNode saved = supabaseGatewayService.updateMemoryById(
            authorizationHeader,
            memoryId,
            patch
        );

        UUID id = uuid(text(saved.get("id")));
        return new CreateMemoryResponse(
            id,
            List.of(id),
            1,
            toStatus(text(saved.get("status"))),
            nullableText(saved.get("error_message")),
            snippet(nullableText(saved.get("transcript"))),
            nullableText(saved.get("title")),
            nullableText(saved.get("summary")),
            readTags(saved.get("tags"))
        );
    }

    private CreateMemoryResponse persistSplitMemories(
        String authorizationHeader,
        String firstMemoryId,
        String childId,
        List<SplitMemory> splitMemories
    ) {
        List<UUID> ids = new ArrayList<>();
        JsonNode firstSaved = null;

        for (int i = 0; i < splitMemories.size(); i++) {
            SplitMemory splitMemory = splitMemories.get(i);
            String excerpt = normalizeTranscript(splitMemory.excerpt());
            MemoryInsightsService.MemoryInsights insights = memoryInsightsService.generate(excerpt);
            List<String> tags = toTagLabels(memoryTaggingService.detectTags(excerpt));

            JsonNode saved;
            if (i == 0) {
                Map<String, Object> patch = new java.util.LinkedHashMap<>();
                patch.put("status", "READY");
                patch.put("recorded_at", splitMemory.recordedAt().toString());
                patch.put("transcript", excerpt);
                patch.put("title", insights.title());
                patch.put("summary", insights.summary());
                patch.put("tags", tags);
                patch.put("error_message", null);
                saved = supabaseGatewayService.updateMemoryById(
                    authorizationHeader,
                    firstMemoryId,
                    patch
                );
                firstSaved = saved;
            } else {
                saved = supabaseGatewayService.insertReadyMemory(
                    authorizationHeader,
                    childId,
                    splitMemory.recordedAt(),
                    excerpt,
                    insights.title(),
                    insights.summary(),
                    tags
                );
            }

            ids.add(uuid(text(saved.get("id"))));
        }

        if (firstSaved == null) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Could not persist split memories");
        }

        return new CreateMemoryResponse(
            ids.getFirst(),
            ids,
            ids.size(),
            MemoryStatus.READY,
            null,
            snippet(nullableText(firstSaved.get("transcript"))),
            nullableText(firstSaved.get("title")),
            nullableText(firstSaved.get("summary")),
            readTags(firstSaved.get("tags"))
        );
    }

    private MemoryResponse toMemoryResponse(JsonNode row) {
        return new MemoryResponse(
            uuid(text(row.get("id"))),
            instant(row.get("created_at")),
            instantOrFallback(row.get("recorded_at"), row.get("created_at")),
            toStatus(text(row.get("status"))),
            nullableText(row.get("title")),
            nullableText(row.get("summary")),
            nullableText(row.get("transcript")),
            nullableText(row.get("error_message")),
            readTags(row.get("tags"))
        );
    }

    private MemoryStatus toStatus(String value) {
        if ("PROCESSING".equals(value)) {
            return MemoryStatus.PROCESSING;
        }
        if ("READY".equals(value)) {
            return MemoryStatus.READY;
        }
        return MemoryStatus.FAILED;
    }

    private String snippet(String transcript) {
        if (transcript == null || transcript.isBlank()) {
            return "";
        }
        String normalized = transcript.trim().replaceAll("\\s+", " ");
        if (normalized.length() <= MAX_SNIPPET_LENGTH) {
            return normalized;
        }
        return normalized.substring(0, MAX_SNIPPET_LENGTH - 3) + "...";
    }

    private String buildErrorMessage(Exception ex) {
        String message = ex.getMessage();
        if (message == null || message.isBlank()) {
            message = ex.getClass().getSimpleName();
        }
        if (message.length() <= MAX_ERROR_LENGTH) {
            return message;
        }
        return message.substring(0, MAX_ERROR_LENGTH);
    }

    private List<String> resolveTagLabels(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return List.of();
        }
        Set<String> labels = new LinkedHashSet<>();
        for (String value : tags) {
            MemoryTag tag = MemoryTag.fromLabel(value)
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Invalid tag: " + value));
            labels.add(tag.label());
        }
        return List.copyOf(labels);
    }

    private List<String> toTagLabels(Set<MemoryTag> tags) {
        if (tags == null || tags.isEmpty()) {
            return List.of();
        }
        return tags.stream().map(MemoryTag::label).sorted().toList();
    }

    private String normalizeTitle(String value) {
        return value == null ? null : value.trim();
    }

    private String normalizeFamilyId(String familyId) {
        if (!StringUtils.hasText(familyId)) {
            return null;
        }
        return familyId.trim();
    }

    private String normalizeTranscript(String value) {
        String normalized = value == null ? "" : value.trim().replaceAll("\\s+", " ");
        if (normalized.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Transcript must not be empty");
        }
        return normalized;
    }

    private UUID uuid(String value) {
        return UUID.fromString(value);
    }

    private Instant instant(JsonNode node) {
        return Instant.parse(text(node));
    }

    private Instant instantOrFallback(JsonNode primary, JsonNode fallback) {
        String value = text(primary);
        if (value.isBlank()) {
            return instant(fallback);
        }
        return Instant.parse(value);
    }

    private String text(JsonNode node) {
        if (node == null || node.isNull()) {
            return "";
        }
        return node.asText("");
    }

    private String nullableText(JsonNode node) {
        String value = text(node);
        return value.isBlank() ? null : value;
    }

    private List<String> readTags(JsonNode tagsNode) {
        if (tagsNode == null || !tagsNode.isArray()) {
            return List.of();
        }
        List<String> tags = new ArrayList<>();
        for (JsonNode node : tagsNode) {
            String value = text(node);
            if (!value.isBlank()) {
                tags.add(value);
            }
        }
        return tags;
    }
}
