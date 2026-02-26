package de.csiem.backend.service;

import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class MemoryInsightsService {

    private static final int MAX_TITLE_LENGTH = 120;
    private static final int MAX_SUMMARY_LENGTH = 320;

    public MemoryInsights generate(String transcript) {
        String normalized = normalize(transcript);
        if (normalized.isBlank()) {
            return new MemoryInsights("Untitled Memory", "");
        }

        String firstSentence = extractFirstSentence(normalized);
        String title = trim(firstSentence, MAX_TITLE_LENGTH);
        String summary = trim(normalized, MAX_SUMMARY_LENGTH);

        if (title.isBlank()) {
            title = "Untitled Memory";
        }

        return new MemoryInsights(title, summary);
    }

    private String normalize(String transcript) {
        if (transcript == null) {
            return "";
        }
        return transcript.trim().replaceAll("\\s+", " ");
    }

    private String extractFirstSentence(String value) {
        int index = indexOfSentenceEnd(value);
        if (index <= 0) {
            return value;
        }
        return value.substring(0, index + 1);
    }

    private int indexOfSentenceEnd(String value) {
        int dot = value.indexOf('.');
        int exclamation = value.indexOf('!');
        int question = value.indexOf('?');

        int end = dot;
        if (end < 0 || (exclamation >= 0 && exclamation < end)) {
            end = exclamation;
        }
        if (end < 0 || (question >= 0 && question < end)) {
            end = question;
        }
        return end;
    }

    private String trim(String value, int maxLength) {
        if (value.length() <= maxLength) {
            return capitalize(value);
        }
        return capitalize(value.substring(0, maxLength - 3).trim()) + "...";
    }

    private String capitalize(String value) {
        if (value.isBlank()) {
            return value;
        }
        String first = value.substring(0, 1).toUpperCase(Locale.ROOT);
        return first + value.substring(1);
    }

    public record MemoryInsights(String title, String summary) {
    }
}
