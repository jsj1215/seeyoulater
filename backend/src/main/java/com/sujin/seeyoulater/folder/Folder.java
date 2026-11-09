package com.sujin.seeyoulater.folder;

import com.sujin.seeyoulater.user.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "folders", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "name"}))
public class Folder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "is_public", nullable = false)
    private boolean isPublic = false;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    protected Folder() {}

    public Folder(User user, String name, int sortOrder) {
        this.user = user;
        this.name = name;
        this.sortOrder = sortOrder;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getName() { return name; }
    public boolean isPublic() { return isPublic; }
    public void setName(String name) { this.name = name; }
    public void setPublic(boolean isPublic) { this.isPublic = isPublic; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
