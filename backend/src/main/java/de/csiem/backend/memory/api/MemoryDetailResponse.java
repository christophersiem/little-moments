package de.csiem.backend.memory.api;

import de.csiem.backend.memory.MemoryStatus;

import java.time.Instant;
import java.util.UUID;

public record MemoryDetailResponse(
    UUID id,
    Instant createdAt,
    Instant recordedAt,
    MemoryStatus status,
    String transcript,
    String errorMessage
) {
}
