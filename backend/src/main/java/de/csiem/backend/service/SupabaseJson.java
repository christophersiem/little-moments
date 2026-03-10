package de.csiem.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.HttpStatus;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

final class SupabaseJson {

    private SupabaseJson() {
    }

    static String asText(JsonNode node) {
        if (node == null || node.isNull()) {
            return "";
        }
        return node.asText("");
    }

    static String firstNonBlank(String value, String fallback) {
        if (StringUtils.hasText(value)) {
            return value;
        }
        return fallback;
    }

    static JsonNode firstRow(JsonNode rows, HttpStatus status, String message) {
        if (!rows.isArray() || rows.isEmpty()) {
            throw new ResponseStatusException(status, message);
        }
        return rows.get(0);
    }
}
