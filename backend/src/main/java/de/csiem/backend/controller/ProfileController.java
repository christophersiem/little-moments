package de.csiem.backend.controller;

import de.csiem.backend.dto.ProfileEnsureRequest;
import de.csiem.backend.dto.ProfileResponse;
import de.csiem.backend.dto.UpdateProfileRequest;
import de.csiem.backend.service.SupabaseGatewayService;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@RestController
@RequestMapping("/api/profiles")
public class ProfileController {

    private final SupabaseGatewayService supabaseGatewayService;

    public ProfileController(SupabaseGatewayService supabaseGatewayService) {
        this.supabaseGatewayService = supabaseGatewayService;
    }

    @PostMapping("/ensure")
    public ResponseEntity<Void> ensureOwnProfile(
        @RequestHeader("Authorization") String authorizationHeader,
        @RequestBody(required = false) ProfileEnsureRequest request
    ) {
        String displayName = request != null && StringUtils.hasText(request.displayName())
            ? request.displayName().trim()
            : "Member";
        supabaseGatewayService.ensureOwnProfile(authorizationHeader, displayName);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ProfileResponse getOwnProfile(
        @RequestHeader("Authorization") String authorizationHeader
    ) {
        return supabaseGatewayService.getOwnProfile(authorizationHeader);
    }

    @PatchMapping("/me")
    public ResponseEntity<Void> updateOwnProfile(
        @RequestHeader("Authorization") String authorizationHeader,
        @RequestBody UpdateProfileRequest request
    ) {
        if (!StringUtils.hasText(request.displayName())) {
            throw new ResponseStatusException(BAD_REQUEST, "Display name is required");
        }
        supabaseGatewayService.updateOwnProfile(authorizationHeader, request.displayName().trim());
        return ResponseEntity.noContent().build();
    }
}
