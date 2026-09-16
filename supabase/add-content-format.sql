-- ============================================================
-- 콘텐츠 형식(릴스/노트/숏폼/게시물) 컬럼 추가 + 자동 백필
-- v2 리포트 "콘텐츠 형식 분석" 섹션에서 사용.
-- NULL로 두면 프론트(lib/content-format.ts)에서 채널/URL 패턴으로 자동 분류하고,
-- 여기 값을 채워두면 그 값을 우선(수동 보정)합니다.
-- ============================================================

ALTER TABLE contents ADD COLUMN IF NOT EXISTS content_format TEXT;

ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_content_format_check;
ALTER TABLE contents ADD CONSTRAINT contents_content_format_check
  CHECK (content_format IS NULL OR content_format IN ('릴스', '노트', '숏폼', '게시물'));

-- 자동 백필 — 업로드 링크가 있는 기존 행만. 규칙:
--   샤오홍슈            → 노트
--   인스타그램 (/reel/ 포함) → 릴스
--   인스타그램 (그 외)   → 게시물
--   틱톡 · 도우인        → 숏폼
--   웨이보 · 그 외       → 게시물
UPDATE contents
SET content_format = CASE
  WHEN channel = '샤오홍슈' THEN '노트'
  WHEN channel = '인스타그램' AND upload_url ILIKE '%/reel%' THEN '릴스'
  WHEN channel = '인스타그램' THEN '게시물'
  WHEN channel IN ('틱톡', '도우인') THEN '숏폼'
  ELSE '게시물'
END
WHERE content_format IS NULL
  AND upload_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contents_content_format ON contents(content_format);

GRANT SELECT ON contents TO anon, authenticated;
