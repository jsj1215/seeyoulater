package com.sujin.seeyoulater.bookmark;

import com.sujin.seeyoulater.folder.Folder;
import com.sujin.seeyoulater.folder.FolderRepository;
import com.sujin.seeyoulater.tag.Tag;
import com.sujin.seeyoulater.tag.TagRepository;
import com.sujin.seeyoulater.tag.TagService;
import com.sujin.seeyoulater.user.User;
import com.sujin.seeyoulater.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class BookmarkService {

    private final BookmarkRepository bookmarkRepository;
    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final FolderRepository folderRepository;
    private final TagService tagService;

    private static final int MAX_PAGE_SIZE = 100;

    public BookmarkService(BookmarkRepository bookmarkRepository,
                           TagRepository tagRepository,
                           UserRepository userRepository,
                           FolderRepository folderRepository,
                           TagService tagService) {
        this.bookmarkRepository = bookmarkRepository;
        this.tagRepository = tagRepository;
        this.userRepository = userRepository;
        this.folderRepository = folderRepository;
        this.tagService = tagService;
    }

    public BookmarkResponse create(String email, BookmarkRequest request) {
        User user = getUser(email);
        Set<Tag> tags = getOrCreateTags(user, request.tagNames());
        Folder folder = resolveFolder(request.folderId(), user.getId());
        Bookmark bookmark = new Bookmark(user, request.url(), request.title(),
                request.thumbnailUrl(), request.memo());
        bookmark.setTags(tags);
        bookmark.setFolder(folder);
        return BookmarkResponse.from(bookmarkRepository.save(bookmark));
    }

    @Transactional(readOnly = true)
    public Page<BookmarkResponse> search(String email, String keyword, List<Long> tagIds,
                                         Long folderId, LocalDate date, String sortBy,
                                         boolean starredOnly, int page, int size) {
        User user = getUser(email);
        var spec = BookmarkSpec.build(user.getId(), keyword, tagIds, folderId, date);
        if (starredOnly) spec = spec.and(BookmarkSpec.starredOnly());
        Sort newest = Sort.by("createdAt").descending().and(Sort.by("id").descending());
        Sort sort;
        if (date != null) {
            sort = newest;
        } else if ("oldest".equals(sortBy)) {
            sort = Sort.by("createdAt").ascending().and(Sort.by("id").ascending());
        } else if ("starred".equals(sortBy)) {
            sort = Sort.by("rating").descending().and(newest);
        } else {
            // 기본값 newest: 최신 저장순 (기존에는 starred와 같은 정렬이었음)
            sort = newest;
        }
        // 한 번에 큰 페이지를 요청해 DB/메모리를 과하게 쓰지 않도록 size 상한 100
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        var pageable = PageRequest.of(Math.max(page, 0), safeSize, sort);
        return bookmarkRepository.findAll(spec, pageable).map(BookmarkResponse::from);
    }

    @Transactional(readOnly = true)
    public List<String> getBookmarkDates(String email, int year, int month) {
        User user = getUser(email);
        YearMonth ym;
        try {
            ym = YearMonth.of(year, month);
        } catch (DateTimeException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid year or month");
        }
        LocalDate start = ym.atDay(1);
        LocalDate end = ym.atEndOfMonth().plusDays(1);
        var spec = BookmarkSpec.build(user.getId(), null, null, null)
                .and((root, query, cb) -> cb.and(
                        cb.greaterThanOrEqualTo(root.get("createdAt"), start.atStartOfDay()),
                        cb.lessThan(root.get("createdAt"), end.atStartOfDay())));
        return bookmarkRepository.findAll(spec).stream()
                .map(b -> b.getCreatedAt().toLocalDate().toString())
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public BookmarkResponse findById(String email, Long id) {
        return BookmarkResponse.from(getOwned(email, id));
    }

    public BookmarkResponse update(String email, Long id, BookmarkRequest request) {
        User user = getUser(email);
        Bookmark bookmark = getOwned(user, id);
        Set<Tag> tags = getOrCreateTags(user, request.tagNames());
        Folder folder = resolveFolder(request.folderId(), user.getId());
        int rating = request.rating() != null ? request.rating() : bookmark.getRating();
        bookmark.update(request.url(), request.title(), request.thumbnailUrl(), request.memo(), tags, folder, rating);
        return BookmarkResponse.from(bookmark);
    }

    public BookmarkResponse updateRating(String email, Long id, int rating) {
        Bookmark bookmark = getOwned(email, id);
        bookmark.updateRating(rating);
        return BookmarkResponse.from(bookmark);
    }

    public void delete(String email, Long id) {
        bookmarkRepository.delete(getOwned(email, id));
    }

    private Folder resolveFolder(Long folderId, Long userId) {
        if (folderId == null) return null;
        return folderRepository.findByIdAndUserId(folderId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));
    }

    private Bookmark getOwned(String email, Long id) {
        return getOwned(getUser(email), id);
    }

    // 남의 북마크도 "없음"과 같은 404로 응답해 id 존재 여부를 노출하지 않음 (기존 403)
    private Bookmark getOwned(User user, Long id) {
        return bookmarkRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bookmark not found"));
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private Set<Tag> getOrCreateTags(User user, List<String> tagNames) {
        if (tagNames == null || tagNames.isEmpty()) return new HashSet<>();
        Set<Tag> result = new HashSet<>();
        for (String name : tagNames) {
            if (name == null || name.isBlank()) continue;
            Tag tag = tagRepository.findByUserIdAndName(user.getId(), name.trim())
                    .orElseGet(() -> tagService.createTag(user, name.trim()));
            result.add(tag);
        }
        return result;
    }
}
