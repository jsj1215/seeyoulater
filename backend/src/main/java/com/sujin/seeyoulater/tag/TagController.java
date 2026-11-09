package com.sujin.seeyoulater.tag;

import com.sujin.seeyoulater.folder.OrderRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tags")
public class TagController {

    private final TagService tagService;

    public TagController(TagService tagService) {
        this.tagService = tagService;
    }

    @GetMapping
    public List<TagResponse> findAll(@AuthenticationPrincipal UserDetails user) {
        return tagService.findAll(user.getUsername());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TagResponse create(@AuthenticationPrincipal UserDetails user,
                               @Valid @RequestBody TagCreateRequest request) {
        return tagService.create(user.getUsername(), request.name());
    }

    record TagCreateRequest(@NotBlank @Size(max = 100) String name) {}

    @PutMapping("/order")
    public List<TagResponse> reorder(@AuthenticationPrincipal UserDetails user,
                                     @Valid @RequestBody OrderRequest request) {
        return tagService.reorder(user.getUsername(), request.ids());
    }

    @PutMapping("/{id}")
    public TagResponse rename(@AuthenticationPrincipal UserDetails user,
                               @PathVariable Long id,
                               @Valid @RequestBody TagCreateRequest request) {
        return tagService.rename(user.getUsername(), id, request.name());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        tagService.delete(user.getUsername(), id);
    }
}
