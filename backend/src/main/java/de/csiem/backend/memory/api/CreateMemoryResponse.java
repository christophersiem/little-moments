package de.csiem.backend.memory.api;

import de.csiem.backend.memory.MemoryStatus;

import java.util.UUID;

public record CreateMemoryResponse(
    UUID id,
    MemoryStatus status,
    String errorMessage,
    String transcriptPreview
) {
}
