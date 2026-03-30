package de.csiem.backend.service;

import de.csiem.backend.config.AppProperties;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

final class AudioUploadGuardrails {

    private static final Set<String> ALLOWED_AUDIO_TYPES = Set.of(
        "audio/webm",
        "audio/mp4",
        "audio/m4a",
        "audio/ogg",
        "audio/wav",
        "audio/x-wav",
        "audio/opus"
    );

    private AudioUploadGuardrails() {
    }

    static void validate(MultipartFile audio, AppProperties appProperties) {
        String normalizedContentType = normalizeContentType(audio.getContentType());
        if (!StringUtils.hasText(normalizedContentType) || !ALLOWED_AUDIO_TYPES.contains(normalizedContentType)) {
            throw new ResponseStatusException(
                BAD_REQUEST,
                "Unsupported audio type. Use WEBM, MP4, M4A, OGG, or WAV."
            );
        }

        long maxBytes = Math.max(appProperties.getRecording().getMaxBytes(), 1L);
        if (audio.getSize() > maxBytes) {
            throw new ResponseStatusException(
                BAD_REQUEST,
                "Audio file exceeds max size of %d bytes".formatted(maxBytes)
            );
        }
    }

    private static String normalizeContentType(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            MediaType mediaType = MediaType.parseMediaType(value);
            return new MediaType(mediaType.getType(), mediaType.getSubtype()).toString().toLowerCase();
        } catch (InvalidMediaTypeException ignored) {
            return null;
        }
    }
}
