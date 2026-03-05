package de.csiem.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.csiem.backend.config.AppProperties;
import de.csiem.backend.dto.FamilyMemberResponse;
import de.csiem.backend.dto.FamilySummaryResponse;
import de.csiem.backend.dto.ProfileResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.ArrayList;
import java.time.Instant;
import java.net.URI;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
public class SupabaseGatewayService {

    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;

    public SupabaseGatewayService(AppProperties appProperties) {
        this.appProperties = appProperties;
        this.objectMapper = new ObjectMapper();
    }

    public boolean isConfigured() {
        return StringUtils.hasText(appProperties.getSupabase().getUrl())
            && StringUtils.hasText(appProperties.getSupabase().getAnonKey());
    }

    public String createFamilyWithOwner(String authorizationHeader, String name) {
        JsonNode result = callRpc("rpc_create_family_with_owner", Map.of("name", name), authorizationHeader);
        return asText(result);
    }

    public String getFirstChildIdForFamily(String authorizationHeader, String familyId) {
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/children")
            .queryParam("select", "id")
            .queryParam("family_id", "eq." + familyId)
            .queryParam("order", "created_at.asc")
            .queryParam("limit", 1)
            .build(true)
            .toUriString();

        JsonNode response = callGet(uri, authorizationHeader);
        if (!response.isArray() || response.isEmpty()) {
            return null;
        }
        return asText(response.get(0).get("id"));
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
        return asText(result);
    }

    public List<FamilyMemberResponse> listFamilyMembers(String authorizationHeader, String familyId) {
        String membersUri = UriComponentsBuilder
            .fromPath("/rest/v1/family_members")
            .queryParam("select", "user_id,role,joined_at")
            .queryParam("family_id", "eq." + familyId)
            .queryParam("order", "joined_at.asc")
            .build(true)
            .toUriString();

        JsonNode members = callGet(membersUri, authorizationHeader);
        if (!members.isArray()) {
            return List.of();
        }

        List<String> userIds = new ArrayList<>();
        for (JsonNode row : members) {
            String userId = asText(row.get("user_id"));
            if (!userId.isBlank()) {
                userIds.add(userId);
            }
        }

        Map<String, String> displayNamesByUserId = fetchDisplayNames(authorizationHeader, userIds);
        List<FamilyMemberResponse> response = new ArrayList<>();

        for (JsonNode row : members) {
            String userId = asText(row.get("user_id"));
            String role = asText(row.get("role"));
            String joinedAt = asText(row.get("joined_at"));
            String displayName = displayNamesByUserId.getOrDefault(userId, "Member");

            response.add(new FamilyMemberResponse(userId, displayName, role, joinedAt));
        }

        return response;
    }

    public List<FamilySummaryResponse> listMyFamilies(String authorizationHeader) {
        SupabaseUser user = getCurrentUser(authorizationHeader);

        String membershipUri = UriComponentsBuilder
            .fromPath("/rest/v1/family_members")
            .queryParam("select", "family_id,role,joined_at")
            .queryParam("user_id", "eq." + user.id())
            .queryParam("order", "joined_at.asc")
            .build(true)
            .toUriString();

        JsonNode membershipRows = callGet(membershipUri, authorizationHeader);
        if (!membershipRows.isArray() || membershipRows.isEmpty()) {
            return List.of();
        }

        List<String> familyIds = new ArrayList<>();
        for (JsonNode row : membershipRows) {
            String familyId = asText(row.get("family_id"));
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

        JsonNode familyRows = callGet(familiesUri, authorizationHeader);
        Map<String, String> familyNamesById = new HashMap<>();
        if (familyRows.isArray()) {
            for (JsonNode row : familyRows) {
                String familyId = asText(row.get("id"));
                if (!familyId.isBlank()) {
                    familyNamesById.put(familyId, firstNonBlank(asText(row.get("name")), "Family"));
                }
            }
        }

        List<FamilySummaryResponse> result = new ArrayList<>();
        for (JsonNode row : membershipRows) {
            String familyId = asText(row.get("family_id"));
            if (familyId.isBlank()) {
                continue;
            }
            result.add(
                new FamilySummaryResponse(
                    familyId,
                    familyNamesById.getOrDefault(familyId, "Family"),
                    asText(row.get("role")),
                    asText(row.get("joined_at"))
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
        return asText(result);
    }

    public String acceptInvitation(String authorizationHeader, String token) {
        JsonNode result = callRpc(
            "rpc_accept_invitation",
            Map.of("p_token", token),
            authorizationHeader
        );
        return asText(result);
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
        SupabaseUser user = getCurrentUser(authorizationHeader);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("user_id", user.id());
        body.put("display_name", displayName);

        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/profiles")
            .queryParam("on_conflict", "user_id")
            .build(true)
            .toUriString();

        callPost(uri, body, authorizationHeader, "resolution=merge-duplicates,return=minimal");
    }

    public ProfileResponse getOwnProfile(String authorizationHeader) {
        SupabaseUser user = getCurrentUser(authorizationHeader);
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/profiles")
            .queryParam("select", "user_id,display_name")
            .queryParam("user_id", "eq." + user.id())
            .queryParam("limit", 1)
            .build(true)
            .toUriString();

        JsonNode result = callGet(uri, authorizationHeader);
        if (!result.isArray() || result.isEmpty()) {
            return new ProfileResponse(user.id(), "Member");
        }

        JsonNode row = result.get(0);
        return new ProfileResponse(
            asText(row.get("user_id")),
            firstNonBlank(asText(row.get("display_name")), "Member")
        );
    }

    public void assertOwnerCanCreateMemory(String authorizationHeader, String childId) {
        SupabaseUser user = getCurrentUser(authorizationHeader);
        assertOwnerForChild(authorizationHeader, user.id(), childId, "Only owners can record memories.");
    }

    public String resolveFamilyIdForChild(String authorizationHeader, String childId) {
        String childUri = UriComponentsBuilder
            .fromPath("/rest/v1/children")
            .queryParam("select", "family_id")
            .queryParam("id", "eq." + childId)
            .queryParam("limit", 1)
            .build(true)
            .toUriString();

        JsonNode childRows = callGet(childUri, authorizationHeader);
        if (!childRows.isArray() || childRows.isEmpty()) {
            throw new ResponseStatusException(NOT_FOUND, "Child not found");
        }

        String familyId = asText(childRows.get(0).get("family_id"));
        if (!StringUtils.hasText(familyId)) {
            throw new ResponseStatusException(FORBIDDEN, "Family not found for child");
        }

        return familyId;
    }

    public void uploadMemoryAudio(String objectPath, byte[] audioBytes, String contentType) {
        String bucket = appProperties.getSupabase().getAudioBucket();
        if (!StringUtils.hasText(bucket)) {
            throw new ResponseStatusException(BAD_REQUEST, "SUPABASE_AUDIO_BUCKET is not configured");
        }

        String uri = "/storage/v1/object/" + bucket + "/" + objectPath;

        try {
            restClient().post()
                .uri(uri)
                .headers(headers -> {
                    applyServiceRoleHeaders(headers, null);
                    headers.set("x-upsert", "true");
                })
                .contentType(safeMediaType(contentType))
                .body(audioBytes)
                .retrieve()
                .toBodilessEntity();
        } catch (RestClientResponseException ex) {
            throw mapException(ex, "Could not upload audio to storage");
        } catch (Exception ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Could not upload audio to storage");
        }
    }

    public String createSignedAudioUrl(String objectPath, int expiresInSeconds) {
        String bucket = appProperties.getSupabase().getAudioBucket();
        if (!StringUtils.hasText(bucket)) {
            throw new ResponseStatusException(BAD_REQUEST, "SUPABASE_AUDIO_BUCKET is not configured");
        }

        JsonNode response = callPostWithServiceRole(
            "/storage/v1/object/sign/" + bucket + "/" + objectPath,
            Map.of("expiresIn", Math.max(expiresInSeconds, 1)),
            null
        );

        String signedPath = firstNonBlank(asText(response.get("signedURL")), asText(response.get("signedUrl")));
        if (!StringUtils.hasText(signedPath)) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Could not sign audio URL");
        }

        if (signedPath.startsWith("http://") || signedPath.startsWith("https://")) {
            return signedPath;
        }
        String baseUrl = appProperties.getSupabase().getUrl();
        if (!StringUtils.hasText(baseUrl)) {
            throw new ResponseStatusException(BAD_REQUEST, "SUPABASE_URL is not configured");
        }
        if (signedPath.startsWith("/")) {
            return baseUrl + signedPath;
        }
        return baseUrl + "/" + signedPath;
    }

    public void assertOwnerCanManageMemory(String authorizationHeader, String memoryId) {
        SupabaseUser user = getCurrentUser(authorizationHeader);
        String memoryUri = UriComponentsBuilder
            .fromPath("/rest/v1/memories")
            .queryParam("select", "child_id")
            .queryParam("id", "eq." + memoryId)
            .queryParam("limit", 1)
            .build(true)
            .toUriString();

        JsonNode memoryRows = callGet(memoryUri, authorizationHeader);
        if (!memoryRows.isArray() || memoryRows.isEmpty()) {
            throw new ResponseStatusException(NOT_FOUND, "Memory not found");
        }

        String childId = asText(memoryRows.get(0).get("child_id"));
        if (!StringUtils.hasText(childId)) {
            throw new ResponseStatusException(FORBIDDEN, "Only owners can edit or delete memories.");
        }

        assertOwnerForChild(authorizationHeader, user.id(), childId, "Only owners can edit or delete memories.");
    }

    private void assertOwnerForChild(String authorizationHeader, String userId, String childId, String errorMessage) {
        String childUri = UriComponentsBuilder
            .fromPath("/rest/v1/children")
            .queryParam("select", "family_id")
            .queryParam("id", "eq." + childId)
            .queryParam("limit", 1)
            .build(true)
            .toUriString();

        JsonNode childRows = callGet(childUri, authorizationHeader);
        if (!childRows.isArray() || childRows.isEmpty()) {
            throw new ResponseStatusException(NOT_FOUND, "Child not found");
        }

        String familyId = asText(childRows.get(0).get("family_id"));
        if (!StringUtils.hasText(familyId)) {
            throw new ResponseStatusException(FORBIDDEN, errorMessage);
        }

        String membershipUri = UriComponentsBuilder
            .fromPath("/rest/v1/family_members")
            .queryParam("select", "role")
            .queryParam("family_id", "eq." + familyId)
            .queryParam("user_id", "eq." + userId)
            .queryParam("limit", 1)
            .build(true)
            .toUriString();

        JsonNode membershipRows = callGet(membershipUri, authorizationHeader);
        if (!membershipRows.isArray() || membershipRows.isEmpty()) {
            throw new ResponseStatusException(FORBIDDEN, errorMessage);
        }

        String role = asText(membershipRows.get(0).get("role"));
        if (!"OWNER".equalsIgnoreCase(role)) {
            throw new ResponseStatusException(FORBIDDEN, errorMessage);
        }
    }

    public void updateOwnProfile(String authorizationHeader, String displayName) {
        SupabaseUser user = getCurrentUser(authorizationHeader);
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/profiles")
            .queryParam("user_id", "eq." + user.id())
            .build(true)
            .toUriString();

        callPatch(
            uri,
            Map.of("display_name", displayName),
            authorizationHeader,
            "return=minimal"
        );
    }

    public JsonNode createProcessingMemory(String authorizationHeader, String childId, Instant recordedAt) {
        SupabaseUser user = getCurrentUser(authorizationHeader);
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/memories")
            .queryParam("select", memorySelect())
            .build(true)
            .toUriString();

        return firstRow(
            callPost(
                uri,
                Map.of(
                    "child_id", childId,
                    "created_by", user.id(),
                    "recorded_at", recordedAt.toString(),
                    "status", "PROCESSING"
                ),
                authorizationHeader,
                "return=representation"
            ),
            NOT_FOUND,
            "Could not create memory"
        );
    }

    public JsonNode insertReadyMemory(
        String authorizationHeader,
        String childId,
        Instant recordedAt,
        String transcript,
        String title,
        String summary,
        List<String> tags,
        String audioPath,
        String audioMimeType,
        Long audioSizeBytes,
        Integer audioDurationSeconds
    ) {
        SupabaseUser user = getCurrentUser(authorizationHeader);
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/memories")
            .queryParam("select", memorySelect())
            .build(true)
            .toUriString();

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("child_id", childId);
        payload.put("created_by", user.id());
        payload.put("recorded_at", recordedAt.toString());
        payload.put("status", "READY");
        payload.put("transcript", transcript);
        payload.put("title", title);
        payload.put("summary", summary);
        payload.put("tags", tags);
        if (StringUtils.hasText(audioPath)) {
            payload.put("audio_path", audioPath);
            payload.put("audio_mime_type", audioMimeType);
            payload.put("audio_size_bytes", audioSizeBytes);
            payload.put("audio_duration_seconds", audioDurationSeconds);
        }

        return firstRow(
            callPost(
                uri,
                payload,
                authorizationHeader,
                "return=representation"
            ),
            NOT_FOUND,
            "Could not create split memory"
        );
    }

    public JsonNode updateMemoryById(String authorizationHeader, String memoryId, Map<String, ?> updates) {
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/memories")
            .queryParam("select", memorySelect())
            .queryParam("id", "eq." + memoryId)
            .build(true)
            .toUriString();

        return firstRow(
            callPatchForJson(uri, updates, authorizationHeader, "return=representation"),
            NOT_FOUND,
            "Memory not found"
        );
    }

    public JsonNode getMemoryById(String authorizationHeader, String memoryId) {
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/memories")
            .queryParam("select", memorySelect())
            .queryParam("id", "eq." + memoryId)
            .queryParam("limit", 1)
            .build(true)
            .toUriString();

        return firstRow(
            callGet(uri, authorizationHeader),
            NOT_FOUND,
            "Memory not found"
        );
    }

    public JsonNode listMemories(
        String authorizationHeader,
        int offset,
        int limit,
        String familyId,
        String fromRecordedAtIso,
        String toRecordedAtIso,
        List<String> tags
    ) {
        UriComponentsBuilder builder = UriComponentsBuilder
            .fromPath("/rest/v1/memories")
            .queryParam("select", memorySelect())
            .queryParam("order", "recorded_at.desc,created_at.desc")
            .queryParam("offset", offset)
            .queryParam("limit", limit);

        applyMemoryFilters(builder, authorizationHeader, familyId, fromRecordedAtIso, toRecordedAtIso, tags);
        return callGet(builder.build().encode().toUri(), authorizationHeader);
    }

    public long countMemories(
        String authorizationHeader,
        String familyId,
        String fromRecordedAtIso,
        String toRecordedAtIso,
        List<String> tags
    ) {
        UriComponentsBuilder builder = UriComponentsBuilder
            .fromPath("/rest/v1/memories")
            .queryParam("select", "id");

        applyMemoryFilters(builder, authorizationHeader, familyId, fromRecordedAtIso, toRecordedAtIso, tags);
        JsonNode rows = callGet(builder.build().encode().toUri(), authorizationHeader);
        if (!rows.isArray()) {
            return 0L;
        }
        return rows.size();
    }

    public void deleteMemoryById(String authorizationHeader, String memoryId) {
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/memories")
            .queryParam("id", "eq." + memoryId)
            .queryParam("select", "id")
            .build(true)
            .toUriString();

        JsonNode deleted = callDelete(uri, authorizationHeader, "return=representation");
        if (!deleted.isArray() || deleted.isEmpty()) {
            throw new ResponseStatusException(NOT_FOUND, "Memory not found");
        }
    }

    private Map<String, String> fetchDisplayNames(String authorizationHeader, List<String> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }

        String inFilter = "in.(" + String.join(",", userIds) + ")";
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/profiles")
            .queryParam("select", "user_id,display_name")
            .queryParam("user_id", inFilter)
            .build(true)
            .toUriString();

        JsonNode rows = callGet(uri, authorizationHeader);
        if (!rows.isArray()) {
            return Map.of();
        }

        Map<String, String> result = new HashMap<>();
        for (JsonNode row : rows) {
            String userId = asText(row.get("user_id"));
            String displayName = firstNonBlank(asText(row.get("display_name")), "Member");
            if (!userId.isBlank()) {
                result.put(userId, displayName);
            }
        }
        return result;
    }

    private JsonNode callRpc(String rpcName, Map<String, ?> payload, String authorizationHeader) {
        String uri = "/rest/v1/rpc/" + rpcName;
        return callPost(uri, payload, authorizationHeader, null);
    }

    private JsonNode callGet(String uri, String authorizationHeader) {
        try {
            String body = restClient().get()
                .uri(uri)
                .headers(headers -> applySupabaseHeaders(headers, authorizationHeader, null))
                .retrieve()
                .body(String.class);

            if (!StringUtils.hasText(body)) {
                return objectMapper.nullNode();
            }
            return objectMapper.readTree(body);
        } catch (RestClientResponseException ex) {
            throw mapException(ex, "Supabase request failed");
        } catch (Exception ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Supabase request failed");
        }
    }

    private JsonNode callGet(URI uri, String authorizationHeader) {
        try {
            String body = restClient().get()
                .uri(uri)
                .headers(headers -> applySupabaseHeaders(headers, authorizationHeader, null))
                .retrieve()
                .body(String.class);

            if (!StringUtils.hasText(body)) {
                return objectMapper.nullNode();
            }
            return objectMapper.readTree(body);
        } catch (RestClientResponseException ex) {
            throw mapException(ex, "Supabase request failed");
        } catch (Exception ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Supabase request failed");
        }
    }

    private JsonNode callPost(String uri, Object payload, String authorizationHeader, String preferHeader) {
        try {
            String body = restClient().post()
                .uri(uri)
                .headers(headers -> applySupabaseHeaders(headers, authorizationHeader, preferHeader))
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(String.class);

            if (!StringUtils.hasText(body)) {
                return objectMapper.nullNode();
            }
            return objectMapper.readTree(body);
        } catch (RestClientResponseException ex) {
            throw mapException(ex, "Supabase request failed");
        } catch (Exception ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Supabase request failed");
        }
    }

    private JsonNode callPostWithServiceRole(String uri, Object payload, String preferHeader) {
        try {
            String body = restClient().post()
                .uri(uri)
                .headers(headers -> applyServiceRoleHeaders(headers, preferHeader))
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(String.class);

            if (!StringUtils.hasText(body)) {
                return objectMapper.nullNode();
            }
            return objectMapper.readTree(body);
        } catch (RestClientResponseException ex) {
            throw mapException(ex, "Supabase request failed");
        } catch (Exception ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Supabase request failed");
        }
    }

    private JsonNode callPatchForJson(String uri, Object payload, String authorizationHeader, String preferHeader) {
        try {
            String body = restClient().patch()
                .uri(uri)
                .headers(headers -> applySupabaseHeaders(headers, authorizationHeader, preferHeader))
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(String.class);

            if (!StringUtils.hasText(body)) {
                return objectMapper.nullNode();
            }
            return objectMapper.readTree(body);
        } catch (RestClientResponseException ex) {
            throw mapException(ex, "Supabase request failed");
        } catch (Exception ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Supabase request failed");
        }
    }

    private void callPatch(String uri, Object payload, String authorizationHeader, String preferHeader) {
        try {
            restClient().patch()
                .uri(uri)
                .headers(headers -> applySupabaseHeaders(headers, authorizationHeader, preferHeader))
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .toBodilessEntity();
        } catch (RestClientResponseException ex) {
            throw mapException(ex, "Supabase request failed");
        } catch (Exception ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Supabase request failed");
        }
    }

    private JsonNode callDelete(String uri, String authorizationHeader, String preferHeader) {
        try {
            String body = restClient().delete()
                .uri(uri)
                .headers(headers -> applySupabaseHeaders(headers, authorizationHeader, preferHeader))
                .retrieve()
                .body(String.class);

            if (!StringUtils.hasText(body)) {
                return objectMapper.nullNode();
            }
            return objectMapper.readTree(body);
        } catch (RestClientResponseException ex) {
            throw mapException(ex, "Supabase request failed");
        } catch (Exception ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Supabase request failed");
        }
    }

    private void applySupabaseHeaders(HttpHeaders headers, String authorizationHeader, String preferHeader) {
        AppProperties.Supabase supabase = appProperties.getSupabase();
        if (!StringUtils.hasText(supabase.getAnonKey())) {
            throw new ResponseStatusException(BAD_REQUEST, "SUPABASE_ANON_KEY is not configured");
        }
        if (!StringUtils.hasText(authorizationHeader) || !authorizationHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(UNAUTHORIZED, "Missing or invalid Authorization header");
        }

        headers.set("apikey", supabase.getAnonKey());
        headers.set(HttpHeaders.AUTHORIZATION, authorizationHeader);
        if (StringUtils.hasText(preferHeader)) {
            headers.set("Prefer", preferHeader);
        }
    }

    private void applyServiceRoleHeaders(HttpHeaders headers, String preferHeader) {
        AppProperties.Supabase supabase = appProperties.getSupabase();
        if (!StringUtils.hasText(supabase.getServiceRoleKey())) {
            throw new ResponseStatusException(BAD_REQUEST, "SUPABASE_SERVICE_ROLE_KEY is not configured");
        }

        headers.set("apikey", supabase.getServiceRoleKey());
        headers.setBearerAuth(supabase.getServiceRoleKey());
        if (StringUtils.hasText(preferHeader)) {
            headers.set("Prefer", preferHeader);
        }
    }

    private SupabaseUser getCurrentUser(String authorizationHeader) {
        try {
            String body = restClient().get()
                .uri("/auth/v1/user")
                .headers(headers -> applySupabaseHeaders(headers, authorizationHeader, null))
                .retrieve()
                .body(String.class);

            JsonNode user = objectMapper.readTree(body);
            return new SupabaseUser(
                asText(user.get("id")),
                asText(user.get("email"))
            );
        } catch (RestClientResponseException ex) {
            throw mapException(ex, "Could not resolve authenticated user");
        } catch (Exception ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, "Could not resolve authenticated user");
        }
    }

    private ResponseStatusException mapException(RestClientResponseException exception, String fallbackMessage) {
        String message = fallbackMessage;
        String responseBody = exception.getResponseBodyAsString();
        if (StringUtils.hasText(responseBody)) {
            try {
                JsonNode json = objectMapper.readTree(responseBody);
                if (json.hasNonNull("message")) {
                    message = json.get("message").asText(message);
                } else if (json.hasNonNull("error_description")) {
                    message = json.get("error_description").asText(message);
                } else if (json.hasNonNull("error")) {
                    message = json.get("error").asText(message);
                }
            } catch (Exception ignored) {
                message = responseBody;
            }
        }
        return new ResponseStatusException(exception.getStatusCode(), message);
    }

    private RestClient restClient() {
        String baseUrl = appProperties.getSupabase().getUrl();
        if (!StringUtils.hasText(baseUrl)) {
            throw new ResponseStatusException(BAD_REQUEST, "SUPABASE_URL is not configured");
        }
        return RestClient.builder().baseUrl(baseUrl).build();
    }

    private String asText(JsonNode node) {
        if (node == null || node.isNull()) {
            return "";
        }
        return node.asText("");
    }

    private String firstNonBlank(String value, String fallback) {
        if (StringUtils.hasText(value)) {
            return value;
        }
        return fallback;
    }

    private void applyMemoryFilters(
        UriComponentsBuilder builder,
        String authorizationHeader,
        String familyId,
        String fromRecordedAtIso,
        String toRecordedAtIso,
        List<String> tags
    ) {
        if (StringUtils.hasText(familyId)) {
            List<String> childIds = listChildIdsForFamily(authorizationHeader, familyId);
            if (childIds.isEmpty()) {
                builder.queryParam("id", "eq.00000000-0000-0000-0000-000000000000");
                return;
            }
            builder.queryParam("child_id", "in.(" + String.join(",", childIds) + ")");
        }
        if (StringUtils.hasText(fromRecordedAtIso)) {
            builder.queryParam("recorded_at", "gte." + fromRecordedAtIso);
        }
        if (StringUtils.hasText(toRecordedAtIso)) {
            builder.queryParam("recorded_at", "lt." + toRecordedAtIso);
        }
        if (tags != null && !tags.isEmpty()) {
            String tagFilter = buildTagOverlapFilter(tags);
            if (StringUtils.hasText(tagFilter)) {
                builder.queryParam("tags", tagFilter);
            }
        }
    }

    private List<String> listChildIdsForFamily(String authorizationHeader, String familyId) {
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/children")
            .queryParam("select", "id")
            .queryParam("family_id", "eq." + familyId)
            .build(true)
            .toUriString();

        JsonNode rows = callGet(uri, authorizationHeader);
        if (!rows.isArray()) {
            return List.of();
        }

        List<String> childIds = new ArrayList<>();
        for (JsonNode row : rows) {
            String childId = asText(row.get("id"));
            if (!childId.isBlank()) {
                childIds.add(childId);
            }
        }
        return childIds;
    }

    String buildTagOverlapFilter(List<String> values) {
        String tagArrayLiteral = toPostgresTextArrayLiteral(values);
        if (!StringUtils.hasText(tagArrayLiteral)) {
            return null;
        }
        return "ov." + tagArrayLiteral;
    }

    String toPostgresTextArrayLiteral(List<String> values) {
        List<String> quotedValues = new ArrayList<>();
        for (String value : values) {
            if (!StringUtils.hasText(value)) {
                continue;
            }
            String escaped = value.trim()
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
            quotedValues.add("\"" + escaped + "\"");
        }
        if (quotedValues.isEmpty()) {
            return null;
        }
        return "{" + String.join(",", quotedValues) + "}";
    }

    private JsonNode firstRow(JsonNode rows, org.springframework.http.HttpStatus status, String message) {
        if (!rows.isArray() || rows.isEmpty()) {
            throw new ResponseStatusException(status, message);
        }
        return rows.get(0);
    }

    private MediaType safeMediaType(String value) {
        if (!StringUtils.hasText(value)) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
        try {
            MediaType parsed = MediaType.parseMediaType(value);
            // Supabase storage MIME allow-list checks only the base type/subtype.
            // Strip optional parameters (for example codecs=opus) before upload.
            return new MediaType(parsed.getType(), parsed.getSubtype());
        } catch (InvalidMediaTypeException ignored) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    private String memorySelect() {
        return "id,created_at,recorded_at,status,title,summary,transcript,error_message,tags,audio_path,audio_mime_type,audio_size_bytes,audio_duration_seconds";
    }

    private record SupabaseUser(String id, String email) {
    }
}
