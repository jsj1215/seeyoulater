package com.sujin.seeyoulater.bookmark;

import com.sujin.seeyoulater.folder.FolderResponse;
import com.sujin.seeyoulater.tag.TagResponse;

import java.time.LocalDateTime;
import java.util.List;

public record BookmarkResponse(
    Long id,
    String url,
    String title,
    String thumbnailUrl,
    String memo,
    List<TagResponse> tags,
    FolderResponse folder,
    int rating,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {
    public static BookmarkResponse from(Bookmark b) {
        return new BookmarkResponse(
            b.getId(), b.getUrl(), b.getTitle(), b.getThumbnailUrl(), b.getMemo(),
            b.getTags().stream().map(TagResponse::from).toList(),
            b.getFolder() != null ? FolderResponse.from(b.getFolder()) : null,
            b.getRating(),
            b.getCreatedAt(), b.getUpdatedAt()
        );
    }
}
