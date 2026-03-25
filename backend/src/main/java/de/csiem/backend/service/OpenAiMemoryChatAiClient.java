package de.csiem.backend.service;

import de.csiem.backend.config.AppProperties;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

import static org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE;

@Service
public class OpenAiMemoryChatAiClient implements MemoryChatAiClient {

    private final AppProperties appProperties;
    private final RestClient restClient;

    public OpenAiMemoryChatAiClient(AppProperties appProperties) {
        this.appProperties = appProperties;
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(8000);
        requestFactory.setReadTimeout(30000);
        this.restClient = RestClient.builder().requestFactory(requestFactory).build();
    }

    @Override
    public List<Double> createEmbedding(String input) {
        AppProperties.MemoryChat config = appProperties.getMemoryChat();
        String apiKey = config.getOpenaiApiKey();
        String baseUrl = config.getOpenaiBaseUrl();
        String model = config.getEmbeddingModel();
        if (!StringUtils.hasText(apiKey) || !StringUtils.hasText(baseUrl) || !StringUtils.hasText(model)) {
            throw new ResponseStatusException(SERVICE_UNAVAILABLE, "Memory chat AI is not configured.");
        }

        EmbeddingResponse response = restClient.post()
            .uri(baseUrl + "/v1/embeddings")
            .headers(headers -> headers.setBearerAuth(apiKey))
            .body(new EmbeddingRequest(model, input))
            .retrieve()
            .body(EmbeddingResponse.class);

        if (response == null || response.data() == null || response.data().isEmpty()) {
            throw new ResponseStatusException(SERVICE_UNAVAILABLE, "Embedding generation failed.");
        }
        List<Double> vector = response.data().getFirst().embedding();
        if (vector == null || vector.isEmpty()) {
            throw new ResponseStatusException(SERVICE_UNAVAILABLE, "Embedding generation failed.");
        }
        return vector;
    }

    @Override
    public String completeJson(String systemPrompt, String userPrompt) {
        AppProperties.MemoryChat config = appProperties.getMemoryChat();
        String apiKey = config.getOpenaiApiKey();
        String baseUrl = config.getOpenaiBaseUrl();
        String model = config.getChatModel();
        if (!StringUtils.hasText(apiKey) || !StringUtils.hasText(baseUrl) || !StringUtils.hasText(model)) {
            throw new ResponseStatusException(SERVICE_UNAVAILABLE, "Memory chat AI is not configured.");
        }

        ChatCompletionsResponse response = restClient.post()
            .uri(baseUrl + "/v1/chat/completions")
            .headers(headers -> headers.setBearerAuth(apiKey))
            .body(new ChatCompletionsRequest(
                model,
                0.2,
                new ResponseFormat("json_object"),
                List.of(
                    new ChatMessage("system", systemPrompt),
                    new ChatMessage("user", userPrompt)
                )
            ))
            .retrieve()
            .body(ChatCompletionsResponse.class);

        if (response == null || response.choices() == null || response.choices().isEmpty()) {
            throw new ResponseStatusException(SERVICE_UNAVAILABLE, "Memory chat answer generation failed.");
        }
        ChatMessage message = response.choices().getFirst().message();
        if (message == null || !StringUtils.hasText(message.content())) {
            throw new ResponseStatusException(SERVICE_UNAVAILABLE, "Memory chat answer generation failed.");
        }
        return message.content();
    }

    private record EmbeddingRequest(
        String model,
        String input
    ) {
    }

    private record EmbeddingData(
        List<Double> embedding
    ) {
    }

    private record EmbeddingResponse(
        List<EmbeddingData> data
    ) {
    }

    private record ChatCompletionsRequest(
        String model,
        double temperature,
        ResponseFormat response_format,
        List<ChatMessage> messages
    ) {
    }

    private record ResponseFormat(
        String type
    ) {
    }

    private record ChatCompletionsResponse(
        List<Choice> choices
    ) {
    }

    private record Choice(
        ChatMessage message
    ) {
    }

    private record ChatMessage(
        String role,
        String content
    ) {
    }
}
