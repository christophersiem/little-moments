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
    private static final int MAX_TITLE_WORDS = 6;
    private static final int MAX_SUMMARY_WORDS = 22;
    private static final Pattern QUOTED_TEXT_PATTERN = Pattern.compile("\"([^\"]+)\"");
    private static final Pattern JSON_TITLE_PATTERN = Pattern.compile("\"title\"\\s*:\\s*\"((?:\\\\.|[^\\\"])*)\"", Pattern.CASE_INSENSITIVE);
    private static final Pattern JSON_SUMMARY_PATTERN = Pattern.compile("\"summary\"\\s*:\\s*\"((?:\\\\.|[^\\\"])*)\"", Pattern.CASE_INSENSITIVE);
    private static final Pattern LEADING_LIST_PATTERN = Pattern.compile("^(?:[-*]|\\d+[.)])\\s*");
    private static final Pattern FIRST_SENTENCE_PATTERN = Pattern.compile("^(.+?[.!?])(?:\\s+.*)?$");
    private static final Pattern SUMMARY_META_LEADIN_PATTERN = Pattern.compile(
        "(?i)^(?:transcript says|the transcript describes|according to (?:the )?(?:transcript|recording)|im transkript|laut dem transkript)\\s*[:,-]?\\s*"
    );
    private static final Pattern MILESTONE_TRANSCRIPT_PATTERN = Pattern.compile(
        "(?i)(?:\\bfirst(?:\\s+time)?\\b|for the first time|\\bfull\\s+sentences?\\b|\\bcomplete\\s+sentences?\\b|\\bwithout prompting\\b|\\bzum ersten mal\\b|\\berstmals?\\b|\\bganze[nsr]?\\s+s(?:a|ä)tze?\\b|\\bohne aufforderung\\b)"
    );
    private static final Pattern MILESTONE_TITLE_PATTERN = Pattern.compile(
        "(?i)(?:\\bfirst\\b|\\berst(?:e|er|es)?(?:mal)?\\b|\\bsentence\\b|\\bsatz\\b|\\bwithout prompting\\b|\\bohne aufforderung\\b|\\bmilestone\\b)"
    );

    // Title/Summary generation rules for Reduced MVP:
    // - title: specific, timeline-friendly, max 10 words, avoid generic filler terms
    // - summary: exactly one factual sentence, max 22 words
    // - both: strict JSON contract with deterministic post-processing and retry guards
    private static final String METADATA_SYSTEM_PROMPT =
        "You generate concise, factual, timeline-friendly titles and summaries from transcripts. " +
            "Be strictly grounded in the transcript and never add interpretation.";
    private static final String METADATA_USER_PROMPT_TEMPLATE = """
        TRANSCRIPT:
        <<<
        %s
        >>>

        TASK:
        Return valid JSON ONLY with keys "title" and "summary".

        RULES:
        - Grounding:
          - Use only information explicitly present in the transcript.
          - Do NOT add emotion, intent, developmental meaning, or context not directly stated.
          - Keep uncertainty words if present (e.g., maybe, perhaps, not sure, vielleicht).
        - Title: 2-6 words, max 6 words. Make it specific and scannable.
          - Describe the concrete moment (what happened), not just a quote.
          - Prioritize milestones/first-time events over objects or catchphrases.
          - If transcript mentions first-time or full-sentence behavior, reflect that in the title.
          - Avoid generic words like "moment", "memory", "today".
          - The title value must be plain text only: no surrounding quotes, no backslashes, no JSON snippets.
        - Summary: exactly 1 sentence, max 22 words, factual and literal.
          - Write naturally as a memory description, not as meta commentary.
          - Do NOT reference transcripts, recordings, prompts, AI, or model behavior.
          - Never start with phrases like "Transcript says", "The transcript describes", or "According to...".
          - Stay neutral for low-information / test / noisy transcripts.
          - No advice, diagnosis, speculation, or embellishment.

        EXAMPLES:
        Input transcript:
        "At breakfast, he asked for more apples and said the full sentence without prompting."
        Output:
        {"title":"Asked in a full sentence","summary":"He asked for more apples in a full sentence at breakfast."}

        Input transcript:
        "Test eins, zwei, drei."
        Output:
        {"title":"Testaufnahme","summary":"Short test recording: \\"Test eins, zwei, drei\\""}

        Now produce the JSON for the provided transcript.
        """;
    private static final String JSON_RETRY_NOTE = "Return ONLY valid JSON with exactly the keys \"title\" and \"summary\".";
    private static final String SPECIFIC_TITLE_RETRY_NOTE =
        "Your title is too generic. Make it concrete and timeline-friendly. Avoid words like moment, memory, today, nice, sweet, or a day.";
    private static final String MILESTONE_TITLE_RETRY_NOTE =
        "Your title misses the main milestone. Prioritize the first-time/full-sentence development in plain, concise words.";
    private static final Set<String> TITLE_GENERIC_PATTERNS = Set.of(
        "moment", "memory", "today", "a day", "nice", "sweet"
    );
    private static final Set<String> TITLE_FILLER_WORDS = Set.of(
        "a", "an", "the", "my", "our", "little", "special", "beautiful", "nice", "sweet", "joyful",
        "meaningful", "proud", "happy", "lovely", "wonderful", "moment", "memory", "today",
        "ein", "eine", "der", "die", "das", "besonderer", "besondere", "schoener", "suesser"
    );
    private static final Set<String> LOW_INFORMATION_MARKERS = Set.of(
        "test", "testing", "mic", "microphone", "check", "eins", "zwei", "drei", "one", "two", "three"
    );
    private static final Set<String> NOISE_MARKERS = Set.of(
        "um", "uh", "hmm", "mm", "ah", "eh", "mhm", "er", "erm"
    );
    private static final Set<String> COUNTING_WORDS = Set.of(
        "eins", "zwei", "drei", "vier", "fuenf", "fünf", "sechs", "sieben", "acht", "neun", "zehn",
        "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"
    );
    private static final Set<String> UNCERTAINTY_MARKERS = Set.of(
        "maybe", "perhaps", "probably", "possibly", "not sure", "unsure", "i think", "might",
        "vielleicht", "eventuell", "wohl", "scheinbar", "nicht sicher", "ich glaube", "koennte", "könnte"
    );

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
        "der", "die", "das", "und", "nicht", "ein", "eine", "wir", "heute", "gestern", "woche", "kind", "eins", "zwei", "drei"
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
        DetectedLanguage language = detectLanguage(normalized);
        if (normalized.isBlank()) {
            return new MemoryInsights(defaultTitle(language), emptyTranscriptSummary(language));
        }

        MemoryInsights aiInsights = generateWithAi(normalized);
        if (aiInsights != null) {
            return aiInsights;
        }

        return generateFallback(normalized, language);
    }

    private MemoryInsights generateWithAi(String transcript) {
        AppProperties.Insights insights = appProperties.getInsights();
        if (!insights.isEnabled()) {
            return null;
        }
        DetectedLanguage transcriptLanguage = detectLanguage(transcript);
        if (isLowInformationTranscript(transcript, transcriptLanguage)) {
            return null;
        }

        String apiKey = firstNonBlank(insights.getOpenaiApiKey(), appProperties.getTranscription().getOpenaiApiKey());
        if (apiKey == null || apiKey.isBlank()) {
            return null;
        }

        String baseUrl = firstNonBlank(insights.getOpenaiBaseUrl(), appProperties.getTranscription().getOpenaiBaseUrl());
        String model = firstNonBlank(insights.getOpenaiModel(), "gpt-4o-mini");

        RestClient client = RestClient.builder().baseUrl(baseUrl).build();

        try {
            // Rules live in code so we can enforce quality even when model output drifts.
            String basePrompt = METADATA_USER_PROMPT_TEMPLATE.formatted(transcript);
            ProcessedInsights processed = parseAndValidateModelOutput(
                requestInsights(client, apiKey, model, basePrompt),
                transcript,
                transcriptLanguage
            );

            if (!processed.valid()) {
                String retryPrompt = basePrompt + "\n\n" + JSON_RETRY_NOTE;
                processed = parseAndValidateModelOutput(
                    requestInsights(client, apiKey, model, retryPrompt),
                    transcript,
                    transcriptLanguage
                );
            }

            if (processed.valid() && processed.genericTitle()) {
                String retryPrompt = basePrompt + "\n\n" + SPECIFIC_TITLE_RETRY_NOTE;
                ProcessedInsights specificRetry = parseAndValidateModelOutput(
                    requestInsights(client, apiKey, model, retryPrompt),
                    transcript,
                    transcriptLanguage
                );
                if (specificRetry.valid()) {
                    processed = specificRetry;
                }
            }

            if (processed.valid() && processed.missingMilestoneFocus()) {
                String retryPrompt = basePrompt + "\n\n" + MILESTONE_TITLE_RETRY_NOTE;
                ProcessedInsights milestoneRetry = parseAndValidateModelOutput(
                    requestInsights(client, apiKey, model, retryPrompt),
                    transcript,
                    transcriptLanguage
                );
                if (milestoneRetry.valid()) {
                    processed = milestoneRetry;
                }
            }

            if (processed.valid() && !processed.genericTitle() && !processed.missingMilestoneFocus()) {
                return processed.insights();
            }
            return null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private String requestInsights(
        RestClient client,
        String apiKey,
        String model,
        String userPrompt
    ) {
        ChatCompletionsResponse response = client.post()
            .uri("/v1/chat/completions")
            .headers(headers -> headers.setBearerAuth(apiKey))
            .body(new ChatCompletionsRequest(
                model,
                0.0,
                new ResponseFormat("json_object"),
                List.of(
                    new ChatMessage("system", METADATA_SYSTEM_PROMPT),
                    new ChatMessage("user", userPrompt)
                )
            ))
            .retrieve()
            .body(ChatCompletionsResponse.class);

        if (response == null || response.choices() == null || response.choices().isEmpty()) {
            return null;
        }
        return response.choices().getFirst().message() != null
            ? response.choices().getFirst().message().content()
            : null;
    }

    private ProcessedInsights parseAndValidateModelOutput(
        String modelJson,
        String transcript,
        DetectedLanguage transcriptLanguage
    ) {
        if (modelJson == null || modelJson.isBlank()) {
            return ProcessedInsights.invalid(false, false);
        }

        String titleRaw = extractJsonValue(modelJson, JSON_TITLE_PATTERN);
        String summaryRaw = extractJsonValue(modelJson, JSON_SUMMARY_PATTERN);
        if (titleRaw.isBlank() || summaryRaw.isBlank()) {
            return ProcessedInsights.invalid(false, false);
        }

        String title = sanitizeTitle(titleRaw, transcript);
        String summary = sanitizeSummary(summaryRaw, transcript, title);
        if (title.isBlank() || summary.isBlank()) {
            return ProcessedInsights.invalid(false, false);
        }
        if (!isGroundedSummary(summary, transcript, transcriptLanguage)) {
            return ProcessedInsights.invalid(false, false);
        }
        if (containsUncertaintyMarker(transcript) && !containsUncertaintyMarker(summary)) {
            return ProcessedInsights.invalid(false, false);
        }
        if (!matchesLanguage(title, transcriptLanguage) || !matchesLanguage(summary, transcriptLanguage)) {
            return ProcessedInsights.invalid(false, false);
        }

        boolean genericTitle = isGenericTitle(title);
        boolean missingMilestoneFocus = transcriptSignalsMilestone(transcript) && !titleCapturesMilestone(title);
        return new ProcessedInsights(new MemoryInsights(title, summary), true, genericTitle, missingMilestoneFocus);
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
            .replace("\\n", "\n")
            .replace("\\r", "\r")
            .replace("\\t", "\t")
            .replace("\\\"", "\"")
            .replace("\\\\", "\\");
    }

    private MemoryInsights generateFallback(String transcript, DetectedLanguage language) {
        List<String> words = tokenize(transcript);
        boolean lowInformation = isLowInformationTranscript(transcript, language);
        String title = buildFallbackTitle(transcript, words, language);
        String summary = buildFallbackSummary(transcript, language, lowInformation);
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

    private String buildFallbackSummary(String transcript, DetectedLanguage language, boolean lowInformation) {
        if (lowInformation) {
            String excerpt = normalize(keepFirstSentence(transcript)).replaceAll("[.!?]+$", "");
            if (excerpt.isBlank()) {
                return emptyTranscriptSummary(language);
            }
            boolean looksLikeTest = tokenize(excerpt).stream().anyMatch(
                word -> word.equals("test") || word.equals("testing") || word.equals("check")
            );
            if (language == DetectedLanguage.GERMAN) {
                return (looksLikeTest ? "Kurze Testaufnahme: \"" : "Kurze Aufnahme: \"") + excerpt + "\"";
            }
            return (looksLikeTest ? "Short test recording: \"" : "Short recording: \"") + excerpt + "\"";
        }

        String literal = keepFirstSentence(transcript);
        if (literal.isBlank()) {
            return emptyTranscriptSummary(language);
        }
        literal = limitSummaryWordCount(literal, MAX_SUMMARY_WORDS);
        if (!literal.endsWith(".") && !literal.endsWith("!") && !literal.endsWith("?")) {
            literal = literal + ".";
        }
        return literal;
    }

    private String sanitizeTitle(String value, String transcript) {
        String title = normalize(value)
            .replaceAll("[\\n\\r\\t]+", " ");

        title = extractNestedTitleIfPresent(title);
        title = title
            .replace("\\\"", "\"")
            .replace("\\'", "'")
            .replaceAll("\\\\+$", "")
            .trim();
        title = stripSurroundingQuotes(title);
        if (title.isBlank()) {
            return "";
        }

        title = enforceTitleWordLimit(title);
        if (title.length() > MAX_TITLE_LENGTH) {
            title = title.substring(0, MAX_TITLE_LENGTH - 3).trim() + "...";
        }

        if (equalsIgnoringPunctuation(title, transcript)) {
            return "";
        }

        return title;
    }

    private String extractNestedTitleIfPresent(String value) {
        String normalized = normalize(value);
        if (!normalized.startsWith("{") || !normalized.endsWith("}")) {
            return normalized;
        }
        String nestedTitle = extractJsonValue(normalized, JSON_TITLE_PATTERN);
        if (nestedTitle.isBlank()) {
            return normalized;
        }
        return normalize(nestedTitle);
    }

    private String stripSurroundingQuotes(String value) {
        String normalized = normalize(value);
        while (normalized.length() >= 2) {
            char first = normalized.charAt(0);
            char last = normalized.charAt(normalized.length() - 1);
            boolean wrapped = (first == '"' && last == '"')
                || (first == '\'' && last == '\'')
                || (first == '`' && last == '`');
            if (!wrapped) {
                break;
            }
            normalized = normalize(normalized.substring(1, normalized.length() - 1));
        }
        return normalized
            .replaceAll("^[\"'`]+", "")
            .replaceAll("[\"'`]+$", "");
    }

    private String sanitizeSummary(String value, String transcript, String title) {
        String summary = normalize(value)
            .replace('\n', ' ')
            .replace('\r', ' ');
        summary = SUMMARY_META_LEADIN_PATTERN.matcher(summary).replaceFirst("");
        summary = LEADING_LIST_PATTERN.matcher(summary).replaceFirst("");
        summary = keepFirstSentence(summary);
        summary = limitSummaryWordCount(summary, MAX_SUMMARY_WORDS);
        if (summary.isBlank()) {
            return "";
        }

        if (!summary.endsWith(".") && !summary.endsWith("!") && !summary.endsWith("?")) {
            summary = summary + ".";
        }

        if (equalsIgnoringPunctuation(summary, title) || summaryRepeatsTitle(summary, title)) {
            return "";
        }

        return summary;
    }

    private String enforceTitleWordLimit(String value) {
        List<String> words = splitWords(value);
        if (words.size() <= MAX_TITLE_WORDS) {
            return String.join(" ", words);
        }

        List<String> withoutFillers = new ArrayList<>();
        for (String word : words) {
            String normalizedWord = word.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]", "");
            if (!TITLE_FILLER_WORDS.contains(normalizedWord)) {
                withoutFillers.add(word);
            }
        }
        if (withoutFillers.size() >= 3 && withoutFillers.size() < words.size()) {
            words = withoutFillers;
        }

        if (words.size() > MAX_TITLE_WORDS) {
            words = new ArrayList<>(words.subList(0, MAX_TITLE_WORDS));
        }
        return String.join(" ", words).trim();
    }

    private String keepFirstSentence(String value) {
        String normalized = normalize(value);
        if (normalized.isBlank()) {
            return "";
        }
        Matcher matcher = FIRST_SENTENCE_PATTERN.matcher(normalized);
        if (matcher.matches()) {
            return normalize(matcher.group(1));
        }
        return normalized;
    }

    private String limitSummaryWordCount(String summary, int maxWords) {
        String current = normalize(summary);
        if (splitWords(current).size() <= maxWords) {
            return current;
        }

        while (splitWords(current).size() > maxWords) {
            int clauseBreak = Math.max(
                Math.max(current.lastIndexOf(","), current.lastIndexOf(";")),
                Math.max(current.lastIndexOf(" - "), current.lastIndexOf(" -- "))
            );
            if (clauseBreak > 20) {
                current = normalize(current.substring(0, clauseBreak));
                continue;
            }
            List<String> words = splitWords(current);
            if (words.isEmpty()) {
                return "";
            }
            words.remove(words.size() - 1);
            current = String.join(" ", words);
        }
        return current;
    }

    private boolean summaryRepeatsTitle(String summary, String title) {
        String normalizedSummary = normalize(summary).toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N} ]", "");
        String normalizedTitle = normalize(title).toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N} ]", "");
        if (normalizedSummary.isBlank() || normalizedTitle.isBlank()) {
            return false;
        }
        if (normalizedSummary.equals(normalizedTitle)) {
            return true;
        }
        return normalizedSummary.startsWith(normalizedTitle + " ");
    }

    private boolean isGenericTitle(String title) {
        String normalizedTitle = normalize(title).toLowerCase(Locale.ROOT);
        for (String banned : TITLE_GENERIC_PATTERNS) {
            if (normalizedTitle.contains(banned)) {
                return true;
            }
        }
        return false;
    }

    private boolean transcriptSignalsMilestone(String transcript) {
        String normalizedTranscript = normalize(transcript);
        if (normalizedTranscript.isBlank()) {
            return false;
        }
        return MILESTONE_TRANSCRIPT_PATTERN.matcher(normalizedTranscript).find();
    }

    private boolean titleCapturesMilestone(String title) {
        String normalizedTitle = normalize(title);
        if (normalizedTitle.isBlank()) {
            return false;
        }
        return MILESTONE_TITLE_PATTERN.matcher(normalizedTitle).find();
    }

    private List<String> splitWords(String text) {
        String normalized = normalize(text);
        if (normalized.isBlank()) {
            return List.of();
        }
        String[] split = normalized.split("\\s+");
        List<String> words = new ArrayList<>();
        for (String word : split) {
            if (!word.isBlank()) {
                words.add(word);
            }
        }
        return words;
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

    private String emptyTranscriptSummary(DetectedLanguage language) {
        if (language == DetectedLanguage.GERMAN) {
            return "Keine klare gesprochene Erinnerung im Transkript.";
        }
        return "No clear spoken memory in the transcript.";
    }

    private boolean isLowInformationTranscript(String transcript, DetectedLanguage language) {
        List<String> words = tokenize(transcript);
        if (words.isEmpty()) {
            return true;
        }
        if (words.size() <= 3) {
            return true;
        }

        int markerHits = 0;
        int noiseHits = 0;
        int numericOrCountingHits = 0;
        for (String word : words) {
            if (LOW_INFORMATION_MARKERS.contains(word)) {
                markerHits++;
            }
            if (NOISE_MARKERS.contains(word)) {
                noiseHits++;
            }
            if (word.matches("\\d+") || COUNTING_WORDS.contains(word)) {
                numericOrCountingHits++;
            }
        }

        if (markerHits >= 1 && words.size() <= 8) {
            return true;
        }
        if (noiseHits >= Math.max(2, words.size() - 1)) {
            return true;
        }
        if (numericOrCountingHits == words.size()) {
            return true;
        }

        Set<String> stopWords = language == DetectedLanguage.GERMAN ? STOP_WORDS_DE : STOP_WORDS_EN;
        int informativeWords = 0;
        for (String word : words) {
            if (!stopWords.contains(word) && !NOISE_MARKERS.contains(word) && !word.matches("\\d+")) {
                informativeWords++;
            }
        }
        return informativeWords <= 2;
    }

    private boolean isGroundedSummary(String summary, String transcript, DetectedLanguage language) {
        List<String> transcriptWords = tokenize(transcript);
        if (transcriptWords.isEmpty()) {
            return false;
        }
        Set<String> transcriptWordSet = Set.copyOf(transcriptWords);
        Set<String> stopWords = language == DetectedLanguage.GERMAN ? STOP_WORDS_DE : STOP_WORDS_EN;

        int contentWords = 0;
        int groundedContentWords = 0;
        int unsupportedContentWords = 0;
        for (String word : tokenize(summary)) {
            if (word.length() <= 2 || stopWords.contains(word) || word.matches("\\d+")) {
                continue;
            }
            contentWords++;
            if (!transcriptWordSet.contains(word)) {
                unsupportedContentWords++;
            } else {
                groundedContentWords++;
            }
        }

        if (contentWords == 0) {
            return false;
        }
        if (contentWords <= 4) {
            return groundedContentWords >= 1 && unsupportedContentWords <= 2;
        }

        double groundedRatio = (double) groundedContentWords / (double) contentWords;
        int allowedUnsupportedWords = Math.max(2, (int) Math.floor(contentWords * 0.60));
        return groundedRatio >= 0.45 && unsupportedContentWords <= allowedUnsupportedWords;
    }

    private boolean containsUncertaintyMarker(String text) {
        String normalized = normalize(text).toLowerCase(Locale.ROOT);
        if (normalized.isBlank()) {
            return false;
        }
        for (String marker : UNCERTAINTY_MARKERS) {
            if (normalized.contains(marker)) {
                return true;
            }
        }
        return false;
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

    ProcessedInsights postProcessModelOutputForTest(String modelJson, String transcript) {
        return parseAndValidateModelOutput(modelJson, normalize(transcript), detectLanguage(transcript));
    }

    public record MemoryInsights(String title, String summary) {
    }

    record ProcessedInsights(MemoryInsights insights, boolean valid, boolean genericTitle, boolean missingMilestoneFocus) {
        static ProcessedInsights invalid(boolean genericTitle, boolean missingMilestoneFocus) {
            return new ProcessedInsights(null, false, genericTitle, missingMilestoneFocus);
        }
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
