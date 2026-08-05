-- ============================================================
-- ClipForge — remember which clips a generate job was given
--
-- A prompt→video job can be handed up to eight of the person's own clips, and
-- until now nothing recorded which ones. That is fine on the first run — the
-- paths travel in the queue payload — but the job row is the only thing left
-- once the queue entry is gone, so a retry rebuilt the video with the prompt
-- and none of the footage. The person would get back a different video and no
-- explanation for why their clips had vanished.
--
-- Storing them on the row also makes the record honest: the row now says what
-- the job was asked to do, not just what it produced.
-- ============================================================

set search_path = clipforge, public;

alter table clipforge.video_jobs
  add column if not exists source_asset_paths text[];

comment on column clipforge.video_jobs.source_asset_paths is
  'Storage paths of the clips the person attached to a generate job, in their order.';
