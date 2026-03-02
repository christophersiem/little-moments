package de.csiem.backend.service;

import de.csiem.backend.config.AppProperties;
import de.csiem.backend.service.prompts.SplitMemoriesPrompt;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class OpenAiMemorySplittingService implements MemorySplittingService {

    private static final int MAX_INPUT_CHARS = 16000;
    private static final Pattern MEMORIES_ARRAY_PATTERN = Pattern.compile("\"memories\"\\s*:\\s*\\[(.*)]", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern OBJECT_PATTERN = Pattern.compile("\\{([^{}]*)}", Pattern.DOTALL);
    private static final Pattern EXCERPT_PATTERN = Pattern.compile("\"excerpt\"\\s*:\\s*\"((?:\\\\.|[^\\\\\"])*)\"", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern DATE_TEXT_PATTERN = Pattern.compile("\"date_text\"\\s*:\\s*(null|\"((?:\\\\.|[^\\\\\"])*)\")", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern CONFIDENCE_PATTERN = Pattern.compile("\"confidence\"\\s*:\\s*([-+]?\\d*\\.?\\d+)", Pattern.CASE_INSENSITIVE);

    private final AppProperties appProperties;
    private final MemoryDateResolver dateResolver;

    public OpenAiMemorySplittingService(
        AppProperties appProperties,
        MemoryDateResolver dateResolver
    ) {
        this.appProperties = appProperties;
        this.dateResolver = dateResolver;
    }

    @Override
    public List<SplitMemory> split(String transcript, Instant uploadTimestamp) {
        String normalizedTranscript = normalize(transcript);
        if (normalizedTranscript.isBlank()) {
            return List.of(new SplitMemory("", uploadTimestamp, 1.0));
        }

        AppProperties.Splitter splitter = appProperties.getSplitter();
        int maxMemories = Math.max(1, splitter.getMaxMemories());
        int minExcerptChars = Math.max(1, splitter.getMinExcerptChars());

        List<SplitCandidate> candidates = splitWithAi(normalizedTranscript, splitter, maxMemories, minExcerptChars);
        if (candidates.isEmpty()) {
            return List.of(new SplitMemory(normalizedTranscript, uploadTimestamp, 1.0));
        }

        List<SplitCandidate> sanitized = sanitize(candidates, maxMemories, minExcerptChars, normalizedTranscript);
        if (sanitized.isEmpty()) {
            return List.of(new SplitMemory(normalizedTranscript, uploadTimestamp, 1.0));
        }

        if (sanitized.size() == 1 && !sameText(sanitized.getFirst().excerpt(), normalizedTranscript)) {
            // If only one segment remains after cleanup, keep full transcript to avoid accidental truncation.
            return List.of(new SplitMemory(normalizedTranscript, uploadTimestamp, clampConfidence(sanitized.getFirst().confidence())));
        }

        return sanitized.stream()
            .map(candidate -> new SplitMemory(
                candidate.excerpt(),
                dateResolver.resolveRecordedAt(candidate.dateText(), uploadTimestamp),
                clampConfidence(candidate.confidence())
            ))
            .toList();
    }

    private List<SplitCandidate> splitWithAi(
        String transcript,
        AppProperties.Splitter splitter,
        int maxMemories,
        int minExcerptChars
    ) {
        if (!splitter.isEnabled()) {
            return List.of();
        }

        String apiKey = firstNonBlank(splitter.getOpenaiApiKey(), appProperties.getTranscription().getOpenaiApiKey());
        if (apiKey == null || apiKey.isBlank()) {
            return List.of();
        }

        String baseUrl = firstNonBlank(splitter.getOpenaiBaseUrl(), appProperties.getTranscription().getOpenaiBaseUrl());
        String model = firstNonBlank(splitter.getOpenaiModel(), "gpt-4o-mini");
        String promptTranscript = transcript.length() > MAX_INPUT_CHARS ? transcript.substring(0, MAX_INPUT_CHARS) : transcript;

        RestClient client = RestClient.builder().baseUrl(baseUrl).build();
        try {
            ChatCompletionsResponse response = client.post()
                .uri("/v1/chat/completions")
                .headers(headers -> headers.setBearerAuth(apiKey))
                .body(new ChatCompletionsRequest(
                    model,
                    0.1,
                    new ResponseFormat("json_object"),
                    List.of(
                        new ChatMessage("system", SplitMemoriesPrompt.systemPrompt(maxMemories, minExcerptChars)),
                        new ChatMessage("user", SplitMemoriesPrompt.userPrompt(promptTranscript))
                    )
                ))
                .retrieve()
                .body(ChatCompletionsResponse.class);

            if (response == null || response.choices() == null || response.choices().isEmpty()) {
                return List.of();
            }

            ChatMessageContent message = response.choices().getFirst().message();
            if (message == null || message.content() == null || message.content().isBlank()) {
                return List.of();
            }

            return parseCandidates(message.content());
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private List<SplitCandidate> parseCandidates(String content) {
        String json = extractJsonObject(content);
        Matcher arrayMatcher = MEMORIES_ARRAY_PATTERN.matcher(json);
        if (!arrayMatcher.find()) {
            return List.of();
        }

        String arrayContent = arrayMatcher.group(1);
        Matcher objectMatcher = OBJECT_PATTERN.matcher(arrayContent);
        List<SplitCandidate> parsed = new ArrayList<>();

        while (objectMatcher.find()) {
            String objectContent = objectMatcher.group(1);
            String excerpt = normalize(extractJsonField(objectContent, EXCERPT_PATTERN, 1));
            if (excerpt.isBlank()) {
                continue;
            }

            String dateTextRaw = extractDateText(objectContent);
            String dateText = dateTextRaw == null ? null : normalize(dateTextRaw);
            double confidence = parseConfidence(objectContent);
            parsed.add(new SplitCandidate(excerpt, dateText, confidence));
        }

        return parsed;
    }

    private List<SplitCandidate> sanitize(
        List<SplitCandidate> candidates,
        int maxMemories,
        int minExcerptChars,
        String fallbackTranscript
    ) {
        List<SplitCandidate> merged = new ArrayList<>();

        for (SplitCandidate candidate : candidates) {
            String excerpt = normalize(candidate.excerpt());
            if (excerpt.isBlank()) {
                continue;
            }

            if (excerpt.length() < minExcerptChars && !merged.isEmpty()) {
                SplitCandidate previous = merged.removeLast();
                String mergedExcerpt = normalize(previous.excerpt() + " " + excerpt);
                double mergedConfidence = clampConfidence(Math.max(previous.confidence(), candidate.confidence()));
                merged.add(new SplitCandidate(mergedExcerpt, previous.dateText(), mergedConfidence));
            } else {
                merged.add(new SplitCandidate(excerpt, candidate.dateText(), clampConfidence(candidate.confidence())));
            }

            if (merged.size() == maxMemories) {
                break;
            }
        }

        if (merged.isEmpty()) {
            return List.of();
        }

        if (merged.size() == 1 && merged.getFirst().excerpt().length() < minExcerptChars) {
            return List.of(new SplitCandidate(fallbackTranscript, merged.getFirst().dateText(), merged.getFirst().confidence()));
        }

        return merged;
    }

    private double clampConfidence(double value) {
        if (Double.isNaN(value)) {
            return 0.5;
        }
        return Math.max(0.0, Math.min(1.0, value));
    }

    private String extractJsonObject(String raw) {
        int start = raw.indexOf('{');
        int end = raw.lastIndexOf('}');
        if (start < 0 || end <= start) {
            return raw;
        }
        return raw.substring(start, end + 1);
    }

    private String extractJsonField(String raw, Pattern pattern, int group) {
        Matcher matcher = pattern.matcher(raw);
        if (!matcher.find()) {
            return "";
        }
        return unescapeJsonString(matcher.group(group));
    }

    private String extractDateText(String raw) {
        Matcher matcher = DATE_TEXT_PATTERN.matcher(raw);
        if (!matcher.find()) {
            return null;
        }
        if ("null".equalsIgnoreCase(matcher.group(1))) {
            return null;
        }
        String value = matcher.group(2);
        return value == null ? null : unescapeJsonString(value);
    }

    private double parseConfidence(String raw) {
        Matcher matcher = CONFIDENCE_PATTERN.matcher(raw);
        if (!matcher.find()) {
            return 0.5;
        }
        try {
            return Double.parseDouble(matcher.group(1));
        } catch (NumberFormatException ignored) {
            return 0.5;
        }
    }

    private String unescapeJsonString(String value) {
        return value
            .replace("\\\\n", "\n")
            .replace("\\\\r", "\r")
            .replace("\\\\t", "\t")
            .replace("\\\\\"", "\"")
            .replace("\\\\\\\\", "\\");
    }

    private boolean sameText(String left, String right) {
        String normalizedLeft = left.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
        String normalizedRight = right.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
        return normalizedLeft.equals(normalizedRight);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ");
    }

    private String firstNonBlank(String first, String second) {
        if (first != null && !first.isBlank()) {
            return first;
        }
        return second;
    }

    private record SplitCandidate(String excerpt, String dateText, double confidence) {
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
