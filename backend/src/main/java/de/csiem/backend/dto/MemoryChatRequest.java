package de.csiem.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MemoryChatRequest(
    @NotBlank(message = "question is required")
    @Size(max = 600, message = "question must be at most 600 characters")
    String question,
    String familyId
) {
}
