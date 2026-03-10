package de.csiem.backend.controller;

import de.csiem.backend.dto.ProfileResponse;
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

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ProfileControllerTests {

    @Mock
    private SupabaseGatewayService supabaseGatewayService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
            .standaloneSetup(new ProfileController(supabaseGatewayService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    }

    @Test
    void ensureOwnProfileDefaultsDisplayNameToMemberWhenBodyMissing() throws Exception {
        mockMvc.perform(
                post("/api/profiles/ensure")
                    .header("Authorization", "Bearer token")
            )
            .andExpect(status().isNoContent());

        verify(supabaseGatewayService).ensureOwnProfile("Bearer token", "Member");
    }

    @Test
    void ensureOwnProfileTrimsDisplayName() throws Exception {
        mockMvc.perform(
                post("/api/profiles/ensure")
                    .header("Authorization", "Bearer token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                          "displayName": "  Chris  "
                        }
                        """)
            )
            .andExpect(status().isNoContent());

        verify(supabaseGatewayService).ensureOwnProfile("Bearer token", "Chris");
    }

    @Test
    void getOwnProfileReturnsGatewayPayload() throws Exception {
        when(supabaseGatewayService.getOwnProfile("Bearer token"))
            .thenReturn(new ProfileResponse("user-1", "Chris"));

        mockMvc.perform(
                get("/api/profiles/me")
                    .header("Authorization", "Bearer token")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.userId").value("user-1"))
            .andExpect(jsonPath("$.displayName").value("Chris"));
    }

    @Test
    void updateOwnProfileReturnsBadRequestWhenDisplayNameMissing() throws Exception {
        mockMvc.perform(
                patch("/api/profiles/me")
                    .header("Authorization", "Bearer token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                          "displayName": "  "
                        }
                        """)
            )
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Display name is required"));

        verifyNoInteractions(supabaseGatewayService);
    }

    @Test
    void updateOwnProfileTrimsDisplayNameAndReturnsNoContent() throws Exception {
        mockMvc.perform(
                patch("/api/profiles/me")
                    .header("Authorization", "Bearer token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                          "displayName": "  New Name  "
                        }
                        """)
            )
            .andExpect(status().isNoContent());

        verify(supabaseGatewayService).updateOwnProfile("Bearer token", "New Name");
    }
}
