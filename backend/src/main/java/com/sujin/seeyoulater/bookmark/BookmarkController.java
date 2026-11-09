package com.sujin.seeyoulater.bookmark;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/bookmarks")
public class BookmarkController {

    private final BookmarkService bookmarkService;

    public BookmarkController(BookmarkService bookmarkService) {
        this.bookmarkService = bookmarkService;
    }

    @GetMapping
    public Page<BookmarkResponse> search(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) List<Long> tagIds,
            @RequestParam(required = false) Long folderId,
            @RequestParam(required = false) LocalDate date,
            @RequestParam(defaultValue = "newest") String sortBy,
            @RequestParam(defaultValue = "false") boolean starredOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return bookmarkService.search(user.getUsername(), keyword, tagIds, folderId, date, sortBy, starredOnly, page, size);
    }

    @GetMapping("/dates")
    public List<String> getBookmarkDates(
            @AuthenticationPrincipal UserDetails user,
            @RequestParam int year,
            @RequestParam int month) {
        return bookmarkService.getBookmarkDates(user.getUsername(), year, month);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BookmarkResponse create(@AuthenticationPrincipal UserDetails user,
                                   @Valid @RequestBody BookmarkRequest request) {
        return bookmarkService.create(user.getUsername(), request);
    }

    @GetMapping("/{id}")
    public BookmarkResponse findById(@AuthenticationPrincipal UserDetails user,
                                     @PathVariable Long id) {
        return bookmarkService.findById(user.getUsername(), id);
    }

    @PutMapping("/{id}")
    public BookmarkResponse update(@AuthenticationPrincipal UserDetails user,
                                   @PathVariable Long id,
                                   @Valid @RequestBody BookmarkRequest request) {
        return bookmarkService.update(user.getUsername(), id, request);
    }

    @PatchMapping("/{id}/rating")
    public BookmarkResponse updateRating(@AuthenticationPrincipal UserDetails user,
                                          @PathVariable Long id,
                                          @RequestBody RatingRequest request) {
        return bookmarkService.updateRating(user.getUsername(), id, request.rating());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        bookmarkService.delete(user.getUsername(), id);
    }

    record RatingRequest(int rating) {}
}
