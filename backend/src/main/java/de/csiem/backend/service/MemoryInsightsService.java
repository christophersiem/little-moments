package de.csiem.backend.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class MemoryInsightsService {

    private static final int MAX_TITLE_LENGTH = 72;
    private static final int MAX_TITLE_WORDS = 6;
    private static final int SUMMARY_WORD_LIMIT = 18;
    private static final Pattern QUOTED_TEXT_PATTERN = Pattern.compile("\"([^\"]+)\"");

    private static final Set<String> STOP_WORDS = Set.of(
        "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "had", "has", "have",
        "he", "her", "hers", "him", "his", "i", "if", "in", "is", "it", "its", "me", "my", "of",
        "on", "or", "our", "she", "that", "the", "their", "them", "they", "this", "to", "was", "we",
        "were", "with", "you", "your"
    );

    public MemoryInsights generate(String transcript) {
        String normalized = normalize(transcript);
        if (normalized.isBlank()) {
            return new MemoryInsights("Untitled Memory", "");
        }

        List<String> words = tokenize(normalized);
        String title = buildTitle(normalized, words);
        String summary = buildSummary(normalized, words, title);

        return new MemoryInsights(title, summary);
    }

    private String normalize(String transcript) {
        if (transcript == null) {
            return "";
        }
        return transcript.trim().replaceAll("\\s+", " ");
    }

    private List<String> tokenize(String text) {
        String cleaned = text.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9' ]", " ");
        String[] split = cleaned.trim().split("\\s+");

        List<String> words = new ArrayList<>();
        for (String word : split) {
            if (!word.isBlank()) {
                words.add(word);
            }
        }
        return words;
    }

    private String buildTitle(String transcript, List<String> words) {
        String quoted = tryQuotedPhraseTitle(transcript);
        if (!quoted.isBlank()) {
            return quoted;
        }

        List<String> candidates = new ArrayList<>();
        for (String word : words) {
            if (!STOP_WORDS.contains(word)) {
                candidates.add(word);
            }
            if (candidates.size() == MAX_TITLE_WORDS) {
                break;
            }
        }

        if (candidates.isEmpty()) {
            for (String word : words) {
                candidates.add(word);
                if (candidates.size() == MAX_TITLE_WORDS) {
                    break;
                }
            }
        }

        String title = toTitleCase(String.join(" ", candidates));
        if (title.isBlank()) {
            return "Untitled Memory";
        }

        if (title.length() > MAX_TITLE_LENGTH) {
            title = title.substring(0, MAX_TITLE_LENGTH - 3).trim() + "...";
        }

        if (equalsIgnoringPunctuation(title, transcript)) {
            title = "Untitled Memory";
        }

        return title;
    }

    private String tryQuotedPhraseTitle(String transcript) {
        Matcher matcher = QUOTED_TEXT_PATTERN.matcher(transcript);
        if (!matcher.find()) {
            return "";
        }

        String phrase = matcher.group(1).trim();
        if (phrase.isBlank()) {
            return "";
        }

        int wordCount = tokenize(phrase).size();
        if (wordCount > 4) {
            return "";
        }

        String normalized = toTitleCase(phrase);
        if (transcript.toLowerCase(Locale.ROOT).contains("first")) {
            return "First Time Saying '" + normalized + "'";
        }
        return normalized;
    }

    private String buildSummary(String transcript, List<String> words, String title) {
        if (words.size() <= 12) {
            String summary = "A short memory about " + lowerFirst(title) + ".";
            if (equalsIgnoringPunctuation(summary, transcript)) {
                return "A short memory was captured.";
            }
            return summary;
        }

        StringBuilder builder = new StringBuilder("This memory captures ");
        int limit = Math.min(words.size(), SUMMARY_WORD_LIMIT);
        for (int i = 0; i < limit; i++) {
            if (i > 0) {
                builder.append(' ');
            }
            builder.append(words.get(i));
        }
        builder.append(words.size() > SUMMARY_WORD_LIMIT ? "..." : ".");

        String summary = capitalize(builder.toString());
        if (equalsIgnoringPunctuation(summary, transcript) || equalsIgnoringPunctuation(summary, title)) {
            return "A meaningful moment was recorded and saved.";
        }
        return summary;
    }

    private boolean equalsIgnoringPunctuation(String left, String right) {
        String normalizedLeft = left.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
        String normalizedRight = right.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
        return !normalizedLeft.isBlank() && normalizedLeft.equals(normalizedRight);
    }

    private String toTitleCase(String value) {
        String[] split = value.trim().split("\\s+");
        List<String> words = new ArrayList<>();
        for (String word : split) {
            if (word.isBlank()) {
                continue;
            }
            words.add(capitalize(word));
        }
        return String.join(" ", words);
    }

    private String lowerFirst(String value) {
        if (value == null || value.isBlank()) {
            return "memory";
        }
        return value.substring(0, 1).toLowerCase(Locale.ROOT) + value.substring(1);
    }

    private String capitalize(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String first = value.substring(0, 1).toUpperCase(Locale.ROOT);
        if (value.length() == 1) {
            return first;
        }
        return first + value.substring(1);
    }

    public record MemoryInsights(String title, String summary) {
    }
}
