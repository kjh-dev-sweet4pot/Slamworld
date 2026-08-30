-- 프로필 사진 (Supabase Storage 공개 URL)
ALTER TABLE contents
  ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
