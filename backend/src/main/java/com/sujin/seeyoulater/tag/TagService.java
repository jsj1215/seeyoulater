package com.sujin.seeyoulater.tag;

import com.sujin.seeyoulater.user.User;
import com.sujin.seeyoulater.user.UserRepository;
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
public class TagService {

    private final TagRepository tagRepository;
    private final UserRepository userRepository;

    public TagService(TagRepository tagRepository, UserRepository userRepository) {
        this.tagRepository = tagRepository;
        this.userRepository = userRepository;
    }

    public TagResponse create(String email, String name) {
        var user = getUser(email);
        if (tagRepository.findByUserIdAndName(user.getId(), name.trim()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tag already exists");
        }
        return TagResponse.from(createTag(user, name.trim()));
    }

    /** 북마크 저장 시 새 태그를 만들 때도 같은 규칙(sort_order = max + 1)을 쓰도록 공개 */
    public Tag createTag(User user, String name) {
        int nextOrder = tagRepository.findMaxSortOrder(user.getId()) + 1;
        return tagRepository.save(new Tag(user, name, nextOrder));
    }

    @Transactional(readOnly = true)
    public List<TagResponse> findAll(String email) {
        var user = getUser(email);
        return tagRepository.findAllByUserIdOrderBySortOrderAscNameAsc(user.getId()).stream()
                .map(TagResponse::from).toList();
    }

    public TagResponse rename(String email, Long tagId, String newName) {
        var user = getUser(email);
        Tag tag = getOwned(tagId, user.getId());
        String trimmed = newName.trim();
        if (!trimmed.equals(tag.getName()) && tagRepository.findByUserIdAndName(user.getId(), trimmed).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Tag name already exists");
        }
        tag.setName(trimmed);
        return TagResponse.from(tag);
    }

    /** FolderService.reorder와 같은 규칙. 남의 태그/없는 id는 404, 중복 id는 400 */
    public List<TagResponse> reorder(String email, List<Long> ids) {
        var user = getUser(email);
        if (new HashSet<>(ids).size() != ids.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duplicate tag ids");
        }
        Map<Long, Tag> owned = tagRepository.findAllByUserIdOrderBySortOrderAscNameAsc(user.getId()).stream()
                .collect(Collectors.toMap(Tag::getId, Function.identity(), (a, b) -> a, LinkedHashMap::new));
        if (!owned.keySet().containsAll(ids)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Tag not found");
        }
        List<Tag> ordered = new ArrayList<>(ids.stream().map(owned::get).toList());
        owned.values().stream().filter(t -> !ids.contains(t.getId())).forEach(ordered::add);
        for (int i = 0; i < ordered.size(); i++) {
            ordered.get(i).setSortOrder(i);
        }
        return ordered.stream().map(TagResponse::from).toList();
    }

    public void delete(String email, Long tagId) {
        var user = getUser(email);
        tagRepository.delete(getOwned(tagId, user.getId()));
    }

    // 남의 태그도 "없음"과 같은 404로 응답해 존재 여부를 노출하지 않음
    private Tag getOwned(Long tagId, Long userId) {
        return tagRepository.findByIdAndUserId(tagId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tag not found"));
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
