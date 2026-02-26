package de.csiem.backend.dto;

import java.util.List;

public record MemoryListResponse(
    List<MemoryListItemResponse> items,
    int page,
    int size,
    long totalElements,
    int totalPages
) {
}
