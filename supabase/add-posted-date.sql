-- 게시일(업로드 날짜). 방문일(visit_date)과 별개로, 월 필터·업로드 목록 기준
ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS posted_date DATE;
