package de.csiem.backend.dto;

public record FamilySummaryResponse(
    String familyId,
    String familyName,
    String role,
    String joinedAt
) {
}
