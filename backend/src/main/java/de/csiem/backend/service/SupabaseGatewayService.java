package de.csiem.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.csiem.backend.config.AppProperties;
import de.csiem.backend.dto.FamilyMemberResponse;
import de.csiem.backend.dto.FamilySummaryResponse;
import de.csiem.backend.dto.ProfileResponse;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;

@Service
public class SupabaseGatewayService {

    private static final String SUPABASE_REQUEST_FAILED = "Supabase request failed";

    private final AppProperties appProperties;
    private final SupabaseHttpClient supabaseHttpClient;
    private final SupabaseMemoryGateway supabaseMemoryGateway;

    public SupabaseGatewayService(AppProperties appProperties) {
        this.appProperties = appProperties;
        ObjectMapper objectMapper = new ObjectMapper();
        this.supabaseHttpClient = new SupabaseHttpClient(appProperties, objectMapper);
        this.supabaseMemoryGateway = new SupabaseMemoryGateway(supabaseHttpClient);
    }

    public boolean isConfigured() {
        return StringUtils.hasText(appProperties.getSupabase().getUrl())
            && StringUtils.hasText(appProperties.getSupabase().getAnonKey());
    }

    public String createFamilyWithOwner(String authorizationHeader, String name) {
        JsonNode result = callRpc("rpc_create_family_with_owner", Map.of("name", name), authorizationHeader);
        return SupabaseJson.asText(result);
    }

    public String getFirstChildIdForFamily(String authorizationHeader, String familyId) {
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/children")
            .queryParam("select", SupabaseFields.ID)
            .queryParam(SupabaseFields.FAMILY_ID, "eq." + familyId)
            .queryParam("order", "created_at.asc")
            .queryParam("limit", 1)
            .build(true)
            .toUriString();

        JsonNode response = supabaseHttpClient.get(uri, authorizationHeader, SUPABASE_REQUEST_FAILED);
        if (!response.isArray() || response.isEmpty()) {
            return null;
        }
        return SupabaseJson.asText(response.get(0).get(SupabaseFields.ID));
    }

    public String ensureDefaultChildForFamily(String authorizationHeader, String familyId) {
        JsonNode result = callRpc(
            "rpc_ensure_default_child_for_family",
            Map.of(
                "p_family_id", familyId,
                "p_child_name", "My Child"
            ),
            authorizationHeader
        );
        return SupabaseJson.asText(result);
    }

    public List<FamilyMemberResponse> listFamilyMembers(String authorizationHeader, String familyId) {
        String membersUri = UriComponentsBuilder
            .fromPath("/rest/v1/family_members")
            .queryParam("select", "user_id,role,joined_at")
            .queryParam(SupabaseFields.FAMILY_ID, "eq." + familyId)
            .queryParam("order", "joined_at.asc")
            .build(true)
            .toUriString();

        JsonNode members = supabaseHttpClient.get(membersUri, authorizationHeader, SUPABASE_REQUEST_FAILED);
        if (!members.isArray()) {
            return List.of();
        }

        List<String> userIds = new ArrayList<>();
        for (JsonNode row : members) {
            String userId = SupabaseJson.asText(row.get(SupabaseFields.USER_ID));
            if (!userId.isBlank()) {
                userIds.add(userId);
            }
        }

        Map<String, String> displayNamesByUserId = fetchDisplayNames(authorizationHeader, userIds);
        List<FamilyMemberResponse> response = new ArrayList<>();

        for (JsonNode row : members) {
            String userId = SupabaseJson.asText(row.get(SupabaseFields.USER_ID));
            String role = SupabaseJson.asText(row.get(SupabaseFields.ROLE));
            String joinedAt = SupabaseJson.asText(row.get(SupabaseFields.JOINED_AT));
            String displayName = displayNamesByUserId.getOrDefault(userId, "Member");

            response.add(new FamilyMemberResponse(userId, displayName, role, joinedAt));
        }

        return response;
    }

    public List<FamilySummaryResponse> listMyFamilies(String authorizationHeader) {
        SupabaseHttpClient.SupabaseUser user = supabaseHttpClient.getCurrentUser(authorizationHeader);

        String membershipUri = UriComponentsBuilder
            .fromPath("/rest/v1/family_members")
            .queryParam("select", "family_id,role,joined_at")
            .queryParam(SupabaseFields.USER_ID, "eq." + user.id())
            .queryParam("order", "joined_at.asc")
            .build(true)
            .toUriString();

        JsonNode membershipRows = supabaseHttpClient.get(membershipUri, authorizationHeader, SUPABASE_REQUEST_FAILED);
        if (!membershipRows.isArray() || membershipRows.isEmpty()) {
            return List.of();
        }

        List<String> familyIds = new ArrayList<>();
        for (JsonNode row : membershipRows) {
            String familyId = SupabaseJson.asText(row.get(SupabaseFields.FAMILY_ID));
            if (!familyId.isBlank()) {
                familyIds.add(familyId);
            }
        }
        if (familyIds.isEmpty()) {
            return List.of();
        }

        String familiesUri = UriComponentsBuilder
            .fromPath("/rest/v1/families")
            .queryParam("select", "id,name")
            .queryParam("id", "in.(" + String.join(",", familyIds) + ")")
            .build(true)
            .toUriString();

        JsonNode familyRows = supabaseHttpClient.get(familiesUri, authorizationHeader, SUPABASE_REQUEST_FAILED);
        Map<String, String> familyNamesById = new HashMap<>();
        if (familyRows.isArray()) {
            for (JsonNode row : familyRows) {
                String familyId = SupabaseJson.asText(row.get(SupabaseFields.ID));
                if (!familyId.isBlank()) {
                    familyNamesById.put(familyId, SupabaseJson.firstNonBlank(SupabaseJson.asText(row.get("name")), "Family"));
                }
            }
        }

        List<FamilySummaryResponse> result = new ArrayList<>();
        for (JsonNode row : membershipRows) {
            String familyId = SupabaseJson.asText(row.get(SupabaseFields.FAMILY_ID));
            if (familyId.isBlank()) {
                continue;
            }
            result.add(
                new FamilySummaryResponse(
                    familyId,
                    familyNamesById.getOrDefault(familyId, "Family"),
                    SupabaseJson.asText(row.get(SupabaseFields.ROLE)),
                    SupabaseJson.asText(row.get(SupabaseFields.JOINED_AT))
                )
            );
        }
        return result;
    }

    public String createInvitation(String authorizationHeader, String familyId, String email, String role) {
        JsonNode result = callRpc(
            "rpc_create_invitation",
            Map.of(
                "p_family_id", familyId,
                "p_email", email,
                "p_role", role
            ),
            authorizationHeader
        );
        return SupabaseJson.asText(result);
    }

    public String acceptInvitation(String authorizationHeader, String token) {
        JsonNode result = callRpc(
            "rpc_accept_invitation",
            Map.of("p_token", token),
            authorizationHeader
        );
        return SupabaseJson.asText(result);
    }

    public void setMemberRole(String authorizationHeader, String familyId, String userId, String role) {
        callRpc(
            "rpc_set_member_role",
            Map.of(
                "p_family_id", familyId,
                "p_target_user_id", userId,
                "p_new_role", role
            ),
            authorizationHeader
        );
    }

    public void removeMember(String authorizationHeader, String familyId, String userId) {
        callRpc(
            "rpc_remove_member",
            Map.of(
                "p_family_id", familyId,
                "p_user_id", userId
            ),
            authorizationHeader
        );
    }

    public void ensureOwnProfile(String authorizationHeader, String displayName) {
        SupabaseHttpClient.SupabaseUser user = supabaseHttpClient.getCurrentUser(authorizationHeader);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("user_id", user.id());
        body.put("display_name", displayName);

        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/profiles")
            .queryParam("on_conflict", "user_id")
            .build(true)
            .toUriString();

        supabaseHttpClient.post(uri, body, authorizationHeader, profileEnsurePreferHeader(), SUPABASE_REQUEST_FAILED);
    }

    public ProfileResponse getOwnProfile(String authorizationHeader) {
        SupabaseHttpClient.SupabaseUser user = supabaseHttpClient.getCurrentUser(authorizationHeader);
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/profiles")
            .queryParam("select", "user_id,display_name")
            .queryParam(SupabaseFields.USER_ID, "eq." + user.id())
            .queryParam("limit", 1)
            .build(true)
            .toUriString();

        JsonNode result = supabaseHttpClient.get(uri, authorizationHeader, SUPABASE_REQUEST_FAILED);
        if (!result.isArray() || result.isEmpty()) {
            return new ProfileResponse(user.id(), "Member");
        }

        JsonNode row = result.get(0);
        return new ProfileResponse(
            SupabaseJson.asText(row.get(SupabaseFields.USER_ID)),
            SupabaseJson.firstNonBlank(SupabaseJson.asText(row.get(SupabaseFields.DISPLAY_NAME)), "Member")
        );
    }

    public void updateOwnProfile(String authorizationHeader, String displayName) {
        SupabaseHttpClient.SupabaseUser user = supabaseHttpClient.getCurrentUser(authorizationHeader);
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/profiles")
            .queryParam("on_conflict", "user_id")
            .queryParam("select", "user_id,display_name")
            .build(true)
            .toUriString();

        JsonNode rows = supabaseHttpClient.post(
            uri,
            Map.of(
                "user_id", user.id(),
                "display_name", displayName
            ),
            authorizationHeader,
            "resolution=merge-duplicates,return=representation",
            SUPABASE_REQUEST_FAILED
        );

        if (!rows.isArray() || rows.isEmpty()) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Could not update profile");
        }
    }

    public void assertOwnerCanCreateMemory(String authorizationHeader, String childId) {
        supabaseMemoryGateway.assertOwnerCanCreateMemory(authorizationHeader, childId);
    }

    public void assertOwnerCanManageMemory(String authorizationHeader, String memoryId) {
        supabaseMemoryGateway.assertOwnerCanManageMemory(authorizationHeader, memoryId);
    }

    public JsonNode createProcessingMemory(String authorizationHeader, String childId, Instant recordedAt) {
        return supabaseMemoryGateway.createProcessingMemory(authorizationHeader, childId, recordedAt);
    }

    public JsonNode insertReadyMemory(
        String authorizationHeader,
        String childId,
        Instant recordedAt,
        String transcript,
        String title,
        String summary,
        List<String> tags
    ) {
        return supabaseMemoryGateway.insertReadyMemory(
            authorizationHeader,
            childId,
            recordedAt,
            transcript,
            title,
            summary,
            tags
        );
    }

    public JsonNode updateMemoryById(String authorizationHeader, String memoryId, Map<String, ?> updates) {
        return supabaseMemoryGateway.updateMemoryById(authorizationHeader, memoryId, updates);
    }

    public JsonNode getMemoryById(String authorizationHeader, String memoryId) {
        return supabaseMemoryGateway.getMemoryById(authorizationHeader, memoryId);
    }

    public JsonNode listMemories(
        String authorizationHeader,
        int offset,
        int limit,
        String familyId,
        String fromRecordedAtIso,
        String toRecordedAtIso,
        List<String> tags,
        boolean highlightsOnly
    ) {
        return supabaseMemoryGateway.listMemories(
            authorizationHeader,
            offset,
            limit,
            familyId,
            fromRecordedAtIso,
            toRecordedAtIso,
            tags,
            highlightsOnly
        );
    }

    public long countMemories(
        String authorizationHeader,
        String familyId,
        String fromRecordedAtIso,
        String toRecordedAtIso,
        List<String> tags,
        boolean highlightsOnly
    ) {
        return supabaseMemoryGateway.countMemories(
            authorizationHeader,
            familyId,
            fromRecordedAtIso,
            toRecordedAtIso,
            tags,
            highlightsOnly
        );
    }

    public void deleteMemoryById(String authorizationHeader, String memoryId) {
        supabaseMemoryGateway.deleteMemoryById(authorizationHeader, memoryId);
    }

    String profileEnsurePreferHeader() {
        return "resolution=ignore-duplicates,return=minimal";
    }

    String buildTagOverlapFilter(List<String> values) {
        return supabaseMemoryGateway.buildTagOverlapFilter(values);
    }

    String toPostgresTextArrayLiteral(List<String> values) {
        return supabaseMemoryGateway.toPostgresTextArrayLiteral(values);
    }

    private Map<String, String> fetchDisplayNames(String authorizationHeader, List<String> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }

        String inFilter = "in.(" + String.join(",", userIds) + ")";
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/profiles")
            .queryParam("select", "user_id,display_name")
            .queryParam(SupabaseFields.USER_ID, inFilter)
            .build(true)
            .toUriString();

        JsonNode rows = supabaseHttpClient.get(uri, authorizationHeader, SUPABASE_REQUEST_FAILED);
        if (!rows.isArray()) {
            return Map.of();
        }

        Map<String, String> result = new HashMap<>();
        for (JsonNode row : rows) {
            String userId = SupabaseJson.asText(row.get(SupabaseFields.USER_ID));
            String displayName = SupabaseJson.firstNonBlank(SupabaseJson.asText(row.get(SupabaseFields.DISPLAY_NAME)), "Member");
            if (!userId.isBlank()) {
                result.put(userId, displayName);
            }
        }
        return result;
    }

    private JsonNode callRpc(String rpcName, Map<String, ?> payload, String authorizationHeader) {
        String uri = "/rest/v1/rpc/" + rpcName;
        return supabaseHttpClient.post(uri, payload, authorizationHeader, null, SUPABASE_REQUEST_FAILED);
    }
}
