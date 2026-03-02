package de.csiem.backend.service.prompts;

public final class SplitMemoriesPrompt {

    private SplitMemoriesPrompt() {
    }

    public static String systemPrompt(int maxMemories, int minExcerptChars) {
        return """
            You split a parenting transcript into distinct memories.
            Return JSON ONLY with this exact shape:
            {
              "memories": [
                {
                  "excerpt": "string",
                  "date_text": "string | null",
                  "confidence": 0.0
                }
              ]
            }

            Rules:
            - Split only when moments are clearly distinct (different day/event/context, cues like "und dann", "außerdem").
            - Do not invent details.
            - Each excerpt must be a contiguous span from the transcript.
            - If unsure, return one memory with excerpt equal to the full transcript.
            - Limit to at most %d memories.
            - Keep excerpt length >= %d chars when possible.
            - Keep each excerpt concise but complete (roughly 1-6 sentences).
            - date_text should capture only what user said, e.g. "heute", "gestern", "vorgestern", "letzte Woche", "am 12.01.", "am 3. März", "an Weihnachten", or null.
            """.formatted(maxMemories, minExcerptChars);
    }

    public static String userPrompt(String transcript) {
        return """
            Transcript:
            ---
            %s
            ---

            Return JSON only.
            """.formatted(transcript);
    }
}
