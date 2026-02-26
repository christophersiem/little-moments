package de.csiem.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "memories")
public class MemoryEntity {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserEntity user;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "recorded_at", nullable = false)
    private Instant recordedAt;

    @Column(name = "transcript", columnDefinition = "TEXT")
    private String transcript;

    @Column(name = "title", length = 255)
    private String title;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MemoryStatus status;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "memory_tags", joinColumns = @JoinColumn(name = "memory_id"))
    @Column(name = "tag", nullable = false, length = 32)
    @Enumerated(EnumType.STRING)
    private Set<MemoryTag> tags = new LinkedHashSet<>();

    protected MemoryEntity() {
    }

    public MemoryEntity(UUID id, UserEntity user, Instant recordedAt, MemoryStatus status) {
        this.id = id;
        this.user = user;
        this.recordedAt = recordedAt;
        this.status = status;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public void markReady(
        String transcriptText,
        Set<MemoryTag> detectedTags,
        String generatedTitle,
        String generatedSummary
    ) {
        this.status = MemoryStatus.READY;
        this.transcript = transcriptText;
        this.title = generatedTitle;
        this.summary = generatedSummary;
        this.errorMessage = null;
        this.tags.clear();
        if (detectedTags != null && !detectedTags.isEmpty()) {
            this.tags.addAll(detectedTags);
        }
    }

    public void markFailed(String message) {
        this.status = MemoryStatus.FAILED;
        this.transcript = null;
        this.title = null;
        this.summary = null;
        this.errorMessage = message;
        this.tags.clear();
    }

    public void updateTitle(String nextTitle) {
        this.title = nextTitle;
    }

    public void updateTranscriptAndSummary(String nextTranscript, String nextSummary) {
        this.transcript = nextTranscript;
        this.summary = nextSummary;
    }

    public void replaceTags(Set<MemoryTag> nextTags) {
        this.tags.clear();
        if (nextTags != null && !nextTags.isEmpty()) {
            this.tags.addAll(nextTags);
        }
    }

    public UUID getId() {
        return id;
    }

    public UserEntity getUser() {
        return user;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Instant getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(Instant recordedAt) {
        this.recordedAt = recordedAt;
    }

    public String getTranscript() {
        return transcript;
    }

    public String getTitle() {
        return title;
    }

    public String getSummary() {
        return summary;
    }

    public MemoryStatus getStatus() {
        return status;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public Set<MemoryTag> getTags() {
        return tags;
    }
}
