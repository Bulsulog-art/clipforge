-- ============================================================
-- DentVideo lifecycle email kinds on Liman — additive only, NOT applied
-- automatically. Apply by hand after 0005 (Liman SQL editor or psql), then
-- run the checks at the bottom. Idempotent; safe to run twice.
--
-- dentvid_email_log.kind (0005 allowed only welcome / nudge_preview /
-- nudge_offer) now accepts any lowercase kind, so the app can record:
--     nudge_start                day 0, unpaid clinic: finish your preview
--     nudge_objections           day 3, unpaid clinic: three common questions
--     nudge_post_YYYY_MM_DD      paying clinic, nothing shared that week
--     monthly_YYYY_MM            paying clinic, monthly summary
-- unique (clinic_id, kind) stays, so each is still sent at most once (the
-- periodic kinds once per week / month). The set of kinds lives in
-- web/src/lib/dentvid/lifecycle.ts.
--
-- Until this is applied the app keeps sending welcome / day 1 / day 7 and
-- skips the new kinds (it logs that once); nothing else changes.
-- ============================================================

alter table public.dentvid_email_log drop constraint if exists dentvid_email_log_kind_check;
alter table public.dentvid_email_log
  add constraint dentvid_email_log_kind_check check (kind ~ '^[a-z][a-z0-9_]{2,39}$');

-- The weekly posting nudge counts a clinic's "video_shared" events (0006).
do $$
begin
  if to_regclass('public.dentvid_events') is not null then
    create index if not exists dentvid_events_clinic_name
      on public.dentvid_events (clinic_id, name, created_at desc)
      where clinic_id is not null;
  end if;
end $$;

comment on table public.dentvid_email_log is 'DentVideo lifecycle emails sent, one row per (clinic, kind): idempotency for welcome, activation, weekly nudge and monthly summary mail.';

-- Checks (run after applying) -------------------------------------------------
-- select pg_get_constraintdef(oid) from pg_constraint where conname = 'dentvid_email_log_kind_check';  -- CHECK ((kind ~ '^[a-z][a-z0-9_]{2,39}$'::text))
-- select indexname from pg_indexes where indexname = 'dentvid_events_clinic_name';
