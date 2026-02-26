package de.csiem.backend.service;

import de.csiem.backend.config.AppProperties;
import de.csiem.backend.dto.CreateMemoryRequest;
import de.csiem.backend.dto.CreateMemoryResponse;
import de.csiem.backend.dto.MemoryListItemResponse;
import de.csiem.backend.dto.MemoryListResponse;
import de.csiem.backend.dto.MemoryResponse;
import de.csiem.backend.model.MemoryEntity;
import de.csiem.backend.model.MemoryStatus;
import de.csiem.backend.model.MemoryTag;
import de.csiem.backend.model.UserEntity;
import de.csiem.backend.repository.MemoryRepository;
import de.csiem.backend.repository.UserRepository;
import de.csiem.backend.service.transcription.TranscriptionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
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
    private final MemoryTaggingService memoryTaggingService;
    private final AppProperties appProperties;

    public MemoryService(
        MemoryRepository memoryRepository,
        UserRepository userRepository,
        TranscriptionService transcriptionService,
        MemoryTaggingService memoryTaggingService,
        AppProperties appProperties
    ) {
        this.memoryRepository = memoryRepository;
        this.userRepository = userRepository;
        this.transcriptionService = transcriptionService;
        this.memoryTaggingService = memoryTaggingService;
        this.appProperties = appProperties;
    }

    @Transactional
    public CreateMemoryResponse createMemory(CreateMemoryRequest request) {
        var audio = request.audio();
        var recordedAt = request.recordedAt();
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
            memory.markReady(transcript, memoryTaggingService.detectTags(transcript));
        } catch (Exception ex) {
            memory.markFailed(buildErrorMessage(ex));
        }

        MemoryEntity saved = memoryRepository.save(memory);
        return MemoryMapper.toCreateMemoryResponse(saved, snippet(saved.getTranscript()));
    }

    @Transactional(readOnly = true)
    public MemoryListResponse getMemories(int page, int size) {
        return getMemories(page, size, null, List.of());
    }

    @Transactional(readOnly = true)
    public MemoryListResponse getMemories(int page, int size, String month, List<String> tags) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(
            safePage,
            safeSize,
            Sort.by(Sort.Direction.DESC, "createdAt")
        );

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

        Set<MemoryTag> resolvedTags = new LinkedHashSet<>();
        if (tags != null) {
            for (String value : tags) {
                MemoryTag tag = MemoryTag.fromLabel(value)
                    .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Invalid tag: " + value));
                resolvedTags.add(tag);
            }
        }

        Set<MemoryTag> tagsForQuery = resolvedTags.isEmpty() ? Set.of(MemoryTag.GROWTH) : resolvedTags;

        Page<MemoryEntity> result = memoryRepository.findByUserWithFilters(
            appProperties.getDefaultUserId(),
            fromInstant,
            toInstant,
            tagsForQuery,
            resolvedTags.isEmpty(),
            pageable
        );

        List<MemoryListItemResponse> items = result.getContent().stream()
            .map(memory -> MemoryMapper.toMemoryListItemResponse(memory, snippet(memory.getTranscript())))
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
    public MemoryResponse getMemory(UUID id) {
        MemoryEntity memory = memoryRepository.findByIdAndUser_Id(id, appProperties.getDefaultUserId())
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Memory not found"));
        return MemoryMapper.toMemoryResponse(memory);
    }

    private UserEntity getOrCreateDefaultUser() {
        UUID defaultUserId = appProperties.getDefaultUserId();
        return userRepository.findById(defaultUserId)
            .orElseGet(() -> userRepository.save(new UserEntity(defaultUserId, null)));
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
