package com.sujin.seeyoulater.tag;

import com.sujin.seeyoulater.user.User;
import jakarta.persistence.*;

@Entity
@Table(name = "tags", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "name"}))
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    protected Tag() {}

    public Tag(User user, String name, int sortOrder) {
        this.user = user;
        this.name = name;
        this.sortOrder = sortOrder;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}
