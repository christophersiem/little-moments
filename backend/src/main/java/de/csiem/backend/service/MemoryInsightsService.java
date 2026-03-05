package de.csiem.backend.service;

import de.csiem.backend.config.AppProperties;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class MemoryInsightsService {

    private static final int MAX_TITLE_LENGTH = 72;
    private static final Pattern QUOTED_TEXT_PATTERN = Pattern.compile("\"([^\"]+)\"");
    private static final Pattern JSON_TITLE_PATTERN = Pattern.compile("\"title\"\\s*:\\s*\"((?:\\\\.|[^\\\"])*)\"", Pattern.CASE_INSENSITIVE);
    private static final Pattern JSON_SUMMARY_PATTERN = Pattern.compile("\"summary\"\\s*:\\s*\"((?:\\\\.|[^\\\"])*)\"", Pattern.CASE_INSENSITIVE);

    private static final Set<String> STOP_WORDS_EN = Set.of(
        "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "had", "has", "have",
        "he", "her", "hers", "him", "his", "i", "if", "in", "is", "it", "its", "me", "my", "of",
        "on", "or", "our", "she", "that", "the", "their", "them", "they", "this", "to", "was", "we",
        "were", "with", "you", "your"
    );
    private static final Set<String> STOP_WORDS_DE = Set.of(
        "aber", "als", "am", "an", "auch", "auf", "aus", "bei", "bin", "bis", "da", "dann", "das",
        "dem", "den", "der", "des", "die", "doch", "du", "ein", "eine", "einem", "einer", "eines",
        "er", "es", "für", "hat", "habe", "haben", "ich", "im", "in", "ist", "mit", "nach", "nicht",
        "noch", "oder", "sie", "sind", "so", "und", "uns", "unser", "war", "waren", "wie", "wir", "zu", "zum", "zur"
    );
    private static final Set<String> LANGUAGE_MARKERS_DE = Set.of(
        "der", "die", "das", "und", "nicht", "ein", "eine", "wir", "heute", "gestern", "woche", "kind"
    );
    private static final Set<String> LANGUAGE_MARKERS_EN = Set.of(
        "the", "and", "not", "a", "an", "we", "today", "yesterday", "week", "child"
    );
    private static final Pattern UMLAUT_PATTERN = Pattern.compile("[äöüßÄÖÜ]");

    private final AppProperties appProperties;

    public MemoryInsightsService(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    public MemoryInsights generate(String transcript) {
        String normalized = normalize(transcript);
        if (normalized.isBlank()) {
            return new MemoryInsights("Untitled Memory", "");
        }

        MemoryInsights aiInsights = generateWithAi(normalized);
        if (aiInsights != null) {
            return aiInsights;
        }

        return generateFallback(normalized);
    }

    private MemoryInsights generateWithAi(String transcript) {
        AppProperties.Insights insights = appProperties.getInsights();
        if (!insights.isEnabled()) {
            return null;
        }
        DetectedLanguage transcriptLanguage = detectLanguage(transcript);

        String apiKey = firstNonBlank(insights.getOpenaiApiKey(), appProperties.getTranscription().getOpenaiApiKey());
        if (apiKey == null || apiKey.isBlank()) {
            return null;
        }

        String baseUrl = firstNonBlank(insights.getOpenaiBaseUrl(), appProperties.getTranscription().getOpenaiBaseUrl());
        String model = firstNonBlank(insights.getOpenaiModel(), "gpt-4o-mini");

        RestClient client = RestClient.builder().baseUrl(baseUrl).build();

        try {
            ChatCompletionsResponse response = client.post()
                .uri("/v1/chat/completions")
                .headers(headers -> headers.setBearerAuth(apiKey))
                .body(new ChatCompletionsRequest(
                    model,
                    0.2,
                    new ResponseFormat("json_object"),
                    List.of(
                        new ChatMessage("system", "You write parenting-memory metadata. Return strict JSON with keys title and summary. " +
                            "Title: 3-8 words, specific, no trailing punctuation. " +
                            "Summary: one concise sentence, max 28 words, paraphrase transcript and do not copy it verbatim. " +
                            "Use same language as transcript."),
                        new ChatMessage("user", transcript)
                    )
                ))
                .retrieve()
                .body(ChatCompletionsResponse.class);

            if (response == null || response.choices() == null || response.choices().isEmpty()) {
                return null;
            }

            String content = response.choices().getFirst().message() != null
                ? response.choices().getFirst().message().content()
                : null;

            if (content == null || content.isBlank()) {
                return null;
            }

            String titleRaw = extractJsonValue(content, JSON_TITLE_PATTERN);
            String summaryRaw = extractJsonValue(content, JSON_SUMMARY_PATTERN);

            String title = sanitizeTitle(titleRaw, transcript);
            String summary = sanitizeSummary(summaryRaw, transcript, title);

            if (title.isBlank() || summary.isBlank()) {
                return null;
            }
            if (!matchesLanguage(title, transcriptLanguage) || !matchesLanguage(summary, transcriptLanguage)) {
                return null;
            }

            return new MemoryInsights(title, summary);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String extractJsonValue(String json, Pattern pattern) {
        Matcher matcher = pattern.matcher(json);
        if (!matcher.find()) {
            return "";
        }
        return unescapeJsonString(matcher.group(1));
    }

    private String unescapeJsonString(String value) {
        return value
            .replace("\\\\n", "\n")
            .replace("\\\\r", "\r")
            .replace("\\\\t", "\t")
            .replace("\\\\\"", "\"")
            .replace("\\\\\\\\", "\\");
    }

    private MemoryInsights generateFallback(String transcript) {
        DetectedLanguage language = detectLanguage(transcript);
        List<String> words = tokenize(transcript);
        String title = buildFallbackTitle(transcript, words, language);
        String summary = buildFallbackSummary(title, language);
        return new MemoryInsights(title, summary);
    }

    private String normalize(String transcript) {
        if (transcript == null) {
            return "";
        }
        return transcript.trim().replaceAll("\\s+", " ");
    }

    private List<String> tokenize(String text) {
        String cleaned = text.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}' ]", " ");
        String[] split = cleaned.trim().split("\\s+");

        List<String> words = new ArrayList<>();
        for (String word : split) {
            if (!word.isBlank()) {
                words.add(word);
            }
        }
        return words;
    }

    private String buildFallbackTitle(String transcript, List<String> words, DetectedLanguage language) {
        String quoted = tryQuotedPhraseTitle(transcript, language);
        if (!quoted.isBlank()) {
            return quoted;
        }

        Set<String> stopWords = language == DetectedLanguage.GERMAN ? STOP_WORDS_DE : STOP_WORDS_EN;
        List<String> selected = new ArrayList<>();
        for (String word : words) {
            if (!stopWords.contains(word)) {
                selected.add(word);
            }
            if (selected.size() == 5) {
                break;
            }
        }

        if (selected.isEmpty()) {
            return defaultTitle(language);
        }

        String title = toTitleCase(String.join(" ", selected));
        if (title.length() > MAX_TITLE_LENGTH) {
            return title.substring(0, MAX_TITLE_LENGTH - 3).trim() + "...";
        }
        return title;
    }

    private String tryQuotedPhraseTitle(String transcript, DetectedLanguage language) {
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
        if (language == DetectedLanguage.GERMAN && transcript.toLowerCase(Locale.ROOT).contains("erste")) {
            return "Erstes Mal: '" + normalized + "'";
        }
        if (language != DetectedLanguage.GERMAN && transcript.toLowerCase(Locale.ROOT).contains("first")) {
            return "First Time Saying '" + normalized + "'";
        }
        return normalized;
    }

    private String buildFallbackSummary(String title, DetectedLanguage language) {
        if (language == DetectedLanguage.GERMAN) {
            if (title == null || title.isBlank()) {
                return "Ein besonderer Moment wurde festgehalten.";
            }
            return "Ein besonderer Moment zu " + lowerFirst(title) + " wurde festgehalten.";
        }
        if (title == null || title.isBlank()) {
            return "A meaningful moment was captured and saved.";
        }
        return "A meaningful moment about " + lowerFirst(title) + " was captured and saved.";
    }

    private String sanitizeTitle(String value, String transcript) {
        String title = normalize(value).replaceAll("^[\"'`]+|[\"'`.,!?]+$", "");
        if (title.isBlank()) {
            return "";
        }

        if (title.length() > MAX_TITLE_LENGTH) {
            title = title.substring(0, MAX_TITLE_LENGTH - 3).trim() + "...";
        }

        if (equalsIgnoringPunctuation(title, transcript)) {
            return "";
        }

        return title;
    }

    private String sanitizeSummary(String value, String transcript, String title) {
        String summary = normalize(value);
        if (summary.isBlank()) {
            return "";
        }

        if (!summary.endsWith(".") && !summary.endsWith("!") && !summary.endsWith("?")) {
            summary = summary + ".";
        }

        if (equalsIgnoringPunctuation(summary, transcript) || equalsIgnoringPunctuation(summary, title)) {
            return "";
        }

        return summary;
    }

    private boolean equalsIgnoringPunctuation(String left, String right) {
        if (left == null || right == null) {
            return false;
        }
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

    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        return second;
    }

    private String defaultTitle(DetectedLanguage language) {
        if (language == DetectedLanguage.GERMAN) {
            return "Unbenannter Moment";
        }
        return "Untitled Memory";
    }

    private boolean matchesLanguage(String text, DetectedLanguage expected) {
        if (expected == DetectedLanguage.UNKNOWN) {
            return true;
        }
        DetectedLanguage actual = detectLanguage(text);
        if (actual == DetectedLanguage.UNKNOWN) {
            return true;
        }
        return actual == expected;
    }

    private DetectedLanguage detectLanguage(String text) {
        String normalized = normalize(text).toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return DetectedLanguage.UNKNOWN;
        }
        if (UMLAUT_PATTERN.matcher(normalized).find()) {
            return DetectedLanguage.GERMAN;
        }

        List<String> words = tokenize(normalized);
        int deScore = 0;
        int enScore = 0;
        for (String word : words) {
            if (LANGUAGE_MARKERS_DE.contains(word) || STOP_WORDS_DE.contains(word)) {
                deScore++;
            }
            if (LANGUAGE_MARKERS_EN.contains(word) || STOP_WORDS_EN.contains(word)) {
                enScore++;
            }
        }

        if (deScore == 0 && enScore == 0) {
            return DetectedLanguage.UNKNOWN;
        }
        if (deScore == enScore) {
            return DetectedLanguage.UNKNOWN;
        }
        return deScore > enScore ? DetectedLanguage.GERMAN : DetectedLanguage.ENGLISH;
    }

    public record MemoryInsights(String title, String summary) {
    }

    private enum DetectedLanguage {
        GERMAN,
        ENGLISH,
        UNKNOWN
    }

    private record ChatCompletionsRequest(
        String model,
        double temperature,
        ResponseFormat response_format,
        List<ChatMessage> messages
    ) {
    }

    private record ResponseFormat(String type) {
    }

    private record ChatMessage(String role, String content) {
    }

    private record ChatCompletionsResponse(List<Choice> choices) {
    }

    private record Choice(ChatMessageContent message) {
    }

    private record ChatMessageContent(String content) {
    }
}
