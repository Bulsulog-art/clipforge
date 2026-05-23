-- ============================================================
-- ClipForge — per-user push notification preferences
--
-- Apple App Review Guideline 5.1.1(vi) wants granular notification
-- control. Adds a jsonb column on profiles keyed by notification
-- "kind" (job_ready / low_credits / trend_match / avatar_ready).
-- Missing keys default to enabled so existing users aren't muted.
-- ============================================================
set search_path = clipforge, public;

alter table clipforge.profiles
  add column if not exists push_preferences jsonb not null default '{}'::jsonb;

-- No new policy — existing "self update" on profiles already lets the
-- user write their own row.
