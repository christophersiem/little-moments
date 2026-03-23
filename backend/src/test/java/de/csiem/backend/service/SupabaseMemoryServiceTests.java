package de.csiem.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.csiem.backend.dto.CreateMemoryRequest;
import de.csiem.backend.dto.CreateMemoryResponse;
import de.csiem.backend.model.MemoryStatus;
import de.csiem.backend.model.MemoryTag;
import de.csiem.backend.service.transcription.TranscriptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SupabaseMemoryServiceTests {

    @Mock
    private SupabaseGatewayService supabaseGatewayService;

    @Mock
    private TranscriptionService transcriptionService;

    @Mock
    private MemorySplittingService memorySplittingService;

    @Mock
    private MemoryTaggingService memoryTaggingService;

    @Mock
    private MemoryInsightsService memoryInsightsService;

    @Mock
    private MemoryEnrichmentWebhookService memoryEnrichmentWebhookService;

    private SupabaseMemoryService supabaseMemoryService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        supabaseMemoryService = new SupabaseMemoryService(
            supabaseGatewayService,
            transcriptionService,
            memorySplittingService,
            memoryTaggingService,
            memoryInsightsService,
            memoryEnrichmentWebhookService
        );
    }

    @Test
    void createMemoryTransitionsFromProcessingToReadyOnHappyPath() throws Exception {
        UUID memoryId = UUID.fromString("55555555-5555-5555-5555-555555555555");
        Instant recordedAt = Instant.parse("2026-03-05T08:15:00Z");
        String transcript = "She asked for another bedtime story.";
        CreateMemoryRequest request = new CreateMemoryRequest(
            new MockMultipartFile("audio", "moment.webm", "audio/webm", "audio-data".getBytes()),
            recordedAt,
            " child-1 "
        );

        when(supabaseGatewayService.createProcessingMemory("Bearer token", "child-1", recordedAt))
            .thenReturn(json("""
                {
                  "id": "%s"
                }
                """.formatted(memoryId)));
        when(transcriptionService.transcribe(any(), any(), any())).thenReturn(transcript);
        when(memorySplittingService.split(transcript, recordedAt))
            .thenReturn(List.of(new SplitMemory(transcript, recordedAt, 0.95)));
        when(memoryInsightsService.generate(transcript))
            .thenReturn(new MemoryInsightsService.MemoryInsights("Asked for bedtime story", "A clear language leap."));
        when(memoryTaggingService.detectTags(transcript)).thenReturn(Set.of(MemoryTag.LANGUAGE));
        when(supabaseGatewayService.updateMemoryById(eq("Bearer token"), eq(memoryId.toString()), any(Map.class)))
            .thenReturn(json("""
                {
                  "id": "%s",
                  "created_at": "2026-03-05T08:15:00Z",
                  "status": "READY",
                  "error_message": null,
                  "transcript": "She asked for another bedtime story.",
                  "title": "Asked for bedtime story",
                  "summary": "A clear language leap.",
                  "tags": ["Language"]
                }
                """.formatted(memoryId)));

        CreateMemoryResponse response = supabaseMemoryService.createMemory("Bearer token", request);

        assertEquals(MemoryStatus.READY, response.status());
        assertEquals(1, response.count());
        assertEquals(List.of(memoryId), response.ids());
        assertEquals("Asked for bedtime story", response.title());
        assertTrue(response.tags().contains("Language"));

        verify(supabaseGatewayService).assertOwnerCanCreateMemory("Bearer token", "child-1");
        verify(supabaseGatewayService).updateMemoryById(
            eq("Bearer token"),
            eq(memoryId.toString()),
            argThat(patch ->
                "READY".equals(patch.get("status"))
                    && "A clear language leap.".equals(patch.get("summary"))
            )
        );
        verify(memoryEnrichmentWebhookService).publishCreatedEntry(
            eq(memoryId),
            eq("child-1"),
            eq(transcript),
            eq(Instant.parse("2026-03-05T08:15:00Z")),
            isNull(),
            isNull()
        );
    }

    @Test
    void createMemoryPublishesWebhookForEachSplitEntry() throws Exception {
        UUID firstId = UUID.fromString("77777777-7777-7777-7777-777777777777");
        UUID secondId = UUID.fromString("88888888-8888-8888-8888-888888888888");
        Instant recordedAt = Instant.parse("2026-03-05T08:15:00Z");
        Instant splitTwoRecordedAt = Instant.parse("2026-03-05T09:00:00Z");
        String transcript = "At breakfast he asked for more apples. Later he climbed the ladder alone.";
        SplitMemory splitOne = new SplitMemory("At breakfast he asked for more apples.", recordedAt, 0.9);
        SplitMemory splitTwo = new SplitMemory("Later he climbed the ladder alone.", splitTwoRecordedAt, 0.85);
        CreateMemoryRequest request = new CreateMemoryRequest(
            new MockMultipartFile("audio", "moment.webm", "audio/webm", "audio-data".getBytes()),
            recordedAt,
            "child-1"
        );

        when(supabaseGatewayService.createProcessingMemory("Bearer token", "child-1", recordedAt))
            .thenReturn(json("""
                {
                  "id": "%s"
                }
                """.formatted(firstId)));
        when(transcriptionService.transcribe(any(), any(), any())).thenReturn(transcript);
        when(memorySplittingService.split(transcript, recordedAt)).thenReturn(List.of(splitOne, splitTwo));
        when(memoryInsightsService.generate(anyString()))
            .thenReturn(
                new MemoryInsightsService.MemoryInsights("Asked for more apples", "Breakfast language leap."),
                new MemoryInsightsService.MemoryInsights("Climbed ladder alone", "Strong independent climbing.")
            );
        when(memoryTaggingService.detectTags(anyString())).thenReturn(Set.of(MemoryTag.LANGUAGE));
        when(supabaseGatewayService.updateMemoryById(eq("Bearer token"), eq(firstId.toString()), any(Map.class)))
            .thenReturn(json("""
                {
                  "id": "%s",
                  "status": "READY",
                  "error_message": null,
                  "transcript": "At breakfast he asked for more apples.",
                  "title": "Asked for more apples",
                  "summary": "Breakfast language leap.",
                  "tags": ["Language"]
                }
                """.formatted(firstId)));
        when(supabaseGatewayService.insertReadyMemory(
            eq("Bearer token"),
            eq("child-1"),
            eq(splitTwoRecordedAt),
            eq("Later he climbed the ladder alone."),
            eq("Climbed ladder alone"),
            eq("Strong independent climbing."),
            org.mockito.ArgumentMatchers.<List<String>>any()
        )).thenReturn(json("""
                {
                  "id": "%s",
                  "created_at": "2026-03-05T09:00:00Z",
                  "status": "READY",
                  "error_message": null,
                  "transcript": "Later he climbed the ladder alone.",
                  "title": "Climbed ladder alone",
                  "summary": "Strong independent climbing.",
                  "tags": ["Language"]
                }
                """.formatted(secondId)));

        CreateMemoryResponse response = supabaseMemoryService.createMemory("Bearer token", request);

        assertEquals(2, response.count());
        assertEquals(List.of(firstId, secondId), response.ids());
        verify(memoryEnrichmentWebhookService, times(2))
            .publishCreatedEntry(any(), eq("child-1"), anyString(), any(), isNull(), isNull());
        verify(memoryEnrichmentWebhookService).publishCreatedEntry(
            eq(firstId),
            eq("child-1"),
            eq("At breakfast he asked for more apples."),
            eq(recordedAt),
            isNull(),
            isNull()
        );
        verify(memoryEnrichmentWebhookService).publishCreatedEntry(
            eq(secondId),
            eq("child-1"),
            eq("Later he climbed the ladder alone."),
            eq(splitTwoRecordedAt),
            isNull(),
            isNull()
        );
    }

    @Test
    void createMemoryTransitionsFromProcessingToFailedWhenTranscriptionFails() throws Exception {
        UUID memoryId = UUID.fromString("66666666-6666-6666-6666-666666666666");
        Instant recordedAt = Instant.parse("2026-03-05T08:15:00Z");
        CreateMemoryRequest request = new CreateMemoryRequest(
            new MockMultipartFile("audio", "moment.webm", "audio/webm", "audio-data".getBytes()),
            recordedAt,
            "child-1"
        );

        when(supabaseGatewayService.createProcessingMemory("Bearer token", "child-1", recordedAt))
            .thenReturn(json("""
                {
                  "id": "%s"
                }
                """.formatted(memoryId)));
        when(transcriptionService.transcribe(any(), any(), any()))
            .thenThrow(new IllegalStateException("Provider unavailable"));
        when(supabaseGatewayService.updateMemoryById(eq("Bearer token"), eq(memoryId.toString()), any(Map.class)))
            .thenReturn(json("""
                {
                  "id": "%s",
                  "status": "FAILED",
                  "error_message": "Provider unavailable"
                }
                """.formatted(memoryId)));

        CreateMemoryResponse response = supabaseMemoryService.createMemory("Bearer token", request);

        assertEquals(MemoryStatus.FAILED, response.status());
        assertEquals(0, response.count());
        assertTrue(response.ids().isEmpty());
        assertEquals("Provider unavailable", response.errorMessage());
        assertNull(response.transcriptPreview());
        verify(supabaseGatewayService).updateMemoryById(
            eq("Bearer token"),
            eq(memoryId.toString()),
            argThat(patch ->
                "FAILED".equals(patch.get("status"))
                    && patch.get("transcript") == null
            )
        );
        verifyNoInteractions(memoryEnrichmentWebhookService);
    }

    @Test
    void createMemoryReturnsBadRequestWhenAudioMissing() {
        CreateMemoryRequest request = new CreateMemoryRequest(null, Instant.parse("2026-03-05T08:15:00Z"), "child-1");

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> supabaseMemoryService.createMemory("Bearer token", request)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("Audio file is required", exception.getReason());
        verifyNoInteractions(
            supabaseGatewayService,
            transcriptionService,
            memorySplittingService,
            memoryEnrichmentWebhookService
        );
    }

    @Test
    void createMemoryReturnsBadRequestWhenChildIdMissing() {
        CreateMemoryRequest request = new CreateMemoryRequest(
            new MockMultipartFile("audio", "moment.webm", "audio/webm", "audio-data".getBytes()),
            Instant.parse("2026-03-05T08:15:00Z"),
            "  "
        );

        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> supabaseMemoryService.createMemory("Bearer token", request)
        );

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("childId is required", exception.getReason());
        verifyNoInteractions(
            supabaseGatewayService,
            transcriptionService,
            memorySplittingService,
            memoryEnrichmentWebhookService
        );
    }

    private JsonNode json(String payload) throws Exception {
        return objectMapper.readTree(payload);
    }
}
