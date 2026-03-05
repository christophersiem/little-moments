package de.csiem.backend.dto;

public record CreateInvitationRequest(
    String email,
    String role
) {
}
