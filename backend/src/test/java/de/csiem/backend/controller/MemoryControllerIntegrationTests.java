package de.csiem.backend.controller;

import de.csiem.backend.service.transcription.TranscriptionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class MemoryControllerIntegrationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private StubTranscriptionService stubTranscriptionService;

    @Test
    void createsMemoryThenReturnsItInListAndDetail() throws Exception {
        stubTranscriptionService.setTranscript("Today my child stacked four blocks without help.");
        stubTranscriptionService.setFailure(null);

        MockMultipartFile audioFile = new MockMultipartFile(
            "audio",
            "moment.webm",
            "audio/webm",
            "fake-audio".getBytes()
        );

        MvcResult createResult = mockMvc.perform(
                multipart("/api/memories")
                    .file(audioFile)
                    .param("recordedAt", "2026-02-26T14:35:00Z")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("READY"))
            .andExpect(jsonPath("$.transcriptPreview").isNotEmpty())
            .andReturn();

        String id = extractId(createResult.getResponse().getContentAsString());

        mockMvc.perform(get("/api/memories"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].id").value(id))
            .andExpect(jsonPath("$.items[0].status").value("READY"));

        mockMvc.perform(get("/api/memories/{id}", id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(id))
            .andExpect(jsonPath("$.status").value("READY"))
            .andExpect(jsonPath("$.transcript").value("Today my child stacked four blocks without help."));
    }

    @Test
    void returnsFailedStatusWhenTranscriptionThrows() throws Exception {
        stubTranscriptionService.setFailure(new IllegalStateException("Provider unavailable"));

        MockMultipartFile audioFile = new MockMultipartFile(
            "audio",
            "moment.webm",
            "audio/webm",
            "fake-audio".getBytes()
        );

        mockMvc.perform(multipart("/api/memories").file(audioFile))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("FAILED"))
            .andExpect(jsonPath("$.errorMessage").value("Provider unavailable"));
    }

    @TestConfiguration
    static class TestConfig {
        @Bean
        @Primary
        StubTranscriptionService testTranscriptionService() {
            return new StubTranscriptionService();
        }
    }

    static class StubTranscriptionService implements TranscriptionService {
        private final AtomicReference<String> transcript = new AtomicReference<>("Test transcript");
        private final AtomicReference<RuntimeException> failure = new AtomicReference<>();

        void setTranscript(String text) {
            transcript.set(text);
        }

        void setFailure(RuntimeException error) {
            failure.set(error);
        }

        @Override
        public String transcribe(byte[] audioBytes, String filename, String contentType) {
            RuntimeException currentFailure = failure.get();
            if (currentFailure != null) {
                throw currentFailure;
            }
            return transcript.get();
        }
    }

    private String extractId(String json) {
        Matcher matcher = Pattern.compile("\"id\"\\s*:\\s*\"([^\"]+)\"").matcher(json);
        if (!matcher.find()) {
            throw new IllegalStateException("Could not extract id from response: " + json);
        }
        return matcher.group(1);
    }
}
