package de.csiem.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private UUID defaultUserId = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private String corsAllowedOrigins = "http://localhost:5173,http://127.0.0.1:5173,https://*.ngrok-free.app";
    private final Recording recording = new Recording();
    private final Transcription transcription = new Transcription();
    private final Insights insights = new Insights();
    private final Splitter splitter = new Splitter();
    private final Supabase supabase = new Supabase();

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

    public Recording getRecording() {
        return recording;
    }

    public Transcription getTranscription() {
        return transcription;
    }

    public Insights getInsights() {
        return insights;
    }

    public Splitter getSplitter() {
        return splitter;
    }

    public Supabase getSupabase() {
        return supabase;
    }

    public List<String> getCorsOriginsAsList() {
        return Arrays.stream(corsAllowedOrigins.split(","))
            .map(String::trim)
            .filter(value -> !value.isEmpty())
            .toList();
    }

    public static class Recording {
        private int maxSeconds = 60;

        public int getMaxSeconds() {
            return maxSeconds;
        }

        public void setMaxSeconds(int maxSeconds) {
            this.maxSeconds = maxSeconds;
        }
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

    public static class Splitter {
        private boolean enabled = true;
        private String openaiBaseUrl = "https://api.openai.com";
        private String openaiModel = "gpt-4o-mini";
        private String openaiApiKey;
        private int maxMemories = 5;
        private int minExcerptChars = 20;

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

        public int getMaxMemories() {
            return maxMemories;
        }

        public void setMaxMemories(int maxMemories) {
            this.maxMemories = maxMemories;
        }

        public int getMinExcerptChars() {
            return minExcerptChars;
        }

        public void setMinExcerptChars(int minExcerptChars) {
            this.minExcerptChars = minExcerptChars;
        }
    }

    public static class Supabase {
        private String url;
        private String anonKey;
        private String serviceRoleKey;
        private String audioBucket = "memory-audio";
        private int audioSignedUrlTtlSeconds = 60;

        public String getUrl() {
            return url;
        }

        public void setUrl(String url) {
            this.url = url;
        }

        public String getAnonKey() {
            return anonKey;
        }

        public void setAnonKey(String anonKey) {
            this.anonKey = anonKey;
        }

        public String getServiceRoleKey() {
            return serviceRoleKey;
        }

        public void setServiceRoleKey(String serviceRoleKey) {
            this.serviceRoleKey = serviceRoleKey;
        }

        public String getAudioBucket() {
            return audioBucket;
        }

        public void setAudioBucket(String audioBucket) {
            this.audioBucket = audioBucket;
        }

        public int getAudioSignedUrlTtlSeconds() {
            return audioSignedUrlTtlSeconds;
        }

        public void setAudioSignedUrlTtlSeconds(int audioSignedUrlTtlSeconds) {
            this.audioSignedUrlTtlSeconds = audioSignedUrlTtlSeconds;
        }
    }
}
