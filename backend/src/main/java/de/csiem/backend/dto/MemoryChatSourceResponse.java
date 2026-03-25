package de.csiem.backend.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MemoryChatSourceResponse(
    UUID id,
    Instant recordedAt,
    String title,
    String snippet,
    List<String> tags
) {
}
