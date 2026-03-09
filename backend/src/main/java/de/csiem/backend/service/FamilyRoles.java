package de.csiem.backend.service;

import java.util.Locale;

public final class FamilyRoles {

    public static final String OWNER = "OWNER";
    public static final String MEMBER = "MEMBER";

    private FamilyRoles() {
    }

    public static String normalize(String value) {
        if (value == null) {
            return "";
        }
        return value.trim().toUpperCase(Locale.ROOT);
    }

    public static String normalizeOrDefaultMember(String value) {
        String normalized = normalize(value);
        return normalized.isEmpty() ? MEMBER : normalized;
    }

    public static boolean isSupported(String value) {
        return OWNER.equals(value) || MEMBER.equals(value);
    }

    public static boolean isOwner(String value) {
        return OWNER.equalsIgnoreCase(value);
    }
}
