package de.csiem.backend.service;

import de.csiem.backend.config.AppProperties;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SupabaseGatewayServiceProfileTests {

    @Test
    void profileEnsurePreferHeaderUsesIgnoreDuplicates() {
        SupabaseGatewayService service = new SupabaseGatewayService(new AppProperties());
        assertEquals(
            "resolution=ignore-duplicates,return=minimal",
            service.profileEnsurePreferHeader()
        );
    }
}
