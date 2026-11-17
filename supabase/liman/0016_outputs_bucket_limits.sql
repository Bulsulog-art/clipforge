-- Liman: server audit 2026-11-14 (M9, L3).
-- Studio's public `outputs` bucket had no size or type limit. Existing objects
-- are png/jpeg/mp4 up to ~15 MB; allow common image/video types up to 500 MB.
update storage.buckets
   set file_size_limit = 524288000,
       allowed_mime_types = array['image/png','image/jpeg','image/webp','video/mp4','video/webm','video/quicktime']
 where id = 'outputs';
-- Collation version warning printed by every backup (glibc 2.39 -> 2.40).
alter database template1 refresh collation version;
