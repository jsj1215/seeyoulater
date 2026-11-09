package com.sujin.seeyoulater.folder;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final FolderService folderService;

    public PublicController(FolderService folderService) {
        this.folderService = folderService;
    }

    @GetMapping("/folders")
    public List<PublicFolderResponse> listPublicFolders() {
        return folderService.findAllPublic();
    }

    @GetMapping("/folders/{id}/bookmarks")
    public List<PublicBookmarkResponse> getPublicFolderBookmarks(@PathVariable Long id) {
        return folderService.getPublicFolderBookmarks(id);
    }
}
