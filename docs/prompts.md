# AI Prompting Notes (Current)

## 1) Memory Insights Prompt (title + summary)

Used in backend `MemoryInsightsService` to generate structured metadata from transcript text.

Expected JSON output:
```json
{
  "title": "...",
  "summary": "..."
}
```

Key enforced rules:
- Title should be specific and timeline-friendly.
- Title max 10 words; avoid generic fillers (`moment`, `memory`, `today`, etc.).
- Summary must be one sentence, max ~22 words.
- Summary should include what happened + why it mattered (without speculation).
- Output must be valid JSON only.

Post-processing and validation:
- JSON parsing with one retry if invalid.
- Generic-title detection and one retry for specificity.
- Deterministic cleanup for length and language consistency.

## 2) Memory Splitting Prompt

Used by splitter service to detect multiple distinct moments in one transcript.

Expected JSON output:
```json
{
  "memories": [
    {
      "excerpt": "string",
      "date_text": "string | null",
      "confidence": 0.0
    }
  ]
}
```

Key rules:
- Split only when events are clearly distinct.
- Keep contiguous transcript excerpts.
- Cap number of splits and ignore tiny fragments.
- When uncertain, return a single memory.

Date resolution is deterministic in Java (not delegated to model output).

## 3) Tag Assignment

Tags are currently assigned by backend keyword heuristics (`MemoryTaggingService`), not by LLM prompt.

## Out of Scope
- Monthly summary generation prompt is not active in current runtime flow.
