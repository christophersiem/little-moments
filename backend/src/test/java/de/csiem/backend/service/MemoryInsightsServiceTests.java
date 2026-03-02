package de.csiem.backend.service;

import de.csiem.backend.config.AppProperties;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MemoryInsightsServiceTests {

    @Test
    void generatesGermanFallbackMetadataForGermanTranscript() {
        AppProperties properties = new AppProperties();
        properties.getInsights().setEnabled(false);

        MemoryInsightsService service = new MemoryInsightsService(properties);
        MemoryInsightsService.MemoryInsights insights = service.generate(
            "Heute waren wir im Zoo und unser Kind hat zum ersten Mal den Löwen erkannt."
        );

        assertFalse(insights.title().isBlank());
        assertTrue(insights.summary().startsWith("Ein besonderer Moment"));
        assertFalse(insights.summary().startsWith("A meaningful moment"));
    }

    @Test
    void generatesEnglishFallbackMetadataForEnglishTranscript() {
        AppProperties properties = new AppProperties();
        properties.getInsights().setEnabled(false);

        MemoryInsightsService service = new MemoryInsightsService(properties);
        MemoryInsightsService.MemoryInsights insights = service.generate(
            "Today we went to the park and she climbed the slide all by herself."
        );

        assertFalse(insights.title().isBlank());
        assertTrue(insights.summary().startsWith("A meaningful moment"));
    }
}
