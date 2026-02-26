package de.csiem.backend.model;

import java.util.Arrays;
import java.util.Optional;

public enum MemoryTag {
    LANGUAGE("Language"),
    MOTOR_SKILLS("Motor Skills"),
    EMOTIONAL("Emotional"),
    SOCIAL("Social"),
    MILESTONE("Milestone"),
    PLAY("Play"),
    FAMILY("Family"),
    FUNNY("Funny"),
    GROWTH("Growth"),
    CHALLENGE("Challenge");

    private final String label;

    MemoryTag(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    public static Optional<MemoryTag> fromLabel(String value) {
        if (value == null) {
            return Optional.empty();
        }
        return Arrays.stream(values())
            .filter(tag -> tag.label.equalsIgnoreCase(value.trim()) || tag.name().equalsIgnoreCase(value.trim()))
            .findFirst();
    }
}
