package com.sujin.seeyoulater.folder;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/** 폴더/태그 순서 변경 요청. ids 순서대로 sort_order 0, 1, 2 ...를 부여함 */
public record OrderRequest(@NotNull @Size(min = 1, max = 1000) List<@NotNull Long> ids) {}
