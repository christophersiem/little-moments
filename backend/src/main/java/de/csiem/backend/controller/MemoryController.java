package de.csiem.backend.controller;

import de.csiem.backend.dto.CreateMemoryRequest;
import de.csiem.backend.dto.CreateMemoryResponse;
import de.csiem.backend.dto.MemoryListResponse;
import de.csiem.backend.dto.MemoryResponse;
import de.csiem.backend.service.MemoryService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
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
        @Valid @ModelAttribute CreateMemoryRequest request
    ) {
        return ResponseEntity.status(CREATED).body(memoryService.createMemory(request));
    }

    @GetMapping
    public MemoryListResponse getMemories(
        @RequestParam(value = "page", defaultValue = "0") int page,
        @RequestParam(value = "size", defaultValue = "20") int size,
        @RequestParam(value = "month", required = false) String month,
        @RequestParam(value = "tags", required = false) List<String> tags
    ) {
        return memoryService.getMemories(page, size, month, tags);
    }

    @GetMapping("/{id}")
    public MemoryResponse getMemory(@PathVariable("id") UUID id) {
        return memoryService.getMemory(id);
    }
}
