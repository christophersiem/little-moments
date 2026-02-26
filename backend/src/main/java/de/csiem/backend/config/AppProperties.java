package de.csiem.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private UUID defaultUserId = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private String corsAllowedOrigins = "http://localhost:5173";
    private final Transcription transcription = new Transcription();
    private final Insights insights = new Insights();

    public UUID getDefaultUserId() {
        return defaultUserId;
    }

    public void setDefaultUserId(UUID defaultUserId) {
        this.defaultUserId = defaultUserId;
    }

    public String getCorsAllowedOrigins() {
        return corsAllowedOrigins;
    }

    public void setCorsAllowedOrigins(String corsAllowedOrigins) {
        this.corsAllowedOrigins = corsAllowedOrigins;
    }

    public Transcription getTranscription() {
        return transcription;
    }

    public Insights getInsights() {
        return insights;
    }

    public List<String> getCorsOriginsAsList() {
        return Arrays.stream(corsAllowedOrigins.split(","))
            .map(String::trim)
            .filter(value -> !value.isEmpty())
            .toList();
    }

    public static class Transcription {
        private String openaiBaseUrl = "https://api.openai.com";
        private String openaiModel = "gpt-4o-mini-transcribe";
        private String openaiApiKey;

        public String getOpenaiBaseUrl() {
            return openaiBaseUrl;
        }

        public void setOpenaiBaseUrl(String openaiBaseUrl) {
            this.openaiBaseUrl = openaiBaseUrl;
        }

        public String getOpenaiModel() {
            return openaiModel;
        }

        public void setOpenaiModel(String openaiModel) {
            this.openaiModel = openaiModel;
        }

        public String getOpenaiApiKey() {
            return openaiApiKey;
        }

        public void setOpenaiApiKey(String openaiApiKey) {
            this.openaiApiKey = openaiApiKey;
        }
    }

    public static class Insights {
        private boolean enabled = true;
        private String openaiBaseUrl = "https://api.openai.com";
        private String openaiModel = "gpt-4o-mini";
        private String openaiApiKey;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getOpenaiBaseUrl() {
            return openaiBaseUrl;
        }

        public void setOpenaiBaseUrl(String openaiBaseUrl) {
            this.openaiBaseUrl = openaiBaseUrl;
        }

        public String getOpenaiModel() {
            return openaiModel;
        }

        public void setOpenaiModel(String openaiModel) {
            this.openaiModel = openaiModel;
        }

        public String getOpenaiApiKey() {
            return openaiApiKey;
        }

        public void setOpenaiApiKey(String openaiApiKey) {
            this.openaiApiKey = openaiApiKey;
        }
    }
}
