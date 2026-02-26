package de.csiem.backend.dto;

import de.csiem.backend.model.MemoryStatus;

import java.util.List;
import java.util.UUID;

public record CreateMemoryResponse(
    UUID id,
    MemoryStatus status,
    String errorMessage,
    String transcriptPreview,
    String title,
    String summary,
    List<String> tags
) {
}
