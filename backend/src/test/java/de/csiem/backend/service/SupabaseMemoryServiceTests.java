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
import org.mockito.ArgumentCaptor;
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
import static org.mockito.ArgumentMatchers.eq;
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

    private SupabaseMemoryService supabaseMemoryService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        supabaseMemoryService = new SupabaseMemoryService(
            supabaseGatewayService,
            transcriptionService,
            memorySplittingService,
            memoryTaggingService,
            memoryInsightsService
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

        ArgumentCaptor<Map<String, ?>> patchCaptor = ArgumentCaptor.forClass(Map.class);
        verify(supabaseGatewayService).updateMemoryById(eq("Bearer token"), eq(memoryId.toString()), patchCaptor.capture());
        assertEquals("READY", patchCaptor.getValue().get("status"));
        assertEquals("A clear language leap.", patchCaptor.getValue().get("summary"));
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

        ArgumentCaptor<Map<String, ?>> patchCaptor = ArgumentCaptor.forClass(Map.class);
        verify(supabaseGatewayService).updateMemoryById(eq("Bearer token"), eq(memoryId.toString()), patchCaptor.capture());
        assertEquals("FAILED", patchCaptor.getValue().get("status"));
        assertNull(patchCaptor.getValue().get("transcript"));
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
        verifyNoInteractions(supabaseGatewayService, transcriptionService, memorySplittingService);
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
        verifyNoInteractions(supabaseGatewayService, transcriptionService, memorySplittingService);
    }

    private JsonNode json(String payload) throws Exception {
        return objectMapper.readTree(payload);
    }
}
