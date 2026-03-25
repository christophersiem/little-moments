package de.csiem.backend.controller;

import de.csiem.backend.service.EmbeddingRunnerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

import static org.springframework.http.HttpStatus.ACCEPTED;
import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@RequestMapping("/api/internal/embeddings")
public class EmbeddingRunnerController {

    private final EmbeddingRunnerService embeddingRunnerService;

    public EmbeddingRunnerController(EmbeddingRunnerService embeddingRunnerService) {
        this.embeddingRunnerService = embeddingRunnerService;
    }

    @PostMapping("/run")
    public ResponseEntity<Map<String, Object>> runOnce(
        @RequestHeader(value = "X-Internal-Api-Key", required = false) String internalApiKey
    ) {
        if (!embeddingRunnerService.isEnabled()) {
            throw new ResponseStatusException(NOT_FOUND, "Embedding runner is disabled");
        }
        if (!embeddingRunnerService.isAuthorized(internalApiKey)) {
            throw new ResponseStatusException(FORBIDDEN, "Invalid internal API key");
        }

        EmbeddingRunnerService.TriggerState triggerState = embeddingRunnerService.triggerAsyncRun();
        if (triggerState == EmbeddingRunnerService.TriggerState.STARTED) {
            return ResponseEntity.status(ACCEPTED)
                .body(Map.of("status", "accepted", "message", "Embedding run started"));
        }

        if (triggerState == EmbeddingRunnerService.TriggerState.ALREADY_RUNNING) {
            return ResponseEntity.ok(Map.of("status", "already_running", "message", "Embedding run already active"));
        }

        throw new ResponseStatusException(NOT_FOUND, "Embedding runner is disabled");
    }
}

