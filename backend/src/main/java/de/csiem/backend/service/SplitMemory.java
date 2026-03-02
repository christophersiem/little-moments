package de.csiem.backend.service;

import java.time.Instant;

public record SplitMemory(
    String excerpt,
    Instant recordedAt,
    double confidence
) {
}
