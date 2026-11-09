package com.sujin.seeyoulater.folder;

import com.sujin.seeyoulater.bookmark.Bookmark;

import java.time.LocalDateTime;

/** 공개 폴더의 북마크 응답. 개인 정보가 될 수 있는 memo, tags, rating, folder는 제외함 */
public record PublicBookmarkResponse(Long id, String url, String title, String thumbnailUrl, LocalDateTime createdAt) {
    public static PublicBookmarkResponse from(Bookmark b) {
        return new PublicBookmarkResponse(b.getId(), b.getUrl(), b.getTitle(), b.getThumbnailUrl(), b.getCreatedAt());
    }
}
