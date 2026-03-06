package de.csiem.backend.controller;

import de.csiem.backend.repository.MemoryRepository;
import de.csiem.backend.service.MemorySplittingService;
import de.csiem.backend.service.SplitMemory;
import de.csiem.backend.service.transcription.TranscriptionService;
import org.junit.jupiter.api.BeforeEach;
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
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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

    @Autowired
    private StubMemorySplittingService stubMemorySplittingService;

    @Autowired
    private MemoryRepository memoryRepository;

    @BeforeEach
    void resetStubs() {
        stubTranscriptionService.setFailure(null);
        stubMemorySplittingService.setSplits(List.of());
    }

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
            .andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.ids.length()").value(1))
            .andReturn();

        String id = extractId(createResult.getResponse().getContentAsString());

        mockMvc.perform(get("/api/memories"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.id=='" + id + "')]").isNotEmpty())
            .andExpect(jsonPath("$.items[?(@.id=='" + id + "')].status").value(hasItem("READY")))
            .andExpect(jsonPath("$.items[?(@.id=='" + id + "')].title").isNotEmpty());

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
            .andExpect(jsonPath("$.count").value(0))
            .andExpect(jsonPath("$.ids").isArray())
            .andExpect(jsonPath("$.ids").isEmpty())
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
            .andExpect(jsonPath("$.items[?(@.id=='" + id + "')]").isNotEmpty())
            .andExpect(jsonPath("$.items[?(@.id=='" + id + "')].status").value(hasItem("FAILED")))
            .andExpect(jsonPath("$.items[?(@.id=='" + id + "')].title").value(hasItem(nullValue())))
            .andExpect(jsonPath("$.items[?(@.id=='" + id + "')].transcriptSnippet").value(hasItem("")));
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
    void paginatesMemoriesNewestFirstAndReturnsPaginationMetadata() throws Exception {
        stubTranscriptionService.setFailure(null);

        MockMultipartFile audioFile = new MockMultipartFile(
            "audio",
            "moment.webm",
            "audio/webm",
            "fake-audio".getBytes()
        );

        stubTranscriptionService.setTranscript("First memory in April.");
        MvcResult oldestCreateResult = mockMvc.perform(
                multipart("/api/memories")
                    .file(audioFile)
                    .param("recordedAt", "2024-04-01T08:00:00Z")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
            )
            .andExpect(status().isCreated())
            .andReturn();
        String oldestId = extractId(oldestCreateResult.getResponse().getContentAsString());

        stubTranscriptionService.setTranscript("Second memory in April.");
        MvcResult middleCreateResult = mockMvc.perform(
                multipart("/api/memories")
                    .file(audioFile)
                    .param("recordedAt", "2024-04-11T08:00:00Z")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
            )
            .andExpect(status().isCreated())
            .andReturn();
        String middleId = extractId(middleCreateResult.getResponse().getContentAsString());

        stubTranscriptionService.setTranscript("Newest memory in April.");
        MvcResult newestCreateResult = mockMvc.perform(
                multipart("/api/memories")
                    .file(audioFile)
                    .param("recordedAt", "2024-04-20T08:00:00Z")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
            )
            .andExpect(status().isCreated())
            .andReturn();
        String newestId = extractId(newestCreateResult.getResponse().getContentAsString());

        mockMvc.perform(
                get("/api/memories")
                    .param("month", "2024-04")
                    .param("page", "0")
                    .param("size", "2")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.page").value(0))
            .andExpect(jsonPath("$.size").value(2))
            .andExpect(jsonPath("$.totalElements").value(3))
            .andExpect(jsonPath("$.totalPages").value(2))
            .andExpect(jsonPath("$.items.length()").value(2))
            .andExpect(jsonPath("$.items[0].id").value(newestId))
            .andExpect(jsonPath("$.items[1].id").value(middleId));

        mockMvc.perform(
                get("/api/memories")
                    .param("month", "2024-04")
                    .param("page", "1")
                    .param("size", "2")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.page").value(1))
            .andExpect(jsonPath("$.size").value(2))
            .andExpect(jsonPath("$.totalElements").value(3))
            .andExpect(jsonPath("$.totalPages").value(2))
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].id").value(oldestId));
    }

    @Test
    void createsParentAndTwoVisibleChildrenWhenSplitterReturnsTwoMemories() throws Exception {
        stubTranscriptionService.setTranscript("Gestern im Park ist Lea gerutscht. Heute hat sie wieder geuebt.");

        Instant uploadTimestamp = Instant.parse("2028-03-10T18:30:00Z");
        stubMemorySplittingService.setSplits(List.of(
            new SplitMemory("Gestern im Park ist Lea gerutscht.", Instant.parse("2028-03-09T18:30:00Z"), 0.93),
            new SplitMemory("Heute hat sie wieder geuebt.", Instant.parse("2028-03-10T18:30:00Z"), 0.9)
        ));

        MockMultipartFile audioFile = new MockMultipartFile(
            "audio",
            "split.webm",
            "audio/webm",
            "fake-audio-split".getBytes()
        );

        MvcResult createResult = mockMvc.perform(
                multipart("/api/memories")
                    .file(audioFile)
                    .param("recordedAt", uploadTimestamp.toString())
                    .contentType(MediaType.MULTIPART_FORM_DATA)
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("READY"))
            .andExpect(jsonPath("$.count").value(2))
            .andExpect(jsonPath("$.ids.length()").value(2))
            .andReturn();

        List<String> childIds = extractIds(createResult.getResponse().getContentAsString());
        assertEquals(2, childIds.size());

        mockMvc.perform(
                get("/api/memories")
                    .param("month", "2028-03")
                    .param("page", "0")
                    .param("size", "10")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(2))
            .andExpect(jsonPath("$.items[0].id").value(childIds.get(1)))
            .andExpect(jsonPath("$.items[1].id").value(childIds.get(0)));

        UUID firstChildId = UUID.fromString(childIds.getFirst());
        var firstChild = memoryRepository.findById(firstChildId).orElseThrow();
        assertNotNull(firstChild.getParentMemory());
        UUID parentId = firstChild.getParentMemory().getId();
        assertEquals(2, memoryRepository.countByParentMemory_Id(parentId));
        var parent = memoryRepository.findById(parentId).orElseThrow();
        assertTrue(parent.isParent());
    }

    @Test
    void keepsSingleVisibleMemoryWhenSplitterReturnsOneMemory() throws Exception {
        stubTranscriptionService.setTranscript("Heute haben wir einen Schneemann gebaut.");
        stubMemorySplittingService.setSplits(List.of(
            new SplitMemory("Heute haben wir einen Schneemann gebaut.", Instant.parse("2030-01-10T18:00:00Z"), 0.95)
        ));

        MockMultipartFile audioFile = new MockMultipartFile(
            "audio",
            "single-split.webm",
            "audio/webm",
            "fake-audio-single-split".getBytes()
        );

        MvcResult createResult = mockMvc.perform(
                multipart("/api/memories")
                    .file(audioFile)
                    .param("recordedAt", "2030-01-10T18:00:00Z")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
            )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value("READY"))
            .andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.ids.length()").value(1))
            .andReturn();

        String id = extractId(createResult.getResponse().getContentAsString());

        mockMvc.perform(
                get("/api/memories")
                    .param("month", "2030-01")
                    .param("page", "0")
                    .param("size", "10")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].id").value(id));

        UUID memoryId = UUID.fromString(id);
        var saved = memoryRepository.findById(memoryId).orElseThrow();
        assertEquals(Instant.parse("2030-01-10T18:00:00Z"), saved.getRecordedAt());
        assertNull(saved.getParentMemory());
        assertFalse(saved.isParent());
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

    @Test
    void togglesHighlightAndFiltersListByHighlights() throws Exception {
        stubTranscriptionService.setFailure(null);
        MockMultipartFile audioFile = new MockMultipartFile(
            "audio",
            "moment.webm",
            "audio/webm",
            "fake-audio".getBytes()
        );

        stubTranscriptionService.setTranscript("First memory for highlight.");
        MvcResult firstCreateResult = mockMvc.perform(
                multipart("/api/memories")
                    .file(audioFile)
                    .param("recordedAt", "2044-02-26T18:20:00Z")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
            )
            .andExpect(status().isCreated())
            .andReturn();
        String highlightId = extractId(firstCreateResult.getResponse().getContentAsString());

        stubTranscriptionService.setTranscript("Second memory without highlight.");
        mockMvc.perform(
                multipart("/api/memories")
                    .file(audioFile)
                    .param("recordedAt", "2044-02-27T18:20:00Z")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
            )
            .andExpect(status().isCreated());

        mockMvc.perform(
                patch("/api/memories/{id}", highlightId)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("""
                        {
                          "isHighlight": true
                        }
                        """)
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.isHighlight").value(true));

        mockMvc.perform(get("/api/memories/{id}", highlightId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.isHighlight").value(true));

        mockMvc.perform(
                get("/api/memories")
                    .param("month", "2044-02")
                    .param("highlights", "true")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].id").value(highlightId))
            .andExpect(jsonPath("$.items[0].isHighlight").value(true));
    }

    @Test
    void deletesMemoryAndRemovesItFromDetailAndList() throws Exception {
        stubTranscriptionService.setFailure(null);
        stubTranscriptionService.setTranscript("Today we built a long train track.");

        MockMultipartFile audioFile = new MockMultipartFile(
            "audio",
            "moment.webm",
            "audio/webm",
            "fake-audio".getBytes()
        );

        MvcResult createResult = mockMvc.perform(
                multipart("/api/memories")
                    .file(audioFile)
                    .param("recordedAt", "2026-02-26T18:20:00Z")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
            )
            .andExpect(status().isCreated())
            .andReturn();

        String id = extractId(createResult.getResponse().getContentAsString());

        mockMvc.perform(delete("/api/memories/{id}", id))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/memories/{id}", id))
            .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/memories"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.id=='" + id + "')]").isEmpty());
    }

    @TestConfiguration
    static class TestConfig {
        @Bean
        @Primary
        StubTranscriptionService testTranscriptionService() {
            return new StubTranscriptionService();
        }

        @Bean
        @Primary
        StubMemorySplittingService testMemorySplittingService() {
            return new StubMemorySplittingService();
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

    static class StubMemorySplittingService implements MemorySplittingService {
        private final AtomicReference<List<SplitMemory>> splits = new AtomicReference<>(List.of());

        void setSplits(List<SplitMemory> splitMemories) {
            splits.set(List.copyOf(splitMemories));
        }

        @Override
        public List<SplitMemory> split(String transcript, Instant uploadTimestamp) {
            List<SplitMemory> configured = splits.get();
            if (configured.isEmpty()) {
                return List.of(new SplitMemory(transcript, uploadTimestamp, 1.0));
            }
            return configured;
        }
    }

    private String extractId(String json) {
        Matcher matcher = Pattern.compile("\"id\"\\s*:\\s*\"([^\"]+)\"").matcher(json);
        if (!matcher.find()) {
            throw new IllegalStateException("Could not extract id from response: " + json);
        }
        return matcher.group(1);
    }

    private List<String> extractIds(String json) {
        Matcher blockMatcher = Pattern.compile("\"ids\"\\s*:\\s*\\[(.*?)]").matcher(json);
        if (!blockMatcher.find()) {
            throw new IllegalStateException("Could not extract ids from response: " + json);
        }

        Matcher idMatcher = Pattern.compile("\"([0-9a-fA-F-]{36})\"").matcher(blockMatcher.group(1));
        List<String> ids = new ArrayList<>();
        while (idMatcher.find()) {
            ids.add(idMatcher.group(1));
        }
        return ids;
    }
}
