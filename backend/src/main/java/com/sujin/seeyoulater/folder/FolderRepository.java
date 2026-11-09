package com.sujin.seeyoulater.folder;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FolderRepository extends JpaRepository<Folder, Long> {
    List<Folder> findAllByUserIdOrderBySortOrderAscIdAsc(Long userId);
    Optional<Folder> findByIdAndUserId(Long id, Long userId);
    boolean existsByUserIdAndName(Long userId, String name);
    long countByUserId(Long userId);

    @Query("SELECT COALESCE(MAX(f.sortOrder), -1) FROM Folder f WHERE f.user.id = :userId")
    int findMaxSortOrder(@Param("userId") Long userId);

    @Query("SELECT f FROM Folder f JOIN FETCH f.user WHERE f.isPublic = true ORDER BY f.createdAt DESC")
    List<Folder> findAllPublicOrderByCreatedAtDesc();

    @Query("SELECT f FROM Folder f JOIN FETCH f.user WHERE f.id = :id AND f.isPublic = true")
    Optional<Folder> findPublicById(@Param("id") Long id);
}
