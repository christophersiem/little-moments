package de.csiem.backend.dto;

import de.csiem.backend.model.MemoryStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MemoryListItemResponse(
    UUID id,
    Instant createdAt,
    Instant recordedAt,
    MemoryStatus status,
    String transcriptSnippet,
    List<String> tags
) {
}
