package de.csiem.backend.memory.api;

import de.csiem.backend.memory.MemoryStatus;

import java.time.Instant;
import java.util.UUID;

public record MemoryListItemResponse(
    UUID id,
    Instant createdAt,
    Instant recordedAt,
    MemoryStatus status,
    String transcriptSnippet
) {
}
