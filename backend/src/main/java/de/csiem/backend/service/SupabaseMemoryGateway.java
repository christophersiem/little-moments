package de.csiem.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

class SupabaseMemoryGateway {

    private final SupabaseHttpClient supabaseHttpClient;

    SupabaseMemoryGateway(SupabaseHttpClient supabaseHttpClient) {
        this.supabaseHttpClient = supabaseHttpClient;
    }

    void assertOwnerCanCreateMemory(String authorizationHeader, String childId) {
        SupabaseHttpClient.SupabaseUser user = supabaseHttpClient.getCurrentUser(authorizationHeader);
        assertOwnerForChild(authorizationHeader, user.id(), childId, "Only owners can record memories.");
    }

    void assertOwnerCanManageMemory(String authorizationHeader, String memoryId) {
        SupabaseHttpClient.SupabaseUser user = supabaseHttpClient.getCurrentUser(authorizationHeader);
        String memoryUri = UriComponentsBuilder
            .fromPath("/rest/v1/memories")
            .queryParam("select", SupabaseFields.CHILD_ID)
            .queryParam(SupabaseFields.ID, "eq." + memoryId)
            .queryParam("limit", 1)
            .build(true)
            .toUriString();

        JsonNode memoryRows = supabaseHttpClient.get(
            memoryUri,
            authorizationHeader,
            SupabaseHttpClient.REQUEST_FAILED_MESSAGE
        );
        if (!memoryRows.isArray() || memoryRows.isEmpty()) {
            throw new ResponseStatusException(NOT_FOUND, "Memory not found");
        }

        String childId = SupabaseJson.asText(memoryRows.get(0).get(SupabaseFields.CHILD_ID));
        if (!StringUtils.hasText(childId)) {
            throw new ResponseStatusException(FORBIDDEN, "Only owners can edit or delete memories.");
        }

        assertOwnerForChild(authorizationHeader, user.id(), childId, "Only owners can edit or delete memories.");
    }

    JsonNode createProcessingMemory(String authorizationHeader, String childId, Instant recordedAt) {
        SupabaseHttpClient.SupabaseUser user = supabaseHttpClient.getCurrentUser(authorizationHeader);
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/memories")
            .queryParam("select", memorySelect())
            .build(true)
            .toUriString();

        return SupabaseJson.firstRow(
            supabaseHttpClient.post(
                uri,
                Map.of(
                    SupabaseFields.CHILD_ID, childId,
                    SupabaseFields.CREATED_BY, user.id(),
                    SupabaseFields.USER_ID, user.id(),
                    SupabaseFields.RECORDED_AT, recordedAt.toString(),
                    SupabaseFields.STATUS, SupabaseStatuses.PROCESSING
                ),
                authorizationHeader,
                "return=representation",
                SupabaseHttpClient.REQUEST_FAILED_MESSAGE
            ),
            NOT_FOUND,
            "Could not create memory"
        );
    }

    JsonNode insertReadyMemory(
        String authorizationHeader,
        String childId,
        Instant recordedAt,
        String transcript,
        String title,
        String summary,
        List<String> tags
    ) {
        SupabaseHttpClient.SupabaseUser user = supabaseHttpClient.getCurrentUser(authorizationHeader);
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/memories")
            .queryParam("select", memorySelect())
            .build(true)
            .toUriString();

        return SupabaseJson.firstRow(
            supabaseHttpClient.post(
                uri,
                Map.of(
                    SupabaseFields.CHILD_ID, childId,
                    SupabaseFields.CREATED_BY, user.id(),
                    SupabaseFields.USER_ID, user.id(),
                    SupabaseFields.RECORDED_AT, recordedAt.toString(),
                    SupabaseFields.STATUS, SupabaseStatuses.READY,
                    SupabaseFields.TRANSCRIPT, transcript,
                    SupabaseFields.TITLE, title,
                    SupabaseFields.SUMMARY, summary,
                    SupabaseFields.TAGS, tags
                ),
                authorizationHeader,
                "return=representation",
                SupabaseHttpClient.REQUEST_FAILED_MESSAGE
            ),
            NOT_FOUND,
            "Could not create split memory"
        );
    }

    JsonNode updateMemoryById(String authorizationHeader, String memoryId, Map<String, ?> updates) {
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/memories")
            .queryParam("select", memorySelect())
            .queryParam(SupabaseFields.ID, "eq." + memoryId)
            .build(true)
            .toUriString();

        return SupabaseJson.firstRow(
            supabaseHttpClient.patchForJson(
                uri,
                updates,
                authorizationHeader,
                "return=representation",
                SupabaseHttpClient.REQUEST_FAILED_MESSAGE
            ),
            NOT_FOUND,
            "Memory not found"
        );
    }

    JsonNode getMemoryById(String authorizationHeader, String memoryId) {
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/memories")
            .queryParam("select", memorySelect())
            .queryParam(SupabaseFields.ID, "eq." + memoryId)
            .queryParam("limit", 1)
            .build(true)
            .toUriString();

        return SupabaseJson.firstRow(
            supabaseHttpClient.get(uri, authorizationHeader, SupabaseHttpClient.REQUEST_FAILED_MESSAGE),
            NOT_FOUND,
            "Memory not found"
        );
    }

    JsonNode listMemories(
        String authorizationHeader,
        int offset,
        int limit,
        String familyId,
        String fromRecordedAtIso,
        String toRecordedAtIso,
        List<String> tags,
        boolean highlightsOnly
    ) {
        UriComponentsBuilder builder = UriComponentsBuilder
            .fromPath("/rest/v1/memories")
            .queryParam("select", memorySelect())
            .queryParam("order", "recorded_at.desc,created_at.desc")
            .queryParam("offset", offset)
            .queryParam("limit", limit);

        applyMemoryFilters(
            builder,
            authorizationHeader,
            familyId,
            fromRecordedAtIso,
            toRecordedAtIso,
            tags,
            highlightsOnly
        );

        URI uri = builder.build().encode().toUri();
        return supabaseHttpClient.get(uri, authorizationHeader, SupabaseHttpClient.REQUEST_FAILED_MESSAGE);
    }

    long countMemories(
        String authorizationHeader,
        String familyId,
        String fromRecordedAtIso,
        String toRecordedAtIso,
        List<String> tags,
        boolean highlightsOnly
    ) {
        UriComponentsBuilder builder = UriComponentsBuilder
            .fromPath("/rest/v1/memories")
            .queryParam("select", SupabaseFields.ID);

        applyMemoryFilters(
            builder,
            authorizationHeader,
            familyId,
            fromRecordedAtIso,
            toRecordedAtIso,
            tags,
            highlightsOnly
        );

        URI uri = builder.build().encode().toUri();
        JsonNode rows = supabaseHttpClient.get(uri, authorizationHeader, SupabaseHttpClient.REQUEST_FAILED_MESSAGE);
        if (!rows.isArray()) {
            return 0L;
        }
        return rows.size();
    }

    void deleteMemoryById(String authorizationHeader, String memoryId) {
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/memories")
            .queryParam(SupabaseFields.ID, "eq." + memoryId)
            .queryParam("select", SupabaseFields.ID)
            .build(true)
            .toUriString();

        JsonNode deleted = supabaseHttpClient.delete(
            uri,
            authorizationHeader,
            "return=representation",
            SupabaseHttpClient.REQUEST_FAILED_MESSAGE
        );
        if (!deleted.isArray() || deleted.isEmpty()) {
            throw new ResponseStatusException(NOT_FOUND, "Memory not found");
        }
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

    private void assertOwnerForChild(String authorizationHeader, String userId, String childId, String errorMessage) {
        String childUri = UriComponentsBuilder
            .fromPath("/rest/v1/children")
            .queryParam("select", SupabaseFields.FAMILY_ID)
            .queryParam(SupabaseFields.ID, "eq." + childId)
            .queryParam("limit", 1)
            .build(true)
            .toUriString();

        JsonNode childRows = supabaseHttpClient.get(
            childUri,
            authorizationHeader,
            SupabaseHttpClient.REQUEST_FAILED_MESSAGE
        );
        if (!childRows.isArray() || childRows.isEmpty()) {
            throw new ResponseStatusException(NOT_FOUND, "Child not found");
        }

        String familyId = SupabaseJson.asText(childRows.get(0).get(SupabaseFields.FAMILY_ID));
        if (!StringUtils.hasText(familyId)) {
            throw new ResponseStatusException(FORBIDDEN, errorMessage);
        }

        String membershipUri = UriComponentsBuilder
            .fromPath("/rest/v1/family_members")
            .queryParam("select", SupabaseFields.ROLE)
            .queryParam(SupabaseFields.FAMILY_ID, "eq." + familyId)
            .queryParam(SupabaseFields.USER_ID, "eq." + userId)
            .queryParam("limit", 1)
            .build(true)
            .toUriString();

        JsonNode membershipRows = supabaseHttpClient.get(
            membershipUri,
            authorizationHeader,
            SupabaseHttpClient.REQUEST_FAILED_MESSAGE
        );
        if (!membershipRows.isArray() || membershipRows.isEmpty()) {
            throw new ResponseStatusException(FORBIDDEN, errorMessage);
        }

        String role = SupabaseJson.asText(membershipRows.get(0).get(SupabaseFields.ROLE));
        if (!FamilyRoles.isOwner(role)) {
            throw new ResponseStatusException(FORBIDDEN, errorMessage);
        }
    }

    private void applyMemoryFilters(
        UriComponentsBuilder builder,
        String authorizationHeader,
        String familyId,
        String fromRecordedAtIso,
        String toRecordedAtIso,
        List<String> tags,
        boolean highlightsOnly
    ) {
        if (StringUtils.hasText(familyId)) {
            List<String> childIds = listChildIdsForFamily(authorizationHeader, familyId);
            if (childIds.isEmpty()) {
                builder.queryParam(SupabaseFields.ID, "eq.00000000-0000-0000-0000-000000000000");
                return;
            }
            builder.queryParam(SupabaseFields.CHILD_ID, "in.(" + String.join(",", childIds) + ")");
        }
        if (StringUtils.hasText(fromRecordedAtIso)) {
            builder.queryParam(SupabaseFields.RECORDED_AT, "gte." + fromRecordedAtIso);
        }
        if (StringUtils.hasText(toRecordedAtIso)) {
            builder.queryParam(SupabaseFields.RECORDED_AT, "lt." + toRecordedAtIso);
        }
        if (tags != null && !tags.isEmpty()) {
            String tagFilter = buildTagOverlapFilter(tags);
            if (StringUtils.hasText(tagFilter)) {
                builder.queryParam(SupabaseFields.TAGS, tagFilter);
            }
        }
        if (highlightsOnly) {
            builder.queryParam(SupabaseFields.IS_HIGHLIGHT, "eq.true");
        }
    }

    private List<String> listChildIdsForFamily(String authorizationHeader, String familyId) {
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/children")
            .queryParam("select", SupabaseFields.ID)
            .queryParam(SupabaseFields.FAMILY_ID, "eq." + familyId)
            .build(true)
            .toUriString();

        JsonNode rows = supabaseHttpClient.get(uri, authorizationHeader, SupabaseHttpClient.REQUEST_FAILED_MESSAGE);
        if (!rows.isArray()) {
            return List.of();
        }

        List<String> childIds = new ArrayList<>();
        for (JsonNode row : rows) {
            String childId = SupabaseJson.asText(row.get(SupabaseFields.ID));
            if (!childId.isBlank()) {
                childIds.add(childId);
            }
        }
        return childIds;
    }

    private String memorySelect() {
        return String.join(
            ",",
            SupabaseFields.ID,
            SupabaseFields.CREATED_AT,
            SupabaseFields.RECORDED_AT,
            SupabaseFields.STATUS,
            SupabaseFields.IS_HIGHLIGHT,
            SupabaseFields.TITLE,
            SupabaseFields.SUMMARY,
            SupabaseFields.TRANSCRIPT,
            SupabaseFields.ERROR_MESSAGE,
            SupabaseFields.TAGS
        );
    }
}
