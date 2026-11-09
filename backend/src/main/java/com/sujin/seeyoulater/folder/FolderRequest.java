package com.sujin.seeyoulater.folder;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record FolderRequest(@NotBlank @Size(max = 200) String name) {}
