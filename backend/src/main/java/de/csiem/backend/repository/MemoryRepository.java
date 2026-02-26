package de.csiem.backend.repository;

import de.csiem.backend.model.MemoryEntity;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface MemoryRepository extends JpaRepository<MemoryEntity, UUID>, JpaSpecificationExecutor<MemoryEntity> {

    Page<MemoryEntity> findByUser_Id(UUID userId, Pageable pageable);

    Optional<MemoryEntity> findByIdAndUser_Id(UUID id, UUID userId);
}
