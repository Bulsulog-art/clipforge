-- ============================================================
-- DentVideo background photos (Liman)
--
-- Each generated video gets 10–20 suggested photos from our curated library
-- (web/public/dentvideo/backgrounds, ranked by worker/src/dentvid/backgrounds/
-- suggest.ts). The chosen 1–4 live in plan.backgrounds; picking new ones
-- re-renders the video (worker job "restyle").
--
--   suggested_backgrounds  library ids, best first (jsonb array of text)
--   restyle_status         null | 'queued' (card shows "updating…") | 'failed'
--   restyle_requested_at   when the clinic last asked for new photos
--
-- Additive and nullable: the worker and the web app both keep working on a
-- database without it (the worker retries the insert without the column, the
-- web app selects * and computes suggestions from the plan).
-- ============================================================

alter table public.dentvid_items
  add column if not exists suggested_backgrounds jsonb,
  add column if not exists restyle_status text check (restyle_status in ('queued', 'failed')),
  add column if not exists restyle_requested_at timestamptz;
