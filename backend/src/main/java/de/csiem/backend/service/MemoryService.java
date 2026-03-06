package de.csiem.backend.service;

import de.csiem.backend.config.AppProperties;
import de.csiem.backend.dto.CreateMemoryRequest;
import de.csiem.backend.dto.CreateMemoryResponse;
import de.csiem.backend.dto.MemoryListItemResponse;
import de.csiem.backend.dto.MemoryListResponse;
import de.csiem.backend.dto.MemoryResponse;
import de.csiem.backend.dto.UpdateMemoryRequest;
import de.csiem.backend.model.MemoryEntity;
import de.csiem.backend.model.MemoryStatus;
import de.csiem.backend.model.MemoryTag;
import de.csiem.backend.model.UserEntity;
import de.csiem.backend.repository.MemoryRepository;
import de.csiem.backend.repository.UserRepository;
import de.csiem.backend.service.transcription.TranscriptionService;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
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
    private final MemorySplittingService memorySplittingService;
    private final MemoryTaggingService memoryTaggingService;
    private final MemoryInsightsService memoryInsightsService;
    private final AppProperties appProperties;

    public MemoryService(
        MemoryRepository memoryRepository,
        UserRepository userRepository,
        TranscriptionService transcriptionService,
        MemorySplittingService memorySplittingService,
        MemoryTaggingService memoryTaggingService,
        MemoryInsightsService memoryInsightsService,
        AppProperties appProperties
    ) {
        this.memoryRepository = memoryRepository;
        this.userRepository = userRepository;
        this.transcriptionService = transcriptionService;
        this.memorySplittingService = memorySplittingService;
        this.memoryTaggingService = memoryTaggingService;
        this.memoryInsightsService = memoryInsightsService;
        this.appProperties = appProperties;
    }

    @Transactional
    public CreateMemoryResponse createMemory(CreateMemoryRequest request) {
        var audio = request.audio();
        Instant uploadTimestamp = request.recordedAt() != null ? request.recordedAt() : Instant.now();
        if (audio == null || audio.isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "Audio file is required");
        }

        UserEntity user = getOrCreateDefaultUser();
        MemoryEntity memory = new MemoryEntity(
            UUID.randomUUID(),
            user,
            uploadTimestamp,
            MemoryStatus.PROCESSING
        );
        memoryRepository.save(memory);

        try {
            String transcript = transcriptionService.transcribe(
                audio.getBytes(),
                Optional.ofNullable(audio.getOriginalFilename()).orElse("recording.webm"),
                Optional.ofNullable(audio.getContentType()).orElse(MediaType.APPLICATION_OCTET_STREAM_VALUE)
            );

            List<SplitMemory> splitMemories = memorySplittingService.split(transcript, uploadTimestamp);
            if (splitMemories.size() <= 1) {
                SplitMemory single = splitMemories.isEmpty()
                    ? new SplitMemory(transcript, uploadTimestamp, 1.0)
                    : splitMemories.getFirst();
                return persistSingleMemory(memory, single);
            }

            return persistSplitMemories(memory, transcript, splitMemories, user);
        } catch (Exception ex) {
            memory.markFailed(buildErrorMessage(ex));
            MemoryEntity failed = memoryRepository.save(memory);
            return new CreateMemoryResponse(
                failed.getId(),
                List.of(),
                0,
                failed.getStatus(),
                failed.getErrorMessage(),
                null,
                null,
                null,
                List.of()
            );
        }
    }

    @Transactional(readOnly = true)
    public MemoryListResponse getMemories(int page, int size) {
        return getMemories(page, size, null, List.of(), false);
    }

    @Transactional(readOnly = true)
    public MemoryListResponse getMemories(int page, int size, String month, List<String> tags) {
        return getMemories(page, size, month, tags, false);
    }

    @Transactional(readOnly = true)
    public MemoryListResponse getMemories(int page, int size, String month, List<String> tags, boolean highlightsOnly) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(
            safePage,
            safeSize,
            Sort.by(
                Sort.Order.desc("recordedAt").nullsLast(),
                Sort.Order.desc("createdAt")
            )
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

        UUID userId = appProperties.getDefaultUserId();
        Instant fromFilter = fromInstant;
        Instant toFilter = toInstant;
        Set<MemoryTag> tagFilter = Set.copyOf(resolvedTags);

        Specification<MemoryEntity> specification = (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(criteriaBuilder.equal(root.get("user").get("id"), userId));
            predicates.add(criteriaBuilder.isFalse(root.get("isParent")));

            if (fromFilter != null) {
                predicates.add(criteriaBuilder.greaterThanOrEqualTo(root.get("recordedAt"), fromFilter));
            }
            if (toFilter != null) {
                predicates.add(criteriaBuilder.lessThan(root.get("recordedAt"), toFilter));
            }
            if (!tagFilter.isEmpty()) {
                predicates.add(root.joinSet("tags", JoinType.INNER).in(tagFilter));
                query.distinct(true);
            }
            if (highlightsOnly) {
                predicates.add(criteriaBuilder.isTrue(root.get("highlight")));
            }

            return criteriaBuilder.and(predicates.toArray(Predicate[]::new));
        };

        Page<MemoryEntity> result = memoryRepository.findAll(specification, pageable);

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
        MemoryEntity memory = memoryRepository.findByIdAndUser_IdAndIsParentFalse(id, appProperties.getDefaultUserId())
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Memory not found"));
        return MemoryMapper.toMemoryResponse(memory);
    }

    @Transactional
    public MemoryResponse updateMemory(UUID id, UpdateMemoryRequest request) {
        MemoryEntity memory = memoryRepository.findByIdAndUser_IdAndIsParentFalse(id, appProperties.getDefaultUserId())
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Memory not found"));

        if (request.title() != null) {
            memory.updateTitle(normalizeTitle(request.title()));
        }

        if (request.tags() != null) {
            memory.replaceTags(resolveTags(request.tags()));
        }

        if (request.recordedAt() != null) {
            memory.setRecordedAt(request.recordedAt());
        }

        if (request.isHighlight() != null) {
            memory.setHighlight(request.isHighlight());
        }

        if (request.transcript() != null) {
            String nextTranscript = normalizeTranscript(request.transcript());
            MemoryInsightsService.MemoryInsights insights = memoryInsightsService.generate(nextTranscript);
            memory.updateTranscriptAndSummary(nextTranscript, insights.summary());

            if (request.title() == null || request.title().isBlank()) {
                if (memory.getTitle() == null || memory.getTitle().isBlank()) {
                    memory.updateTitle(insights.title());
                }
            }

            if (request.tags() == null) {
                memory.replaceTags(memoryTaggingService.detectTags(nextTranscript));
            }
        }

        MemoryEntity saved = memoryRepository.save(memory);
        return MemoryMapper.toMemoryResponse(saved);
    }

    @Transactional
    public void deleteMemory(UUID id) {
        MemoryEntity memory = memoryRepository.findByIdAndUser_IdAndIsParentFalse(id, appProperties.getDefaultUserId())
            .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Memory not found"));
        memoryRepository.delete(memory);
    }

    private CreateMemoryResponse persistSingleMemory(MemoryEntity memory, SplitMemory splitMemory) {
        String excerpt = normalizeTranscript(splitMemory.excerpt());
        MemoryInsightsService.MemoryInsights insights = memoryInsightsService.generate(excerpt);
        memory.setRecordedAt(splitMemory.recordedAt());
        memory.markReady(
            excerpt,
            memoryTaggingService.detectTags(excerpt),
            insights.title(),
            insights.summary()
        );

        MemoryEntity saved = memoryRepository.save(memory);
        return new CreateMemoryResponse(
            saved.getId(),
            List.of(saved.getId()),
            1,
            saved.getStatus(),
            saved.getErrorMessage(),
            snippet(saved.getTranscript()),
            saved.getTitle(),
            saved.getSummary(),
            MemoryMapper.toTagLabels(saved)
        );
    }

    private CreateMemoryResponse persistSplitMemories(
        MemoryEntity parentMemory,
        String fullTranscript,
        List<SplitMemory> splitMemories,
        UserEntity user
    ) {
        parentMemory.markReadyAsParent(fullTranscript);
        MemoryEntity parentSaved = memoryRepository.save(parentMemory);

        List<MemoryEntity> children = new ArrayList<>();
        for (SplitMemory splitMemory : splitMemories) {
            String excerpt = normalizeTranscript(splitMemory.excerpt());
            MemoryInsightsService.MemoryInsights insights = memoryInsightsService.generate(excerpt);

            MemoryEntity child = new MemoryEntity(
                UUID.randomUUID(),
                user,
                splitMemory.recordedAt(),
                MemoryStatus.READY
            );
            child.setParentMemory(parentSaved);
            child.markReady(
                excerpt,
                memoryTaggingService.detectTags(excerpt),
                insights.title(),
                insights.summary()
            );
            children.add(child);
        }

        List<MemoryEntity> savedChildren = memoryRepository.saveAll(children);
        MemoryEntity first = savedChildren.getFirst();
        List<UUID> ids = savedChildren.stream().map(MemoryEntity::getId).toList();

        return new CreateMemoryResponse(
            first.getId(),
            ids,
            ids.size(),
            MemoryStatus.READY,
            null,
            snippet(first.getTranscript()),
            first.getTitle(),
            first.getSummary(),
            MemoryMapper.toTagLabels(first)
        );
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

    private Set<MemoryTag> resolveTags(List<String> tags) {
        Set<MemoryTag> resolved = new LinkedHashSet<>();
        for (String value : tags) {
            MemoryTag tag = MemoryTag.fromLabel(value)
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Invalid tag: " + value));
            resolved.add(tag);
        }
        return resolved;
    }

    private String normalizeTitle(String value) {
        return value == null ? null : value.trim();
    }

    private String normalizeTranscript(String value) {
        String normalized = value == null ? "" : value.trim().replaceAll("\\s+", " ");
        if (normalized.isBlank()) {
            throw new ResponseStatusException(BAD_REQUEST, "Transcript must not be empty");
        }
        return normalized;
    }
}
