package com.sujin.seeyoulater.folder;

import com.sujin.seeyoulater.bookmark.Bookmark;
import com.sujin.seeyoulater.bookmark.BookmarkRepository;
import com.sujin.seeyoulater.bookmark.BookmarkSpec;
import com.sujin.seeyoulater.user.User;
import com.sujin.seeyoulater.user.UserRepository;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
public class FolderService {

    private final FolderRepository folderRepository;
    private final BookmarkRepository bookmarkRepository;
    private final UserRepository userRepository;

    public FolderService(FolderRepository folderRepository,
                         BookmarkRepository bookmarkRepository,
                         UserRepository userRepository) {
        this.folderRepository = folderRepository;
        this.bookmarkRepository = bookmarkRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<FolderResponse> findAll(String email) {
        var user = getUser(email);
        return folderRepository.findAllByUserIdOrderBySortOrderAscIdAsc(user.getId())
                .stream().map(f -> FolderResponse.from(f, countBookmarks(user.getId(), f.getId()))).toList();
    }

    public FolderResponse create(String email, FolderRequest request) {
        var user = getUser(email);
        if (folderRepository.existsByUserIdAndName(user.getId(), request.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Folder name already exists");
        }
        int nextOrder = folderRepository.findMaxSortOrder(user.getId()) + 1;
        return FolderResponse.from(folderRepository.save(new Folder(user, request.name(), nextOrder)));
    }

    public FolderResponse rename(String email, Long id, FolderRequest request) {
        var user = getUser(email);
        var folder = getOwned(id, user.getId());
        if (!folder.getName().equals(request.name())
                && folderRepository.existsByUserIdAndName(user.getId(), request.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Folder name already exists");
        }
        folder.setName(request.name());
        return FolderResponse.from(folder, countBookmarks(user.getId(), folder.getId()));
    }

    /**
     * ids 순서대로 sort_order를 다시 매김. 요청에 없는 폴더는 기존 순서를 유지한 채 뒤로 붙임.
     * 남의 폴더나 없는 id가 섞이면 존재 여부를 노출하지 않도록 둘 다 404로 거절함.
     */
    public List<FolderResponse> reorder(String email, List<Long> ids) {
        var user = getUser(email);
        if (new HashSet<>(ids).size() != ids.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duplicate folder ids");
        }
        Map<Long, Folder> owned = folderRepository.findAllByUserIdOrderBySortOrderAscIdAsc(user.getId()).stream()
                .collect(Collectors.toMap(Folder::getId, Function.identity(), (a, b) -> a, LinkedHashMap::new));
        if (!owned.keySet().containsAll(ids)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found");
        }
        List<Folder> ordered = new ArrayList<>(ids.stream().map(owned::get).toList());
        owned.values().stream().filter(f -> !ids.contains(f.getId())).forEach(ordered::add);
        for (int i = 0; i < ordered.size(); i++) {
            ordered.get(i).setSortOrder(i);
        }
        return ordered.stream().map(f -> FolderResponse.from(f, countBookmarks(user.getId(), f.getId()))).toList();
    }

    public FolderResponse toggleVisibility(String email, Long id) {
        var user = getUser(email);
        var folder = getOwned(id, user.getId());
        folder.setPublic(!folder.isPublic());
        return FolderResponse.from(folder, countBookmarks(user.getId(), folder.getId()));
    }

    @Transactional(readOnly = true)
    public List<PublicFolderResponse> findAllPublic() {
        return folderRepository.findAllPublicOrderByCreatedAtDesc().stream()
                .map(f -> PublicFolderResponse.from(f, countBookmarks(f.getUser().getId(), f.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PublicBookmarkResponse> getPublicFolderBookmarks(Long folderId) {
        var folder = getPublic(folderId);
        var spec = BookmarkSpec.build(folder.getUser().getId(), null, null, folderId);
        return bookmarkRepository.findAll(spec, Sort.by("createdAt").descending().and(Sort.by("id").descending()))
                .stream().map(PublicBookmarkResponse::from).toList();
    }

    public FolderResponse forkFolder(String email, Long folderId) {
        var user = getUser(email);
        var source = getPublic(folderId);
        if (source.getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot fork your own folder");
        }

        String newName = source.getName();
        int suffix = 1;
        while (folderRepository.existsByUserIdAndName(user.getId(), newName)) {
            newName = source.getName() + " (" + suffix++ + ")";
        }
        int nextOrder = folderRepository.findMaxSortOrder(user.getId()) + 1;
        var newFolder = folderRepository.save(new Folder(user, newName, nextOrder));

        var sourceBookmarks = bookmarkRepository.findAll(
                BookmarkSpec.build(source.getUser().getId(), null, null, folderId));
        for (var b : sourceBookmarks) {
            // 공개 응답과 같은 범위(url, title, thumbnailUrl)만 복사. 원본 소유자의 memo, 태그, 별점은 가져오지 않음
            var copy = new Bookmark(user, b.getUrl(), b.getTitle(), b.getThumbnailUrl(), null);
            copy.setFolder(newFolder);
            copy.setTags(new HashSet<>());
            bookmarkRepository.save(copy);
        }
        return FolderResponse.from(newFolder, sourceBookmarks.size());
    }

    public void delete(String email, Long id) {
        var user = getUser(email);
        folderRepository.delete(getOwned(id, user.getId()));
    }

    private long countBookmarks(Long userId, Long folderId) {
        return bookmarkRepository.count(BookmarkSpec.build(userId, null, null, folderId));
    }

    // 비공개 폴더도 "없음"과 같은 404로 응답해 존재 여부를 노출하지 않음
    private Folder getPublic(Long folderId) {
        return folderRepository.findPublicById(folderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));
    }

    private Folder getOwned(Long id, Long userId) {
        return folderRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
