package com.sujin.seeyoulater.folder;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/folders")
public class FolderController {

    private final FolderService folderService;

    public FolderController(FolderService folderService) {
        this.folderService = folderService;
    }

    @GetMapping
    public List<FolderResponse> findAll(@AuthenticationPrincipal UserDetails user) {
        return folderService.findAll(user.getUsername());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FolderResponse create(@AuthenticationPrincipal UserDetails user,
                                  @Valid @RequestBody FolderRequest request) {
        return folderService.create(user.getUsername(), request);
    }

    @PutMapping("/order")
    public List<FolderResponse> reorder(@AuthenticationPrincipal UserDetails user,
                                        @Valid @RequestBody OrderRequest request) {
        return folderService.reorder(user.getUsername(), request.ids());
    }

    @PutMapping("/{id}")
    public FolderResponse rename(@AuthenticationPrincipal UserDetails user,
                                  @PathVariable Long id,
                                  @Valid @RequestBody FolderRequest request) {
        return folderService.rename(user.getUsername(), id, request);
    }

    @PatchMapping("/{id}/visibility")
    public FolderResponse toggleVisibility(@AuthenticationPrincipal UserDetails user,
                                            @PathVariable Long id) {
        return folderService.toggleVisibility(user.getUsername(), id);
    }

    @PostMapping("/{id}/fork")
    @ResponseStatus(HttpStatus.CREATED)
    public FolderResponse fork(@AuthenticationPrincipal UserDetails user,
                                @PathVariable Long id) {
        return folderService.forkFolder(user.getUsername(), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UserDetails user, @PathVariable Long id) {
        folderService.delete(user.getUsername(), id);
    }
}
