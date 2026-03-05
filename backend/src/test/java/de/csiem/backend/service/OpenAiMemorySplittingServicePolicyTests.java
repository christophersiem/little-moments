package de.csiem.backend.service;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OpenAiMemorySplittingServicePolicyTests {

    @Test
    void keepsSingleMemoryByDefault() {
        List<SplitMemory> splits = List.of(
            new SplitMemory("Wir waren im Hallenbad und hatten Spaß.", Instant.parse("2026-03-02T10:00:00Z"), 0.92)
        );

        assertTrue(OpenAiMemorySplittingService.shouldKeepMultipleMemories(splits));
    }

    @Test
    void collapsesWhenAllSplitsPointToSameDay() {
        List<SplitMemory> splits = List.of(
            new SplitMemory("Wir waren schwimmen und haben gesungen.", Instant.parse("2026-03-02T10:00:00Z"), 0.95),
            new SplitMemory("Danach haben wir Nudeln gegessen und sind heimgefahren.", Instant.parse("2026-03-02T15:00:00Z"), 0.93)
        );

        assertFalse(OpenAiMemorySplittingService.shouldKeepMultipleMemories(splits));
    }

    @Test
    void keepsMultipleWhenDatesAreDistinctAndConfidenceIsHigh() {
        List<SplitMemory> splits = List.of(
            new SplitMemory("Gestern waren wir im Park.", Instant.parse("2026-03-01T10:00:00Z"), 0.91),
            new SplitMemory("Heute hat sie es nochmal gemacht.", Instant.parse("2026-03-02T10:00:00Z"), 0.89)
        );

        assertTrue(OpenAiMemorySplittingService.shouldKeepMultipleMemories(splits));
    }

    @Test
    void collapsesWhenAnySplitConfidenceIsTooLow() {
        List<SplitMemory> splits = List.of(
            new SplitMemory("Gestern waren wir im Park.", Instant.parse("2026-03-01T10:00:00Z"), 0.91),
            new SplitMemory("Heute hat sie es nochmal gemacht.", Instant.parse("2026-03-02T10:00:00Z"), 0.62)
        );

        assertFalse(OpenAiMemorySplittingService.shouldKeepMultipleMemories(splits));
    }
}
