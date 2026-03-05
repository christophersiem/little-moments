package de.csiem.backend.service;

import de.csiem.backend.config.AppProperties;
import org.junit.jupiter.api.Test;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SupabaseGatewayServiceTagFilterTests {

    private final SupabaseGatewayService service = new SupabaseGatewayService(new AppProperties());

    @Test
    void buildTagOverlapFilterSupportsTagsWithSpaces() {
        String filter = service.buildTagOverlapFilter(List.of("Motor Skills"));
        assertEquals("ov.{\"Motor Skills\"}", filter);
    }

    @Test
    void toPostgresTextArrayLiteralEscapesQuotesAndBackslashes() {
        String literal = service.toPostgresTextArrayLiteral(List.of("Kid \"wow\" \\ test"));
        assertEquals("{\"Kid \\\"wow\\\" \\\\ test\"}", literal);
    }

    @Test
    void buildTagOverlapFilterReturnsNullForEmptyInput() {
        assertNull(service.buildTagOverlapFilter(List.of()));
        assertNull(service.buildTagOverlapFilter(List.of("   ")));
    }

    @Test
    void encodedQueryContainsSinglePercentEncodingForArrayLiteral() {
        String filter = service.buildTagOverlapFilter(List.of("Motor Skills"));
        String uri = UriComponentsBuilder
            .fromPath("/rest/v1/memories")
            .queryParam("tags", filter)
            .build()
            .encode()
            .toUriString();

        assertTrue(uri.contains("tags=ov.%7B%22Motor%20Skills%22%7D"));
        assertTrue(!uri.contains("%257B"));
    }
}
