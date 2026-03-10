package de.csiem.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.csiem.backend.config.AppProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

final class SupabaseHttpClient {

    static final String REQUEST_FAILED_MESSAGE = "Supabase request failed";

    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;

    SupabaseHttpClient(AppProperties appProperties, ObjectMapper objectMapper) {
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
    }

    JsonNode get(String uri, String authorizationHeader, String fallbackMessage) {
        try {
            String body = restClient().get()
                .uri(uri)
                .headers(headers -> applySupabaseHeaders(headers, authorizationHeader, null))
                .retrieve()
                .body(String.class);

            return readJsonBodyOrNull(body);
        } catch (RestClientResponseException ex) {
            throw mapException(ex, fallbackMessage);
        } catch (Exception ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, fallbackMessage);
        }
    }

    JsonNode get(URI uri, String authorizationHeader, String fallbackMessage) {
        try {
            String body = restClient().get()
                .uri(uri)
                .headers(headers -> applySupabaseHeaders(headers, authorizationHeader, null))
                .retrieve()
                .body(String.class);

            return readJsonBodyOrNull(body);
        } catch (RestClientResponseException ex) {
            throw mapException(ex, fallbackMessage);
        } catch (Exception ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, fallbackMessage);
        }
    }

    JsonNode post(String uri, Object payload, String authorizationHeader, String preferHeader, String fallbackMessage) {
        try {
            String body = restClient().post()
                .uri(uri)
                .headers(headers -> applySupabaseHeaders(headers, authorizationHeader, preferHeader))
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(String.class);

            return readJsonBodyOrNull(body);
        } catch (RestClientResponseException ex) {
            throw mapException(ex, fallbackMessage);
        } catch (Exception ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, fallbackMessage);
        }
    }

    JsonNode patchForJson(String uri, Object payload, String authorizationHeader, String preferHeader, String fallbackMessage) {
        try {
            String body = restClient().patch()
                .uri(uri)
                .headers(headers -> applySupabaseHeaders(headers, authorizationHeader, preferHeader))
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .body(String.class);

            return readJsonBodyOrNull(body);
        } catch (RestClientResponseException ex) {
            throw mapException(ex, fallbackMessage);
        } catch (Exception ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, fallbackMessage);
        }
    }

    JsonNode delete(String uri, String authorizationHeader, String preferHeader, String fallbackMessage) {
        try {
            String body = restClient().delete()
                .uri(uri)
                .headers(headers -> applySupabaseHeaders(headers, authorizationHeader, preferHeader))
                .retrieve()
                .body(String.class);

            return readJsonBodyOrNull(body);
        } catch (RestClientResponseException ex) {
            throw mapException(ex, fallbackMessage);
        } catch (Exception ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, fallbackMessage);
        }
    }

    SupabaseUser getCurrentUser(String authorizationHeader) {
        final String fallbackMessage = "Could not resolve authenticated user";
        try {
            String body = restClient().get()
                .uri("/auth/v1/user")
                .headers(headers -> applySupabaseHeaders(headers, authorizationHeader, null))
                .retrieve()
                .body(String.class);

            JsonNode user = objectMapper.readTree(body);
            return new SupabaseUser(
                SupabaseJson.asText(user.get(SupabaseFields.ID)),
                SupabaseJson.asText(user.get("email"))
            );
        } catch (RestClientResponseException ex) {
            throw mapException(ex, fallbackMessage);
        } catch (Exception ex) {
            throw new ResponseStatusException(INTERNAL_SERVER_ERROR, fallbackMessage);
        }
    }

    private JsonNode readJsonBodyOrNull(String body) throws Exception {
        if (!StringUtils.hasText(body)) {
            return objectMapper.nullNode();
        }
        return objectMapper.readTree(body);
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

    record SupabaseUser(String id, String email) {
    }
}
