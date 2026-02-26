package de.csiem.backend.repository;

import de.csiem.backend.model.UserEntity;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserRepository extends JpaRepository<UserEntity, UUID> {
}
