-- Chelsie Alquinto · 이태원점 인스타 업로드 URL 교체
UPDATE contents
SET
  upload_url = 'https://www.instagram.com/reel/DWdtSjegK8f/',
  views = NULL,
  likes = NULL,
  saves = NULL,
  comments = NULL,
  views_estimated = NULL,
  views_est_low = NULL,
  views_est_high = NULL,
  views_source = 'none',
  metrics_updated_at = NULL
WHERE location = '이태원점'
  AND influencer_name = 'Chelsie Alquinto'
  AND channel = '인스타그램';
