-- ============================================================
-- ClipForge — prompt→video jobs
--
-- The generate pipeline writes rows into the same video_jobs table as the
-- clipping pipeline, but it moves through different stages and carries a
-- scene plan instead of a transcript. Three things in the original schema
-- reject it outright:
--
--   1. source_type's CHECK predates this feature, so the insert fails.
--   2. job_status has no 'planning' / 'gathering' / 'uploading', so every
--      progress write throws — after the credit has already been taken.
--   3. There is nowhere to keep the plan the model wrote, which is the only
--      record of *why* a video looks the way it does.
--
-- None of this shows up in the worker's tests: Supabase is mocked there, so
-- the constraint never runs. It only fails against the real database.
-- ============================================================

set search_path = clipforge, public;

-- New stages. Added after 'queued' so a status sort still reads in the order
-- a job actually moves through.
alter type clipforge.job_status add value if not exists 'planning'  after 'queued';
alter type clipforge.job_status add value if not exists 'gathering' after 'planning';
alter type clipforge.job_status add value if not exists 'uploading' after 'rendering';

alter table clipforge.video_jobs
  drop constraint if exists video_jobs_source_type_check;

alter table clipforge.video_jobs
  add constraint video_jobs_source_type_check
  check (source_type in ('upload', 'youtube', 'tiktok_url', 'generate'));

-- The scene plan the model produced: what each shot says, how long it holds,
-- which footage it asked for. Kept so a render can be explained, compared or
-- re-run without asking the model again.
alter table clipforge.video_jobs
  add column if not exists scene_plan jsonb;
