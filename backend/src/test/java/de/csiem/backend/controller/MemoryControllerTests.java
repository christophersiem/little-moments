package de.csiem.backend.controller;

import de.csiem.backend.dto.CreateMemoryRequest;
import de.csiem.backend.dto.CreateMemoryResponse;
import de.csiem.backend.dto.MemoryChatResponse;
import de.csiem.backend.dto.MemoryListItemResponse;
import de.csiem.backend.dto.MemoryListResponse;
import de.csiem.backend.dto.MemoryResponse;
import de.csiem.backend.exception.GlobalExceptionHandler;
import de.csiem.backend.model.MemoryStatus;
import de.csiem.backend.service.MemoryService;
import de.csiem.backend.service.SupabaseMemoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class MemoryControllerTests {

    @Mock
    private MemoryService memoryService;

    @Mock
    private SupabaseMemoryService supabaseMemoryService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
            .standaloneSetup(new MemoryController(memoryService, supabaseMemoryService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    }

    @Test
    void createMemoryUsesLegacyServiceWhenSupabaseDisabled() throws Exception {
        UUID memoryId = UUID.fromString("11111111-1111-1111-1111-111111111111");
        when(supabaseMemoryService.isEnabled()).thenReturn(false);
        when(memoryService.createMemory(any(CreateMemoryRequest.class))).thenReturn(
            new CreateMemoryResponse(
                memoryId,
                List.of(memoryId),
                1,
                MemoryStatus.READY,
                null,
                "Short transcript",
                "First sentence",
                "A language milestone",
                List.of("Language")
            )
        );

        MockMultipartFile audio = new MockMultipartFile(
            "audio",
            "moment.webm",
            "audio/webm",
            "audio-data".getBytes()
        );

        mockMvc.perform(
                multipart("/api/memories")
                    .file(audio)
                    .param("recordedAt", "2026-03-01T12:00:00Z")
                    .param("childId", "child-1")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(memoryId.toString()))
            .andExpect(jsonPath("$.status").value("READY"));

        verify(memoryService).createMemory(any(CreateMemoryRequest.class));
    }

    @Test
    void getMemoriesReturnsUnauthorizedWhenSupabaseEnabledAndAuthMissing() throws Exception {
        when(supabaseMemoryService.isEnabled()).thenReturn(true);

        mockMvc.perform(get("/api/memories"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Missing or invalid Authorization header"));
    }

    @Test
    void getMemoriesDelegatesToSupabaseServiceWhenEnabled() throws Exception {
        UUID memoryId = UUID.fromString("22222222-2222-2222-2222-222222222222");
        when(supabaseMemoryService.isEnabled()).thenReturn(true);
        when(
            supabaseMemoryService.getMemories(
                eq("Bearer token"),
                eq(1),
                eq(5),
                eq("family-1"),
                eq("2026-03"),
                eq(List.of("Language", "Play")),
                eq(true)
            )
        ).thenReturn(
            new MemoryListResponse(
                List.of(
                    new MemoryListItemResponse(
                        memoryId,
                        Instant.parse("2026-03-01T12:00:00Z"),
                        Instant.parse("2026-03-01T12:00:00Z"),
                        MemoryStatus.READY,
                        true,
                        "Title",
                        "Snippet",
                        List.of("Language")
                    )
                ),
                1,
                5,
                1,
                1
            )
        );

        mockMvc.perform(
                get("/api/memories")
                    .header("Authorization", "Bearer token")
                    .param("page", "1")
                    .param("size", "5")
                    .param("familyId", "family-1")
                    .param("month", "2026-03")
                    .param("tags", "Language", "Play")
                    .param("highlights", "true")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].id").value(memoryId.toString()))
            .andExpect(jsonPath("$.items[0].isHighlight").value(true));

        verify(supabaseMemoryService).getMemories(
            "Bearer token",
            1,
            5,
            "family-1",
            "2026-03",
            List.of("Language", "Play"),
            true
        );
    }

    @Test
    void getMemoryReturnsNotFoundWhenLegacyServiceThrows() throws Exception {
        UUID missingId = UUID.fromString("33333333-3333-3333-3333-333333333333");
        when(supabaseMemoryService.isEnabled()).thenReturn(false);
        when(memoryService.getMemory(missingId)).thenThrow(new ResponseStatusException(NOT_FOUND, "Memory not found"));

        mockMvc.perform(get("/api/memories/{id}", missingId))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("Memory not found"));
    }

    @Test
    void getMemoryUsesLegacyServiceWhenSupabaseDisabled() throws Exception {
        UUID id = UUID.fromString("44444444-4444-4444-4444-444444444444");
        when(supabaseMemoryService.isEnabled()).thenReturn(false);
        when(memoryService.getMemory(id)).thenReturn(
            new MemoryResponse(
                id,
                Instant.parse("2026-03-01T12:00:00Z"),
                Instant.parse("2026-03-01T12:00:00Z"),
                MemoryStatus.READY,
                false,
                "Title",
                "Summary",
                "Transcript",
                null,
                List.of("Language")
            )
        );

        mockMvc.perform(get("/api/memories/{id}", id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(id.toString()))
            .andExpect(jsonPath("$.status").value("READY"));
    }

    @Test
    void chatReturnsUnauthorizedWhenAuthHeaderMissing() throws Exception {
        when(supabaseMemoryService.isEnabled()).thenReturn(true);

        mockMvc.perform(
                post("/api/memories/chat")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {"question":"When did he say mama?"}
                        """)
            )
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Missing or invalid Authorization header"));
    }

    @Test
    void chatDelegatesToSupabaseServiceWhenEnabled() throws Exception {
        UUID sourceId = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
        when(supabaseMemoryService.isEnabled()).thenReturn(true);
        when(supabaseMemoryService.chatWithMemories(eq("Bearer token"), any()))
            .thenReturn(
                new MemoryChatResponse(
                    "The earliest matching memory was in March 2026.",
                    "medium",
                    "success",
                    null,
                    List.of(sourceId),
                    List.of()
                )
            );

        mockMvc.perform(
                post("/api/memories/chat")
                    .header("Authorization", "Bearer token")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {"question":"When were his first steps?","familyId":"family-1"}
                        """)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("success"))
            .andExpect(jsonPath("$.answer").value("The earliest matching memory was in March 2026."))
            .andExpect(jsonPath("$.sourceMemoryIds[0]").value(sourceId.toString()));
    }
}
