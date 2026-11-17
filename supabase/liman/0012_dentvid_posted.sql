-- ============================================================
-- DentVideo "posted" ticks on Liman — additive only, NOT applied
-- automatically. Apply by hand after 0001–0011 (Liman SQL editor or psql),
-- then run the checks at the bottom. Idempotent; safe to run twice.
--
-- dentvid_items.posted_at: when the clinic ticked a video as posted (null =
-- not posted). Until now the tick lived only in the browser that made it, so
-- a dentist who approves on the phone and checks on the desktop lost the
-- week's progress. Written by:
--   - the app (PATCH /api/dentvideo/items/[id] { posted }) with the owner's
--     session — the 0004 owner guard does not list posted_at, so an owner may
--     set it on their own rows, and nothing else changes with it;
--   - the email's "approve & share" page (POST /api/dentvideo/post) with the
--     service role, only for an approved video of the signed clinic + week.
--
-- Until this is applied the app keeps the ticks in the browser as before
-- (the API answers { stored: false }) and the emails still work.
-- ============================================================

alter table public.dentvid_items add column if not exists posted_at timestamptz;

comment on column public.dentvid_items.posted_at is
  'DentVideo: when the clinic marked this video as posted on its social accounts (its own checklist; null = not posted).';

-- Checks ---------------------------------------------------------------------
-- select column_name, data_type from information_schema.columns
--  where table_name = 'dentvid_items' and column_name = 'posted_at';   -- posted_at | timestamp with time zone
