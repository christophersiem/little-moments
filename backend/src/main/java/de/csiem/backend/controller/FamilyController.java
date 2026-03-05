package de.csiem.backend.controller;

import de.csiem.backend.dto.AcceptInvitationRequest;
import de.csiem.backend.dto.ChildIdResponse;
import de.csiem.backend.dto.CreateInvitationRequest;
import de.csiem.backend.dto.FamilyIdResponse;
import de.csiem.backend.dto.FamilyMemberResponse;
import de.csiem.backend.dto.FamilyNameRequest;
import de.csiem.backend.dto.FamilySummaryResponse;
import de.csiem.backend.dto.SetMemberRoleRequest;
import de.csiem.backend.dto.TokenResponse;
import de.csiem.backend.service.SupabaseGatewayService;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@RestController
@RequestMapping("/api")
public class FamilyController {

    private final SupabaseGatewayService supabaseGatewayService;

    public FamilyController(SupabaseGatewayService supabaseGatewayService) {
        this.supabaseGatewayService = supabaseGatewayService;
    }

    @PostMapping("/families/with-owner")
    public FamilyIdResponse createFamilyWithOwner(
        @RequestHeader("Authorization") String authorizationHeader,
        @RequestBody(required = false) FamilyNameRequest request
    ) {
        String name = request != null && StringUtils.hasText(request.name())
            ? request.name().trim()
            : "My Family";
        return new FamilyIdResponse(supabaseGatewayService.createFamilyWithOwner(authorizationHeader, name));
    }

    @GetMapping("/families/{familyId}/children/first")
    public ChildIdResponse getFirstChildId(
        @RequestHeader("Authorization") String authorizationHeader,
        @PathVariable("familyId") String familyId
    ) {
        return new ChildIdResponse(supabaseGatewayService.getFirstChildIdForFamily(authorizationHeader, familyId));
    }

    @PostMapping("/families/{familyId}/children/default")
    public ChildIdResponse ensureDefaultChild(
        @RequestHeader("Authorization") String authorizationHeader,
        @PathVariable("familyId") String familyId
    ) {
        return new ChildIdResponse(supabaseGatewayService.ensureDefaultChildForFamily(authorizationHeader, familyId));
    }

    @GetMapping("/families")
    public List<FamilySummaryResponse> listMyFamilies(
        @RequestHeader("Authorization") String authorizationHeader
    ) {
        return supabaseGatewayService.listMyFamilies(authorizationHeader);
    }

    @GetMapping("/families/{familyId}/members")
    public List<FamilyMemberResponse> listMembers(
        @RequestHeader("Authorization") String authorizationHeader,
        @PathVariable("familyId") String familyId
    ) {
        return supabaseGatewayService.listFamilyMembers(authorizationHeader, familyId);
    }

    @PostMapping("/families/{familyId}/invitations")
    public TokenResponse createInvitation(
        @RequestHeader("Authorization") String authorizationHeader,
        @PathVariable("familyId") String familyId,
        @RequestBody CreateInvitationRequest request
    ) {
        if (!StringUtils.hasText(request.email())) {
            throw new ResponseStatusException(BAD_REQUEST, "Email is required");
        }
        String role = StringUtils.hasText(request.role()) ? request.role().trim().toUpperCase() : "MEMBER";
        return new TokenResponse(
            supabaseGatewayService.createInvitation(authorizationHeader, familyId, request.email().trim(), role)
        );
    }

    @PostMapping("/invitations/accept")
    public FamilyIdResponse acceptInvitation(
        @RequestHeader("Authorization") String authorizationHeader,
        @RequestBody AcceptInvitationRequest request
    ) {
        if (!StringUtils.hasText(request.token())) {
            throw new ResponseStatusException(BAD_REQUEST, "Invitation token is required");
        }
        return new FamilyIdResponse(supabaseGatewayService.acceptInvitation(authorizationHeader, request.token().trim()));
    }

    @PatchMapping("/families/{familyId}/members/{userId}/role")
    public ResponseEntity<Void> setMemberRole(
        @RequestHeader("Authorization") String authorizationHeader,
        @PathVariable("familyId") String familyId,
        @PathVariable("userId") String userId,
        @RequestBody SetMemberRoleRequest request
    ) {
        if (!StringUtils.hasText(request.role())) {
            throw new ResponseStatusException(BAD_REQUEST, "Role is required");
        }
        supabaseGatewayService.setMemberRole(authorizationHeader, familyId, userId, request.role().trim().toUpperCase());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/families/{familyId}/members/{userId}")
    public ResponseEntity<Void> removeMember(
        @RequestHeader("Authorization") String authorizationHeader,
        @PathVariable("familyId") String familyId,
        @PathVariable("userId") String userId
    ) {
        supabaseGatewayService.removeMember(authorizationHeader, familyId, userId);
        return ResponseEntity.noContent().build();
    }
}
