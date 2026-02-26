package de.csiem.backend.service.transcription;

import de.csiem.backend.config.AppProperties;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

@Service
public class OpenAiTranscriptionService implements TranscriptionService {

    private final AppProperties appProperties;
    private final RestClient restClient;

    public OpenAiTranscriptionService(AppProperties appProperties) {
        this.appProperties = appProperties;
        this.restClient = RestClient.builder()
            .baseUrl(appProperties.getTranscription().getOpenaiBaseUrl())
            .build();
    }

    @Override
    public String transcribe(byte[] audioBytes, String filename, String contentType) {
        String apiKey = appProperties.getTranscription().getOpenaiApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            throw new IllegalStateException("OPENAI_API_KEY is not configured");
        }

        ByteArrayResource audioResource = new ByteArrayResource(audioBytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        };

        HttpHeaders fileHeaders = new HttpHeaders();
        fileHeaders.setContentType(MediaType.parseMediaType(contentType));

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new HttpEntity<>(audioResource, fileHeaders));
        body.add("model", appProperties.getTranscription().getOpenaiModel());

        OpenAiTranscriptionResponse response = restClient.post()
            .uri("/v1/audio/transcriptions")
            .headers(headers -> headers.setBearerAuth(apiKey))
            .contentType(MediaType.MULTIPART_FORM_DATA)
            .body(body)
            .retrieve()
            .body(OpenAiTranscriptionResponse.class);

        if (response == null || response.text() == null || response.text().isBlank()) {
            throw new IllegalStateException("Transcription response was empty");
        }

        return response.text().trim();
    }

    private record OpenAiTranscriptionResponse(String text) {
    }
}
