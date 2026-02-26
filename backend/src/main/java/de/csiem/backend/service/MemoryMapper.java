package de.csiem.backend.service;

import de.csiem.backend.dto.CreateMemoryResponse;
import de.csiem.backend.dto.MemoryListItemResponse;
import de.csiem.backend.dto.MemoryResponse;
import de.csiem.backend.model.MemoryEntity;
import de.csiem.backend.model.MemoryTag;

import java.util.List;
import java.util.stream.Collectors;

final class MemoryMapper {

    private MemoryMapper() {
    }

    static CreateMemoryResponse toCreateMemoryResponse(MemoryEntity memory, String transcriptPreview) {
        return new CreateMemoryResponse(
            memory.getId(),
            memory.getStatus(),
            memory.getErrorMessage(),
            transcriptPreview,
            memory.getTitle(),
            memory.getSummary(),
            toTagLabels(memory)
        );
    }

    static MemoryListItemResponse toMemoryListItemResponse(MemoryEntity memory, String transcriptSnippet) {
        return new MemoryListItemResponse(
            memory.getId(),
            memory.getCreatedAt(),
            memory.getRecordedAt(),
            memory.getStatus(),
            memory.getTitle(),
            transcriptSnippet,
            toTagLabels(memory)
        );
    }

    static MemoryResponse toMemoryResponse(MemoryEntity memory) {
        return new MemoryResponse(
            memory.getId(),
            memory.getCreatedAt(),
            memory.getRecordedAt(),
            memory.getStatus(),
            memory.getTitle(),
            memory.getSummary(),
            memory.getTranscript(),
            memory.getErrorMessage(),
            toTagLabels(memory)
        );
    }

    private static List<String> toTagLabels(MemoryEntity memory) {
        return memory.getTags().stream()
            .sorted()
            .map(MemoryTag::label)
            .collect(Collectors.toList());
    }
}
