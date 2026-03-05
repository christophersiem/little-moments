package de.csiem.backend.dto;

public record FamilyMemberResponse(
    String userId,
    String displayName,
    String role,
    String joinedAt
) {
}
