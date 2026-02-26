package de.csiem.backend.dto;

import de.csiem.backend.model.MemoryStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MemoryResponse(
    UUID id,
    Instant createdAt,
    Instant recordedAt,
    MemoryStatus status,
    String title,
    String summary,
    String transcript,
    String errorMessage,
    List<String> tags
) {
}
