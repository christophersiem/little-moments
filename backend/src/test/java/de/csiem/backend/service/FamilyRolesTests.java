package de.csiem.backend.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class FamilyRolesTests {

    @Test
    void normalizeHandlesCaseAndWhitespace() {
        assertEquals("OWNER", FamilyRoles.normalize(" owner "));
        assertEquals("", FamilyRoles.normalize(null));
    }

    @Test
    void normalizeOrDefaultMemberFallsBackToMember() {
        assertEquals(FamilyRoles.MEMBER, FamilyRoles.normalizeOrDefaultMember(" "));
        assertEquals(FamilyRoles.MEMBER, FamilyRoles.normalizeOrDefaultMember(null));
        assertEquals(FamilyRoles.OWNER, FamilyRoles.normalizeOrDefaultMember("owner"));
    }

    @Test
    void supportedAndOwnerChecksMatchCurrentVocabulary() {
        assertTrue(FamilyRoles.isSupported("OWNER"));
        assertTrue(FamilyRoles.isSupported("MEMBER"));
        assertFalse(FamilyRoles.isSupported("VIEWER"));

        assertTrue(FamilyRoles.isOwner("owner"));
        assertFalse(FamilyRoles.isOwner("member"));
    }
}
