package de.csiem.backend.memory;

import de.csiem.backend.memory.api.CreateMemoryResponse;
import de.csiem.backend.memory.api.MemoryDetailResponse;
import de.csiem.backend.memory.api.MemoryListResponse;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.UUID;

import static org.springframework.http.HttpStatus.CREATED;

@RestController
@RequestMapping("/api/memories")
public class MemoryController {

    private final MemoryService memoryService;

    public MemoryController(MemoryService memoryService) {
        this.memoryService = memoryService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CreateMemoryResponse> createMemory(
        @RequestPart("audio") MultipartFile audio,
        @RequestParam(value = "recordedAt", required = false)
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant recordedAt
    ) {
        return ResponseEntity.status(CREATED).body(memoryService.createMemory(audio, recordedAt));
    }

    @GetMapping
    public MemoryListResponse getMemories(
        @RequestParam(value = "page", defaultValue = "0") int page,
        @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        return memoryService.getMemories(page, size);
    }

    @GetMapping("/{id}")
    public MemoryDetailResponse getMemory(@PathVariable("id") UUID id) {
        return memoryService.getMemory(id);
    }
}
