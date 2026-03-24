package de.csiem.backend.controller;

import de.csiem.backend.exception.GlobalExceptionHandler;
import de.csiem.backend.service.EmbeddingRunnerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class EmbeddingRunnerControllerTests {

    @Mock
    private EmbeddingRunnerService embeddingRunnerService;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
            .standaloneSetup(new EmbeddingRunnerController(embeddingRunnerService))
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    }

    @Test
    void returnsAcceptedWhenRunStarts() throws Exception {
        when(embeddingRunnerService.isEnabled()).thenReturn(true);
        when(embeddingRunnerService.isAuthorized("internal-secret")).thenReturn(true);
        when(embeddingRunnerService.triggerAsyncRun()).thenReturn(EmbeddingRunnerService.TriggerState.STARTED);

        mockMvc.perform(
                post("/api/internal/embeddings/run")
                    .header("X-Internal-Api-Key", "internal-secret")
            )
            .andExpect(status().isAccepted())
            .andExpect(jsonPath("$.status").value("accepted"));
    }

    @Test
    void returnsAlreadyRunningWhenRunIsActive() throws Exception {
        when(embeddingRunnerService.isEnabled()).thenReturn(true);
        when(embeddingRunnerService.isAuthorized("internal-secret")).thenReturn(true);
        when(embeddingRunnerService.triggerAsyncRun()).thenReturn(EmbeddingRunnerService.TriggerState.ALREADY_RUNNING);

        mockMvc.perform(
                post("/api/internal/embeddings/run")
                    .header("X-Internal-Api-Key", "internal-secret")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("already_running"));
    }

    @Test
    void returnsForbiddenWhenApiKeyInvalid() throws Exception {
        when(embeddingRunnerService.isEnabled()).thenReturn(true);
        when(embeddingRunnerService.isAuthorized("wrong")).thenReturn(false);

        mockMvc.perform(
                post("/api/internal/embeddings/run")
                    .header("X-Internal-Api-Key", "wrong")
            )
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid internal API key"));
    }

    @Test
    void returnsNotFoundWhenRunnerDisabled() throws Exception {
        when(embeddingRunnerService.isEnabled()).thenReturn(false);

        mockMvc.perform(post("/api/internal/embeddings/run"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("Embedding runner is disabled"));
    }
}

