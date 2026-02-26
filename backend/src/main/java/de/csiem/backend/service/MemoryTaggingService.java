package de.csiem.backend.service;

import de.csiem.backend.model.MemoryTag;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

@Service
public class MemoryTaggingService {

    private static final MemoryTag DEFAULT_TAG = MemoryTag.GROWTH;

    public Set<MemoryTag> detectTags(String transcript) {
        String normalized = transcript == null ? "" : transcript.toLowerCase(Locale.ROOT);
        Set<MemoryTag> tags = new LinkedHashSet<>();

        addIfMatches(tags, normalized, MemoryTag.LANGUAGE, "say", "said", "word", "talk", "speak", "story", "read");
        addIfMatches(tags, normalized, MemoryTag.MOTOR_SKILLS, "walk", "run", "jump", "climb", "stack", "tower", "dance", "kick");
        addIfMatches(tags, normalized, MemoryTag.EMOTIONAL, "happy", "sad", "angry", "upset", "excited", "proud", "cry", "frustrat");
        addIfMatches(tags, normalized, MemoryTag.SOCIAL, "friend", "share", "together", "hello", "teacher", "class", "playdate");
        addIfMatches(tags, normalized, MemoryTag.MILESTONE, "first time", "for the first time", "learned to", "finally", "milestone");
        addIfMatches(tags, normalized, MemoryTag.PLAY, "play", "toy", "game", "pretend", "puzzle", "blocks", "building");
        addIfMatches(tags, normalized, MemoryTag.FAMILY, "mom", "dad", "mother", "father", "sister", "brother", "grandma", "grandpa", "family");
        addIfMatches(tags, normalized, MemoryTag.FUNNY, "funny", "laugh", "giggle", "joke", "silly", "hilarious");
        addIfMatches(tags, normalized, MemoryTag.GROWTH, "improv", "better", "growing", "progress", "new skill", "without help");
        addIfMatches(tags, normalized, MemoryTag.CHALLENGE, "hard", "difficult", "struggle", "challeng", "tried", "couldn't", "could not", "failed");

        if (tags.isEmpty()) {
            tags.add(DEFAULT_TAG);
        }

        return tags;
    }

    private void addIfMatches(Set<MemoryTag> tags, String transcript, MemoryTag tag, String... keywords) {
        for (String keyword : keywords) {
            if (transcript.contains(keyword)) {
                tags.add(tag);
                return;
            }
        }
    }
}
