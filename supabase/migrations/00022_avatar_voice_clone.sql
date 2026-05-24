-- ============================================================
-- ClipForge — wire voice clones into the avatar render pipeline
--
-- avatar_jobs.voice_id has always been a free-text persona / OpenAI
-- voice name. To use an ElevenLabs cloned voice we need a separate FK
-- column so the worker can disambiguate "stock voice" vs "user clone"
-- and pull the elevenlabs_voice_id at synthesis time.
--
-- on delete set null: deleting the clone shouldn't break old job rows
-- (we want the historical record to survive). The render will simply
-- fall back to voice_id (stock voice) if both columns are missing.
-- ============================================================
set search_path = clipforge, public;

alter table clipforge.avatar_jobs
  add column if not exists voice_clone_id uuid
    references clipforge.voice_clones(id) on delete set null;

create index if not exists avatar_jobs_voice_clone_idx
  on clipforge.avatar_jobs (voice_clone_id)
  where voice_clone_id is not null;
