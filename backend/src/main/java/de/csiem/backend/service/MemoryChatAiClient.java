package de.csiem.backend.service;

import java.util.List;

public interface MemoryChatAiClient {

    List<Double> createEmbedding(String input);

    String completeJson(String systemPrompt, String userPrompt);
}
