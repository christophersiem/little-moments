package de.csiem.backend.dto;

import java.util.List;

public record UpdateMemoryRequest(
    String title,
    String transcript,
    List<String> tags
) {
}
