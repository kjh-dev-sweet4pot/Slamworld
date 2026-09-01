-- 명동 오픈 인스타 인플루언서 채널 수정 (샤오홍슈 → 인스타그램)
UPDATE contents
SET channel = '인스타그램'
WHERE campaign = '명동오픈_0811'
  AND influencer_name IN (
    'luna_pro_beauty',
    'dk_a_life',
    'erica.scoro',
    'lolahouques',
    'ariluxbloom',
    'marimariiiaaaa'
  );
