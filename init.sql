CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS users (
    id          BIGSERIAL PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS folders (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id),
    name       VARCHAR(200) NOT NULL,
    is_public  BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders(user_id);

CREATE TABLE IF NOT EXISTS bookmarks (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT NOT NULL REFERENCES users(id),
    folder_id     BIGINT REFERENCES folders(id) ON DELETE SET NULL,
    url           VARCHAR(2048) NOT NULL,
    title         VARCHAR(500),
    thumbnail_url VARCHAR(2048),
    memo          TEXT,
    rating        SMALLINT NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_created ON bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_folder ON bookmarks(folder_id);
-- 검색은 lower(title/memo) LIKE lower(:kw) 형태라 원본 컬럼 인덱스(idx_bookmarks_search)는 쓰이지 않음.
-- 식(expression) 인덱스로 교체하고, OR 조건을 BitmapOr로 합칠 수 있도록 컬럼별로 나눔
DROP INDEX IF EXISTS idx_bookmarks_search;
CREATE INDEX IF NOT EXISTS idx_bookmarks_title_trgm ON bookmarks
    USING GIN (lower(title) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_bookmarks_memo_trgm ON bookmarks
    USING GIN (lower(memo) gin_trgm_ops);

CREATE TABLE IF NOT EXISTS tags (
    id      BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    name    VARCHAR(100) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);

CREATE TABLE IF NOT EXISTS bookmark_tags (
    bookmark_id BIGINT NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
    tag_id      BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (bookmark_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmark_tags_tag_id ON bookmark_tags(tag_id);

-- 기존 DB 마이그레이션용. 이 파일 전체를 다시 실행해도 안전하도록(idempotent) 작성함
ALTER TABLE folders ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
ALTER TABLE tags ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;
