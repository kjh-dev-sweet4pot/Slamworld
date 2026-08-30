-- Apify sync 시각 기록
ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS metrics_updated_at TIMESTAMPTZ;
