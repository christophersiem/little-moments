package de.csiem.backend.repository;

import de.csiem.backend.model.MemoryEntity;
import de.csiem.backend.model.MemoryTag;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface MemoryRepository extends JpaRepository<MemoryEntity, UUID> {

    Page<MemoryEntity> findByUser_Id(UUID userId, Pageable pageable);

    @Query(
        value = """
            SELECT DISTINCT m
            FROM MemoryEntity m
            WHERE m.user.id = :userId
                AND (:fromInstant IS NULL OR m.recordedAt >= :fromInstant)
                AND (:toInstant IS NULL OR m.recordedAt < :toInstant)
                AND (
                    :tagsEmpty = TRUE
                    OR EXISTS (
                        SELECT 1
                        FROM MemoryEntity m2
                        JOIN m2.tags tag
                        WHERE m2.id = m.id AND tag IN :tags
                    )
                )
            """,
        countQuery = """
            SELECT COUNT(DISTINCT m.id)
            FROM MemoryEntity m
            WHERE m.user.id = :userId
                AND (:fromInstant IS NULL OR m.recordedAt >= :fromInstant)
                AND (:toInstant IS NULL OR m.recordedAt < :toInstant)
                AND (
                    :tagsEmpty = TRUE
                    OR EXISTS (
                        SELECT 1
                        FROM MemoryEntity m2
                        JOIN m2.tags tag
                        WHERE m2.id = m.id AND tag IN :tags
                    )
                )
            """
    )
    Page<MemoryEntity> findByUserWithFilters(
        @Param("userId") UUID userId,
        @Param("fromInstant") Instant fromInstant,
        @Param("toInstant") Instant toInstant,
        @Param("tags") Set<MemoryTag> tags,
        @Param("tagsEmpty") boolean tagsEmpty,
        Pageable pageable
    );

    Optional<MemoryEntity> findByIdAndUser_Id(UUID id, UUID userId);
}
