package de.csiem.backend.dto;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;

public record CreateMemoryRequest(
    MultipartFile audio,
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant recordedAt
) {
}
