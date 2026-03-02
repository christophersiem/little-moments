package de.csiem.backend.service;

import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.Month;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class MemoryDateResolver {

    private static final ZoneId BERLIN_ZONE = ZoneId.of("Europe/Berlin");

    private static final Pattern NUMERIC_WITH_YEAR = Pattern.compile("\\b(\\d{1,2})\\.(\\d{1,2})\\.(\\d{2,4})\\b");
    private static final Pattern NUMERIC_WITHOUT_YEAR = Pattern.compile("\\b(\\d{1,2})\\.(\\d{1,2})\\.?\\b");
    private static final Pattern TEXTUAL_DATE = Pattern.compile(
        "\\b(?:am\\s+|an\\s+)?(\\d{1,2})\\.?\\s*(januar|jan|februar|feb|märz|maerz|marz|mär|april|apr|mai|juni|jun|juli|jul|august|aug|september|sep|sept|oktober|okt|november|nov|dezember|dez)(?:\\s+(\\d{4}))?\\b",
        Pattern.CASE_INSENSITIVE
    );
    private static final Pattern WEEKDAY_PATTERN = Pattern.compile(
        "\\b(?:am\\s+|an\\s+)?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\\b",
        Pattern.CASE_INSENSITIVE
    );

    private static final Map<String, Month> MONTHS = Map.ofEntries(
        Map.entry("januar", Month.JANUARY),
        Map.entry("jan", Month.JANUARY),
        Map.entry("februar", Month.FEBRUARY),
        Map.entry("feb", Month.FEBRUARY),
        Map.entry("märz", Month.MARCH),
        Map.entry("maerz", Month.MARCH),
        Map.entry("marz", Month.MARCH),
        Map.entry("mär", Month.MARCH),
        Map.entry("april", Month.APRIL),
        Map.entry("apr", Month.APRIL),
        Map.entry("mai", Month.MAY),
        Map.entry("juni", Month.JUNE),
        Map.entry("jun", Month.JUNE),
        Map.entry("juli", Month.JULY),
        Map.entry("jul", Month.JULY),
        Map.entry("august", Month.AUGUST),
        Map.entry("aug", Month.AUGUST),
        Map.entry("september", Month.SEPTEMBER),
        Map.entry("sep", Month.SEPTEMBER),
        Map.entry("sept", Month.SEPTEMBER),
        Map.entry("oktober", Month.OCTOBER),
        Map.entry("okt", Month.OCTOBER),
        Map.entry("november", Month.NOVEMBER),
        Map.entry("nov", Month.NOVEMBER),
        Map.entry("dezember", Month.DECEMBER),
        Map.entry("dez", Month.DECEMBER)
    );

    private static final Map<String, DayOfWeek> WEEKDAYS = Map.of(
        "montag", DayOfWeek.MONDAY,
        "dienstag", DayOfWeek.TUESDAY,
        "mittwoch", DayOfWeek.WEDNESDAY,
        "donnerstag", DayOfWeek.THURSDAY,
        "freitag", DayOfWeek.FRIDAY,
        "samstag", DayOfWeek.SATURDAY,
        "sonntag", DayOfWeek.SUNDAY
    );

    public Instant resolveRecordedAt(String dateText, Instant uploadTimestamp) {
        if (uploadTimestamp == null) {
            return Instant.now();
        }

        ZonedDateTime uploadBerlin = uploadTimestamp.atZone(BERLIN_ZONE);
        if (dateText == null || dateText.isBlank()) {
            return uploadTimestamp;
        }

        String normalized = normalize(dateText);

        Optional<LocalDate> special = parseSpecialRelative(normalized, uploadBerlin.toLocalDate());
        if (special.isPresent()) {
            return toInstant(special.get(), uploadBerlin.toLocalTime());
        }

        Optional<LocalDate> numericWithYear = parseNumericWithYear(normalized);
        if (numericWithYear.isPresent()) {
            return toInstant(numericWithYear.get(), uploadBerlin.toLocalTime());
        }

        Optional<LocalDate> textualDate = parseTextualDate(normalized, uploadBerlin.toLocalDate());
        if (textualDate.isPresent()) {
            return toInstant(textualDate.get(), uploadBerlin.toLocalTime());
        }

        Optional<LocalDate> numericWithoutYear = parseNumericWithoutYear(normalized, uploadBerlin.toLocalDate());
        if (numericWithoutYear.isPresent()) {
            return toInstant(numericWithoutYear.get(), uploadBerlin.toLocalTime());
        }

        Optional<LocalDate> weekday = parseWeekday(normalized, uploadBerlin.toLocalDate());
        if (weekday.isPresent()) {
            return toInstant(weekday.get(), uploadBerlin.toLocalTime());
        }

        return uploadTimestamp;
    }

    private Optional<LocalDate> parseSpecialRelative(String normalized, LocalDate uploadDate) {
        if (normalized.contains("vorgestern")) {
            return Optional.of(uploadDate.minusDays(2));
        }
        if (normalized.contains("gestern")) {
            return Optional.of(uploadDate.minusDays(1));
        }
        if (normalized.contains("heute")) {
            return Optional.of(uploadDate);
        }
        if (normalized.contains("letzte woche")) {
            return Optional.of(uploadDate.minusDays(7));
        }
        if (normalized.contains("weihnachten")) {
            LocalDate christmas = LocalDate.of(uploadDate.getYear(), Month.DECEMBER, 25);
            if (christmas.isAfter(uploadDate)) {
                christmas = christmas.minusYears(1);
            }
            return Optional.of(christmas);
        }
        return Optional.empty();
    }

    private Optional<LocalDate> parseNumericWithYear(String normalized) {
        Matcher matcher = NUMERIC_WITH_YEAR.matcher(normalized);
        if (!matcher.find()) {
            return Optional.empty();
        }

        int day = parseInt(matcher.group(1));
        int month = parseInt(matcher.group(2));
        int year = normalizeYear(parseInt(matcher.group(3)));
        return safeDate(year, month, day);
    }

    private Optional<LocalDate> parseNumericWithoutYear(String normalized, LocalDate uploadDate) {
        Matcher matcher = NUMERIC_WITHOUT_YEAR.matcher(normalized);
        if (!matcher.find()) {
            return Optional.empty();
        }

        int day = parseInt(matcher.group(1));
        int month = parseInt(matcher.group(2));
        LocalDate resolved = safeDate(uploadDate.getYear(), month, day).orElse(null);
        if (resolved == null) {
            return Optional.empty();
        }
        if (resolved.isAfter(uploadDate)) {
            resolved = resolved.minusYears(1);
        }
        return Optional.of(resolved);
    }

    private Optional<LocalDate> parseTextualDate(String normalized, LocalDate uploadDate) {
        Matcher matcher = TEXTUAL_DATE.matcher(normalized);
        if (!matcher.find()) {
            return Optional.empty();
        }

        int day = parseInt(matcher.group(1));
        String monthLabel = normalize(matcher.group(2));
        Month month = MONTHS.get(monthLabel);
        if (month == null) {
            return Optional.empty();
        }

        String yearLabel = matcher.group(3);
        int year = yearLabel == null ? uploadDate.getYear() : normalizeYear(parseInt(yearLabel));

        LocalDate resolved = safeDate(year, month.getValue(), day).orElse(null);
        if (resolved == null) {
            return Optional.empty();
        }

        if (yearLabel == null && resolved.isAfter(uploadDate)) {
            resolved = resolved.minusYears(1);
        }
        return Optional.of(resolved);
    }

    private Optional<LocalDate> parseWeekday(String normalized, LocalDate uploadDate) {
        Matcher matcher = WEEKDAY_PATTERN.matcher(normalized);
        if (!matcher.find()) {
            return Optional.empty();
        }

        DayOfWeek target = WEEKDAYS.get(normalize(matcher.group(1)));
        if (target == null) {
            return Optional.empty();
        }

        int delta = (uploadDate.getDayOfWeek().getValue() - target.getValue() + 7) % 7;
        return Optional.of(uploadDate.minusDays(delta));
    }

    private Optional<LocalDate> safeDate(int year, int month, int day) {
        try {
            return Optional.of(LocalDate.of(year, month, day));
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    private int parseInt(String value) {
        return Integer.parseInt(value);
    }

    private int normalizeYear(int year) {
        if (year < 100) {
            return 2000 + year;
        }
        return year;
    }

    private Instant toInstant(LocalDate date, LocalTime localTime) {
        return date.atTime(localTime).atZone(BERLIN_ZONE).toInstant();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
