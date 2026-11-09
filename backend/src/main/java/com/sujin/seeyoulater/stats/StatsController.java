package com.sujin.seeyoulater.stats;

import com.sujin.seeyoulater.bookmark.BookmarkRepository;
import com.sujin.seeyoulater.folder.FolderRepository;
import com.sujin.seeyoulater.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final BookmarkRepository bookmarkRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;

    public StatsController(BookmarkRepository bookmarkRepository,
                           FolderRepository folderRepository,
                           UserRepository userRepository) {
        this.bookmarkRepository = bookmarkRepository;
        this.folderRepository = folderRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public StatsResponse getStats(@AuthenticationPrincipal UserDetails userDetails) {
        var user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        long total = bookmarkRepository.count(
                (root, query, cb) -> cb.equal(root.get("user").get("id"), user.getId()));
        long folders = folderRepository.countByUserId(user.getId());
        long starred = bookmarkRepository.count(
                (root, query, cb) -> cb.and(
                        cb.equal(root.get("user").get("id"), user.getId()),
                        cb.greaterThan(root.get("rating"), 0)));

        return new StatsResponse(total, folders, starred);
    }

    record StatsResponse(long total, long folders, long starred) {}
}
