-- 로그인 없이 anon key로 리포트 데이터 읽기 허용
-- Supabase Dashboard → SQL Editor 에서 실행하거나:
--   npm run db:public-read

ALTER TABLE contents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated users can read" ON contents;
DROP POLICY IF EXISTS "public read" ON contents;

CREATE POLICY "public read"
  ON contents FOR SELECT
  TO anon, authenticated
  USING (true);

GRANT SELECT ON contents TO anon, authenticated;
GRANT SELECT ON contents_with_performance TO anon, authenticated;
GRANT SELECT ON summary TO anon, authenticated;
GRANT SELECT ON location_summary TO anon, authenticated;
