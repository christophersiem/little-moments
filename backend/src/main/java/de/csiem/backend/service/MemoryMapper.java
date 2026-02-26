package de.csiem.backend.service;

import de.csiem.backend.dto.CreateMemoryResponse;
import de.csiem.backend.dto.MemoryListItemResponse;
import de.csiem.backend.dto.MemoryResponse;
import de.csiem.backend.model.MemoryEntity;

final class MemoryMapper {

    private MemoryMapper() {
    }

    static CreateMemoryResponse toCreateMemoryResponse(MemoryEntity memory, String transcriptPreview) {
        return new CreateMemoryResponse(
            memory.getId(),
            memory.getStatus(),
            memory.getErrorMessage(),
            transcriptPreview
        );
    }

    static MemoryListItemResponse toMemoryListItemResponse(MemoryEntity memory, String transcriptSnippet) {
        return new MemoryListItemResponse(
            memory.getId(),
            memory.getCreatedAt(),
            memory.getRecordedAt(),
            memory.getStatus(),
            transcriptSnippet
        );
    }

    static MemoryResponse toMemoryResponse(MemoryEntity memory) {
        return new MemoryResponse(
            memory.getId(),
            memory.getCreatedAt(),
            memory.getRecordedAt(),
            memory.getStatus(),
            memory.getTranscript(),
            memory.getErrorMessage()
        );
    }
}
