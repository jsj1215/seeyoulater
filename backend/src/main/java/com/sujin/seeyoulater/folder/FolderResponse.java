package com.sujin.seeyoulater.folder;

import java.time.LocalDateTime;

public record FolderResponse(Long id, String name, boolean isPublic, long bookmarkCount, LocalDateTime createdAt) {
    public static FolderResponse from(Folder f) {
        return new FolderResponse(f.getId(), f.getName(), f.isPublic(), 0, f.getCreatedAt());
    }
    public static FolderResponse from(Folder f, long count) {
        return new FolderResponse(f.getId(), f.getName(), f.isPublic(), count, f.getCreatedAt());
    }
}
