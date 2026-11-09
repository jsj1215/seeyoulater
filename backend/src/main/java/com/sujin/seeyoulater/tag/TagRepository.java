package com.sujin.seeyoulater.tag;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TagRepository extends JpaRepository<Tag, Long> {
    List<Tag> findAllByUserIdOrderBySortOrderAscNameAsc(Long userId);
    Optional<Tag> findByIdAndUserId(Long id, Long userId);
    Optional<Tag> findByUserIdAndName(Long userId, String name);

    @Query("SELECT COALESCE(MAX(t.sortOrder), -1) FROM Tag t WHERE t.user.id = :userId")
    int findMaxSortOrder(@Param("userId") Long userId);
}
