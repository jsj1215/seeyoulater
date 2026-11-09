package com.sujin.seeyoulater.folder;

import java.time.LocalDateTime;

/** 비로그인 공개 API 응답. 소유자 이메일 원문은 절대 내보내지 않고 마스킹한 이름만 노출함 */
public record PublicFolderResponse(Long id, String name, String ownerName, long bookmarkCount, LocalDateTime createdAt) {

    public static PublicFolderResponse from(Folder f, long bookmarkCount) {
        return new PublicFolderResponse(f.getId(), f.getName(), maskEmail(f.getUser().getEmail()),
                bookmarkCount, f.getCreatedAt());
    }

    /** "sujin@example.com" → "su***". 로컬파트가 2자 이하면 1자만 노출 */
    static String maskEmail(String email) {
        if (email == null || email.isEmpty()) return "***";
        int at = email.indexOf('@');
        String local = at > 0 ? email.substring(0, at) : email;
        int visible = local.length() > 2 ? 2 : 1;
        return local.substring(0, visible) + "***";
    }
}
