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

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
            .andExpect(jsonPath("$.title").isNotEmpty())
            .andExpect(jsonPath("$.summary").isNotEmpty())
            .andExpect(jsonPath("$.title").value(not("Today my child stacked four blocks without help.")))
            .andExpect(jsonPath("$.summary").value(not("Today my child stacked four blocks without help.")))
            .andExpect(jsonPath("$.tags").isArray())
            .andExpect(jsonPath("$.tags", hasItem("Motor Skills")))
            .andReturn();

        String id = extractId(createResult.getResponse().getContentAsString());

        mockMvc.perform(get("/api/memories"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].id").value(id))
            .andExpect(jsonPath("$.items[0].status").value("READY"))
            .andExpect(jsonPath("$.items[0].title").isNotEmpty())
            .andExpect(jsonPath("$.items[0].tags", hasItem("Motor Skills")));

        mockMvc.perform(get("/api/memories/{id}", id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(id))
            .andExpect(jsonPath("$.status").value("READY"))
            .andExpect(jsonPath("$.title").isNotEmpty())
            .andExpect(jsonPath("$.summary").isNotEmpty())
            .andExpect(jsonPath("$.transcript").value("Today my child stacked four blocks without help."))
            .andExpect(jsonPath("$.tags", hasItem("Motor Skills")));
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

        MvcResult createResult = mockMvc.perform(multipart("/api/memories").file(audioFile))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("FAILED"))
            .andExpect(jsonPath("$.errorMessage").value("Provider unavailable"))
            .andExpect(jsonPath("$.title").value(nullValue()))
            .andExpect(jsonPath("$.summary").value(nullValue()))
            .andExpect(jsonPath("$.tags").isArray())
            .andExpect(jsonPath("$.tags").isEmpty())
            .andReturn();

        String id = extractId(createResult.getResponse().getContentAsString());

        mockMvc.perform(get("/api/memories/{id}", id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("FAILED"))
            .andExpect(jsonPath("$.title").value(nullValue()))
            .andExpect(jsonPath("$.summary").value(nullValue()))
            .andExpect(jsonPath("$.transcript").value(nullValue()))
            .andExpect(jsonPath("$.errorMessage").value("Provider unavailable"))
            .andExpect(jsonPath("$.tags").isArray())
            .andExpect(jsonPath("$.tags").isEmpty());

        mockMvc.perform(get("/api/memories"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].id").value(id))
            .andExpect(jsonPath("$.items[0].status").value("FAILED"))
            .andExpect(jsonPath("$.items[0].title").value(nullValue()))
            .andExpect(jsonPath("$.items[0].transcriptSnippet").value(""))
            .andExpect(jsonPath("$.items[0].tags").isArray())
            .andExpect(jsonPath("$.items[0].tags").isEmpty());
    }

    @Test
    void filtersMemoriesByMonthAndTag() throws Exception {
        stubTranscriptionService.setFailure(null);

        stubTranscriptionService.setTranscript("First time saying banana.");
        MockMultipartFile febAudio = new MockMultipartFile(
            "audio",
            "feb.webm",
            "audio/webm",
            "fake-audio-feb".getBytes()
        );
        MvcResult febCreateResult = mockMvc.perform(
                multipart("/api/memories")
                    .file(febAudio)
                    .param("recordedAt", "2026-02-20T10:00:00Z")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.tags", hasItem("Language")))
            .andReturn();

        String febId = extractId(febCreateResult.getResponse().getContentAsString());

        stubTranscriptionService.setTranscript("Building a block tower together.");
        MockMultipartFile janAudio = new MockMultipartFile(
            "audio",
            "jan.webm",
            "audio/webm",
            "fake-audio-jan".getBytes()
        );
        MvcResult janCreateResult = mockMvc.perform(
                multipart("/api/memories")
                    .file(janAudio)
                    .param("recordedAt", "2026-01-10T10:00:00Z")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
            )
            .andExpect(status().isCreated())
            .andReturn();

        String janId = extractId(janCreateResult.getResponse().getContentAsString());

        mockMvc.perform(get("/api/memories").param("month", "2026-02").param("tags", "Language"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].id").value(febId))
            .andExpect(jsonPath("$.items[0].tags", hasItem("Language")));

        mockMvc.perform(get("/api/memories").param("month", "2026-02").param("tags", "Play"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(0));

        mockMvc.perform(get("/api/memories/{id}", janId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(janId));
    }

    @Test
    void updatesTitleTranscriptAndTagsAndRegeneratesSummary() throws Exception {
        stubTranscriptionService.setFailure(null);
        stubTranscriptionService.setTranscript("She said no with confidence.");

        MockMultipartFile audioFile = new MockMultipartFile(
            "audio",
            "moment.webm",
            "audio/webm",
            "fake-audio".getBytes()
        );

        MvcResult createResult = mockMvc.perform(
                multipart("/api/memories")
                    .file(audioFile)
                    .param("recordedAt", "2026-01-30T10:00:00Z")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
            )
            .andExpect(status().isCreated())
            .andReturn();

        String id = extractId(createResult.getResponse().getContentAsString());

        mockMvc.perform(
                patch("/api/memories/{id}", id)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                          "title": "Said 'No!' for the First Time",
                          "transcript": "When asked if she wanted more peas, Mila looked me in the eye and said no with confidence.",
                          "tags": ["Language", "Milestone"]
                        }
                        """)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(id))
            .andExpect(jsonPath("$.title").value("Said 'No!' for the First Time"))
            .andExpect(jsonPath("$.summary").isNotEmpty())
            .andExpect(jsonPath("$.summary").value(not("When asked if she wanted more peas, Mila looked me in the eye and said no with confidence.")))
            .andExpect(jsonPath("$.transcript").value("When asked if she wanted more peas, Mila looked me in the eye and said no with confidence."))
            .andExpect(jsonPath("$.tags", hasItem("Language")))
            .andExpect(jsonPath("$.tags", hasItem("Milestone")));
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
