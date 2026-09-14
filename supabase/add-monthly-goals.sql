-- 인원·발행 상태는 contents. 월 분류는 visit_date.
-- monthly_plan 은 만들지 않음. 이미 만들었으면 제거.

DROP TABLE IF EXISTS monthly_plan;

ALTER TABLE contents ADD COLUMN IF NOT EXISTS publish_status TEXT;

UPDATE contents
SET publish_status = CASE
  WHEN upload_url IS NOT NULL AND btrim(upload_url) <> '' THEN '발행완료'
  ELSE '예정'
END
WHERE publish_status IS NULL;

ALTER TABLE contents ALTER COLUMN publish_status SET DEFAULT '예정';
ALTER TABLE contents ALTER COLUMN publish_status SET NOT NULL;

ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_publish_status_check;
ALTER TABLE contents ADD CONSTRAINT contents_publish_status_check
  CHECK (publish_status IN ('예정', '진행중', '발행완료'));

CREATE INDEX IF NOT EXISTS idx_contents_visit_date ON contents (visit_date);
CREATE INDEX IF NOT EXISTS idx_contents_publish_status ON contents (publish_status);

-- 목표 건수만 별도. 달 키는 그 달 1일.
CREATE TABLE IF NOT EXISTS monthly_goals (
  month         DATE PRIMARY KEY,
  upload_target INTEGER NOT NULL CHECK (upload_target >= 0),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE monthly_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read" ON monthly_goals;
CREATE POLICY "public read" ON monthly_goals FOR SELECT TO anon, authenticated USING (true);
GRANT SELECT ON monthly_goals TO anon, authenticated;

INSERT INTO monthly_goals (month, upload_target)
VALUES ('2026-09-01', 150)
ON CONFLICT (month) DO NOTHING;

-- 9월 예정 발행. 링크는 프로필. 업로드 전이라 upload_url 없음.
INSERT INTO contents (
  campaign, location, brands, influencer_name, sns_id, profile_url, channel,
  is_press, visit_date, publish_status, views_source
)
SELECT v.campaign, v.location, v.brands, v.influencer_name, v.sns_id, v.profile_url, v.channel,
       FALSE, v.visit_date::date, '예정', 'none'
FROM (VALUES
  ('9월_방문', '명동점', '닥터리엔장,옵티팜,Rxme', '서하얀', '5940bd3f82ec3963fa2d2428', 'https://www.xiaohongshu.com/user/profile/5940bd3f82ec3963fa2d2428', '샤오홍슈', '2026-09-06'),
  ('9월_방문', '명동점', '닥터리엔장,옵티팜,Rxme', '一只大尚尚', '5c1a7d87000000000700ffa1', 'https://www.xiaohongshu.com/user/profile/5c1a7d87000000000700ffa1', '샤오홍슈', '2026-09-08'),
  ('9월_방문', '명동점', '닥터리엔장,옵티팜,Rxme', '서이사', NULL, 'https://xhslink.cn/m/2Q4Mq0h3X9a', '샤오홍슈', '2026-09-08'),
  ('9월_방문', '명동점', '닥터리엔장,옵티팜,Rxme', 'Win大小姐', NULL, 'https://xhslink.cn/m/5qajSYkEHKE', '샤오홍슈', '2026-09-13'),
  ('9월_방문', '명동점', '닥터리엔장,옵티팜,Rxme', '미린 琳三岁', '5961998650c4b40808c7a305', 'https://www.rednote.com/user/profile/5961998650c4b40808c7a305', '샤오홍슈', '2026-09-14'),
  ('9월_방문', '명동점', '닥터리엔장,옵티팜,Rxme', 'JiaJiaW', '598fd91b50c4b4021d942cf9', 'https://www.xiaohongshu.com/user/profile/598fd91b50c4b4021d942cf9', '샤오홍슈', '2026-09-15'),
  ('9월_방문', '명동점', '닥터리엔장,옵티팜,Rxme', '是你的小G', NULL, 'https://xhslink.cn/m/5nN0KnfBG6B', '샤오홍슈', '2026-09-20'),
  ('9월_방문', '명동점', '닥터리엔장,옵티팜,Rxme', '新新超酷', '615ea0ce000000000201adc5', 'https://www.xiaohongshu.com/user/profile/615ea0ce000000000201adc5', '샤오홍슈', '2026-09-20')
) AS v(campaign, location, brands, influencer_name, sns_id, profile_url, channel, visit_date)
WHERE NOT EXISTS (
  SELECT 1 FROM contents c
  WHERE c.influencer_name = v.influencer_name
    AND c.visit_date = v.visit_date::date
);
