package de.csiem.backend.service;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MemoryDateResolverTests {

    private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");
    private final MemoryDateResolver resolver = new MemoryDateResolver();

    @Test
    void resolvesHeuteGesternUndVorgestern() {
        Instant upload = Instant.parse("2026-02-26T20:00:00Z");

        assertEquals(LocalDate.of(2026, 2, 26), toBerlinDate(resolver.resolveRecordedAt("heute", upload)));
        assertEquals(LocalDate.of(2026, 2, 25), toBerlinDate(resolver.resolveRecordedAt("gestern", upload)));
        assertEquals(LocalDate.of(2026, 2, 24), toBerlinDate(resolver.resolveRecordedAt("vorgestern", upload)));
    }

    @Test
    void resolvesNumericAndTextualDatesWithYearFallback() {
        Instant upload = Instant.parse("2026-02-26T20:00:00Z");

        assertEquals(LocalDate.of(2026, 1, 12), toBerlinDate(resolver.resolveRecordedAt("am 12.01.", upload)));
        assertEquals(LocalDate.of(2025, 12, 12), toBerlinDate(resolver.resolveRecordedAt("12.12.", upload)));
        assertEquals(LocalDate.of(2024, 1, 12), toBerlinDate(resolver.resolveRecordedAt("12.01.2024", upload)));
        assertEquals(LocalDate.of(2025, 3, 3), toBerlinDate(resolver.resolveRecordedAt("am 3. März", upload)));
    }

    @Test
    void resolvesWeekdayAndChristmasRelativeToUploadDate() {
        Instant upload = Instant.parse("2026-02-26T20:00:00Z"); // Thursday in Berlin

        assertEquals(LocalDate.of(2026, 2, 23), toBerlinDate(resolver.resolveRecordedAt("am Montag", upload)));
        assertEquals(LocalDate.of(2025, 12, 25), toBerlinDate(resolver.resolveRecordedAt("an Weihnachten", upload)));
    }

    private LocalDate toBerlinDate(Instant value) {
        return value.atZone(BERLIN).toLocalDate();
    }
}
