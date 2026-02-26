package de.csiem.backend.memory;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MemoryRepository extends JpaRepository<MemoryEntity, UUID> {

    Page<MemoryEntity> findByUser_Id(UUID userId, Pageable pageable);

    Optional<MemoryEntity> findByIdAndUser_Id(UUID id, UUID userId);
}
