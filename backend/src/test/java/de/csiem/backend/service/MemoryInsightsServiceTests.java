package de.csiem.backend.service;

import de.csiem.backend.config.AppProperties;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MemoryInsightsServiceTests {

    private static final String BREAKFAST_TRANSCRIPT =
        "Yesterday at breakfast, he surprised me by asking for more apples using full sentences.";
    private static final String GROUNDED_BREAKFAST_SUMMARY =
        "At breakfast, he was asking for more apples using full sentences.";

    private MemoryInsightsService fallbackOnlyService() {
        AppProperties properties = new AppProperties();
        properties.getInsights().setEnabled(false);
        return new MemoryInsightsService(properties);
    }

    private MemoryInsightsService parsingService() {
        return new MemoryInsightsService(new AppProperties());
    }

    @Test
    void generatesNeutralLiteralSummaryForTestRecording() {
        MemoryInsightsService.MemoryInsights insights = fallbackOnlyService().generate("Test eins, zwei, drei.");

        assertFalse(insights.title().isBlank());
        assertEquals("Kurze Testaufnahme: \"Test eins, zwei, drei\"", insights.summary());
        assertFalse(insights.summary().toLowerCase().contains("freud"));
        assertFalse(insights.summary().toLowerCase().contains("entwicklung"));
    }

    @Test
    void generatesLiteralSummaryForShortFactualMemory() {
        String transcript = "Today she stacked four blocks on her own.";
        MemoryInsightsService.MemoryInsights insights = fallbackOnlyService().generate(transcript);

        assertFalse(insights.title().isBlank());
        assertTrue(insights.summary().contains("stacked four blocks"));
    }

    @Test
    void keepsExplicitEmotionOnlyWhenItIsInTranscript() {
        String transcript = "He said he was happy after finishing the puzzle.";
        MemoryInsightsService.MemoryInsights insights = fallbackOnlyService().generate(transcript);

        assertTrue(insights.summary().toLowerCase().contains("happy"));
    }

    @Test
    void keepsVagueTranscriptVagueWithoutAddedMeaning() {
        String transcript = "We had a day outside and did things together.";
        MemoryInsightsService.MemoryInsights insights = fallbackOnlyService().generate(transcript);

        assertTrue(insights.summary().contains("did things together"));
        assertFalse(insights.summary().toLowerCase().contains("confidence"));
        assertFalse(insights.summary().toLowerCase().contains("development"));
    }

    @Test
    void handlesEmptyTranscriptSafely() {
        MemoryInsightsService.MemoryInsights insights = fallbackOnlyService().generate("   ");

        assertEquals("Untitled Memory", insights.title());
        assertEquals("No clear spoken memory in the transcript.", insights.summary());
    }

    @Test
    void generatesNeutralSummaryForNoisyTranscript() {
        MemoryInsightsService.MemoryInsights insights = fallbackOnlyService().generate("um uh hmm ah");

        assertFalse(insights.title().isBlank());
        assertEquals("Short recording: \"um uh hmm ah\"", insights.summary());
        assertFalse(insights.summary().toLowerCase().contains("emotion"));
    }

    @Test
    void preservesUncertaintyInSummary() {
        String transcript = "Maybe she said apple, I'm not sure.";
        MemoryInsightsService.MemoryInsights insights = fallbackOnlyService().generate(transcript);

        assertTrue(insights.summary().toLowerCase().contains("maybe"));
        assertTrue(insights.summary().toLowerCase().contains("not sure"));
    }

    @Test
    void acceptsReasonablyGroundedParaphrasedSummary() {
        MemoryInsightsService.ProcessedInsights processed = parsingService().postProcessModelOutputForTest(
            "{\"title\":\"Asked for more apples\",\"summary\":\"At breakfast, he requested extra apples in a full sentence.\"}",
            BREAKFAST_TRANSCRIPT
        );

        assertTrue(processed.valid());
        assertEquals("At breakfast, he requested extra apples in a full sentence.", processed.insights().summary());
    }

    @Test
    void flagsTitleThatMissesMilestoneFocus() {
        MemoryInsightsService.ProcessedInsights processed = parsingService().postProcessModelOutputForTest(
            "{\"title\":\"Asked for more apples\",\"summary\":\"At breakfast, he was asking for more apples using full sentences.\"}",
            BREAKFAST_TRANSCRIPT
        );

        assertTrue(processed.valid());
        assertTrue(processed.missingMilestoneFocus());
    }

    @Test
    void acceptsMilestoneFocusedTitle() {
        MemoryInsightsService.ProcessedInsights processed = parsingService().postProcessModelOutputForTest(
            "{\"title\":\"First full sentence at breakfast\",\"summary\":\"At breakfast, he was asking for more apples using full sentences.\"}",
            BREAKFAST_TRANSCRIPT
        );

        assertTrue(processed.valid());
        assertFalse(processed.missingMilestoneFocus());
    }

    @Test
    void acceptsMilestoneFocusedTitleWithPluralOrErstmalsWording() {
        MemoryInsightsService.ProcessedInsights english = parsingService().postProcessModelOutputForTest(
            "{\"title\":\"First full sentences at breakfast\",\"summary\":\"At breakfast, he was asking for more apples using full sentences.\"}",
            BREAKFAST_TRANSCRIPT
        );
        MemoryInsightsService.ProcessedInsights german = parsingService().postProcessModelOutputForTest(
            "{\"title\":\"Erstmals ganze Sätze\",\"summary\":\"Beim Frühstück bat er erstmals in ganzen Sätzen um mehr Äpfel.\"}",
            "Beim Frühstück bat er erstmals in ganzen Sätzen um mehr Äpfel."
        );

        assertTrue(english.valid());
        assertFalse(english.missingMilestoneFocus());
        assertTrue(german.valid());
        assertFalse(german.missingMilestoneFocus());
    }

    @Test
    void stripsTranscriptSaysLeadInFromModelSummary() {
        MemoryInsightsService.ProcessedInsights processed = parsingService().postProcessModelOutputForTest(
            "{\"title\":\"Asked for more apples\",\"summary\":\"Transcript says: At breakfast, he was asking for more apples using full sentences.\"}",
            BREAKFAST_TRANSCRIPT
        );

        assertTrue(processed.valid());
        assertEquals("At breakfast, he was asking for more apples using full sentences.", processed.insights().summary());
    }

    @Test
    void stripsListPrefixBeforeTranscriptMetaLeadIn() {
        MemoryInsightsService.ProcessedInsights processed = parsingService().postProcessModelOutputForTest(
            "{\"title\":\"Asked for more apples\",\"summary\":\"- Transcript says: At breakfast, he was asking for more apples using full sentences.\"}",
            BREAKFAST_TRANSCRIPT
        );

        assertTrue(processed.valid());
        assertEquals("At breakfast, he was asking for more apples using full sentences.", processed.insights().summary());
    }

    @Test
    void rejectsUngroundedModelSummary() {
        AppProperties properties = new AppProperties();
        MemoryInsightsService service = new MemoryInsightsService(properties);

        String modelJson = """
            {"title":"Testaufnahme","summary":"Er freute sich sehr und zeigte eine starke Entwicklung."}
            """;

        MemoryInsightsService.ProcessedInsights processed = service.postProcessModelOutputForTest(
            modelJson,
            "Test eins, zwei, drei."
        );

        assertFalse(processed.valid());
        assertNotNull(processed);
    }

    @Test
    void keepsCleanTitleForSimpleModelOutput() {
        MemoryInsightsService.ProcessedInsights processed = parsingService().postProcessModelOutputForTest(
            "{\"title\":\"More Apples Please\",\"summary\":\"" + GROUNDED_BREAKFAST_SUMMARY + "\"}",
            BREAKFAST_TRANSCRIPT
        );

        assertTrue(processed.valid());
        assertEquals("More Apples Please", processed.insights().title());
        assertFalse(processed.insights().title().contains("\\"));
    }

    @Test
    void stripsSurroundingQuotesFromGeneratedTitle() {
        MemoryInsightsService.ProcessedInsights processed = parsingService().postProcessModelOutputForTest(
            "{\"title\":\"\\\"More Apples, Please.\\\"\",\"summary\":\"" + GROUNDED_BREAKFAST_SUMMARY + "\"}",
            BREAKFAST_TRANSCRIPT
        );

        assertTrue(processed.valid());
        assertEquals("More Apples, Please.", processed.insights().title());
    }

    @Test
    void stripsTrailingBackslashFromGeneratedTitle() {
        MemoryInsightsService.ProcessedInsights processed = parsingService().postProcessModelOutputForTest(
            "{\"title\":\"More Apples, Please.\\\\\",\"summary\":\"" + GROUNDED_BREAKFAST_SUMMARY + "\"}",
            BREAKFAST_TRANSCRIPT
        );

        assertTrue(processed.valid());
        assertEquals("More Apples, Please.", processed.insights().title());
    }

    @Test
    void extractsTitleWhenModelReturnsJsonSnippetAsTitleValue() {
        MemoryInsightsService.ProcessedInsights processed = parsingService().postProcessModelOutputForTest(
            "{\"title\":\"{\\\"title\\\":\\\"More Apples, Please.\\\"}\",\"summary\":\"" + GROUNDED_BREAKFAST_SUMMARY + "\"}",
            BREAKFAST_TRANSCRIPT
        );

        assertTrue(processed.valid());
        assertEquals("More Apples, Please.", processed.insights().title());
    }
}
