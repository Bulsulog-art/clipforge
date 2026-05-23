-- ============================================================
-- ClipForge — clip favorites (one-tap save your best clips)
--
-- Adds an `is_favorite` boolean to clips so users can star clips and
-- filter the feed to "Favorites only". Pure additive — defaults false
-- so existing clips are unchanged.
-- ============================================================
set search_path = clipforge, public;

alter table clipforge.clips
  add column if not exists is_favorite boolean not null default false;

-- Partial index because most clips will have is_favorite=false; the
-- partial index keeps the favorites query small even at scale.
create index if not exists clips_favorites_idx
  on clipforge.clips (user_id, created_at desc)
  where is_favorite = true;

-- Existing RLS already scopes clips to the owning user, so no new
-- policies are needed for favorite reads/writes.
