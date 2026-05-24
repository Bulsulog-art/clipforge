-- ============================================================
-- ClipForge — capture signup attribution (UTM params)
--
-- Tracks where each new user came from (TikTok bio, Reddit thread,
-- ProductHunt, paid ad, etc.) so the team can see which channels
-- actually convert. Stored on the profile so a single SQL query
-- yields the funnel — no third-party analytics SDK in the loop.
-- ============================================================
set search_path = clipforge, public;

alter table clipforge.profiles
  add column if not exists signup_source jsonb;

-- Existing "self update" RLS already lets the user write their own
-- row, but the attribution endpoint will use the service client to
-- be defensive (so a client can't overwrite a previous-day attribution
-- by replaying the call).
