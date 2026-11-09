package com.sujin.seeyoulater.tag;

public record TagResponse(Long id, String name) {
    public static TagResponse from(Tag tag) {
        return new TagResponse(tag.getId(), tag.getName());
    }
}
