package de.csiem.backend.controller;

import de.csiem.backend.dto.CreateMemoryRequest;
import de.csiem.backend.dto.CreateMemoryResponse;
import de.csiem.backend.dto.MemoryListResponse;
import de.csiem.backend.dto.MemoryResponse;
import de.csiem.backend.dto.UpdateMemoryRequest;
import de.csiem.backend.service.MemoryService;
import de.csiem.backend.service.SupabaseMemoryService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.UUID;

import static org.springframework.http.HttpStatus.CREATED;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@RestController
@RequestMapping("/api/memories")
public class MemoryController {

    private final MemoryService memoryService;
    private final SupabaseMemoryService supabaseMemoryService;

    public MemoryController(MemoryService memoryService, SupabaseMemoryService supabaseMemoryService) {
        this.memoryService = memoryService;
        this.supabaseMemoryService = supabaseMemoryService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CreateMemoryResponse> createMemory(
        @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
        @Valid @ModelAttribute CreateMemoryRequest request
    ) {
        if (useSupabase()) {
            return ResponseEntity.status(CREATED).body(
                supabaseMemoryService.createMemory(requireAuthorizationHeader(authorizationHeader), request)
            );
        }
        return ResponseEntity.status(CREATED).body(memoryService.createMemory(request));
    }

    @GetMapping
    public MemoryListResponse getMemories(
        @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
        @RequestParam(value = "page", defaultValue = "0") int page,
        @RequestParam(value = "size", defaultValue = "20") int size,
        @RequestParam(value = "month", required = false) String month,
        @RequestParam(value = "tags", required = false) List<String> tags
    ) {
        if (useSupabase()) {
            return supabaseMemoryService.getMemories(
                requireAuthorizationHeader(authorizationHeader),
                page,
                size,
                month,
                tags
            );
        }
        return memoryService.getMemories(page, size, month, tags);
    }

    @GetMapping("/{id}")
    public MemoryResponse getMemory(
        @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
        @PathVariable("id") UUID id
    ) {
        if (useSupabase()) {
            return supabaseMemoryService.getMemory(requireAuthorizationHeader(authorizationHeader), id);
        }
        return memoryService.getMemory(id);
    }

    @PatchMapping("/{id}")
    public MemoryResponse updateMemory(
        @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
        @PathVariable("id") UUID id,
        @RequestBody UpdateMemoryRequest request
    ) {
        if (useSupabase()) {
            return supabaseMemoryService.updateMemory(requireAuthorizationHeader(authorizationHeader), id, request);
        }
        return memoryService.updateMemory(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMemory(
        @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
        @PathVariable("id") UUID id
    ) {
        if (useSupabase()) {
            supabaseMemoryService.deleteMemory(requireAuthorizationHeader(authorizationHeader), id);
            return ResponseEntity.noContent().build();
        }
        memoryService.deleteMemory(id);
        return ResponseEntity.noContent().build();
    }

    private boolean useSupabase() {
        return supabaseMemoryService.isEnabled();
    }

    private String requireAuthorizationHeader(String authorizationHeader) {
        if (!StringUtils.hasText(authorizationHeader) || !authorizationHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(UNAUTHORIZED, "Missing or invalid Authorization header");
        }
        return authorizationHeader;
    }
}
