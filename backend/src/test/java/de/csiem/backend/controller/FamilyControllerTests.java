package de.csiem.backend.controller;

import de.csiem.backend.dto.FamilyMemberResponse;
import de.csiem.backend.dto.FamilySummaryResponse;
import de.csiem.backend.exception.GlobalExceptionHandler;
import de.csiem.backend.service.SupabaseGatewayService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class FamilyControllerTests {

    @Mock
    private SupabaseGatewayService supabaseGatewayService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
            .standaloneSetup(new FamilyController(supabaseGatewayService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    }

    @Test
    void createFamilyWithOwnerDefaultsToMyFamilyWhenBodyMissing() throws Exception {
        when(supabaseGatewayService.createFamilyWithOwner("Bearer token", "My Family")).thenReturn("family-1");

        mockMvc.perform(
                post("/api/families/with-owner")
                    .header("Authorization", "Bearer token")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.familyId").value("family-1"));

        verify(supabaseGatewayService).createFamilyWithOwner("Bearer token", "My Family");
    }

    @Test
    void createInvitationReturnsBadRequestWhenEmailMissing() throws Exception {
        mockMvc.perform(
                post("/api/families/{familyId}/invitations", "family-1")
                    .header("Authorization", "Bearer token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                          "email": "   ",
                          "role": "MEMBER"
                        }
                        """)
            )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Email is required"));

        verifyNoInteractions(supabaseGatewayService);
    }

    @Test
    void createInvitationReturnsBadRequestWhenRoleUnsupported() throws Exception {
        mockMvc.perform(
                post("/api/families/{familyId}/invitations", "family-1")
                    .header("Authorization", "Bearer token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                          "email": "member@example.com",
                          "role": "viewer"
                        }
                        """)
            )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Role must be OWNER or MEMBER"));

        verifyNoInteractions(supabaseGatewayService);
    }

    @Test
    void createInvitationTrimsEmailAndNormalizesRole() throws Exception {
        when(supabaseGatewayService.createInvitation("Bearer token", "family-1", "member@example.com", "OWNER"))
            .thenReturn("invite-token-1");

        mockMvc.perform(
                post("/api/families/{familyId}/invitations", "family-1")
                    .header("Authorization", "Bearer token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                          "email": " member@example.com ",
                          "role": " owner "
                        }
                        """)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").value("invite-token-1"));

        verify(supabaseGatewayService).createInvitation("Bearer token", "family-1", "member@example.com", "OWNER");
    }

    @Test
    void acceptInvitationReturnsBadRequestWhenTokenMissing() throws Exception {
        mockMvc.perform(
                post("/api/invitations/accept")
                    .header("Authorization", "Bearer token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                          "token": ""
                        }
                        """)
            )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Invitation token is required"));

        verifyNoInteractions(supabaseGatewayService);
    }

    @Test
    void setMemberRoleReturnsNoContentAndNormalizesRole() throws Exception {
        mockMvc.perform(
                patch("/api/families/{familyId}/members/{userId}/role", "family-1", "user-1")
                    .header("Authorization", "Bearer token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                          "role": " member "
                        }
                        """)
            )
            .andExpect(status().isNoContent());

        verify(supabaseGatewayService).setMemberRole("Bearer token", "family-1", "user-1", "MEMBER");
    }

    @Test
    void listFamiliesReturnsGatewayResponse() throws Exception {
        when(supabaseGatewayService.listMyFamilies("Bearer token")).thenReturn(
            List.of(new FamilySummaryResponse("family-1", "Home", "OWNER", "2026-03-01T10:00:00Z"))
        );

        mockMvc.perform(
                get("/api/families")
                    .header("Authorization", "Bearer token")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].familyId").value("family-1"))
            .andExpect(jsonPath("$[0].familyName").value("Home"))
            .andExpect(jsonPath("$[0].role").value("OWNER"));
    }

    @Test
    void listFamilyMembersReturnsGatewayResponse() throws Exception {
        when(supabaseGatewayService.listFamilyMembers("Bearer token", "family-1")).thenReturn(
            List.of(new FamilyMemberResponse("user-1", "Chris", "OWNER", "2026-03-01T10:00:00Z"))
        );

        mockMvc.perform(
                get("/api/families/{familyId}/members", "family-1")
                    .header("Authorization", "Bearer token")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].userId").value("user-1"))
            .andExpect(jsonPath("$[0].displayName").value("Chris"));
    }
}
