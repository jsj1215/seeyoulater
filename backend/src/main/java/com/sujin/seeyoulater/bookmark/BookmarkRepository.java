package com.sujin.seeyoulater.bookmark;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long>,
        JpaSpecificationExecutor<Bookmark> {
    Optional<Bookmark> findByIdAndUserId(Long id, Long userId);
}
