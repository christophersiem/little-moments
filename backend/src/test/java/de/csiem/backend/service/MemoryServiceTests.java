package de.csiem.backend.service;

import de.csiem.backend.config.AppProperties;
import de.csiem.backend.dto.CreateMemoryRequest;
import de.csiem.backend.dto.CreateMemoryResponse;
import de.csiem.backend.model.MemoryEntity;
import de.csiem.backend.model.MemoryStatus;
import de.csiem.backend.model.MemoryTag;
import de.csiem.backend.model.UserEntity;
import de.csiem.backend.repository.MemoryRepository;
import de.csiem.backend.repository.UserRepository;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MemoryServiceTests {

    @Mock
    private MemoryRepository memoryRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TranscriptionService transcriptionService;

    @Mock
    private MemorySplittingService memorySplittingService;

    @Mock
    private MemoryTaggingService memoryTaggingService;

    @Mock
    private MemoryInsightsService memoryInsightsService;

    private MemoryService memoryService;
    private AppProperties appProperties;
    private UserEntity defaultUser;

    @BeforeEach
    void setUp() {
        appProperties = new AppProperties();
        memoryService = new MemoryService(
            memoryRepository,
            userRepository,
            transcriptionService,
            memorySplittingService,
            memoryTaggingService,
            memoryInsightsService,
            appProperties
        );
        defaultUser = new UserEntity(appProperties.getDefaultUserId(), null);
    }

    @Test
    void createMemoryTransitionsFromProcessingToReadyOnHappyPath() {
        when(userRepository.findById(appProperties.getDefaultUserId())).thenReturn(Optional.of(defaultUser));

        Instant recordedAt = Instant.parse("2026-02-20T10:15:00Z");
        MockMultipartFile audio = new MockMultipartFile(
            "audio",
            "memory.webm",
            "audio/webm",
            "audio-data".getBytes()
        );
        CreateMemoryRequest request = new CreateMemoryRequest(audio, recordedAt, "child-1", false, 8);

        List<MemoryStatus> statuses = new ArrayList<>();
        when(memoryRepository.save(any(MemoryEntity.class))).thenAnswer(invocation -> {
            MemoryEntity entity = invocation.getArgument(0);
            statuses.add(entity.getStatus());
            return entity;
        });

        String transcript = "Today she asked for apples in a full sentence.";
        when(transcriptionService.transcribe(any(), any(), any())).thenReturn(transcript);
        when(memorySplittingService.split(transcript, recordedAt))
            .thenReturn(List.of(new SplitMemory(transcript, recordedAt, 0.95)));
        when(memoryTaggingService.detectTags(transcript)).thenReturn(Set.of(MemoryTag.LANGUAGE));
        when(memoryInsightsService.generate(transcript))
            .thenReturn(new MemoryInsightsService.MemoryInsights("First full sentence", "A clear language step was captured."));

        CreateMemoryResponse response = memoryService.createMemory(request);

        assertEquals(MemoryStatus.READY, response.status());
        assertEquals(1, response.count());
        assertEquals(1, response.ids().size());
        assertEquals(List.of(MemoryStatus.PROCESSING, MemoryStatus.READY), statuses);
        assertTrue(response.tags().contains("Language"));
    }

    @Test
    void createMemoryTransitionsFromProcessingToFailedWhenTranscriptionFails() {
        when(userRepository.findById(appProperties.getDefaultUserId())).thenReturn(Optional.of(defaultUser));

        Instant recordedAt = Instant.parse("2026-02-20T10:15:00Z");
        MockMultipartFile audio = new MockMultipartFile(
            "audio",
            "memory.webm",
            "audio/webm",
            "audio-data".getBytes()
        );
        CreateMemoryRequest request = new CreateMemoryRequest(audio, recordedAt, "child-1", false, 8);

        List<MemoryStatus> statuses = new ArrayList<>();
        when(memoryRepository.save(any(MemoryEntity.class))).thenAnswer(invocation -> {
            MemoryEntity entity = invocation.getArgument(0);
            statuses.add(entity.getStatus());
            return entity;
        });

        when(transcriptionService.transcribe(any(), any(), any()))
            .thenThrow(new IllegalStateException("Provider unavailable"));

        CreateMemoryResponse response = memoryService.createMemory(request);

        assertEquals(MemoryStatus.FAILED, response.status());
        assertEquals("Provider unavailable", response.errorMessage());
        assertEquals(List.of(MemoryStatus.PROCESSING, MemoryStatus.FAILED), statuses);
    }

    @Test
    void createMemoryReturnsBadRequestWhenAudioIsMissing() {
        MockMultipartFile emptyAudio = new MockMultipartFile(
            "audio",
            "empty.webm",
            "audio/webm",
            new byte[0]
        );
        CreateMemoryRequest request = new CreateMemoryRequest(
            emptyAudio,
            Instant.parse("2026-02-20T10:15:00Z"),
            "child-1",
            false,
            8
        );

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> memoryService.createMemory(request));

        assertEquals(HttpStatus.BAD_REQUEST, exception.getStatusCode());
        assertEquals("Audio file is required", exception.getReason());
        verify(memoryRepository, org.mockito.Mockito.never()).save(any(MemoryEntity.class));
    }
}
