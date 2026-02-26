package de.csiem.backend.memory;

import de.csiem.backend.config.AppProperties;
import de.csiem.backend.memory.api.CreateMemoryResponse;
import de.csiem.backend.memory.api.MemoryDetailResponse;
import de.csiem.backend.memory.api.MemoryListItemResponse;
import de.csiem.backend.memory.api.MemoryListResponse;
import de.csiem.backend.memory.transcription.TranscriptionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
public class MemoryService {

    private static final int MAX_SNIPPET_LENGTH = 180;
    private static final int MAX_ERROR_LENGTH = 1000;

    private final MemoryRepository memoryRepository;
    private final UserRepository userRepository;
    private final TranscriptionService transcriptionService;
    private final AppProperties appProperties;

    public MemoryService(
        MemoryRepository memoryRepository,
        UserRepository userRepository,
        TranscriptionService transcriptionService,
        AppProperties appProperties
    ) {
        this.memoryRepository = memoryRepository;
        this.userRepository = userRepository;
        this.transcriptionService = transcriptionService;
        this.appProperties = appProperties;
    }

    @Transactional
    public CreateMemoryResponse createMemory(MultipartFile audio, Instant recordedAt) {
        if (audio == null || audio.isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Audio file is required");
        }

        UserEntity user = getOrCreateDefaultUser();
        MemoryEntity memory = new MemoryEntity(
            UUID.randomUUID(),
            user,
            recordedAt != null ? recordedAt : Instant.now(),
            MemoryStatus.PROCESSING
        );
        memoryRepository.save(memory);

        try {
            String transcript = transcriptionService.transcribe(
                audio.getBytes(),
                Optional.ofNullable(audio.getOriginalFilename()).orElse("recording.webm"),
                Optional.ofNullable(audio.getContentType()).orElse(MediaType.APPLICATION_OCTET_STREAM_VALUE)
            );
            memory.markReady(transcript);
        } catch (Exception ex) {
            memory.markFailed(buildErrorMessage(ex));
        }

        MemoryEntity saved = memoryRepository.save(memory);
        return new CreateMemoryResponse(
            saved.getId(),
            saved.getStatus(),
            saved.getErrorMessage(),
            snippet(saved.getTranscript())
        );
    }

    @Transactional(readOnly = true)
    public MemoryListResponse getMemories(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(
            safePage,
            safeSize,
            Sort.by(Sort.Direction.DESC, "createdAt")
        );
        Page<MemoryEntity> result = memoryRepository.findByUser_Id(
            appProperties.getDefaultUserId(),
            pageable
        );

        List<MemoryListItemResponse> items = result.getContent().stream()
            .map(memory -> new MemoryListItemResponse(
                memory.getId(),
                memory.getCreatedAt(),
                memory.getRecordedAt(),
                memory.getStatus(),
                snippet(memory.getTranscript())
            ))
            .toList();

        return new MemoryListResponse(
            items,
            result.getNumber(),
            result.getSize(),
            result.getTotalElements(),
            result.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public MemoryDetailResponse getMemory(UUID id) {
        MemoryEntity memory = memoryRepository.findByIdAndUser_Id(id, appProperties.getDefaultUserId())
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Memory not found"));
        return toDetail(memory);
    }

    private UserEntity getOrCreateDefaultUser() {
        UUID defaultUserId = appProperties.getDefaultUserId();
        return userRepository.findById(defaultUserId)
            .orElseGet(() -> userRepository.save(new UserEntity(defaultUserId, null)));
    }

    private MemoryDetailResponse toDetail(MemoryEntity memory) {
        return new MemoryDetailResponse(
            memory.getId(),
            memory.getCreatedAt(),
            memory.getRecordedAt(),
            memory.getStatus(),
            memory.getTranscript(),
            memory.getErrorMessage()
        );
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
}
