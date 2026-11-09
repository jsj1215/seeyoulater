package com.sujin.seeyoulater.bookmark;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.URL;

import java.util.List;

// 길이 제한은 init.sql 컬럼 길이(url/thumbnail_url 2048, title 500, tags.name 100)와 맞춤.
// javascript:, data: 같은 스킴이 저장되면 공개 폴더에서 링크로 렌더링될 때 XSS가 되므로 http/https만 허용
public record BookmarkRequest(
    @NotBlank @URL @Size(max = 2048)
    @Pattern(regexp = "(?i)^https?://\\S+$", message = "must be an http(s) URL")
    String url,
    @Size(max = 500) String title,
    @Size(max = 2048)
    @Pattern(regexp = "(?i)^(https?://\\S+)?$", message = "must be an http(s) URL")
    String thumbnailUrl,
    @Size(max = 10000) String memo,
    @Size(max = 30) List<@NotBlank @Size(max = 100) String> tagNames,
    Long folderId,
    Integer rating
) {}
