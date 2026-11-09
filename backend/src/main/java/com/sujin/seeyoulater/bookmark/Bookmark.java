package com.sujin.seeyoulater.bookmark;

import com.sujin.seeyoulater.folder.Folder;
import com.sujin.seeyoulater.tag.Tag;
import com.sujin.seeyoulater.user.User;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "bookmarks")
public class Bookmark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id")
    private Folder folder;

    @Column(nullable = false, length = 2048)
    private String url;

    @Column(length = 500)
    private String title;

    @Column(name = "thumbnail_url", length = 2048)
    private String thumbnailUrl;

    @Column(columnDefinition = "TEXT")
    private String memo;

    @Column(nullable = false)
    private int rating = 0;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "bookmark_tags",
        joinColumns = @JoinColumn(name = "bookmark_id"),
        inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private Set<Tag> tags = new HashSet<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();

    protected Bookmark() {}

    public Bookmark(User user, String url, String title, String thumbnailUrl, String memo) {
        this.user = user;
        this.url = url;
        this.title = title;
        this.thumbnailUrl = thumbnailUrl;
        this.memo = memo;
    }

    @PreUpdate
    void onUpdate() { this.updatedAt = LocalDateTime.now(); }

    public void update(String url, String title, String thumbnailUrl, String memo, Set<Tag> tags, Folder folder, int rating) {
        this.url = url;
        this.title = title;
        this.thumbnailUrl = thumbnailUrl;
        this.memo = memo;
        this.tags = tags;
        this.folder = folder;
        this.rating = Math.max(0, Math.min(5, rating));
    }

    public void updateRating(int rating) {
        this.rating = Math.max(0, Math.min(5, rating));
    }

    public void setTags(Set<Tag> tags) { this.tags = tags; }
    public void setFolder(Folder folder) { this.folder = folder; }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public Folder getFolder() { return folder; }
    public String getUrl() { return url; }
    public String getTitle() { return title; }
    public String getThumbnailUrl() { return thumbnailUrl; }
    public String getMemo() { return memo; }
    public Set<Tag> getTags() { return tags; }
    public int getRating() { return rating; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
