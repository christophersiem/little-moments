package de.csiem.backend.service;

import de.csiem.backend.config.AppProperties;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
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

    @Test
    void marksGenericTitlesSoCallerCanRetryWithSpecificPrompt() {
        AppProperties properties = new AppProperties();
        MemoryInsightsService service = new MemoryInsightsService(properties);

        String modelJson = """
            {"title":"Sweet memory today","summary":"She asked for apples in a full sentence, and it felt like a clear language step."}
            """;

        MemoryInsightsService.ProcessedInsights processed = service.postProcessModelOutputForTest(
            modelJson,
            "At breakfast she asked for more apples in a full sentence and smiled."
        );

        assertTrue(processed.valid());
        assertTrue(processed.genericTitle());
        assertNotNull(processed.insights());
    }

    @Test
    void enforcesSingleSentenceAndWordLimitForSummary() {
        AppProperties properties = new AppProperties();
        MemoryInsightsService service = new MemoryInsightsService(properties);

        String modelJson = """
            {"title":"First full sentence at breakfast","summary":"She independently asked for more apples in a full sentence and clapped with joy while everyone smiled around the table. Another sentence that should be removed."}
            """;

        MemoryInsightsService.ProcessedInsights processed = service.postProcessModelOutputForTest(
            modelJson,
            "At breakfast she asked for more apples in a full sentence and clapped for herself."
        );

        assertTrue(processed.valid());
        assertNotNull(processed.insights());
        String summary = processed.insights().summary();
        assertFalse(summary.contains("Another sentence"));
        assertFalse(summary.contains("\n"));
        assertFalse(summary.toLowerCase().contains("independently"));
        assertFalse(summary.toLowerCase().contains("atmosphere"));
        assertTrue(summary.endsWith("."));
        assertTrue(summary.split("\\s+").length <= 22);
    }

    @Test
    void trimsTitleToMaximumWordCount() {
        AppProperties properties = new AppProperties();
        MemoryInsightsService service = new MemoryInsightsService(properties);

        String modelJson = """
            {"title":"A very special and beautiful little morning memory about apples and clapping together today","summary":"She asked clearly for apples and clapped for herself, which showed new confidence at breakfast."}
            """;

        MemoryInsightsService.ProcessedInsights processed = service.postProcessModelOutputForTest(
            modelJson,
            "At breakfast she asked for apples and clapped."
        );

        assertTrue(processed.valid());
        assertNotNull(processed.insights());
        assertTrue(processed.insights().title().split("\\s+").length <= 10);
        assertFalse(processed.insights().title().toLowerCase().contains("memory"));
        assertFalse(processed.insights().title().toLowerCase().contains("today"));
    }
}
