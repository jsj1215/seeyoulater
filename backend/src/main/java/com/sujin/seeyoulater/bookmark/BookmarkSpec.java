package com.sujin.seeyoulater.bookmark;

import com.sujin.seeyoulater.tag.Tag;
import jakarta.persistence.criteria.Join;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class BookmarkSpec {

    private static final char LIKE_ESCAPE = '\\';

    public static Specification<Bookmark> belongsToUser(Long userId) {
        return (root, query, cb) -> cb.equal(root.get("user").get("id"), userId);
    }

    public static Specification<Bookmark> keywordMatches(String keyword) {
        if (keyword == null || keyword.isBlank()) return null;
        // 사용자 입력의 %, _, \ 를 이스케이프해 와일드카드로 해석되지 않게 함
        String pattern = "%" + escapeLike(keyword.trim()) + "%";
        // lower(col) LIKE lower(:kw) 형태를 유지해야 init.sql의 GIN(lower(col) gin_trgm_ops) 식 인덱스를 탐
        return (root, query, cb) -> {
            var kw = cb.lower(cb.literal(pattern));
            return cb.or(
                    cb.like(cb.lower(root.get("title")), kw, LIKE_ESCAPE),
                    cb.like(cb.lower(root.get("memo")), kw, LIKE_ESCAPE)
            );
        };
    }

    static String escapeLike(String raw) {
        StringBuilder sb = new StringBuilder(raw.length());
        for (char c : raw.toCharArray()) {
            if (c == LIKE_ESCAPE || c == '%' || c == '_') sb.append(LIKE_ESCAPE);
            sb.append(c);
        }
        return sb.toString();
    }

    public static Specification<Bookmark> hasTagIds(List<Long> tagIds) {
        if (tagIds == null || tagIds.isEmpty()) return null;
        return (root, query, cb) -> {
            query.distinct(true);
            Join<Bookmark, Tag> tags = root.join("tags");
            return tags.get("id").in(tagIds);
        };
    }

    public static Specification<Bookmark> inFolder(Long folderId) {
        if (folderId == null) return null;
        if (folderId == -1L) {
            return (root, query, cb) -> cb.isNull(root.get("folder"));
        }
        return (root, query, cb) -> cb.equal(root.get("folder").get("id"), folderId);
    }

    public static Specification<Bookmark> starredOnly() {
        return (root, query, cb) -> cb.greaterThan(root.get("rating"), 0);
    }

    public static Specification<Bookmark> onDate(LocalDate date) {
        if (date == null) return null;
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end = date.plusDays(1).atStartOfDay();
        return (root, query, cb) -> cb.and(
                cb.greaterThanOrEqualTo(root.get("createdAt"), start),
                cb.lessThan(root.get("createdAt"), end)
        );
    }

    public static Specification<Bookmark> build(Long userId, String keyword,
                                                 List<Long> tagIds, Long folderId) {
        return build(userId, keyword, tagIds, folderId, null);
    }

    public static Specification<Bookmark> build(Long userId, String keyword,
                                                 List<Long> tagIds, Long folderId, LocalDate date) {
        Specification<Bookmark> spec = belongsToUser(userId);
        Specification<Bookmark> kw = keywordMatches(keyword);
        Specification<Bookmark> tags = hasTagIds(tagIds);
        Specification<Bookmark> folder = inFolder(folderId);
        Specification<Bookmark> dateSpec = onDate(date);
        if (kw != null) spec = spec.and(kw);
        if (tags != null) spec = spec.and(tags);
        if (folder != null) spec = spec.and(folder);
        if (dateSpec != null) spec = spec.and(dateSpec);
        return spec;
    }
}
