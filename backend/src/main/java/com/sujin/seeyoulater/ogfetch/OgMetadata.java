package com.sujin.seeyoulater.ogfetch;

public record OgMetadata(String title, String thumbnailUrl, String description) {
    public static OgMetadata empty() {
        return new OgMetadata(null, null, null);
    }
}
