package de.csiem.backend.dto;

import java.util.List;
import java.util.UUID;

public record MemoryChatResponse(
    String answer,
    String confidence,
    String status,
    String notes,
    List<UUID> sourceMemoryIds,
    List<MemoryChatSourceResponse> sources
) {
}
