package com.sujin.seeyoulater;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ResourceApiTest extends ApiTestSupport {

    @Test
    void otherUsersBookmarkReturns404NotForbidden() throws Exception {
        Cookie owner = loginAs(uniqueEmail("owner"));
        Cookie other = loginAs(uniqueEmail("other"));
        long id = createBookmark(owner, Map.of("url", "https://example.com/a"));

        mockMvc.perform(get("/api/bookmarks/" + id).cookie(other)).andExpect(status().isNotFound());
        mockMvc.perform(put("/api/bookmarks/" + id).cookie(other).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("url", "https://evil.example.com"))))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/bookmarks/" + id).cookie(owner)).andExpect(status().isOk());
    }

    @Test
    void defaultSortIsNewestFirstRegardlessOfRating() throws Exception {
        Cookie user = loginAs(uniqueEmail("sort"));
        long first = createBookmark(user, Map.of("url", "https://example.com/1", "rating", 5));
        long second = createBookmark(user, Map.of("url", "https://example.com/2"));
        // create는 rating을 반영하지 않으므로 PATCH로 첫 번째에 별점을 줌
        mockMvc.perform(patch("/api/bookmarks/" + first + "/rating").cookie(user)
                        .contentType(MediaType.APPLICATION_JSON).content(json(Map.of("rating", 5))))
                .andExpect(status().isOk());
        long third = createBookmark(user, Map.of("url", "https://example.com/3"));

        JsonNode newest = read(mockMvc.perform(get("/api/bookmarks").cookie(user)).andExpect(status().isOk()).andReturn());
        assertThat(ids(newest.get("content"))).containsExactly(third, second, first);

        JsonNode starred = read(mockMvc.perform(get("/api/bookmarks").param("sortBy", "starred").cookie(user))
                .andExpect(status().isOk()).andReturn());
        assertThat(ids(starred.get("content")).get(0)).isEqualTo(first);
    }

    @Test
    void pageSizeIsCappedAt100() throws Exception {
        Cookie user = loginAs(uniqueEmail("size"));
        mockMvc.perform(get("/api/bookmarks").param("size", "100000").cookie(user))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(100));
    }

    @Test
    void bookmarkUpdatePersistsUrl() throws Exception {
        Cookie user = loginAs(uniqueEmail("upd"));
        long id = createBookmark(user, Map.of("url", "https://example.com/old", "title", "t"));
        mockMvc.perform(put("/api/bookmarks/" + id).cookie(user).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("url", "https://example.com/new", "title", "t2"))))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/bookmarks/" + id).cookie(user))
                .andExpect(jsonPath("$.url").value("https://example.com/new"))
                .andExpect(jsonPath("$.title").value("t2"));
    }

    @Test
    void bookmarkRejectsNonHttpUrlsAndOversizedInput() throws Exception {
        Cookie user = loginAs(uniqueEmail("val"));
        mockMvc.perform(post("/api/bookmarks").cookie(user).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("url", "javascript:alert(1)"))))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/bookmarks").cookie(user).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("url", "https://example.com", "thumbnailUrl", "data:image/png;base64,xx"))))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/bookmarks").cookie(user).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("url", "https://example.com", "memo", "x".repeat(10001)))))
                .andExpect(status().isBadRequest());
        List<String> tooManyTags = new ArrayList<>();
        for (int i = 0; i < 31; i++) tooManyTags.add("tag" + i);
        mockMvc.perform(post("/api/bookmarks").cookie(user).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("url", "https://example.com", "tagNames", tooManyTags))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void keywordSearchTreatsLikeWildcardsLiterally() throws Exception {
        Cookie user = loginAs(uniqueEmail("kw"));
        long hit = createBookmark(user, Map.of("url", "https://example.com/p", "title", "100% Pure"));
        createBookmark(user, Map.of("url", "https://example.com/q", "title", "100 Other"));

        JsonNode percent = read(mockMvc.perform(get("/api/bookmarks").param("keyword", "0%").cookie(user))
                .andExpect(status().isOk()).andReturn());
        assertThat(ids(percent.get("content"))).containsExactly(hit);

        JsonNode underscore = read(mockMvc.perform(get("/api/bookmarks").param("keyword", "1_0").cookie(user))
                .andExpect(status().isOk()).andReturn());
        assertThat(underscore.get("content")).isEmpty();
    }

    @Test
    void tagFilterAcceptsRepeatedTagIdsParams() throws Exception {
        // 프론트 axios는 paramsSerializer { indexes: null } 로 tagIds=1&tagIds=2 형태를 보냄
        Cookie user = loginAs(uniqueEmail("tagf"));
        long java = createBookmark(user, Map.of("url", "https://example.com/j", "tagNames", List.of("java")));
        long both = createBookmark(user, Map.of("url", "https://example.com/b", "tagNames", List.of("java", "spring")));
        createBookmark(user, Map.of("url", "https://example.com/n", "tagNames", List.of("etc")));

        JsonNode tags = read(mockMvc.perform(get("/api/bookmarks/" + both).cookie(user))
                .andExpect(status().isOk()).andReturn()).get("tags");
        List<String> tagIds = new ArrayList<>();
        tags.forEach(t -> tagIds.add(t.get("id").asText()));

        JsonNode javaOnly = read(mockMvc.perform(get("/api/bookmarks").cookie(user)
                        .param("tagIds", tagIdOf(tags, "java")))
                .andExpect(status().isOk()).andReturn());
        assertThat(ids(javaOnly.get("content"))).containsExactlyInAnyOrder(java, both);

        JsonNode multi = read(mockMvc.perform(get("/api/bookmarks").cookie(user)
                        .param("tagIds", tagIds.toArray(String[]::new)))
                .andExpect(status().isOk()).andReturn());
        assertThat(ids(multi.get("content"))).contains(both).doesNotContainNull();
        assertThat(multi.get("content").size()).isLessThan(3);
    }

    private static String tagIdOf(JsonNode tags, String name) {
        for (JsonNode t : tags) if (name.equals(t.get("name").asText())) return t.get("id").asText();
        throw new IllegalStateException("tag not found: " + name);
    }

    @Test
    void invalidMonthReturns400() throws Exception {
        Cookie user = loginAs(uniqueEmail("month"));
        mockMvc.perform(get("/api/bookmarks/dates").param("year", "2026").param("month", "13").cookie(user))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
        mockMvc.perform(get("/api/bookmarks/dates").param("year", "2026").param("month", "abc").cookie(user))
                .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/bookmarks/dates").param("year", "2026").param("month", "5").cookie(user))
                .andExpect(status().isOk());
    }

    @Test
    void folderReorderPersistsAndRejectsForeignIds() throws Exception {
        Cookie user = loginAs(uniqueEmail("order"));
        long a = createFolder(user, "A");
        long b = createFolder(user, "B");
        long c = createFolder(user, "C");

        JsonNode initial = read(mockMvc.perform(get("/api/folders").cookie(user)).andReturn());
        assertThat(ids(initial)).containsExactly(a, b, c);

        mockMvc.perform(put("/api/folders/order").cookie(user).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("ids", List.of(c, a, b)))))
                .andExpect(status().isOk());
        JsonNode reordered = read(mockMvc.perform(get("/api/folders").cookie(user)).andReturn());
        assertThat(ids(reordered)).containsExactly(c, a, b);

        // 새 폴더는 맨 뒤(max + 1)
        long d = createFolder(user, "D");
        assertThat(ids(read(mockMvc.perform(get("/api/folders").cookie(user)).andReturn())))
                .containsExactly(c, a, b, d);

        Cookie other = loginAs(uniqueEmail("order-other"));
        long foreign = createFolder(other, "X");
        mockMvc.perform(put("/api/folders/order").cookie(user).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("ids", List.of(a, foreign)))))
                .andExpect(status().isNotFound());
        mockMvc.perform(put("/api/folders/order").cookie(user).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("ids", List.of(a, a)))))
                .andExpect(status().isBadRequest());
        // 거절된 요청은 순서를 바꾸지 않음
        assertThat(ids(read(mockMvc.perform(get("/api/folders").cookie(user)).andReturn())))
                .containsExactly(c, a, b, d);
    }

    @Test
    void tagReorderPersistsAndRejectsForeignIds() throws Exception {
        Cookie user = loginAs(uniqueEmail("tags"));
        long x = read(mockMvc.perform(post("/api/tags").cookie(user).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("name", "x")))).andExpect(status().isCreated()).andReturn()).get("id").asLong();
        long y = read(mockMvc.perform(post("/api/tags").cookie(user).contentType(MediaType.APPLICATION_JSON)
                .content(json(Map.of("name", "y")))).andExpect(status().isCreated()).andReturn()).get("id").asLong();

        mockMvc.perform(put("/api/tags/order").cookie(user).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("ids", List.of(y, x)))))
                .andExpect(status().isOk());
        assertThat(ids(read(mockMvc.perform(get("/api/tags").cookie(user)).andReturn()))).containsExactly(y, x);

        mockMvc.perform(put("/api/tags/order").cookie(user).contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("ids", List.of(999_999L)))))
                .andExpect(status().isNotFound());
    }

    @Test
    void publicFolderApisExposeNoEmailOrPrivateFields() throws Exception {
        String ownerEmail = uniqueEmail("publicowner");
        Cookie owner = loginAs(ownerEmail);
        long folderId = createFolder(owner, "Shared");
        createBookmark(owner, Map.of("url", "https://example.com/pub", "title", "Pub",
                "memo", "secret memo", "tagNames", List.of("private-tag"), "folderId", folderId));
        mockMvc.perform(patch("/api/folders/" + folderId + "/visibility").cookie(owner)).andExpect(status().isOk());

        String list = mockMvc.perform(get("/api/public/folders"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(list).doesNotContain(ownerEmail).doesNotContain("@example.com").doesNotContain("ownerEmail");
        JsonNode folder = findById(objectMapper.readTree(list), folderId);
        assertThat(folder.get("ownerName").asText()).isEqualTo("pu***");
        assertThat(fieldNames(folder)).containsExactlyInAnyOrder("id", "name", "ownerName", "bookmarkCount", "createdAt");
        assertThat(folder.get("bookmarkCount").asLong()).isEqualTo(1);

        String bookmarks = mockMvc.perform(get("/api/public/folders/" + folderId + "/bookmarks"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(bookmarks).doesNotContain("secret memo").doesNotContain("private-tag");
        JsonNode first = objectMapper.readTree(bookmarks).get(0);
        assertThat(fieldNames(first)).containsExactlyInAnyOrder("id", "url", "title", "thumbnailUrl", "createdAt");
    }

    @Test
    void privateFolderIsHiddenAndForkRules() throws Exception {
        Cookie owner = loginAs(uniqueEmail("forkowner"));
        Cookie other = loginAs(uniqueEmail("forker"));
        long folderId = createFolder(owner, "ToFork");
        createBookmark(owner, Map.of("url", "https://example.com/f", "memo", "owner memo", "folderId", folderId));

        // 비공개 폴더는 403이 아니라 404
        mockMvc.perform(get("/api/public/folders/" + folderId + "/bookmarks")).andExpect(status().isNotFound());
        mockMvc.perform(post("/api/folders/" + folderId + "/fork").cookie(other)).andExpect(status().isNotFound());

        mockMvc.perform(patch("/api/folders/" + folderId + "/visibility").cookie(owner)).andExpect(status().isOk());
        mockMvc.perform(post("/api/folders/" + folderId + "/fork").cookie(owner)).andExpect(status().isBadRequest());

        long forkedId = read(mockMvc.perform(post("/api/folders/" + folderId + "/fork").cookie(other))
                .andExpect(status().isCreated()).andReturn()).get("id").asLong();
        JsonNode copied = read(mockMvc.perform(get("/api/bookmarks").param("folderId", String.valueOf(forkedId)).cookie(other))
                .andExpect(status().isOk()).andReturn()).get("content").get(0);
        assertThat(copied.get("url").asText()).isEqualTo("https://example.com/f");
        assertThat(copied.get("memo").isNull()).isTrue();
    }

    private static List<Long> ids(JsonNode array) {
        List<Long> result = new ArrayList<>();
        array.forEach(n -> result.add(n.get("id").asLong()));
        return result;
    }

    private static List<String> fieldNames(JsonNode node) {
        List<String> names = new ArrayList<>();
        node.fieldNames().forEachRemaining(names::add);
        return names;
    }

    private static JsonNode findById(JsonNode array, long id) {
        for (JsonNode n : array) {
            if (n.get("id").asLong() == id) return n;
        }
        throw new AssertionError("id not found: " + id);
    }
}
